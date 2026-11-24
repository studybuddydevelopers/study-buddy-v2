# Database migration, role and RLS gate

Last reviewed: 24 November 2026

## Purpose

This gate proves the complete Prisma migration history and the deployed database
authorization model against disposable pgvector PostgreSQL. It never uses a
shared, staging or production database.

The automated checks cover:

- empty-to-current application of every migration;
- a second idempotent migration deploy with existing synthetic data;
- migration-history drift using a separate disposable shadow database;
- completed `_prisma_migrations` evidence with no failed or rolled-back rows;
- separation between the migration owner and `studybuddy_runtime`;
- the runtime role's bounded attributes, table/sequence grants and DDL denial;
- RLS on every public table and no browser-role CRUD grants;
- denial of a browser-role read, plus RLS denial after a temporary accidental
  `SELECT` grant;
- representative indexes, rollback behaviour and concurrent idempotent writes;
- the existing application database-security verifier running as the real
  runtime role; and
- deterministic cleanup of both disposable databases and the test runtime role.

## Safety boundary

`E2E_DATABASE_URL` must be PostgreSQL on a loopback host and its database name
must end in `_e2e`. The primary database cannot itself use the derived
`_shadow_e2e` name. The setup rejects any URL outside this boundary before a
destructive database command can run.

CI supplies only synthetic credentials to a digest-pinned service container.
The runtime password is test-only and the produced evidence contains counts and
boolean results rather than connection strings or credentials.

Do not run this command against Supabase, Railway, staging, production or any
shared developer database.

## CI and local command

The `Database migrations, roles and RLS` CI job installs the PostgreSQL client,
starts disposable pgvector PostgreSQL and runs:

```bash
npm run test:database-security
```

For a local run, start a disposable pgvector container on a loopback port and
set `E2E_DATABASE_URL` to a database ending in `_e2e`. Stop the container after
the command completes. The command drops its target and shadow databases even
when an assertion fails.

## Evidence and failure handling

The gate writes `output/test-results/database-security.json` and CI retains it
for 14 days. A migration, drift, privilege, RLS, index, transaction,
concurrency, existing-verifier or cleanup failure makes the job fail.

The comparison intentionally uses migration history rather than only the Prisma
datamodel. The schema includes intentional SQL-only behaviour—RLS, grants,
pgvector indexes and generated search-vector defaults—that the Prisma datamodel
cannot fully represent.

## Deliberate boundary

The server runtime role intentionally has `BYPASSRLS` because all browser roles
are denied and application requests reach PostgreSQL through the trusted server.
Object-level cross-account authorization at HTTP route and service boundaries
belongs to the separate API authorization matrix. This gate proves that browser
roles cannot bypass the server and that the runtime identity cannot acquire DDL,
ownership or role-management authority.
