"""Unit tests for the risky parts of pipeline/ingest: download caching, resampling, aggregation, event ranking.

Arrays here are small hand-made test inputs (not data); no file under pipeline/data is touched.
"""

from __future__ import annotations

import datetime as dt
import json

import numpy as np
import pytest
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject

from pipeline.common.grid import Grid, grid_from_lonlat, grid_from_projected
from pipeline.common.io import write_geotiff
from pipeline.common.provenance import UnverifiedDatasetError, dataset_record, record
from pipeline.ingest import cache, imerg, ndvi, srtm
from pipeline.ingest.aoi import boundary_outlet, simplify_ring

PROV = record("prov-test", aoi=None, time_range=None, processing=["test"], notes="unit test content")


# --- download cache ---------------------------------------------------------------------------------------


def test_cached_download_fetches_once_and_writes_sidecar(tmp_path):
    calls = []

    def fake_fetch(url, dest):
        calls.append(url)
        dest.write_bytes(b"abc")

    dest = cache.cache_path("prod", "v1", "file.bin", root=tmp_path)
    path, fresh = cache.cached_download("https://example.invalid/f", dest, PROV, fetch=fake_fetch)
    assert fresh and path.read_bytes() == b"abc"
    assert json.loads((tmp_path / "prod" / "v1" / "file.bin.provenance.json").read_text())["provenance"]["id"] == "prov-test"
    path2, fresh2 = cache.cached_download("https://example.invalid/f", dest, PROV, fetch=fake_fetch)
    assert path2 == path and not fresh2 and len(calls) == 1


def test_cached_download_rejects_empty_and_leaves_no_partial(tmp_path):
    dest = cache.cache_path("prod", "v1", "empty.bin", root=tmp_path)
    with pytest.raises(RuntimeError):
        cache.cached_download("https://example.invalid/e", dest, PROV, fetch=lambda url, d: d.write_bytes(b""))
    assert not dest.exists() and not list(tmp_path.rglob("*.part"))


def test_cache_path_rejects_traversal(tmp_path):
    with pytest.raises(ValueError):
        cache.cache_path("..", "v1", "x", root=tmp_path)


# --- grid and resampling ----------------------------------------------------------------------------------


def test_grid_snaps_to_30m_lattice_and_nests():
    big = grid_from_lonlat(-80.0, -3.95, -78.85, -2.85)
    small = grid_from_lonlat(-79.875, -3.405, -79.805, -3.345)
    for g in (big, small):
        assert g.crs == "EPSG:32717" and g.res == 30.0
        assert g.x_min % 30 == 0 and g.y_max % 30 == 0
    assert (small.x_min - big.x_min) % 30 == 0 and (big.y_max - small.y_max) % 30 == 0


def test_nearest_resampling_invents_no_values():
    coarse = np.array([[1.0, 2.0], [3.0, np.nan]], dtype="float32")
    src_t = from_origin(600000, 9600000, 3000, 3000)
    fine = Grid(x_min=600000, y_max=9600000, width=200, height=200)
    dst = np.full(fine.shape, np.nan, dtype="float32")
    reproject(coarse, dst, src_transform=src_t, src_crs="EPSG:32717", src_nodata=np.nan, dst_transform=fine.transform,
              dst_crs=fine.crs, dst_nodata=np.nan, resampling=Resampling.nearest)
    assert set(np.unique(dst[~np.isnan(dst)])) <= {1.0, 2.0, 3.0}
    assert np.isnan(dst[150, 150])  # the missing coarse cell stays missing


def test_geotiff_writer_keeps_nan_and_writes_sidecar(tmp_path):
    g = grid_from_projected(0, 0, 90, 60)
    data = np.array([[1, np.nan, 3], [4, 5, 6]], dtype="float32")
    path = write_geotiff(tmp_path / "x.tif", data, g, PROV, band_names=["v"])
    with rasterio.open(path) as src:
        back = src.read(1)
        assert src.crs.to_epsg() == 32717 and src.descriptions == ("v",)
    assert np.isnan(back[0, 1]) and back[1, 2] == 6
    assert (tmp_path / "x.tif.provenance.json").is_file()


def test_ndvi_3x3_aggregation_requires_5_of_9():
    fine = np.full((3, 6), 0.8)
    fine[:, 3:] = np.nan
    fine[0, 3:] = 0.2  # only 3 valid in the second block
    out = ndvi.aggregate_3x3(fine)
    assert out[0, 0] == pytest.approx(0.8) and np.isnan(out[0, 1])


# --- SRTM, catchment, IMERG helpers -----------------------------------------------------------------------


def test_srtm_tile_names():
    assert srtm.tile_name(-4, -80) == "S04W080"
    assert srtm.tiles_for_bounds(-79.9, -3.5, -79.1, -3.1) == ["S04W080"]
    assert set(srtm.tiles_for_bounds(-80.0, -3.95, -78.85, -2.85)) == {"S04W080", "S04W079", "S03W080", "S03W079"}


def test_boundary_outlet_picks_highest_edge_cell():
    acc = np.zeros((6, 6))
    acc[2, 2] = 100  # interior: ignored
    acc[1, 4] = 7  # on the window's edge
    assert boundary_outlet(acc, slice(1, 5), slice(1, 5)) == (1, 4)


def test_simplify_ring_stays_closed():
    t = np.linspace(0, 2 * np.pi, 200)
    ring = np.c_[np.cos(t) * 1000, np.sin(t) * 1000]
    ring[-1] = ring[0]
    out = simplify_ring(ring, 10.0)
    assert np.allclose(out[0], out[-1]) and 4 <= len(out) < len(ring)


def test_cell_weights_area_fraction():
    lons, lats = np.array([-79.95, -79.85]), np.array([-3.35, -3.45])  # north-to-south centres
    half = {"type": "Polygon", "coordinates": [[[-80.0, -3.3], [-79.95, -3.3], [-79.95, -3.4], [-80.0, -3.4], [-80.0, -3.3]]]}
    w = imerg.cell_weights(half, lons, lats)
    assert w[0, 0] == pytest.approx(0.5, abs=0.02) and w[0, 1] == 0 and w[1, 0] == 0


def test_weighted_mean_propagates_missing():
    w = np.array([[0.5, 0.0]])
    assert imerg.weighted_mean(np.array([[4.0, np.nan]]), w) == 4.0
    assert np.isnan(imerg.weighted_mean(np.array([[np.nan, 1.0]]), w))


def test_top_events_are_declustered_and_skip_missing():
    dates = [dt.date(2026, 1, 1) + dt.timedelta(days=i) for i in range(10)]
    rain = [0, 10, 20, 30, 0, 0, 5, float("nan"), 50, 0]
    ev = imerg.top_events(dates, rain, n=3)
    assert ev[0] == {"start": "2026-01-02", "end": "2026-01-04", "rain_72h_mm": 60.0}
    starts = [e["start"] for e in ev]
    assert "2026-01-07" not in starts and "2026-01-08" not in starts  # windows touching the missing day are not ranked


def test_single_product_and_version_spans():
    assert imerg.PRODUCT[1] == "GPM_3IMERGDE"  # one product end to end (science review B1)
    assert imerg.granule_suffix("GPM_3IMERGDE.07:3B-DAY-E.MS.MRG.3IMERG.20260304-S000000-E235959.V07C.nc4") == "V07C"
    spans = imerg.suffix_spans(["2026-03-02", "2026-03-03", "2026-03-04"], ["V07B", "V07B", "V07C"])
    assert spans == "V07B 2026-03-02..2026-03-03; V07C 2026-03-04..2026-03-04"


def test_burn_line_lowers_only_the_river_cells():
    from pipeline.ingest.aoi import burn_line, exit_point

    g = grid_from_projected(600000, 9600000, 600300, 9600300)  # 10 x 10 cells
    dem = np.full(g.shape, 50.0)
    from pipeline.common.grid import to_lonlat

    lon, lat = to_lonlat(np.array([600015.0, 600285.0]), np.array([9600165.0, 9600165.0]))
    burned, mask = burn_line(dem, g, list(zip(lon, lat)), depth_m=10)
    assert mask[4:6].any() and not mask[0].any()
    assert (burned[mask] == 40).all() and (burned[~mask] == 50).all()
    line = [(0.0, 0.0), (1.0, 1.0), (2.0, 2.0), (5.0, 5.0)]
    assert exit_point(line, (0.5, 0.5, 2.5, 2.5)) == (2.0, 2.0)


def test_smap_recommended_flags():
    from pipeline.ingest import smap

    sm = np.array([0.3, 0.4, 0.2, 0.25])
    flag = np.array([0.0, 8.0, 9.0, 13.0])
    kept = np.where(np.isin(flag, smap.RECOMMENDED_FLAGS), sm, np.nan)
    assert kept[0] == 0.3 and kept[1] == 0.4 and np.isnan(kept[2:]).all()


def test_smap_dap_csv_parse_and_clean():
    from pipeline.ingest import smap

    text = "Dataset: x.h5\n/G/soil_moisture[0], 0.30, -9999\n/G/soil_moisture[1], 0.60, 0.01\n/G/lat[0], -3.3, -3.3\n/G/lat[1], -3.4, -3.4\n"
    arrays = smap.parse_dap_csv(text)
    assert arrays["/G/soil_moisture"].shape == (2, 2)
    cleaned = smap.clean(arrays["/G/soil_moisture"])
    assert cleaned[0, 0] == 0.30 and np.isnan(cleaned[0, 1]) and np.isnan(cleaned[1, 0]) and np.isnan(cleaned[1, 1])


def test_smap_axis_coords_ignore_fill():
    from pipeline.ingest import smap

    lat2d = np.array([[-9999.0, -3.3], [-3.4, -9999.0]])
    lon2d = np.array([[-9999.0, -79.8], [-79.9, -9999.0]])
    lat, lon = smap.axis_coords(lat2d, lon2d)
    assert lat.tolist() == [-3.3, -3.4] and lon.tolist() == [-79.9, -79.8]


def test_smap_nearest_index_maps_every_farm_cell_to_one_source_cell():
    from pipeline.ingest import smap

    grid = grid_from_lonlat(-79.875, -3.405, -79.805, -3.345)
    lat_c = np.array([-3.285, -3.356, -3.427, -3.497])  # decreasing with row, as in EASE-Grid 2.0
    lon_c = np.array([-79.964, -79.870, -79.777, -79.684])
    ri, ci = smap.nearest_index(grid, lat_c, lon_c)
    assert (ri >= 0).all() and (ci >= 0).all()
    assert set(np.unique(ri)) <= {1, 2} and set(np.unique(ci)) <= {1, 2}


def test_opendap_parser_handles_1d_and_3d():
    from pipeline.ingest import opendap

    text = "Dataset: x\n/lon, -79.95, -79.85\n/lat, -3.45, -3.35\n/p[0][0], 1, 2\n/p[0][1], 3, 4\n"
    a = opendap.parse_dap_csv(text)
    assert a["/lon"].shape == (2,) and a["/p"].shape == (1, 2, 2) and a["/p"][0, 1, 0] == 3


def test_imerg_window_and_coordinate_check():
    win = imerg.index_window((-79.875, -3.579, -79.629, -3.340))
    assert win == (1000, 1004, 863, 867)
    lon, lat = imerg.expected_centres(win)
    good = "Dataset: x\n/lon, " + ", ".join(f"{v:.2f}" for v in lon) + "\n/lat, " + ", ".join(f"{v:.2f}" for v in lat) + "\n"
    good += "".join(f"/precipitation[0][{i}], " + ", ".join(["1"] * 4 + ["-9999.9"]) + "\n" for i in range(5))
    data = imerg.parse_subset(good, win)
    assert data.shape == (5, 5) and np.isnan(data[4]).all() and data[0, 0] == 1  # (lat, lon); fill -> NaN
    with pytest.raises(ValueError):
        imerg.parse_subset(good.replace("-79.95", "-79.90"), win)


def test_window_stats_rank():
    dates = [dt.date(2026, 1, 1) + dt.timedelta(days=i) for i in range(8)]
    rain = [0, 10, 20, 30, 0, 0, 5, 1]
    events = imerg.top_events(dates, rain, n=0)
    s = imerg.window_stats(dates, rain, dt.date(2026, 1, 5), dt.date(2026, 1, 8), events)
    assert s["window"] == ["2026-01-06", "2026-01-08"] and s["max_72h_mm"] == 6.0
    assert s["rank_all_windows"] == 5 and s["n_windows"] == 6


def test_gldas_daily_mean_needs_all_8_instants():
    from pipeline.ingest import gldas

    ones = [np.ones((2, 2))] * 8
    assert gldas.daily_mean(ones)[0, 0] == 1
    assert gldas.daily_mean(ones[:7]) is None and gldas.daily_mean(ones[:7] + [None]) is None


def test_dataset_record_refuses_pending_entry():
    with pytest.raises(UnverifiedDatasetError):
        dataset_record("prov-x", "gaez", processing=[], aoi=None, time_range=None)
    rec = dataset_record("prov-y", "srtm", processing=[], aoi=None, time_range=None)
    assert rec["dataset"] == "SRTMGL1" and rec["version"] == "003"
