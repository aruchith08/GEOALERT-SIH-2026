/**
 * ==============================================================================
 * Google Earth Engine (GEE) - Phase 2A: SRTM Terrain Feature Extraction
 * ==============================================================================
 * Project: AI-Based Early Warning and Landslide Risk Monitoring System (SIH - 2026)
 * Target Region: Meghalaya, North Eastern Region, India
 * Authoritative Environment: Google Earth Engine Code Editor
 * 
 * ------------------------------------------------------------------------------
 * DATASET PROVENANCE & IDENTIFIERS:
 * ------------------------------------------------------------------------------
 * 1. Primary DEM Source:
 *    - Dataset ID: 'USGS/SRTMGL1_003'
 *    - Dataset Name: NASA / USGS Shuttle Radar Topography Mission (SRTM) Global 1-Arcsecond
 *    - Spatial Resolution: 1 arc-second (~30 meters at equator)
 *    - Vertical Datum: EGM96 Geoid (Elevation in meters above Mean Sea Level)
 *    - Horizontal Datum: WGS84 (EPSG:4326)
 * 
 * 2. Hydrological Drainage & Flow Accumulation:
 *    - Dataset ID: 'WWF/HydroSHEDS/15ACC'
 *    - Dataset Name: World Wildlife Fund (WWF) HydroSHEDS Flow Accumulation 15-Arcsecond
 *    - Spatial Resolution: 15 arc-seconds (~450 meters)
 *    - Purpose: Regional upstream drainage area modeling for Topographic Wetness Index (TWI)
 *      and Stream Power Index (SPI).
 * 
 * ------------------------------------------------------------------------------
 * DERIVED TERRAIN ATTRIBUTES (19-COLUMN FINAL SCHEMA):
 * ------------------------------------------------------------------------------
 * 1. elevation (m): Orthometric height above MSL from SRTM 30m grid.
 * 2. slope (deg): Topographic gradient in degrees [0 - 90°] (Horn 1981 / Zevenbergen-Thorne 1987).
 * 3. aspect (deg): Downslope direction in degrees [0 - 360°] clockwise from North (0°=N, 90°=E, 180°=S, 270°=W).
 *    Flat cells (slope < 0.1°) are assigned -1 or NA.
 * 4. plan_curvature (1/m): Contour line curvature (horizontal plane) measuring flow convergence/divergence.
 *    Negative = Convergent (valleys), Positive = Divergent (ridges).
 * 5. profile_curvature (1/m): Curvature along the steepest slope line (vertical plane) measuring flow acceleration.
 *    Negative = Decelerating, Positive = Accelerating.
 * 6. twi (dimensionless): Topographic Wetness Index = ln(As / tan(beta)), where As is Specific Catchment Area (m).
 * 7. spi (m): Stream Power Index = As * tan(beta).
 * ==============================================================================
 */

// 1. Define Study Area: Meghalaya Bounding Box [89.7°E, 24.9°N, 93.0°E, 26.3°N]
var meghalayaBounds = ee.Geometry.Rectangle([89.7, 24.9, 93.0, 26.3]);

// 2. Load 30m SRTM DEM
var srtm = ee.Image('USGS/SRTMGL1_003').clip(meghalayaBounds);
var elevation = srtm.select('elevation');

// 3. Compute Core Terrain Features (Slope & Aspect)
var terrain = ee.Terrain.products(elevation);
var slope = terrain.select('slope');   // in degrees [0 - 90]
var aspect = terrain.select('aspect'); // in degrees [0 - 360 clockwise from North]

// Slope in radians for trigonometric expressions
var slopeRad = slope.multiply(Math.PI / 180.0);
var tanSlope = slopeRad.tan().max(0.001); // Clamp to prevent division-by-zero on flat terrain

// 4. Compute High-Order Terrain Curvatures (Zevenbergen & Thorne, 1987)
var cellResolution = 30.0; // Nominal 30m cell width

// First-order partial derivative finite-difference kernels (Horn 1981 / Zevenbergen-Thorne 1987)
var k_dx = ee.Kernel.fixed(3, 3, [
  [-1/60, 0, 1/60],
  [-2/60, 0, 2/60],
  [-1/60, 0, 1/60]
]);

var k_dy = ee.Kernel.fixed(3, 3, [
  [ 1/60,  2/60,  1/60],
  [    0,     0,     0],
  [-1/60, -2/60, -1/60]
]);

// Second-order partial derivative kernels: z_xx, z_yy, z_xy
var k_dxx = ee.Kernel.fixed(3, 3, [
  [1/900, -2/900, 1/900],
  [1/900, -2/900, 1/900],
  [1/900, -2/900, 1/900]
]);

var k_dyy = ee.Kernel.fixed(3, 3, [
  [ 1/900,  1/900,  1/900],
  [-2/900, -2/900, -2/900],
  [ 1/900,  1/900,  1/900]
]);

var k_dxy = ee.Kernel.fixed(3, 3, [
  [-1/3600, 0,  1/3600],
  [      0, 0,       0],
  [ 1/3600, 0, -1/3600]
]);

var p = elevation.convolve(k_dx);  // dz/dx
var q = elevation.convolve(k_dy);  // dz/dy
var r = elevation.convolve(k_dxx); // d2z/dx2
var t = elevation.convolve(k_dyy); // d2z/dy2
var s = elevation.convolve(k_dxy); // d2z/dxdy

var p2 = p.multiply(p);
var q2 = q.multiply(q);
var p2_plus_q2 = p2.add(q2).max(0.000001);

// Plan Curvature: K_plan = -(q^2*r - 2*p*q*s + p^2*t) / (p^2 + q^2)^(1.5)
var planCurvatureNum = q2.multiply(r).subtract(p.multiply(q).multiply(s).multiply(2)).add(p2.multiply(t));
var planCurvatureDenom = p2_plus_q2.pow(1.5);
var planCurvature = planCurvatureNum.divide(planCurvatureDenom).multiply(-1).rename('plan_curvature');

// Profile Curvature: K_prof = -(p^2*r + 2*p*q*s + q^2*t) / ((p^2 + q^2) * (1 + p^2 + q^2)^(1.5))
var profCurvatureNum = p2.multiply(r).add(p.multiply(q).multiply(s).multiply(2)).add(q2.multiply(t));
var profCurvatureDenom = p2_plus_q2.multiply(p2_plus_q2.add(1.0).pow(1.5));
var profileCurvature = profCurvatureNum.divide(profCurvatureDenom).multiply(-1).rename('profile_curvature');

// 5. Compute Hydrological Indices (TWI & SPI)
// HydroSHEDS 15-arcsec Flow Accumulation (Number of upstream cells)
var flowAcc = ee.Image('WWF/HydroSHEDS/15ACC').clip(meghalayaBounds).resample('bilinear');

// Specific Contributing Area (As = (Accumulation + 1) * cell_width in meters)
var sca = flowAcc.add(1.0).multiply(cellResolution);

// Topographic Wetness Index (TWI) = ln(As / tan(beta))
var twi = sca.divide(tanSlope).log().rename('twi');

// Stream Power Index (SPI) = As * tan(beta)
var spi = sca.multiply(tanSlope).rename('spi');

// 6. Multi-Band Composite
var terrainStack = ee.Image.cat([
  elevation.rename('elevation'),
  slope.rename('slope'),
  aspect.rename('aspect'),
  planCurvature,
  profileCurvature,
  twi,
  spi
]);

// 7. Visualisation in GEE Code Editor
Map.centerObject(meghalayaBounds, 9);
Map.addLayer(elevation, {min: 0, max: 2000, palette: ['#0000FF', '#00FF00', '#FFFF00', '#FF0000', '#FFFFFF']}, 'Elevation (m)');
Map.addLayer(slope, {min: 0, max: 60, palette: ['#FFFFFF', '#FFE082', '#FF9800', '#D32F2F']}, 'Slope (deg)');
Map.addLayer(twi, {min: 2, max: 15, palette: ['#795548', '#FFEB3B', '#00E5FF', '#0D47A1']}, 'TWI');

// 8. 10-Point Validation Sample (Embedded for immediate interactive testing)
var samplePoints = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([92.435539, 25.033514]), {sl_no: 19606, district: 'East Jaintia Hills'}),
  ee.Feature(ee.Geometry.Point([92.359361, 25.079722]), {sl_no: 19650, district: 'East Jaintia Hills'}),
  ee.Feature(ee.Geometry.Point([91.738980, 25.206686]), {sl_no: 19750, district: 'East Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.671435, 25.247226]), {sl_no: 19850, district: 'East Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([92.584900, 25.343939]), {sl_no: 19950, district: 'East Jaintia Hills'}),
  ee.Feature(ee.Geometry.Point([92.181278, 25.426306]), {sl_no: 20050, district: 'West Jaintia Hills'}),
  ee.Feature(ee.Geometry.Point([92.102033, 25.544506]), {sl_no: 20150, district: 'East Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.178200, 25.599575]), {sl_no: 20250, district: 'West Khasi Hills'}),
  ee.Feature(ee.Geometry.Point([91.915944, 25.663444]), {sl_no: 20350, district: 'Ri-Bhoi'}),
  ee.Feature(ee.Geometry.Point([91.865450, 25.972833]), {sl_no: 20536, district: 'East Khasi Hills'})
]);

var sampled10 = terrainStack.reduceRegions({
  collection: samplePoints,
  reducer: ee.Reducer.first(),
  scale: 30
});

print('10-Point Validation Sample Results:', sampled10);

// 9. Full Dataset Extraction Workflow (for uploaded GSI Meghalaya Asset)
/*
var meghalayaLandslides = ee.FeatureCollection('projects/your-project/assets/meghalaya_landslides');

var fullSampled = terrainStack.reduceRegions({
  collection: meghalayaLandslides,
  reducer: ee.Reducer.first(),
  scale: 30
});

Export.table.toDrive({
  collection: fullSampled,
  description: 'meghalaya_terrain_features',
  fileFormat: 'CSV'
});
*/

print('Phase 2A Reference Script Initialized Successfully.');
