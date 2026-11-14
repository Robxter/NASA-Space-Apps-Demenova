"""Terrain features: slope, TWI, ranks, terciles, zones, D8 flow length (docs/spec/09 methods 1-2)."""

import math

import numpy as np
import pytest
from affine import Affine

from pipeline.engine import terrain as t


def test_slope_of_a_plane():
    # z = 0.02 x (m), 30 m cells: tan beta = 0.02 everywhere
    x = np.arange(5) * 30.0
    dem = np.tile(0.02 * x, (4, 1))
    assert np.allclose(t.slope_tan(dem, 30.0), 0.02)


def test_twi_hand_case():
    # a = 900 m2 / 30 m = 30 m; tan beta = 0.1 -> TWI = ln(300) = 5.7038
    assert float(t.twi(np.array(900.0), np.array(0.1), 30.0)) == pytest.approx(math.log(300.0))


def test_twi_is_missing_where_flat_or_missing():
    out = t.twi(np.array([900.0, 900.0, np.nan]), np.array([0.0, np.nan, 0.1]), 30.0)
    assert np.isnan(out).all()


def test_wetter_with_more_area_and_less_slope():
    a = t.twi(np.array([900.0, 9000.0]), np.array([0.1, 0.1]), 30.0)
    b = t.twi(np.array([900.0, 900.0]), np.array([0.1, 0.01]), 30.0)
    assert a[1] > a[0] and b[1] > b[0]


def test_rank_within_farm_with_ties_and_missing():
    assert t.rank_within_farm([3.0, 1.0, 2.0]) == [1.0, 0.0, 0.5]
    assert t.rank_within_farm([1.0, 1.0, 2.0]) == [0.25, 0.25, 1.0]
    assert t.rank_within_farm([5.0, None]) == [None, None]
    assert t.rank_within_farm([2.0, None, 4.0]) == [0.0, None, 1.0]


def test_tercile_breaks_and_classes():
    values = np.arange(1.0, 10.0)  # 1..9
    q1, q2 = t.tercile_breaks(values)
    assert q1 == pytest.approx(11 / 3) and q2 == pytest.approx(19 / 3)
    assert [t.tercile_of(v, (q1, q2)) for v in (1, 4, 7, None)] == ["low", "mid", "high", None]


def test_tercile_raster_respects_mask_and_missing():
    values = np.array([[1.0, 5.0, 9.0], [np.nan, 5.0, 9.0]])
    mask = np.array([[True, True, True], [True, True, False]])
    out = t.tercile_raster(values, mask, (3.0, 6.0))
    assert out.tolist() == [[1, 2, 3], [0, 2, 0]]


def test_rasterize_and_unit_stats():
    transform = Affine(30, 0, 0, 0, -30, 90)
    square = {"type": "Polygon", "coordinates": [[(0, 90), (60, 90), (60, 30), (0, 30), (0, 90)]]}
    labels = t.rasterize_units([square], (3, 3), transform)
    assert labels.sum() == 4
    values = np.array([[1.0, np.nan, 0.0], [3.0, 4.0, 0.0], [0.0, 0.0, 0.0]])
    stats = t.unit_stats(values, labels, 1)[0]
    assert stats == {"n_cells": 4, "n_undefined": 1, "mean": pytest.approx(8 / 3), "max": 4.0, "min": 1.0}


def test_zone_polygons_cover_the_cells():
    transform = Affine(30, 0, 0, 0, -30, 60)
    codes = np.array([[1, 1], [3, 0]], dtype="uint8")
    polys = t.polygons_of(codes, 1, transform)
    assert len(polys) == 1
    xs = [p[0] for p in polys[0][0]]
    assert min(xs) == 0 and max(xs) == 60


def test_d8_flow_length_side_and_diagonal_steps():
    # 2 x 2: (0,0) S -> (1,0) E -> outlet (1,1); (0,1) S -> outlet
    fdir = np.array([[4, 4], [1, 0]])
    mask = np.ones((2, 2), dtype=bool)
    lengths = t.d8_flow_length(fdir, mask, (1, 1), 30.0)
    assert lengths.tolist() == [[60.0, 30.0], [30.0, 0.0]]
    fdir = np.array([[2, 4], [1, 0]])  # (0,0) SE diagonal to the outlet
    assert t.d8_flow_length(fdir, mask, (1, 1), 30.0)[0, 0] == pytest.approx(30 * math.sqrt(2))


def test_d8_flow_length_outside_mask_is_missing():
    fdir = np.array([[1, 1, 1]])
    mask = np.array([[True, False, True]])
    lengths = t.d8_flow_length(fdir, mask, (0, 2), 30.0)
    assert np.isnan(lengths[0, 0]) and np.isnan(lengths[0, 1]) and lengths[0, 2] == 0


def test_longest_flow_path():
    length, cell = t.longest_flow_path(np.array([[1.0, np.nan], [5.0, 0.0]]))
    assert length == 5.0 and cell == (1, 0)
    with pytest.raises(ValueError):
        t.longest_flow_path(np.array([[np.nan]]))
