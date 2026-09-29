-- Marking-review records contain learner answers, marking details and support
-- decisions. Keep them inaccessible to Supabase browser roles; the restricted
-- server runtime role is the only application path to these tables.
ALTER TABLE "MockExamMarkingReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MockExamMarkingReviewEvent" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE "MockExamMarkingReview" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "MockExamMarkingReviewEvent" FROM anon, authenticated;
