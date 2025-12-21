/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,userId]` on the table `SchoolStudent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SchoolStudent_schoolId_userId_key" ON "SchoolStudent"("schoolId", "userId");
