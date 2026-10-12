import type { Media } from './media';

export type EventCategory = 'BIRTH' | 'BAPTISM' | 'SCHOOL_START' | 'WEDDING' | 'OCCUPATION' | 'MOVE' | 'DEATH' | 'OTHER';

export interface TimelineEvent {
  id: string;
  personId: string;
  date?: string | null;
  datePrecision?: string | null;
  title: string;
  category: EventCategory;
  description?: string | null;
  place?: string | null;
  sortOrder?: number | null;
  createdAt: string;
  updatedAt: string;
  /** Linked files – also media of other persons */
  media?: Media[];
}

export interface EventInput {
  personId: string;
  date?: string;
  datePrecision?: string;
  title: string;
  category: string;
  description?: string;
  place?: string;
  sortOrder?: number;
  mediaIds?: string[];
}

/** The person of an event cannot be changed */
export type UpdateEventInput = Omit<EventInput, 'personId'>;
