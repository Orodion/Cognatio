import { FORMAT_NAME, FORMAT_VERSION, type TransferData, type TransferPerson, type TransferRelation } from '../lib/transfer/format.js';

export const T1 = '2026-01-01T10:00:00.000Z';
export const T2 = '2026-06-01T10:00:00.000Z';

export function person(id: string, overrides: Partial<TransferPerson> = {}): TransferPerson {
  return {
    id,
    firstName: id,
    lastName: 'Muster',
    gender: 'UNKNOWN',
    languages: [],
    isDeleted: false,
    createdAt: T1,
    updatedAt: T1,
    events: [],
    notes: [],
    media: [],
    ...overrides,
  };
}

export function relation(id: string, personAId: string, personBId: string, type: string, overrides: Partial<TransferRelation> = {}): TransferRelation {
  return { id, personAId, personBId, type, active: true, createdAt: T1, updatedAt: T1, ...overrides };
}

export function transfer(persons: TransferPerson[], relations: TransferRelation[] = []): TransferData {
  return { format: FORMAT_NAME, version: FORMAT_VERSION, exportedAt: T2, persons, relations };
}
