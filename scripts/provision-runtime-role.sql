\set ON_ERROR_STOP on

SELECT length(:'runtime_password') >= 32 AS runtime_password_valid \gset
\if :runtime_password_valid
\else
  \echo 'Runtime database password must contain at least 32 characters.'
  \quit 1
\endif

SELECT 'CREATE ROLE studybuddy_runtime LOGIN'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'studybuddy_runtime'
) \gexec

ALTER ROLE studybuddy_runtime
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  BYPASSRLS
  CONNECTION LIMIT 20;

SELECT format(
  'ALTER ROLE studybuddy_runtime PASSWORD %L',
  :'runtime_password'
) \gexec

ALTER ROLE studybuddy_runtime SET search_path = public;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM studybuddy_runtime;
GRANT USAGE ON SCHEMA public TO studybuddy_runtime;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM studybuddy_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO studybuddy_runtime;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM studybuddy_runtime;
GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public
  TO studybuddy_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO studybuddy_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO studybuddy_runtime;

GRANT CONNECT ON DATABASE postgres TO studybuddy_runtime;
