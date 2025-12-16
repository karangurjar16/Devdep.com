-- CreateTable
CREATE TABLE "Deploy" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "rootDir" TEXT NOT NULL,

    CONSTRAINT "Deploy_pkey" PRIMARY KEY ("id")
);
