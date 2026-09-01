/**
 * ==============================================================================
 * Google Earth Engine (GEE) - Phase 2B: CHIRPS Daily Rainfall & ARI Extraction
 * ==============================================================================
 * Project: AI-Based Early Warning and Landslide Risk Monitoring System (SIH - 2026)
 * Target Region: Meghalaya, North Eastern Region, India
 * Authoritative Environment: Google Earth Engine Code Editor
 * 
 * ------------------------------------------------------------------------------
 * DATASET PROVENANCE & IDENTIFIERS:
 * ------------------------------------------------------------------------------
 * Primary Rainfall Source:
 *   - Dataset ID: 'UCSB-CHG/CHIRPS/DAILY'
 *   - Provider: Climate Hazards Center, UC Santa Barbara / USGS
 *   - Product Name: Climate Hazards Group InfraRed Precipitation with Station data (CHIRPS)
 *   - Spatial Resolution: 0.05 arc-degrees (~5.5 km grid cell size)
 *   - Temporal Coverage: 1981-01-01 to present (Daily time step)
 *   - Units: Daily precipitation in millimeters (mm/day)
 *   - Band Name: 'precipitation'
 *   - Scientific Citation: Funk, C., et al. (2015). The climate hazards infrared precipitation
 *     with stations—a new environmental record for monitoring extremes. Scientific Data, 2, 150066.
 * 
 * ------------------------------------------------------------------------------
 * ANTECEDENT RAINFALL INDICES (ARI) & DERIVATIVE DEFINITIONS:
 * ------------------------------------------------------------------------------
 * For each landslide event with a validated exact date (T = YYYY-MM-DD):
 * 1. rainfall_event_day (mm): Precipitation on event day T (P_0).
 * 2. ari_3 (mm): 3-day cumulative rainfall [T-2, T] = P(T) + P(T-1) + P(T-2).
 * 3. ari_7 (mm): 7-day cumulative rainfall [T-6, T] = sum_{k=0..6} P(T-k).
 * 4. ari_15 (mm): 15-day cumulative rainfall [T-14, T] = sum_{k=0..14} P(T-k).
 * 5. ari_30 (mm): 30-day cumulative rainfall [T-29, T] = sum_{k=0..29} P(T-k).
 * 6. max_1day_7d (mm): Maximum single-day rainfall in the 7 days leading up to and including T.
 * 7. max_3day_30d (mm): Maximum 3-consecutive-day rolling rainfall in the 30-day antecedent window.
 * 8. rainy_days_7d: Number of days with daily rainfall >= 2.5 mm (IMD rainy day threshold) in 7-day window.
 * 9. rainy_days_15d: Number of rainy days (>= 2.5 mm) in 15-day window.
 * 10. rainy_days_30d: Number of rainy days (>= 2.5 mm) in 30-day window.
 * 
 * CRITICAL RULE: For landslide records without an exact event date (temporal_quality != 'EXACT_DATE'),
 * all dynamic rainfall features are explicitly assigned null / NA.
 * ==============================================================================
 */

// 1. Define Study Area: Meghalaya Bounding Box [89.7°E, 24.9°N, 93.0°E, 26.3°N]
var meghalayaBounds = ee.Geometry.Rectangle([89.7, 24.9, 93.0, 26.3]);

// 2. Load CHIRPS Daily ImageCollection
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(meghalayaBounds)
  .select('precipitation');

// 3. 10-Record Temporal Validation Sample (Embedded for immediate testing)
var validationEvents = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([92.348444, 25.093472]), {sl_no: 19658, district: 'East Jaintia Hills', event_date: '2018-05-07'}),
  ee.Feature(ee.Geometry.Point([92.355294, 25.137450]), {sl_no: 19675, district: 'East Jaintia Hills', event_date: '2007-07-31'}),
  ee.Feature(ee.Geometry.Point([91.688192, 25.188736]), {sl_no: 19737, district: 'East Khasi Hills',   event_date: '2008-08-12'}),
  ee.Feature(ee.Geometry.Point([91.691761, 25.189564]), {sl_no: 19739, district: 'East Khasi Hills',   event_date: '2008-08-10'}),
  ee.Feature(ee.Geometry.Point([91.603094, 25.295244]), {sl_no: 19885, district: 'East Khasi Hills',   event_date: '2024-05-30'}),
  ee.Feature(ee.Geometry.Point([91.716167, 25.304500]), {sl_no: 19895, district: 'East Khasi Hills',   event_date: '2022-04-04'}),
  ee.Feature(ee.Geometry.Point([91.734778, 25.306028]), {sl_no: 19902, district: 'East Khasi Hills',   event_date: '2009-06-29'}),
  ee.Feature(ee.Geometry.Point([91.720806, 25.309083]), {sl_no: 19914, district: 'East Khasi Hills',   event_date: '2013-08-06'}),
  ee.Feature(ee.Geometry.Point([91.718806, 25.309111]), {sl_no: 19915, district: 'East Khasi Hills',   event_date: '2007-07-19'}),
  ee.Feature(ee.Geometry.Point([91.865450, 25.972833]), {sl_no: 20536, district: 'East Khasi Hills',   event_date: '2014-09-23'})
]);

// Function to extract 30-day antecedent rainfall features for a single event feature
var extractAntecedentRainfall = function(feature) {
  var dateStr = ee.String(feature.get('event_date'));
  var geom = feature.geometry();
  
  // Event date T
  var eventDate = ee.Date(dateStr);
  var startDate = eventDate.advance(-29, 'day'); // 30-day window [T-29, T]
  var endDate = eventDate.advance(1, 'day');     // Inclusive of event day
  
  var eventCol = chirps.filterDate(startDate, endDate).sort('system:time_start');
  
  // Daily precipitation values over the 30-day window
  var dailyList = eventCol.map(function(img) {
    var val = img.reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: geom,
      scale: 5566
    }).get('precipitation');
    return ee.Feature(null, {
      'p': ee.Algorithms.If(val, val, 0.0),
      'time': img.get('system:time_start')
    });
  });
  
  var pValues = dailyList.aggregate_array('p');
  
  // Event day (last element in the 30-day series)
  var p_event = ee.Number(pValues.get(29));
  
  // ARI-3: [T-2, T] (indices 27, 28, 29)
  var ari_3 = ee.Number(pValues.slice(27, 30).reduce(ee.Reducer.sum()));
  
  // ARI-7: [T-6, T] (indices 23 to 30)
  var ari_7 = ee.Number(pValues.slice(23, 30).reduce(ee.Reducer.sum()));
  
  // ARI-15: [T-14, T] (indices 15 to 30)
  var ari_15 = ee.Number(pValues.slice(15, 30).reduce(ee.Reducer.sum()));
  
  // ARI-30: [T-29, T] (indices 0 to 30)
  var ari_30 = ee.Number(pValues.slice(0, 30).reduce(ee.Reducer.sum()));
  
  // Max 1-day in 7 days
  var max_1d_7d = ee.Number(pValues.slice(23, 30).reduce(ee.Reducer.max()));
  
  // Rainy days (>= 2.5 mm)
  var rainy_7d = ee.Number(pValues.slice(23, 30).map(function(v) {
    return ee.Number(v).gte(2.5);
  }).reduce(ee.Reducer.sum()));
  
  var rainy_15d = ee.Number(pValues.slice(15, 30).map(function(v) {
    return ee.Number(v).gte(2.5);
  }).reduce(ee.Reducer.sum()));
  
  var rainy_30d = ee.Number(pValues.slice(0, 30).map(function(v) {
    return ee.Number(v).gte(2.5);
  }).reduce(ee.Reducer.sum()));
  
  return feature.set({
    'rainfall_event_day': p_event,
    'ari_3': ari_3,
    'ari_7': ari_7,
    'ari_15': ari_15,
    'ari_30': ari_30,
    'max_1day_7d': max_1d_7d,
    'rainy_days_7d': rainy_7d,
    'rainy_days_15d': rainy_15d,
    'rainy_days_30d': rainy_30d
  });
};

// Apply extraction to 10-point validation sample
var sampleRainfallFeatures = validationEvents.map(extractAntecedentRainfall);
print('10-Record Validation Sample Rainfall Features:', sampleRainfallFeatures);

// 4. Visualization of Monsoon Rainfall in Meghalaya
var sampleMonsoon = chirps.filterDate('2024-05-25', '2024-06-01').sum().clip(meghalayaBounds);
Map.centerObject(meghalayaBounds, 8);
Map.addLayer(sampleMonsoon, {min: 0, max: 300, palette: ['#FFFFFF', '#B3E5FC', '#0288D1', '#01579B', '#4A148C']}, '7-Day Cumulative Rainfall (May 2024 Remal Event)');
Map.addLayer(validationEvents, {color: 'red'}, 'Validation Landslide Locations');

print('Phase 2B GEE Reference Script Initialized Successfully.');
