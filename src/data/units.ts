export interface Unit {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  floorPlanImage: string;
  description: string;
}

export const units: Unit[] = [
  {
    id: 'unit-108',
    name: 'Unit 108',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 564,
    floorPlanImage: '/images/floor-plans/401-W-Ontario-1-Bed-Floor-Plan-108.png',
    description: 'Efficient one-bedroom with open living area and exposed timber ceilings.',
  },
  {
    id: 'unit-111',
    name: 'Unit 111',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 614,
    floorPlanImage: '/images/floor-plans/401-W-Ontario-1-Bed-Floor-Plan-Unit-111.png',
    description: 'Spacious one-bedroom featuring arched windows and original brick walls.',
  },
  {
    id: 'unit-202',
    name: 'Unit 202',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 819,
    floorPlanImage: '/images/floor-plans/401-W-Ontario-2-Bed-Floor-Plan-Unit-202.png',
    description: 'Corner two-bedroom with dual exposures and heavy timber beams throughout.',
  },
];
