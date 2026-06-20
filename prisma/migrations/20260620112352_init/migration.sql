-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Net" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "params" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NetSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "netId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    CONSTRAINT "NetSource_netId_fkey" FOREIGN KEY ("netId") REFERENCES "Net" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NetSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RawCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "netId" TEXT,
    "externalId" TEXT,
    "platformHandle" TEXT,
    "profileUrl" TEXT,
    "matchContext" TEXT,
    "rawPayload" JSONB,
    "dedupeStatus" TEXT NOT NULL DEFAULT 'unresolved',
    "individualId" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RawCandidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RawCandidate_netId_fkey" FOREIGN KEY ("netId") REFERENCES "Net" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RawCandidate_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Individual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "primaryHandle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_enrichment',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_key_key" ON "Source"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NetSource_netId_sourceId_key" ON "NetSource"("netId", "sourceId");
