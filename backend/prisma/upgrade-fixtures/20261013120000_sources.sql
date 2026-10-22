-- Data valid right after the migration 20261013120000_sources: an archive, a source with a scan of the library
-- (no family tree), a citation with a scan of its own, linked with the birth of a person and with a relation.
INSERT INTO "Repository" ("id", "name", "address", "updatedAt") VALUES ('repository-1', 'Standesamt Musterstadt', 'Rathausplatz 1', now());
INSERT INTO "Source" ("id", "type", "title", "author", "repositoryId", "callNumber", "updatedAt")
VALUES ('source-1', 'CIVIL_REGISTER', 'Geburtsregister 1950', 'Standesamt Musterstadt', 'repository-1', 'G 1950', now());
INSERT INTO "Citation" ("id", "sourceId", "page", "date", "datePrecision", "text", "quality", "updatedAt")
VALUES ('citation-1', 'source-1', 'Nr. 117', '1950', 'YEAR', 'Geboren am …', 3, now());
INSERT INTO "Media" ("id", "familyTreeId", "personId", "fileName", "originalFileName", "mimeType", "sizeBytes", "type", "updatedAt")
VALUES ('media-3', NULL, NULL, 'e5f6a7.jpg', 'Register-Seite.jpg', 'image/jpeg', 2048, 'DOCUMENT', now()),
       ('media-4', NULL, NULL, 'f6a7b8.pdf', 'Register.pdf', 'application/pdf', 4096, 'DOCUMENT', now());
INSERT INTO "SourceMedia" ("sourceId", "mediaId") VALUES ('source-1', 'media-4');
INSERT INTO "CitationMedia" ("citationId", "mediaId") VALUES ('citation-1', 'media-3');
INSERT INTO "PersonCitation" ("personId", "citationId", "fact") VALUES ('person-1', 'citation-1', 'BIRTH');
INSERT INTO "RelationCitation" ("relationId", "citationId") VALUES ('relation-1', 'citation-1');
