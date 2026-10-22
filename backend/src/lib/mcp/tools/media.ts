import { z } from 'zod';
import { MEDIA_TYPES, storeMedia } from '../../files/storeMedia.js';
import { copyIntoUploads, readableFile } from '../../files/localFiles.js';
import { McpToolError, defineTool, id, type Gql } from '../tool.js';
import { fullName } from './format.js';
import { loadPerson } from './persons.js';

const MEDIA_FIELDS = 'id personId originalFileName mimeType type sizeBytes createdAt events { id title }';

export const listMedia = defineTool({
  name: 'list_media',
  title: 'List the files of a person',
  description: 'Photos, documents and other files of a person, and files of other persons linked with its life events (e.g. a group photo).',
  area: 'media',
  level: 'read',
  inTree: true,
  input: { personId: id('Id of the person') },
  run: async ({ personId }, { gql }) => {
    const { getPersonMedia, getLinkedMedia } = await gql<{ getPersonMedia: unknown[]; getLinkedMedia: unknown[] }>(
      `query ($id: ID!) { getPersonMedia(personId: $id) { ${MEDIA_FIELDS} } getLinkedMedia(personId: $id) { ${MEDIA_FIELDS} } }`,
      { id: personId },
    );
    return { data: { own: getPersonMedia, linked: getLinkedMedia } };
  },
});

const nameOf = (gql: Gql, personId: string | undefined) => (personId ? loadPerson(gql, personId).then(fullName, () => null) : Promise.resolve(null));

export const addMedia = defineTool({
  name: 'add_media',
  title: 'Add a file',
  description:
    'Adds a file of this computer (photo, scan, document, video) to a person, a life event, a source or a citation. The file is copied; the original stays. Only files in the home, data or backup folder.',
  area: 'media',
  level: 'write',
  inTree: true,
  input: {
    path: z.string().min(1).max(1000).describe('Absolute path of the file on this computer'),
    personId: z.string().max(100).optional(),
    eventId: z.string().max(100).optional().describe('Life event the file shows; without personId it belongs to the person of the event'),
    sourceId: z.string().max(100).optional().describe('Scan of a whole source'),
    citationId: z.string().max(100).optional().describe('Scan of an entry of a source'),
    type: z
      .enum(MEDIA_TYPES)
      .optional()
      .describe('PROFILE_PICTURE also makes an image the profile picture of the person; without a type an image is a PHOTO, any other file a DOCUMENT'),
  },
  run: async ({ path: given, ...target }, { gql, tree }) => {
    if (!target.personId && !target.eventId && !target.sourceId && !target.citationId) {
      throw new McpToolError('BAD_INPUT', 'Give a person, a life event, a source or a citation the file belongs to.');
    }
    const file = await copyIntoUploads(readableFile(given));
    // Like the upload of the app: an image is a photo, any other file a document
    const type = target.type ?? (file.mimetype.startsWith('image/') ? 'PHOTO' : 'DOCUMENT');
    const answer = await storeMedia(file, { ...target, type }, () => Promise.resolve(tree!.id));
    if (answer.status !== 201) {
      throw new McpToolError(String(answer.body.reason), String(answer.body.error));
    }
    const { id: mediaId, originalFileName, mimeType, sizeBytes, personId } = answer.body;
    return {
      data: { id: mediaId, originalFileName, mimeType, type: answer.body.type, sizeBytes, personId },
      target: (await nameOf(gql, personId as string | undefined)) ?? String(originalFileName),
    };
  },
});

export const setProfilePicture = defineTool({
  name: 'set_profile_picture',
  title: 'Set the profile picture',
  description: 'Makes an image of the person its profile picture; without mediaId the profile picture is removed (the file stays).',
  area: 'media',
  level: 'write',
  inTree: true,
  input: { personId: id('Id of the person'), mediaId: z.string().max(100).nullable().optional().describe('Id of an image of the person') },
  run: async ({ personId, mediaId }, { gql }) => {
    const { setProfilePicture: person } = await gql<{ setProfilePicture: { id: string; firstName: string; lastName: string | null } }>(
      'mutation ($personId: ID!, $mediaId: ID) { setProfilePicture(personId: $personId, mediaId: $mediaId) { id firstName lastName profilePictureId } }',
      { personId, mediaId: mediaId ?? null },
    );
    return { data: person, target: fullName(person) };
  },
});

export const removeMedia = defineTool({
  name: 'remove_media',
  title: 'Delete a file',
  description: 'Deletes a file (of a person, an event or a source) for good, from the database and the disk. Cannot be undone.',
  area: 'media',
  level: 'delete',
  inTree: true,
  input: { mediaId: id('Id of the file') },
  run: async ({ mediaId }, { gql }) => {
    await gql('mutation ($id: ID!) { deleteMedia(id: $id) }', { id: mediaId });
    return { data: { deleted: true } };
  },
});

export const MEDIA_TOOLS = [listMedia, addMedia, setProfilePicture, removeMedia];
