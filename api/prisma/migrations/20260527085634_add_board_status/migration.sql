-- CreateEnum
CREATE TYPE "BoardStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "TimeEntry" DROP CONSTRAINT "TimeEntry_userId_fkey";

-- DropIndex
DROP INDEX "TimeEntry_taskId_idx";

-- DropIndex
DROP INDEX "TimeEntry_userId_idx";

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "status" "BoardStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TimeEntry" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ADD CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
