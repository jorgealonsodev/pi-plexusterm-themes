# PlexusTerm theme for Pi

An experimental Pi package with an automatic **best-effort** startup snapshot and an explicit manual retry. It has no runtime dependencies; Pi supplies `@earendil-works/pi-coding-agent` as a peer dependency.

## How the two paths work together

1. The package exposes a `plexusterm` theme in Pi's picker. Its JSON is an ANSI-only fallback: it uses terminal-default foreground/background values and ANSI indices, not copied One Half or PlexusTerm RGB values. Before a snapshot, contrast and selection-highlight quality depend on the terminal.
2. If you select `plexusterm`, Pi persists that picker choice normally. On an initial interactive TUI startup, the extension checks that `plexusterm` is still active, reads the `system` theme currently available through Pi's public API, constructs a named in-memory snapshot, and applies it. This is a best-effort attempt—not a readiness or freshness guarantee.
3. If the startup attempt is unavailable or the colors look stale, run `/plexusterm-theme`. After `/reload`, Pi reapplies the packaged ANSI resource and this extension deliberately skips an automatic snapshot; invoke the command afterward to retry from Pi's current `system` theme.

The startup hook never selects `plexusterm` for you. It does nothing when another theme is active or outside TUI mode. It does not run on `/reload`, query the terminal, poll, wait a fixed delay, or identify the terminal app's selected palette.

## Manual command

- `/plexusterm-theme` — explicitly snapshot the `system` colors Pi currently exposes and apply a `Theme` object for this session.
- `/plexusterm-theme help` — explain the session-only snapshot.
- Other arguments are rejected without changing the theme.

The command uses `setTheme(Theme)`, not the string setter. It does not write Pi settings or persist a theme name. Choosing `plexusterm` in Pi's picker is a separate user action that persists through Pi's normal settings. After restarting Pi, the static named resource is available again and the best-effort startup attempt runs only if that name remains selected; repeat the command if needed.

Pi resolves `system` into semantic roles and may adjust colors for contrast. The snapshot copies the currently resolved RGB values into the public `Theme` constructor, preserves appearance and color mode, and approximates faint/default-terminal colors as concrete RGB. It is not a byte-identical ANSI clone and does not prove that the values came from PlexusTerm.

Gentle Shell compatibility is intended through these same public Pi `Theme` and `setTheme` APIs; no Gentle Shell-specific integration is required. This intent has not been validated in a live shell, and cached header/sidebar views or rendered appearance may not update.

## Local use

This package is private and unpublished (`0.1.0` experimental); there is no npm package to install. If you choose to try the local package for one Pi invocation, use:

```sh
pi -e /absolute/path/to/pi-plexusterm-themes
```

Then choose **plexusterm** through Pi's normal theme picker if you want the startup attempt. The local package invocation does not add a persistent package declaration. Selecting a theme through Pi's picker may update Pi's saved theme setting as normal; the extension itself does not change that setting.

## Boundaries

- Tested behavior is limited to dependency-free unit tests using Pi's public `Theme` constructor and fake extension contexts. No Pi/PlexusTerm session, terminal query route, palette freshness, rendered appearance, restart, or `/reload` result has been validated here.
- The current shell may be running inside PlexusTerm, but that alone does not prove this extension loaded or that Pi received PlexusTerm palette colors.
- No raw terminal input access, private imports, copied palette registry, custom queries, timers, file writes, or settings mutations are used.
- This is a best-effort automatic attempt with a manual recovery path, not a certified live or reload-synchronized theme. See [the option and evidence notes](docs/options.md).
