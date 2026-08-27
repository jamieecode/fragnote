-- AlterTable
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_brandId_name_key" UNIQUE ("brandId", "name");
