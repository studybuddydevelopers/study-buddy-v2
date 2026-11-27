ALTER TYPE public."AccountStatus" ADD VALUE 'GUARDIAN_AUTHORIZATION_WITHDRAWN';

ALTER TABLE public."GuardianAuthorization"
  ADD COLUMN "withdrawalStudentNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "withdrawalGuardianNotifiedAt" TIMESTAMP(3);

CREATE FUNCTION public.revoke_withdrawn_guardian_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM auth.sessions WHERE user_id = NEW.id::uuid;
  DELETE FROM auth.refresh_tokens WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_withdrawn_guardian_sessions()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER revoke_withdrawn_guardian_sessions
AFTER UPDATE OF "accountStatus" ON public."User"
FOR EACH ROW
WHEN (
  OLD."accountStatus" IS DISTINCT FROM NEW."accountStatus"
  AND NEW."accountStatus"::text = 'GUARDIAN_AUTHORIZATION_WITHDRAWN'
)
EXECUTE FUNCTION public.revoke_withdrawn_guardian_sessions();
