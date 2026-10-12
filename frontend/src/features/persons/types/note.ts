export interface PersonNote {
  id: string;
  personId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  personId: string;
  text: string;
}

/** The person of a note cannot be changed */
export type UpdateNoteInput = Omit<NoteInput, 'personId'>;
