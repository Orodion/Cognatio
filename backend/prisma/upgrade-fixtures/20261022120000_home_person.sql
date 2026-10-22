-- Data valid right after the migration 20261022120000_home_person: a family tree with its home person.
UPDATE "FamilyTree" SET "homePersonId" = 'person-1' WHERE "id" = 'tree-1';
