# PlexusTerm theme: automatic attempt and manual recovery

The chosen experience is **automatic-primary, manual-fallback**. These are two parts of one bounded feature, not mutually exclusive product alternatives. The automatic path is best-effort; the command is the user's explicit retry when startup cannot apply a useful snapshot or after Pi reloads.

## Packaged picker resource

`themes/plexusterm.json` makes the name `plexusterm` available through Pi's ordinary theme picker. It is a neutral ANSI baseline, not a snapshot or a copied PlexusTerm/One Half palette: its foreground and background roles use terminal defaults, while color roles refer to ANSI indices 1–6 and 8. It does not force an appearance or export palette. Before a runtime snapshot, there is no guarantee that contrast, selection, or highlight colors will be complete or attractive in a particular terminal.

Pi's normal picker selection persists the theme name as Pi normally does. Loading the package or running its extension does not select this theme for the user.

## Primary: startup snapshot (best effort)

On `session_start` with reason `startup`, and only in TUI mode, the extension first checks that `ctx.ui.theme.name` is exactly `plexusterm`. Only then does it read `ctx.ui.getTheme("system")`, convert the public resolved RGB values for all supported semantic tokens, and apply a new `Theme` object named `plexusterm` through `ctx.ui.setTheme(Theme)`.

This attempt:

- uses only colors Pi already exposes; it makes no terminal query, delay, poll, or private import;
- does not modify the source `system` theme or persisted theme setting;
- does nothing if another theme is active, if startup is not TUI, or if the event is `/reload`;
- reports success only after Pi reports that the in-memory theme application succeeded;
- leaves the packaged ANSI resource as the fallback and gives a manual retry instruction on unavailable colors or apply failure.

The public API does not establish a color-ready callback. The startup value may therefore be a fallback or otherwise stale snapshot, and a later terminal reply is not automatically recopied. No provenance is available to prove those colors came from PlexusTerm or to identify the PlexusTerm palette ID.

## Recovery: `/plexusterm-theme`

Run `/plexusterm-theme` to explicitly retry the same snapshot using Pi's current public `system` theme values. Run it after `/reload` or if the startup colors look stale. `/plexusterm-theme help` explains the behavior; unexpected arguments are rejected.

The command also applies an in-memory `Theme` object only. It does not persist a theme name or write global settings. If the user selected `plexusterm` in the picker earlier, that separate saved choice remains; a manual invocation by itself does not make the picker selection persistent. On Pi restart the package resource loads again, and the startup attempt runs only if `plexusterm` remains the selected theme.

The snapshot concretizes RGB values that Pi's source theme resolves from terminal defaults and faint roles. It preserves the public source appearance and color mode but cannot preserve byte-for-byte ANSI behavior or guarantee exact terminal rendering.

## Status and verification boundary

The package manifest includes both the extension and the parent-owned JSON theme. Unit tests use Pi's public root `Theme` export and captured command/event registration with fake contexts. They cover startup-only activation, the selected-name guard, reload/non-TUI no-ops, all token values, and failure recovery. They do not prove the real PlexusTerm-to-Pi query/reply route, freshness, actual picker collision behavior, rendered colors, or behavior in a live session.

Gentle Shell compatibility is intended through the same public Pi `Theme` and `setTheme` APIs; no shell-specific layer is used. Shell header/sidebar cached views and rendered appearance have not been verified. The user's report that the current shell runs in PlexusTerm is context, not evidence that this extension loaded or that Pi received PlexusTerm palette values. The package remains private, unpublished, and experimental. No One Half RGB palette is copied. See [PRD.md](../PRD.md) for the original named-theme acceptance criteria and evidence history.
