export type Classification =
  | 'PRODUCTIVE'
  | 'NEUTRAL'
  | 'LEISURE'
  | 'UNPRODUCTIVE';

export type ActivityStatus = 'PENDING' | 'RUNNING' | 'COMPLETED';
export type Privacy = 'PUBLIC' | 'PRIVATE';

export const PRODUCTIVITY_CLASSIFICATIONS: Classification[] = [
  'PRODUCTIVE',
  'NEUTRAL',
  'LEISURE',
  'UNPRODUCTIVE',
];

export interface ActivitySummary {
  id: string;
  title: string;
  category: string;
  classification: Classification;
  status: ActivityStatus;
  privacy: Privacy;
  startedAt?: string;
  endedAt?: string;
}
