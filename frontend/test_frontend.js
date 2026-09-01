// Automated frontend unit and integration tests for SIH 2026 Section 36
const fs = require('fs');
const path = require('path');

console.log('================================================================================');
console.log('RUNNING SECTION 36 FRONTEND AUTOMATED TEST SUITE');
console.log('================================================================================');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Verify GeoJSON deliverable in public/data/
const geojsonPath = path.join(__dirname, 'public', 'data', 'regional_risk_surface.geojson');
assert(fs.existsSync(geojsonPath), 'Section 34 GeoJSON surface exists in public/data/');

const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
assert(geojson.type === 'FeatureCollection', 'GeoJSON has FeatureCollection type');
assert(Array.isArray(geojson.features) && geojson.features.length === 3156, `GeoJSON contains 3,156 spatial cells (found: ${geojson.features?.length})`);

// 2. Verify Feature Properties Schema
const feat0 = geojson.features[0];
assert(feat0.geometry && feat0.geometry.coordinates.length === 2, 'Feature contains valid [lon, lat] coordinates');
assert(typeof feat0.properties.p_static === 'number', 'Feature contains p_static number');
assert(typeof feat0.properties.p_dynamic === 'number', 'Feature contains p_dynamic number');
assert(typeof feat0.properties.coupled_risk === 'number', 'Feature contains coupled_risk number');
assert(typeof feat0.properties.alert_level === 'string', 'Feature contains alert_level string');

// 3. Verify Coupling Logic: Risk = P(S) * P(D)
let formulaMatches = 0;
for (let i = 0; i < 50; i++) {
  const p = geojson.features[i].properties;
  const expectedRisk = p.p_static * p.p_dynamic;
  if (Math.abs(p.coupled_risk - expectedRisk) < 0.0001) {
    formulaMatches++;
  }
}
assert(formulaMatches === 50, 'Multiplicative coupling equation Risk = P(S) * P(D) verified across sample cells');

// 4. Verify Alert Tiers
const tiers = new Set(geojson.features.map(f => f.properties.alert_level));
assert(tiers.has('Level 1: Green'), 'Contains Level 1: Green tier');
assert(tiers.has('Level 2: Yellow'), 'Contains Level 2: Yellow tier');
assert(tiers.has('Level 3: Orange'), 'Contains Level 3: Orange tier');
assert(tiers.has('Level 4: Red'), 'Contains Level 4: Red tier');

// 5. Verify Frontend App Router Pages
const appDir = path.join(__dirname, 'app');
assert(fs.existsSync(path.join(appDir, 'page.tsx')), 'Dashboard page (app/page.tsx) exists');
assert(fs.existsSync(path.join(appDir, 'analytics', 'page.tsx')), 'Analytics page (app/analytics/page.tsx) exists');
assert(fs.existsSync(path.join(appDir, 'infrastructure', 'page.tsx')), 'Infrastructure page (app/infrastructure/page.tsx) exists');
assert(fs.existsSync(path.join(appDir, 'methodology', 'page.tsx')), 'Methodology page (app/methodology/page.tsx) exists');
assert(fs.existsSync(path.join(appDir, 'about', 'page.tsx')), 'About page (app/about/page.tsx) exists');

console.log('\n================================================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} tests passed cleanly.`);
console.log('================================================================================');
