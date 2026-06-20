-- CreateTable
CREATE TABLE "NetRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "netId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "metricCount" INTEGER NOT NULL DEFAULT 0,
    "profileCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "log" JSONB,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "NetRun_netId_fkey" FOREIGN KEY ("netId") REFERENCES "Net" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "individualId" TEXT,
    "rawCandidateId" TEXT,
    "netRunId" TEXT,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'post',
    "url" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "authorHandle" TEXT,
    "lang" TEXT,
    "rawPayload" JSONB,
    "publishedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContentItem_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentItem_rawCandidateId_fkey" FOREIGN KEY ("rawCandidateId") REFERENCES "RawCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentItem_netRunId_fkey" FOREIGN KEY ("netRunId") REFERENCES "NetRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentMetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentItemId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "extra" JSONB,
    CONSTRAINT "ContentMetricSnapshot_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfileSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "individualId" TEXT,
    "sourceId" TEXT,
    "handle" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "audienceQuality" JSONB,
    CONSTRAINT "ProfileSnapshot_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfileSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignalEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "individualId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "category" TEXT NOT NULL,
    "matchedPhrase" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0,
    "confidence" REAL NOT NULL DEFAULT 1,
    "detectedBy" TEXT NOT NULL DEFAULT 'keyword',
    "excerpt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignalEvidence_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SignalEvidence_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProspectScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "individualId" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "dominantMotivation" TEXT NOT NULL,
    "championFitScore" REAL NOT NULL DEFAULT 0,
    "useCaseScore" REAL NOT NULL DEFAULT 0,
    "baseScore" REAL NOT NULL DEFAULT 0,
    "frustrationCoefficient" REAL NOT NULL DEFAULT 1,
    "adjustedScore" REAL NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'tier4',
    "outreachAngle" TEXT,
    "components" JSONB,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectScore_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Individual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "primaryHandle" TEXT,
    "primaryProfileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_enrichment',
    "classification" TEXT,
    "dominantMotivation" TEXT,
    "currentTier" TEXT,
    "currentScore" REAL,
    "outreachStatus" TEXT NOT NULL DEFAULT 'not_started',
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Individual" ("createdAt", "displayName", "id", "primaryHandle", "status") SELECT "createdAt", "displayName", "id", "primaryHandle", "status" FROM "Individual";
DROP TABLE "Individual";
ALTER TABLE "new_Individual" RENAME TO "Individual";
CREATE TABLE "new_Net" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "params" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icpTarget" TEXT NOT NULL DEFAULT 'either',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Net" ("createdAt", "description", "id", "isActive", "name", "params", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "name", "params", "updatedAt" FROM "Net";
DROP TABLE "Net";
ALTER TABLE "new_Net" RENAME TO "Net";
CREATE TABLE "new_RawCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "netId" TEXT,
    "netRunId" TEXT,
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
    CONSTRAINT "RawCandidate_netRunId_fkey" FOREIGN KEY ("netRunId") REFERENCES "NetRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RawCandidate_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RawCandidate" ("dedupeStatus", "discoveredAt", "externalId", "id", "individualId", "matchContext", "netId", "platformHandle", "profileUrl", "rawPayload", "sourceId") SELECT "dedupeStatus", "discoveredAt", "externalId", "id", "individualId", "matchContext", "netId", "platformHandle", "profileUrl", "rawPayload", "sourceId" FROM "RawCandidate";
DROP TABLE "RawCandidate";
ALTER TABLE "new_RawCandidate" RENAME TO "RawCandidate";
CREATE UNIQUE INDEX "RawCandidate_sourceId_externalId_key" ON "RawCandidate"("sourceId", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_sourceId_externalId_key" ON "ContentItem"("sourceId", "externalId");
