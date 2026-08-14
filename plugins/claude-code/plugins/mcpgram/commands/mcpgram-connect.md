---
description: Connect an app to MCPGRAM via managed OAuth (e.g. linkedin, slack, github, discord, notion, figma).
argument-hint: <app> (e.g. linkedin, slack, github, discord, notion, figma)
---

# Connect an MCPGRAM app

Connect the app the user named: **$ARGUMENTS**

Assume the `mcpgram` CLI is installed and authenticated (SessionStart surfaces its status). If a step reports you are not signed in, run `mcpgram login` and retry.

Steps:

1. Start the managed OAuth flow for the app:
   ```bash
   mcpgram link $ARGUMENTS
   ```
   If you are in a non-interactive context, hand the returned URL to the user, then wait for them to confirm completion. You can poll with:
   ```bash
   mcpgram link $ARGUMENTS --wait --timeout 120
   ```

2. Verify the connection with a lightweight search or list:
   ```bash
   mcpgram search $ARGUMENTS --limit 5
   mcpgram tools --app $ARGUMENTS 2>/dev/null || mcpgram search $ARGUMENTS
   ```

If `$ARGUMENTS` is empty, ask the user which app they want to connect (examples: linkedin, slack, github, discord, notion, figma).

After linking, prefer `mcpgram execute <tool> --schema` before the first real call so arguments are correct.
