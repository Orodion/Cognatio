-- Data as a user of the first release would have it (state right after the migration 20260930120000_init).
-- The upgrade test (src/lib/__tests__/upgradeMatrix.test.ts) puts this data in, migrates to the current version and
-- checks that nothing is lost. A new migration that changes existing tables should get a fixture file of its
-- own: `<migration name>.sql` with data valid right after that migration.
INSERT INTO "FamilyTree" ("id", "name", "description", "updatedAt")
VALUES ('tree-1', 'Müller', 'Test data of the first release', now());

INSERT INTO "Person" ("id", "familyTreeId", "firstName", "lastName", "birthDate", "birthDatePrecision", "gender", "languages", "updatedAt")
VALUES
  ('person-1', 'tree-1', 'Johann', 'Müller', '1901-05-17', 'EXACT', 'MALE', ARRAY['de'], now()),
  ('person-2', 'tree-1', 'Maria', 'Müller', '1905', 'YEAR', 'FEMALE', ARRAY['de', 'pl'], now()),
  ('person-3', 'tree-1', 'Anna', 'Müller', NULL, NULL, 'FEMALE', ARRAY[]::TEXT[], now());

INSERT INTO "Relation" ("id", "personAId", "personBId", "type", "updatedAt")
VALUES ('relation-1', 'person-1', 'person-2', 'PARTNER', now());

INSERT INTO "Media" ("id", "familyTreeId", "personId", "fileName", "originalFileName", "mimeType", "sizeBytes", "type", "updatedAt")
VALUES ('media-1', 'tree-1', 'person-1', 'a1b2c3.jpg', 'Hochzeit.jpg', 'image/jpeg', 2147483647, 'PHOTO', now());
