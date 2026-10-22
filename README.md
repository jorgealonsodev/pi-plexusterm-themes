# PlexusTerm theme for Pi

An experimental, dependency-free Pi package that exposes a terminal-relative theme named `plexusterm`. The extension reapplies the registered theme object unchanged at eligible startup and provides `/plexusterm-theme` as an explicit session-only apply/reapply command.

## How it works

- `themes/plexusterm.json` is the registered picker resource. Its terminal-default and ANSI-indexed colors remain terminal-relative; it is not a copied RGB palette.
- On TUI startup, if the active theme is already named `plexusterm`, the extension calls `ctx.ui.getTheme("plexusterm")` and passes that same object to `ctx.ui.setTheme(object)`. Other selected themes, reload events, and non-TUI sessions are unchanged.
- `/plexusterm-theme` explicitly applies the registered `plexusterm` object, regardless of the currently selected theme. It does not persist a selection; choose `plexusterm` through Pi's normal theme picker if you want Pi to remember that name.
- Neither path reads `system`, constructs or converts a theme, queries the terminal, writes settings, or changes a global theme selection.

This preserves the resource's ANSI/default escape sequences, including terminal-reset backgrounds. It does not clone the terminal's system theme, guarantee contrast, or ensure every shell view refreshes. The extension reports success only when Pi reports that applying the object succeeded. If the named resource cannot be found, it instructs you to load the local package rather than retrying the lookup.

## Commands

From this package directory, load it locally with either host:

```sh
pi -e .
gentle-shell -e .
```

Then select **plexusterm** in Pi's theme picker for automatic startup reapplication. You can also run `/plexusterm-theme` to apply or reapply the registered object for the current session, or `/plexusterm-theme help` for details. Unexpected arguments are rejected without reading or applying a theme.

The startup handler runs only for TUI `session_start` events whose reason is `startup` and whose active theme name is exactly `plexusterm`. It intentionally does nothing on `/reload`; after reload, use the command if you want to reapply the same registered resource. Loading the package or running the command does not persist the selected name.

## Boundaries

- The extension uses Pi's public `getTheme(name)` and `setTheme(Theme)` APIs. Gentle Shell compatibility is intended through these same APIs; no Gentle Shell-specific integration is present.
- Tests use Pi's public `Theme` constructor and fake extension contexts. No live Pi, PlexusTerm, or Gentle Shell visual retest has been performed for this correction.
- No exact contrast, live terminal palette update, or universal header/sidebar refresh is promised. A successful object application is not proof of pixel-level rendering.
- This package is private and unpublished. It does not alter PlexusTerm, Pi host code, package dependencies, or user settings.

See [option and evidence notes](docs/options.md), [verification](docs/verification.md), and the [PRD](PRD.md).
