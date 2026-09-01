import { CorridorScenario } from './types';

export const FROZEN_COUPLING_THRESHOLD = 0.0502;
export const STATIC_TERRAIN_SAFETY_FLOOR = 0.1500;
export const THRESHOLD_YELLOW_ORANGE = 0.1500;
export const THRESHOLD_ORANGE_RED = 0.3500;

export const MEGHALAYA_CENTER: [number, number] = [25.5788, 91.5000];
export const MEGHALAYA_BOUNDS: [[number, number], [number, number]] = [
  [25.0201, 89.8005],
  [26.0998, 92.8456]
];

export const SPATIAL_BLOCKS = [
  'All Blocks',
  'East Khasi Block',
  'Jaintia Hills Block',
  'Ri-Bhoi Block',
  'West Khasi Block',
  'Garo Hills Block'
];

export const ALERT_TIERS = [
  'All Tiers',
  'Level 1: Green',
  'Level 2: Yellow',
  'Level 3: Orange',
  'Level 4: Red'
];

export const CORRIDOR_DATA: CorridorScenario[] = [
  {
    corridor_id: 'C-01',
    corridor_name: 'Guwahati – Shillong Highway',
    route_code: 'NH-40',
    distance_km: 103,
    static_susceptibility: 0.58,
    dry_risk: 0.0232,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.3645,
    monsoon_tier: 'Level 4: Red',
    cloudburst_risk: 0.5220,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'High volume transport artery; steep road cut slopes along Umtyngar & Nongpoh passes.'
  },
  {
    corridor_id: 'C-02',
    corridor_name: 'Shillong – Silchar Arterial Route',
    route_code: 'NH-44 / NH-6',
    distance_km: 215,
    static_susceptibility: 0.65,
    dry_risk: 0.0260,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.4085,
    monsoon_tier: 'Level 4: Red',
    cloudburst_risk: 0.5850,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'Key link to Barak Valley; heavily fractured sandstone & deep shale colluvium near Sonapur tunnel.'
  },
  {
    corridor_id: 'C-03',
    corridor_name: 'Shillong – Sohra (Cherrapunji) Gorge Route',
    route_code: 'SH-5',
    distance_km: 54,
    static_susceptibility: 0.72,
    dry_risk: 0.0288,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.4524,
    monsoon_tier: 'Level 4: Red',
    cloudburst_risk: 0.6480,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'Extreme orographic precipitation zone; vertical limestone-sandstone escarpments prone to debris avalanches.'
  },
  {
    corridor_id: 'C-04',
    corridor_name: 'Tura – Williamnagar Connector',
    route_code: 'SH-12',
    distance_km: 76,
    static_susceptibility: 0.38,
    dry_risk: 0.0152,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.2388,
    monsoon_tier: 'Level 3: Orange',
    cloudburst_risk: 0.3420,
    cloudburst_tier: 'Level 3: Orange',
    critical_vulnerability: 'Garo Hills undulating lateritic terrain; drainage culvert overflow and shallow translational slips.'
  },
  {
    corridor_id: 'C-05',
    corridor_name: 'Nongstoin – Mawkyrwat Spur Route',
    route_code: 'MDR-22',
    distance_km: 48,
    static_susceptibility: 0.44,
    dry_risk: 0.0176,
    dry_tier: 'Level 1: Green',
    monsoon_risk: 0.2765,
    monsoon_tier: 'Level 3: Orange',
    cloudburst_risk: 0.3960,
    cloudburst_tier: 'Level 4: Red',
    critical_vulnerability: 'West Khasi Plateau ridge; weathered granitic gneiss saprolite vulnerable during sustained saturation.'
  }
];
