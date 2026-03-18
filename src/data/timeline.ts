export interface Milestone {
  date: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export const milestones: Milestone[] = [
  {
    date: '2025',
    title: 'Design & Planning',
    description: 'Architectural plans developed honoring the 1905 heritage.',
    status: 'completed',
  },
  {
    date: 'Early 2026',
    title: 'Permits & Approvals',
    description: 'Historic preservation review and building permits secured.',
    status: 'current',
  },
  {
    date: 'Oct 2026',
    title: 'Construction Begins',
    description: 'Adaptive reuse construction commences on the landmark building.',
    status: 'upcoming',
  },
  {
    date: 'Oct 2027',
    title: 'First Deliveries',
    description: 'Residents move into their new loft homes in River North.',
    status: 'upcoming',
  },
];
