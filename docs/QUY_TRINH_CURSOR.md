# Study Buddy UI contributor workflow

Last updated: 1 November 2026.

The filename is retained for existing links. This is the Study Buddy adaptation
of the optional Cursor design-review workflow, not a separate product spec.

1. Read [AGENTS.md](../AGENTS.md), the [website guide](WEBSITE_GUIDE.md) and the installed Next.js documentation relevant to the change.
2. Inspect the current route and existing UI components. Preserve unrelated and concurrent work.
3. Use the [UI review checklist](DMCTN_UI_TASTE_GATE.md) to state the requested change and measurable acceptance checks.
4. Use [the prompt template](../examples/prompt-cursor.md) if helpful. The existing `.cursor/rules/dmctn-taste-gate.mdc` is an optional editor aid, not a reason to override approved branding.
5. Change only authorised files/behaviour. An audit or documentation request does not authorise a redesign.
6. Run proportionate checks and report what actually passed, failed or was not run.
7. Keep public notes free of credentials, personal data, privileged instructions and sensitive findings; follow [SECURITY.md](../SECURITY.md).

Do not copy an editor rule file into an unrelated location, publish a temporary
design route, install a new UI framework or create public evidence files merely
because a generic template suggests doing so. Preserve the current branch/workflow
unless the user authorises a change.
