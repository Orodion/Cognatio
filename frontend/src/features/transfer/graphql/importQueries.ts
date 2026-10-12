import { gql } from '@apollo/client';

/** Previous imports (version history), newest first */
export const IMPORT_HISTORY = gql`
  query ImportHistory($limit: Int) {
    importHistory(limit: $limit) {
      id
      importedAt
      fileName
      kind
      source
      exportedAt
      strategy
      createdPersons
      updatedPersons
      removedPersons
      recognizedPersons
      createdRelations
      createdEvents
      createdNotes
      createdMedia
      missingFiles
    }
  }
`;
