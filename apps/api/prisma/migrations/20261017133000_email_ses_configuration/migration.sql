CREATE TABLE IF NOT EXISTS "EmailSesConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "txRegion" TEXT NOT NULL DEFAULT 'eu-central-1',
  "txConfigurationSet" TEXT,
  "txSnsTopicArn" TEXT,
  "mktRegion" TEXT,
  "mktConfigurationSet" TEXT,
  "mktSnsTopicArn" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailSesConfiguration_pkey" PRIMARY KEY ("id")
);
