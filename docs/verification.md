# Verification: PlexusTerm theme

## Current behavior

- Automatic application runs only for TUI startup when the selected theme name is exactly `plexusterm`.
- Automatic startup and `/plexusterm-theme` use `getTheme("plexusterm")` and pass the same registered object to `setTheme(object)`.
- `/reload` is an automatic no-op for this extension. The manual command can be used afterward to reapply the same resource; it does not query the terminal or fetch a new palette.
- The selected name is persisted only through Pi's ordinary theme picker. Package loading and the manual command do not persist a theme selection.

## Automated evidence

- **RED — `node --test tests/plexusterm-theme.test.mjs`:** before the correction, exit 1 with 25 passing tests and two new regression tests failing. Both exposed conversion of registered ANSI/default sequences into concrete RGB sequences rather than applying the registered object unchanged.
- **GREEN — `node --test tests/plexusterm-theme.test.mjs`:** after the correction, exit 0; 21 tests passed. Tests verify same-object application, all 56 ANSI getters, terminal-reset sequences, startup guards, reload/non-TUI no-ops, command help/argument handling, and lookup/setter failure behavior.
- **GREEN — `npm test`:** exit 0; 21 tests passed.
- The parent also ran a differential compatibility check: invalid arguments in TUI, invalid arguments in RPC, and no-argument RPC invocation retained the prior notifications/state and did not reach theme lookup or application (exit 0).

These are automated/fake-context checks. They do not launch Pi, PlexusTerm, or Gentle Shell and do not prove visible rendering.

## Human-observed behavior

The first `gentle-shell -e .` loading attempt failed; the user reports that the second attempt worked. The cause of the first failure is unknown, so it should not be attributed to a missing settings package or another unverified cause.

After the correction, the user-provided screenshot showed `/plexusterm-theme` reporting successful application of the registered theme. In that shown session, the editor retained its terminal background and headers remained green; the user said, “Yo creo que funciona bien.” This is accepted evidence for the manual command in that session.

Earlier A/B/C screenshots belong to the superseded system-snapshot implementation: the old command changed the editor/section colors, and reload restored the prior appearance. The current implementation no longer performs that snapshot or RGB conversion. If a running process still displays help or errors mentioning a `system` snapshot, restart it with the corrected package path. `/reload` is not guaranteed to replace already loaded module code.

## Not established

The current observation does not establish all of the following:

- automatic startup application or package/theme persistence across process restart;
- visual behavior in every editor, header, sidebar, or Gentle Shell panel;
- exact contrast, pixel colors, or palette identity;
- behavior across light/dark/alternate terminal palettes or terminals;
- that every cached host view redraws after `/reload` or manual application.

For a user-level check, load the package, choose `plexusterm` in `/settings` → **Theme**, and inspect the current TUI. If a terminal palette change leaves the view stale, try `/reload`; run `/plexusterm-theme` afterward only if you want to reapply the same registered resource. Do not treat the command as a palette fetch. Record the host and view if any surface differs.

## Historical checks

Before the correction, historical checks reported `npm pack --dry-run --json --ignore-scripts` exit 0 with five package entries, a Pi 1.2.0 theme-schema check with zero errors, and public resource-loader discovery without diagnostics. They are not rerun visual acceptance, and they do not replace the current automated or human evidence above.

## Release preparation: candidate 0.1.0

This source tree is prepared as a public npm release candidate. The release parent must record the observed candidate checks here before publication: test results, package metadata/content and exact-tarball/resource-loader validation, and public registry confirmation. This preparation does not claim those checks have passed or that publication has occurred. Historical checks above are not a substitute for validating the exact release tarball.
