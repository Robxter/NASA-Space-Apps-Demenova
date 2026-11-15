// Base maps shared by the risk map and Farm setup (block 4). Layer ids, formats, tile matrix sets and dates were checked
// in the GIBS WMTS GetCapabilities on 2026-11-15, and tiles were fetched over the demo farm (z12 x1139 y2086):
// - Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual: jpeg, GoogleMapsCompatible_Level12, latest 2000-12-01;
//   a cloud-free 30 m annual composite. HLS_S30/L30 (30 m, 2026) were tried: only one date since June had data here
//   (2026-11-06) and it was mostly cloud, so the composite is the base that shows the farm area.
// - Reference_Features / Reference_Labels: png, GoogleMapsCompatible_Level9 (roads, coastlines, place names). The *_15m
//   versions returned only empty tiles over El Oro, so the Level9 layers are used, shown up to zoom 11 (beyond that
//   they are blurred 8x; Streets carries roads and names at farm zoom).
// - OpenStreetMap standard tiles (tile.openstreetmap.org) with the visible credit the OSM tile usage policy requires.
import L from 'leaflet';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

export type BaseId = 'satellite' | 'streets' | 'relief' | 'truecolor';

export const SATELLITE_LAYER = 'Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual';
export const SATELLITE_DATE = '2000-12-01';

/** Text for the credit line under the map (dictionary keys and the layer name it shows). */
export function creditKey(id: BaseId): 'map.attribution' | 'map.attribution.streets' | 'map.attribution.satellite' {
  return id === 'streets' ? 'map.attribution.streets' : id === 'satellite' ? 'map.attribution.satellite' : 'map.attribution';
}

export function gibsLayerName(id: BaseId): string {
  if (id === 'satellite') return `Landsat WELD ${SATELLITE_DATE.slice(0, 4)}`;
  if (id === 'truecolor') return 'MODIS_Terra_CorrectedReflectance_TrueColor';
  if (id === 'relief') return 'ASTER_GDEM_Greyscale_Shaded_Relief';
  return '';
}

/** Adds the chosen base (and its overlays) to the map and returns the layers, so the caller can remove them. */
export function addBase(map: L.Map, id: BaseId, date: string | null): L.Layer[] {
  const opts = { maxZoom: 18, crossOrigin: true } as const;
  let layers: L.TileLayer[];
  if (id === 'streets') {
    layers = [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { ...opts, maxNativeZoom: 19 })];
  } else if (id === 'satellite') {
    layers = [
      L.tileLayer(`${GIBS}/${SATELLITE_LAYER}/default/${SATELLITE_DATE}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpg`, {
        ...opts,
        maxNativeZoom: 12,
      }),
      L.tileLayer(`${GIBS}/Reference_Features/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, {
        ...opts,
        maxNativeZoom: 9,
        maxZoom: 11,
      }),
      L.tileLayer(`${GIBS}/Reference_Labels/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, {
        ...opts,
        maxNativeZoom: 9,
        maxZoom: 11,
      }),
    ];
  } else if (id === 'truecolor') {
    layers = [
      L.tileLayer(
        `${GIBS}/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date ?? 'default'}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        { ...opts, maxNativeZoom: 9 },
      ),
    ];
  } else {
    layers = [
      L.tileLayer(`${GIBS}/ASTER_GDEM_Greyscale_Shaded_Relief/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpg`, {
        ...opts,
        maxNativeZoom: 12,
      }),
    ];
  }
  layers.forEach((l, i) => {
    l.addTo(map);
    l.setZIndex(i + 1);
  });
  return layers;
}
