-- A medium can be larger than 2 GiB (videos): the size needs 64 bits
ALTER TABLE "Media" ALTER COLUMN "sizeBytes" SET DATA TYPE BIGINT;
