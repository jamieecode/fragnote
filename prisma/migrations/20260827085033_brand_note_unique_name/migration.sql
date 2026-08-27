-- AlterTable
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_name_key" UNIQUE ("name");

-- AlterTable
ALTER TABLE "Note" ADD CONSTRAINT "Note_name_key" UNIQUE ("name");
