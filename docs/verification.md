# Verification: PlexusTerm theme apply/reapply behavior

## Current S10 correction

- **RED — `node --test tests/plexusterm-theme.test.mjs`:** exit 1 before implementation; 25 passed and the two new regression tests failed. Each built a public Pi `Theme` from `themes/plexusterm.json`, provided a different synthetic `system` theme, and invoked the registered command/startup handler. The applied object was not the registered object: RGB ANSI such as `\x1b[38;2;…m` replaced ANSI-indexed sequences such as `\x1b[38;5;…m` and terminal resets `\x1b[39m`/`\x1b[49m`. This included the terminal-reset `toolPendingBg`/`toolSuccessBg` roles and indexed green roles. The output showed the same semantic regression isolated by the synthetic public-command probe.
- **GREEN — `node --test tests/plexusterm-theme.test.mjs`:** exit 0; 21 tests passed after the change. Both startup and manual command apply the exact `getTheme("plexusterm")` object, with `getFgAnsi`/`getBgAnsi` equality for all 56 roles and no `system` lookup.
- **GREEN — `npm test`:** exit 0; 21 tests passed.
- The tests also cover passive registration, no-argument/help/invalid-argument behavior, non-TUI rejection, automatic name/startup guards, reload/non-TUI/other-theme no-ops, object-only setter calls, source-object/escape immutability, missing/throwing lookup, and false/throwing setter results without false success or saved-selection mutation.

### Differential compatibility check

The worker could not write the requested scratch path within its allowed surfaces. The parent completed the check using `git archive HEAD` in an ignored `.artifacts/base-visual-fix-*` directory, then imported the old and new registered handlers through Node. Exit 0: invalid arguments in TUI, invalid arguments in RPC, and no-argument RPC invocation produced identical notification text/levels and unchanged observable state; no theme read or setter was reached. Default/manual/startup application and help wording intentionally changed under S10 and are excluded from old-behavior equality. Parent `npm test` also passed 21/21; `git diff --check` exited 0.

## Historical checks (before the S10 correction)

These results describe the earlier system-snapshot implementation and are not current test counts or evidence for the corrected behavior:

- `npm test`: exit 0, 25/25 tests passed.
- `npm pack --dry-run --json --ignore-scripts`: exit 0 with the five intended package entries.
- Independent Python Draft202012Validator against the installed Pi 1.2.0 theme schema: exit 0, zero errors, 56 roles.
- An isolated public `DefaultResourceLoader` discovered the theme and registered extension command/event without diagnostics.
- A prior public-API synthetic command probe showed ANSI/default escapes being converted to concrete RGB escapes. The new RED tests independently reproduced that mismatch against the registered JSON baseline.

## A/B/C evidence and live acceptance boundary

The parent reports that screenshots A and C showed the accepted appearance after reload, while screenshot B, after `/plexusterm-theme`, showed a green editor surface and orange section labels. The synthetic public-command probe and the new failing tests isolated the ANSI/default-to-RGB conversion consistent with the observed difference, without proving every shell-specific cache or rendering cause. This evidence is defect diagnosis; it is not a live visual retest after the fix.

No live Pi, PlexusTerm, or Gentle Shell session has been used to visually verify the corrected implementation. Picker behavior, contrast, rendered appearance, restart/reload behavior, and cached header/sidebar refresh remain unverified. The parent should request human retesting after this functional handoff; do not claim live acceptance based on the unit tests.

## Manual acceptance

1. From this package directory, start a separate local Pi invocation with `pi -e .` or `gentle-shell -e .`.
2. Select `plexusterm` through Pi's normal theme picker and verify eligible TUI startup reapplication.
3. Run `/reload`, then `/plexusterm-theme`; confirm it reapplies the same terminal-relative resource rather than switching to a `system`-mapped appearance.
4. Inspect terminal defaults, indexed green roles, editor, tool backgrounds, and Gentle Shell panels. Record any visual/cache differences without assuming universal contrast or refresh behavior.

Do not call these manual checks passed until results are observed. The package remains private and unpublished; no normal user settings or host code were changed by this task.
