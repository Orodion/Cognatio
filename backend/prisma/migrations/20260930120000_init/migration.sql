-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "FamilyTree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "familyTreeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "middleName" TEXT,
    "birthName" TEXT,
    "title" TEXT,
    "nickname" TEXT,
    "birthDate" TEXT,
    "birthDatePrecision" TEXT,
    "birthPlace" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "deathDate" TEXT,
    "deathDatePrecision" TEXT,
    "deathPlace" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "occupation" TEXT,
    "hobbies" TEXT,
    "maritalStatus" TEXT,
    "nationality" TEXT,
    "languages" TEXT[],
    "profilePictureId" TEXT,
    "phonetics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "date" TEXT,
    "datePrecision" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "place" TEXT,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "familyTreeId" TEXT NOT NULL,
    "personId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "eventId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("eventId","mediaId")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "familyTreeId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT,
    "exportedAt" TIMESTAMP(3),
    "strategy" TEXT NOT NULL,
    "createdPersons" INTEGER NOT NULL,
    "updatedPersons" INTEGER NOT NULL,
    "removedPersons" INTEGER NOT NULL,
    "recognizedPersons" INTEGER NOT NULL DEFAULT 0,
    "createdRelations" INTEGER NOT NULL,
    "createdEvents" INTEGER NOT NULL,
    "createdNotes" INTEGER NOT NULL,
    "createdMedia" INTEGER NOT NULL,
    "missingFiles" INTEGER NOT NULL,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_phonetics_idx" ON "Person" USING GIN ("phonetics");

-- CreateIndex
CREATE INDEX "Person_familyTreeId_idx" ON "Person"("familyTreeId");

-- CreateIndex
CREATE INDEX "Relation_personAId_idx" ON "Relation"("personAId");

-- CreateIndex
CREATE INDEX "Relation_personBId_idx" ON "Relation"("personBId");

-- CreateIndex
CREATE INDEX "Event_personId_idx" ON "Event"("personId");

-- CreateIndex
CREATE INDEX "Note_personId_idx" ON "Note"("personId");

-- CreateIndex
CREATE INDEX "Media_personId_idx" ON "Media"("personId");

-- CreateIndex
CREATE INDEX "Media_familyTreeId_idx" ON "Media"("familyTreeId");

-- CreateIndex
CREATE INDEX "EventMedia_mediaId_idx" ON "EventMedia"("mediaId");

-- CreateIndex
CREATE INDEX "ImportRecord_fileHash_idx" ON "ImportRecord"("fileHash");

-- CreateIndex
CREATE INDEX "ImportRecord_importedAt_idx" ON "ImportRecord"("importedAt");

-- CreateIndex
CREATE INDEX "ImportRecord_familyTreeId_idx" ON "ImportRecord"("familyTreeId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_familyTreeId_fkey" FOREIGN KEY ("familyTreeId") REFERENCES "FamilyTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_familyTreeId_fkey" FOREIGN KEY ("familyTreeId") REFERENCES "FamilyTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_familyTreeId_fkey" FOREIGN KEY ("familyTreeId") REFERENCES "FamilyTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

