-- Allow the restricted server runtime role to resolve the pgvector type and
-- operators without granting schema creation or ownership privileges.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname = 'extensions'
  ) AND EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'studybuddy_runtime'
  ) THEN
    GRANT USAGE ON SCHEMA extensions TO studybuddy_runtime;
  END IF;
END
$$;
