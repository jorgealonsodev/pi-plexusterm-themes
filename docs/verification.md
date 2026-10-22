# Verification: PlexusTerm theme package

## Observed checks

- Writer RED: Node tests exited 1 before snapshot implementation/manifest existed. Reported evidence only; independent verifier observed GREEN, not RED.
- Writer GREEN and parent `npm test`: exit 0, 25 tests passed. Covers public Theme construction, command/event registration with fake contexts, all 56 roles, startup selected-name guard, manual snapshots, non-TUI and failure paths.
- Independent `npm test`: exit 0, 25/25 passed.
- Independent `npm pack --dry-run --json --ignore-scripts`: exit 0, exactly five entries: README.md, package.json, extensions/plexusterm-theme/index.mjs, extensions/plexusterm-theme/snapshot.mjs, themes/plexusterm.json. No tracking/spike/cache artifacts included.
- Independent Python Draft202012Validator against the installed Pi 1.2.0 theme schema: exit 0, zero errors, 56 roles.
- Independent isolated public DefaultResourceLoader with in-memory settings: exit 0. Discovered theme `plexusterm`, loaded the real .mjs extension, registered `plexusterm-theme` and `session_start`; zero errors/warnings/diagnostics. No model calls or normal user settings changed.
- Feasibility spike: two public-root API checks passed; an earlier `node --test spike` command exited 1 because Node treated the directory as a module. Correct explicit-glob suite passed. This does not establish dynamic palette freshness.

## Not verified

No live picker selection/persistence, restart, terminal palette transport, input-routing side effects, visual rendering or Gentle Shell cached header/sidebar behavior was tested. The user confirms this parent session runs inside PlexusTerm; that does not prove package activation or colors. The automatic startup is best-effort only; `/reload` is intentionally followed by manual `/plexusterm-theme`.

## Manual acceptance

1. Start a separate Pi invocation in PlexusTerm using `pi -e .` from this project. To avoid normal settings changes, set `PI_CODING_AGENT_DIR` to an isolated directory under `.artifacts/` for that invocation.
2. Select `plexusterm` using `/settings`; run `/plexusterm-theme` to apply the snapshot now.
3. Restart Pi with the same isolated agent directory and `-e .`; check that the selected theme remains `plexusterm` and the startup snapshot message appears.
4. Change the PlexusTerm palette, run `/reload` and then `/plexusterm-theme`. Check the visible result, especially between two dark themes and between light/dark.
5. Inspect Gentle Shell panels, header/sidebar, selection, messages, tools and editor. Record stale views or contrast issues; no universal cache refresh is promised.

Do not call these manual checks passed until their results are observed. Native review and delivery status are recorded separately in the ODD task document.
