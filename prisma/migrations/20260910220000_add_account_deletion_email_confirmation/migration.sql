-- PostgreSQL requires a newly added enum value to be committed before another
-- statement can use it. The table/default changes therefore live in the next
-- migration.
ALTER TYPE "AccountDeletionRequestStatus"
    ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION' BEFORE 'PENDING';
