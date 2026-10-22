-- Possible errors the user marked as right, as keys per family tree
ALTER TABLE "FamilyTree" ADD COLUMN "checkedIssues" TEXT[] DEFAULT ARRAY[]::TEXT[];
