-- The school-facing product was never launched. Abort instead of silently
-- deleting data if school records are added before this migration is applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SchoolStudent'
  ) AND EXISTS (SELECT 1 FROM "SchoolStudent") THEN
    RAISE EXCEPTION 'Refusing to remove SchoolStudent because it contains data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'School'
  ) AND EXISTS (SELECT 1 FROM "School") THEN
    RAISE EXCEPTION 'Refusing to remove School because it contains data';
  END IF;
END $$;

DROP TABLE "SchoolStudent";
DROP TABLE "School";
