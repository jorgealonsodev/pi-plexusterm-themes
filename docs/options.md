# PlexusTerm theme: registered resource and explicit reapply

The approved behavior is one shared path: automatic startup and `/plexusterm-theme` both apply the already registered `plexusterm` theme object unchanged. The command is an explicit fallback/reapply, not a separate palette-conversion mode.

## Registered theme resource

`themes/plexusterm.json` exposes the name `plexusterm` through Pi's ordinary theme picker. Its ANSI indices and terminal-default values are interpreted by the terminal at render time. They are not a copied RGB palette, a snapshot of `system`, or a guarantee of contrast.

Selecting `plexusterm` through Pi's normal picker uses Pi's ordinary selection persistence. Merely loading the package or running the extension does not select it or write settings.

## Automatic startup

On a TUI `session_start` whose reason is `startup`, the extension first checks that `ctx.ui.theme.name` is exactly `plexusterm`. If so, it reads `ctx.ui.getTheme("plexusterm")` and passes that same object to `ctx.ui.setTheme(theme)`. A different selection, `/reload`, or non-TUI event does no theme work. No system lookup or theme construction occurs.

The automatic path reasserts the package's registered theme for the existing selected name. It neither changes the persisted choice nor claims to refresh all terminal or shell views. If the named resource is unavailable or application fails, the extension does not report success; a missing resource message points to loading the local package with `gentle-shell -e .`.

## Explicit apply/reapply: `/plexusterm-theme`

Run `/plexusterm-theme` to apply the registered object for the current session, even if another theme is currently active. It uses the same exact object as automatic startup and does not save a theme name. Select `plexusterm` through the picker when a persistent choice is desired. After `/reload`, the command can reapply that same resource; it does not substitute the `system` theme or create a different appearance by RGB conversion.

`/plexusterm-theme help` explains the behavior. Unexpected arguments retain the existing usage rejection, and non-TUI invocation retains its existing warning. Lookup or application failures leave the extension without a success report; missing lookup instructs users to load the local package rather than retrying a missing name.

## Scope and evidence

The extension uses only public Pi theme APIs and has no system-theme lookup, `Theme` constructor import, token arrays, color conversion, terminal query, settings write, timer, or shell-specific integration. The object reference and its ANSI/default sequences are tested across all 56 semantic roles, including the `toolPendingBg` and `toolSuccessBg` terminal-reset sequences and indexed green roles.

Prior A/B/C screenshots showed the accepted appearance after reload (A/C) and a regression after the command (B: green editor and orange section labels). A synthetic public-API reproduction isolated the command's ANSI/default-to-concrete-RGB conversion. The new regression tests compare both startup and command application with a public `Theme` built from the repository JSON resource. These checks diagnose and prevent the object/escape-sequence mismatch; they are not a new live visual acceptance run.

The package's tests do not prove terminal contrast, a specific rendered appearance, live palette updates, or that every Gentle Shell/Pi cached view refreshes. Human retesting in PlexusTerm/Gentle Shell remains separate; see [verification](verification.md).
