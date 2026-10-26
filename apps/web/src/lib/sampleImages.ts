export interface SampleImagePreset {
  id: string;
  title: string;
  category: string;
  classCode: 'D40' | 'D20' | 'D10' | 'D00';
  url: string;
  roadName: string;
  latitude: string;
  longitude: string;
  description: string;
  tagColor: string;
}

export const SAMPLE_ROAD_PRESETS: SampleImagePreset[] = [
  {
    id: 'sample-pothole-deep',
    title: 'Severe Cavity Pothole (D40)',
    category: 'Pothole',
    classCode: 'D40',
    url: '/samples/sample-pothole-1.jpg',
    roadName: 'Jalna-Aurangabad Expressway KM 14.2',
    latitude: '19.8762',
    longitude: '75.3433',
    description: 'Deep pavement depression with high risk of rim and tire puncture.',
    tagColor: '#ef4444'
  },
  {
    id: 'sample-alligator-mesh',
    title: 'Alligator Fatigue Cracking (D20)',
    category: 'Fatigue Crack',
    classCode: 'D20',
    url: '/samples/sample-alligator-1.jpg',
    roadName: 'Western Corridor Highway Lane 2',
    latitude: '19.8824',
    longitude: '75.3512',
    description: 'Interconnected crocodile-skin mesh pattern caused by repeated wheel loads.',
    tagColor: '#f59e0b'
  },
  {
    id: 'sample-transverse-thermal',
    title: 'Transverse Thermal Fracture (D10)',
    category: 'Transverse Crack',
    classCode: 'D10',
    url: '/samples/sample-transverse-1.jpg',
    roadName: 'Ring Road Northern Bypass',
    latitude: '19.8691',
    longitude: '75.3370',
    description: 'Perpendicular linear fracture caused by thermal contraction across road width.',
    tagColor: '#06b6d4'
  },
  {
    id: 'sample-pothole-urban',
    title: 'Arterial Road Pothole (D40)',
    category: 'Pothole',
    classCode: 'D40',
    url: '/samples/sample-pothole-2.jpg',
    roadName: 'Industrial Area Sector 5 Road',
    latitude: '19.8915',
    longitude: '75.3618',
    description: 'Surface crater requiring immediate cold-mix / hot-mix patch backfill.',
    tagColor: '#ef4444'
  },
  {
    id: 'sample-clean-control',
    title: 'Resurfaced Asphalt Road (D00 / Control)',
    category: 'Linear Joint',
    classCode: 'D00',
    url: '/samples/sample-clean-road.jpg',
    roadName: 'Central Boulevard Parkway',
    latitude: '19.8730',
    longitude: '75.3490',
    description: 'Recently resurfaced roadway corridor with minor longitudinal center joint.',
    tagColor: '#3b82f6'
  },
  {
    id: 'sample-road-fissure',
    title: 'Severe Road Fissure & Joint Crack (D00)',
    category: 'Longitudinal Crack',
    classCode: 'D00',
    url: '/samples/sample-longitudinal-crack.webp',
    roadName: 'Rural Highway Lane Section B',
    latitude: '19.8845',
    longitude: '75.3478',
    description: 'Major longitudinal asphalt rupture spanning through lane markings, with distant pothole.',
    tagColor: '#3b82f6'
  }
];

