/*
  Warnings:

  - You are about to drop the `looks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "looks" DROP CONSTRAINT "looks_user_id_fkey";

-- DropTable
DROP TABLE "looks";

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled session',
    "thumbnail" TEXT NOT NULL,
    "prompt" TEXT,
    "suggestion" TEXT,
    "transcript" TEXT,
    "mesh_task_id" TEXT,
    "mesh_status" TEXT,
    "mesh_glb" BYTEA,
    "mesh_thumbnail_url" TEXT,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_user_id_updated_at_idx" ON "sessions"("user_id", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
