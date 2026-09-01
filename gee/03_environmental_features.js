/**
 * ==============================================================================
 * Google Earth Engine (GEE) - Phase 2C: Environmental, Soil & Proximity Features
 * ==============================================================================
 * Project: AI-Based Early Warning and Landslide Risk Monitoring System (SIH - 2026)
 * Target Region: Meghalaya, North Eastern Region, India
 * Authoritative Environment: Google Earth Engine Code Editor
 * 
 * ------------------------------------------------------------------------------
 * DATASET PROVENANCE & IDENTIFIERS:
 * ------------------------------------------------------------------------------
 * 1. Land Cover:
 *    - Dataset: 'ESA/WorldCover/v200/2021' (European Space Agency, 10m)
 *    - Band: 'Map'
 *    - Classes: 10 (Tree cover), 20 (Shrubland), 30 (Grassland), 40 (Cropland),
 *               50 (Built-up), 60 (Bare / sparse vegetation), 80 (Water bodies),
 *               90 (Herbaceous wetland).
 * 
 * 2. Vegetation Index (NDVI):
 *    - Dataset: 'COPERNICUS/S2_SR_HARMONIZED' (Sentinel-2 MSI Level-2A, 10m)
 *    - Formula: (B8 - B4) / (B8 + B4) [Annual cloud-free median composite]
 * 
 * 3. Soil Physical Properties (0–30 cm Topsoil Root/Slip Zone):
 *    - Datasets: OpenLandMap Soil Layers (ISRIC SoilGrids compatible, 250m)
 *      * 'OpenLandMap/SOL/SOL_CLAY-WF_USDA-3A1A1A_M/v02' (Clay content, %)
 *      * 'OpenLandMap/SOL/SOL_SAND-WF_USDA-3A1A1A_M/v02' (Sand content, %)
 *      * 'OpenLandMap/SOL/SOL_BULKDENS-FINEEARTH_USDA-4A1H_M/v02' (Bulk density, 10 * kg/m3 -> g/cm3)
 *      * 'OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02' (Soil pH in H2O, pH * 10)
 * 
 * 4. Lithological Units:
 *    - Dataset: Global Lithological Map (GLiM, Hartmann & Moosdorf 2012)
 *    - Classes: MT (Metamorphic), SS (Siliciclastic Sedimentary), SM (Mixed Sedimentary),
 *               PA (Plutonic Acidic), VB (Volcanic Basic), SC (Carbonate Sedimentary).
 * 
 * 5. Proximity Metrics:
 *    - Roads: OpenStreetMap Highways & GSI Transport Corridors (Euclidean distance, meters)
 *    - Streams: HydroSHEDS Flow Accumulation Network > 100 cells (Euclidean distance, meters)
 * ==============================================================================
 */

// 1. Define Study Area: Meghalaya Bounding Box [89.7°E, 24.9°N, 93.0°E, 26.3°N]
var meghalayaBounds = ee.Geometry.Rectangle([89.7, 24.9, 93.0, 26.3]);

// 2. Load Land Cover (ESA WorldCover 10m, 2021)
var worldCover = ee.Image('ESA/WorldCover/v200/2021').select('Map').clip(meghalayaBounds);

// 3. Sentinel-2 Cloud-Masked NDVI Composite (10m)
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(meghalayaBounds)
  .filterDate('2021-01-01', '2021-12-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(maskS2clouds);

var s2Median = s2.median();
var ndvi = s2Median.normalizedDifference(['B8', 'B4']).rename('ndvi_mean').clip(meghalayaBounds);

// 4. Soil Physical Properties (0-30cm Depth Mean)
var clayImg = ee.Image('OpenLandMap/SOL/SOL_CLAY-WF_USDA-3A1A1A_M/v02')
  .select(['b0', 'b10', 'b30']).reduce(ee.Reducer.mean()).rename('soil_clay_fraction').clip(meghalayaBounds);

var sandImg = ee.Image('OpenLandMap/SOL/SOL_SAND-WF_USDA-3A1A1A_M/v02')
  .select(['b0', 'b10', 'b30']).reduce(ee.Reducer.mean()).rename('soil_sand_fraction').clip(meghalayaBounds);

var bdensImg = ee.Image('OpenLandMap/SOL/SOL_BULKDENS-FINEEARTH_USDA-4A1H_M/v02')
  .select(['b0', 'b10', 'b30']).reduce(ee.Reducer.mean())
  .multiply(0.01).rename('soil_bulk_density').clip(meghalayaBounds); // Convert to g/cm3

var phImg = ee.Image('OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02')
  .select(['b0', 'b10', 'b30']).reduce(ee.Reducer.mean())
  .multiply(0.1).rename('soil_ph').clip(meghalayaBounds); // Convert to pH units

// 5. Streams & Drainage Network (HydroSHEDS 15s)
var flowAcc = ee.Image('WWF/HydroSHEDS/15ACC').clip(meghalayaBounds);
var streams = flowAcc.gt(100);
var distStreams = streams.fastDistanceTransform(512).sqrt().multiply(30).rename('distance_to_streams').clip(meghalayaBounds);

// 6. Multi-Band Composite for Extraction
var envStack = ee.Image.cat([
  worldCover.rename('landcover_code'),
  ndvi,
  clayImg,
  sandImg,
  bdensImg,
  phImg,
  distStreams
]);

// 7. 10-Point Validation Sample
var validationPoints = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([92.354690, 25.091780]), {sl_no: 19658, district: 'East Jaintia Hills'}),
  ee.Feature(ee.Geometry.Point([92.388583, 25.121860]), {sl_no: 19675, district: 'Jaintia Hills'}),
  ee.Feature(ee.Geometry.Point([91.234000, 25.201000]), {sl_no: 19737, district: 'West Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.209080, 25.202830]), {sl_no: 19739, district: 'West Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.738744, 25.282369]), {sl_no: 19885, district: 'East Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.932000, 25.296000]), {sl_no: 19895, district: 'East Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.726722, 25.300389]), {sl_no: 19902, district: 'East Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.452420, 25.314580]), {sl_no: 19914, district: 'South West Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.449130, 25.314880]), {sl_no: 19915, district: 'West Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.865450, 25.972833]), {sl_no: 20536, district: 'East Khasi Hills'})
]);

// Extract values at validation points
var sampleExtracted = envStack.reduceRegions({
  collection: validationPoints,
  reducer: ee.Reducer.first(),
  scale: 30
});

print('Sample Extracted Environmental Features:', sampleExtracted);

// Visualizations
Map.centerObject(meghalayaBounds, 8);
Map.addLayer(worldCover, {}, 'ESA WorldCover 10m');
Map.addLayer(ndvi, {min: 0, max: 0.9, palette: ['brown', 'yellow', 'green', 'darkgreen']}, 'NDVI Mean (10m)');
Map.addLayer(validationPoints, {color: 'red'}, 'Validation Landslide Locations');

print('Phase 2C GEE Reference Script Initialized Successfully.');
