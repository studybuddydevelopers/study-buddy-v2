# Security Policy

Study Buddy takes security and privacy reports seriously. This repository is
public, but that does not authorise testing of Study Buddy's production or
staging services, users, providers, or infrastructure.

## Report a vulnerability

Email `security@studybuddyng.com`. Do not open a public GitHub issue or include
the report in a pull request.

Include only what is needed to understand the problem:

- the affected component or page;
- the observed and expected behaviour;
- minimal reproduction steps using your own test data;
- the likely impact; and
- a safe way to contact you.

Do not send credentials, access tokens, personal data, complete database rows,
or data belonging to another person. If sensitive evidence is necessary, first
ask for a secure transfer method.

## Research boundaries

Unless Study Buddy has given you specific written authorisation, do not:

- access or attempt to access another person's account or data;
- test production, private staging, provider dashboards, or third-party
  infrastructure;
- perform denial-of-service, load, spam, brute-force, social-engineering,
  phishing, malware, or physical-security tests;
- create costs, send bulk email or messages, trigger real payments, or disrupt
  service; or
- retain, share, or publish personal data or vulnerability details.

Stop immediately if you encounter personal data, secrets, or evidence of an
active compromise, and report it through the security mailbox.

## What to expect

Study Buddy will acknowledge a report, assess its impact, and agree a
coordinated disclosure approach where appropriate. Please allow time for a fix
and verification before publishing details. This policy is not a bug-bounty
offer and does not promise payment.

## Supported code

Security fixes are applied to the current production release and the active
development branch. Older deployments and forks are not supported by Study
Buddy.

## Public-repository safety

The repository may contain public-safe architecture descriptions, environment
variable names, API contracts, and examples. It must never contain:

- real credentials, tokens, private keys, connection strings, cookies, or
  recovery codes;
- production or private-staging environment exports;
- internal hostnames, service identifiers, account or operator allowlists, or
  provider dashboard links;
- exact production rate limits, alert thresholds, budgets, or defensive tuning;
- raw logs, user records, incident evidence, backup contents, penetration-test
  findings, or screenshots from restricted systems; or
- executable provider agreements or other confidential company records.

Those records belong in the company's restricted evidence store or private
operations system. Placeholder values in `.env.example` are documentation, not
production recommendations.

If a secret is committed, removing it from the latest revision is not enough.
Revoke or rotate it, review access and logs, assess whether notification is
required, and then clean history only as an additional containment step.

## Maintainer release checks

Before a production release, maintainers should verify through private evidence
that:

- required migrations were applied by a migration-only identity;
- the web runtime uses least-privilege credentials;
- staging and production use separate data and provider credentials;
- automated tests, dependency review, secret scanning, and the approved
  staging security scan passed;
- health monitoring, security alerts, scheduled jobs, backup restoration, and
  rollback were exercised; and
- no critical or high-severity security finding remains open.

The exact values and evidence for these checks must not be committed here.
