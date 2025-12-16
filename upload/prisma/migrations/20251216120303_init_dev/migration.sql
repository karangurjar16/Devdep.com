/*
  Warnings:

  - The primary key for the `Deploy` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Deploy" DROP CONSTRAINT "Deploy_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Deploy_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Deploy_id_seq";
