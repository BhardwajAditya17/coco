-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approval_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN     "current_position" VARCHAR(100),
ADD COLUMN     "fee_status" VARCHAR(20) NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "user_type" VARCHAR(30) NOT NULL DEFAULT 'paid';
