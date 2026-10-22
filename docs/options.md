# Behavior and design decisions

**Decision:** Automatic startup and `/plexusterm-theme` both apply the already registered `plexusterm` theme object unchanged. The command is an optional, session-only reapply—not a separate palette-conversion path.

## Behavior at a glance

| Path | When it acts | Effect |
|---|---|---|
| Automatic startup | TUI `session_start`, reason `startup`, active theme name exactly `plexusterm` | Calls `getTheme("plexusterm")`, then passes that same object to `setTheme(object)`. |
| Manual command | `/plexusterm-theme` in the interactive TUI | Applies the same registered object, regardless of the active theme. It does not persist a theme selection. |
| Help | `/plexusterm-theme help` in the interactive TUI | Explains the session-only apply behavior. |
| Reload | `/reload` | No automatic theme work. A user may run the command afterward to reapply the resource. |
| Guarded no-op | Automatic startup with another selected theme, or a non-TUI event/command | Does not apply the theme. |

Unexpected command arguments are rejected. Missing-theme and failed-application paths do not report success. A missing-resource message advises loading the package; for a Pi local run use `pi -e .`, and for Gentle Shell use `gentle-shell -e .` from the package directory.

## What the theme contains

`themes/plexusterm.json` registers the ordinary picker resource named `plexusterm`. Its foreground and background use terminal defaults, and its semantic colors use ANSI indices. The terminal interprets those values at render time.

The extension does not read `system`, detect a PlexusTerm palette ID, query the terminal, construct or convert a theme, or write settings. Startup only reasserts the package's registered theme when that name is already selected. The command can change the current session's theme but does not save the name; use Pi's normal picker when you want that selection persisted.

## Why one apply path

The previous system-snapshot implementation converted ANSI/default values into concrete RGB values. User-observed output changed after invoking the command: the editor became green and section labels orange, then `/reload` restored the prior appearance. The correction removed that conversion. Both paths now use the exact object returned by `getTheme("plexusterm")`, preserving the resource's ANSI and terminal-default sequences.

Changing PlexusTerm's palette does not make this extension fetch a new palette. If the host's view looks stale, `/reload` may be tried; the extension itself does nothing automatically on reload. Running `/plexusterm-theme` afterward is optional and reapplies the same resource—it is not a palette query or refresh mechanism.

## Compatibility and boundaries

The extension uses public Pi theme APIs and has no Gentle Shell-specific layer. This is the intended compatibility path for Pi in Gentle Shell as well as Pi. Actual host rendering, contrast, and refresh of every cached editor/header/sidebar/panel are not guaranteed.

The package is prepared as a public npm release candidate for version `0.1.0`; publication is pending. The manifest keeps the host peer range at `*`; Pi 1.2.0 is the tested baseline, not a guarantee that every host version is verified. Install and local-development instructions are in the self-contained `README.md`. This file and `docs/verification.md` are source-checkout documentation; the package's `files` allowlist does not include `docs/`.

## Evidence

The corrected manual command was observed in a shown Gentle Shell/PlexusTerm session: it reported that the registered theme was applied, while the editor retained the terminal background and green headers. The user accepted the result. This is evidence for that manual apply in that session only—not a verification of startup, restart behavior, all panels, other terminal palettes, or universal rendering. See [verification notes](verification.md) for test results and remaining limits.
