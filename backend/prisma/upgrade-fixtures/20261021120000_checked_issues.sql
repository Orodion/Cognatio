-- Data valid right after the migration 20261021120000_checked_issues: a family tree with a possible error the user
-- marked as right, and one without any.
INSERT INTO "FamilyTree" ("id", "name", "description", "checkedIssues", "updatedAt")
VALUES ('tree-2', 'Schmidt', 'Checked possible errors', ARRAY['LIVING_TOO_OLD||person-3'], now());
UPDATE "FamilyTree" SET "checkedIssues" = ARRAY[]::TEXT[] WHERE "id" = 'tree-1';
