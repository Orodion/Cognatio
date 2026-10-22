-- Sources and citations: archives, sources, citations and their scans form one library for all family trees
-- (scans without a family tree); citations are linked with persons (fact), events and relations.
-- AlterTable
ALTER TABLE "Media" ALTER COLUMN "familyTreeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "url" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publication" TEXT,
    "abbreviation" TEXT,
    "text" TEXT,
    "repositoryId" TEXT,
    "callNumber" TEXT,
    "note" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "page" TEXT,
    "date" TEXT,
    "datePrecision" TEXT,
    "text" TEXT,
    "quality" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceMedia" (
    "sourceId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceMedia_pkey" PRIMARY KEY ("sourceId","mediaId")
);

-- CreateTable
CREATE TABLE "CitationMedia" (
    "citationId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitationMedia_pkey" PRIMARY KEY ("citationId","mediaId")
);

-- CreateTable
CREATE TABLE "PersonCitation" (
    "personId" TEXT NOT NULL,
    "citationId" TEXT NOT NULL,
    "fact" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonCitation_pkey" PRIMARY KEY ("personId","citationId","fact")
);

-- CreateTable
CREATE TABLE "EventCitation" (
    "eventId" TEXT NOT NULL,
    "citationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCitation_pkey" PRIMARY KEY ("eventId","citationId")
);

-- CreateTable
CREATE TABLE "RelationCitation" (
    "relationId" TEXT NOT NULL,
    "citationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationCitation_pkey" PRIMARY KEY ("relationId","citationId")
);

-- CreateIndex
CREATE INDEX "Source_repositoryId_idx" ON "Source"("repositoryId");

-- CreateIndex
CREATE INDEX "Citation_sourceId_idx" ON "Citation"("sourceId");

-- CreateIndex
CREATE INDEX "SourceMedia_mediaId_idx" ON "SourceMedia"("mediaId");

-- CreateIndex
CREATE INDEX "CitationMedia_mediaId_idx" ON "CitationMedia"("mediaId");

-- CreateIndex
CREATE INDEX "PersonCitation_citationId_idx" ON "PersonCitation"("citationId");

-- CreateIndex
CREATE INDEX "EventCitation_citationId_idx" ON "EventCitation"("citationId");

-- CreateIndex
CREATE INDEX "RelationCitation_citationId_idx" ON "RelationCitation"("citationId");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceMedia" ADD CONSTRAINT "SourceMedia_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceMedia" ADD CONSTRAINT "SourceMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitationMedia" ADD CONSTRAINT "CitationMedia_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "Citation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitationMedia" ADD CONSTRAINT "CitationMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonCitation" ADD CONSTRAINT "PersonCitation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonCitation" ADD CONSTRAINT "PersonCitation_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "Citation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCitation" ADD CONSTRAINT "EventCitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCitation" ADD CONSTRAINT "EventCitation_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "Citation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationCitation" ADD CONSTRAINT "RelationCitation_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "Relation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationCitation" ADD CONSTRAINT "RelationCitation_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "Citation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

