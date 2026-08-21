-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KAKAO', 'GOOGLE');

-- CreateEnum
CREATE TYPE "NoteFamily" AS ENUM ('CITRUS', 'FLORAL', 'WOODY', 'ORIENTAL_AMBER', 'FRESH', 'FOUGERE', 'CHYPRE', 'GOURMAND');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNISEX');

-- CreateEnum
CREATE TYPE "NotePosition" AS ENUM ('TOP', 'MIDDLE', 'BASE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "nickname" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "country" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "family" "NoteFamily" NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfume" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "family" "NoteFamily",
    "targetGender" "Gender",
    "volumeMl" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfumeNote" (
    "id" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "position" "NotePosition" NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PerfumeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "totalMl" DOUBLE PRECISION NOT NULL,
    "initialMl" DOUBLE PRECISION NOT NULL,
    "currentMl" DOUBLE PRECISION NOT NULL,
    "isPreOwned" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "lastAdjustedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "price" INTEGER,
    "photoUrl" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatureCelsius" DOUBLE PRECISION,
    "weatherCondition" TEXT,
    "location" TEXT,
    "sprayCount" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Perfume_brandId_idx" ON "Perfume"("brandId");

-- CreateIndex
CREATE INDEX "PerfumeNote_noteId_idx" ON "PerfumeNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfumeNote_perfumeId_noteId_position_key" ON "PerfumeNote"("perfumeId", "noteId", "position");

-- CreateIndex
CREATE INDEX "Collection_userId_perfumeId_idx" ON "Collection"("userId", "perfumeId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_perfumeId_key" ON "Wishlist"("userId", "perfumeId");

-- CreateIndex
CREATE INDEX "UsageLog_collectionId_idx" ON "UsageLog"("collectionId");

-- CreateIndex
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotePreference_userId_noteId_key" ON "UserNotePreference"("userId", "noteId");

-- AddForeignKey
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeNote" ADD CONSTRAINT "PerfumeNote_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeNote" ADD CONSTRAINT "PerfumeNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotePreference" ADD CONSTRAINT "UserNotePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotePreference" ADD CONSTRAINT "UserNotePreference_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
