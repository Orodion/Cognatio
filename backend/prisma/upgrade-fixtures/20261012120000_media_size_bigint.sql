-- Data valid right after the migration 20261012120000_media_size_bigint: a medium larger than 2 GiB (a video).
INSERT INTO "Media" ("id", "familyTreeId", "personId", "fileName", "originalFileName", "mimeType", "sizeBytes", "type", "updatedAt")
VALUES ('media-2', 'tree-1', 'person-2', 'd4e5f6.mp4', 'Familienfilm.mp4', 'video/mp4', 5368709120, 'OTHER', now());
