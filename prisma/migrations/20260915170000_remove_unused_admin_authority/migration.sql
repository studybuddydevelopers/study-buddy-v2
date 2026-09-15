-- Study Buddy has no administrator accounts or administrator product surface.
-- Refuse destructive removal if an administrator was added after the rollout
-- audit, so a migration can never silently discard an active authority record.
DO $$
DECLARE
  has_admin_rows BOOLEAN;
BEGIN
  IF to_regclass('public."AdminUser"') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public."AdminUser")'
      INTO has_admin_rows;

    IF has_admin_rows THEN
      RAISE EXCEPTION 'Refusing to remove AdminUser because it contains data';
    END IF;
  END IF;
END $$;

DROP TABLE IF EXISTS "AdminUser";
