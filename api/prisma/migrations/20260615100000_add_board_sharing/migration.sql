-- Board sharing — FLO-17 (Phase 1 schema) + FLO-18 (Phase 2 invite flow).
-- Adds BoardShare (invite rows with token + expiry) and BoardMember (resolved access rows).
-- PermissionLevel on the invite is the *requested* level; BoardMember.role is the *granted* level.

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'EDIT');
CREATE TYPE "BoardShareStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');
CREATE TYPE "BoardMemberRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "BoardShare" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permissionLevel" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "status" "BoardShareStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardMember" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardMemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardShare_publicId_key" ON "BoardShare"("publicId");
CREATE UNIQUE INDEX "BoardShare_inviteToken_key" ON "BoardShare"("inviteToken");
CREATE UNIQUE INDEX "BoardShare_boardId_email_key" ON "BoardShare"("boardId", "email");
CREATE INDEX "BoardShare_email_status_idx" ON "BoardShare"("email", "status");
CREATE INDEX "BoardShare_boardId_status_idx" ON "BoardShare"("boardId", "status");

CREATE UNIQUE INDEX "BoardMember_publicId_key" ON "BoardMember"("publicId");
CREATE UNIQUE INDEX "BoardMember_boardId_userId_key" ON "BoardMember"("boardId", "userId");
CREATE INDEX "BoardMember_userId_idx" ON "BoardMember"("userId");

-- AddForeignKey
ALTER TABLE "BoardShare" ADD CONSTRAINT "BoardShare_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardShare" ADD CONSTRAINT "BoardShare_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
