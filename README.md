# PlexusTerm theme for Pi and Gentle Shell

Use `plexusterm` to render Pi with terminal-default backgrounds and ANSI colors. Select it once for normal startup behavior; use `/plexusterm-theme` when you want to apply or reapply it for the current session.

> **Published:** `pi-plexusterm-themes@0.1.0` · MIT · Pi and Gentle Shell.

## Quick start

1. Install in the host you use:
   - **Pi:** `pi install npm:pi-plexusterm-themes`
   - **Gentle Shell:** `gentle-shell install npm:pi-plexusterm-themes`
2. Open that host and select `/settings` → **Theme** → **plexusterm**.
3. Keep the selection for future launches. Use `/plexusterm-theme` only when you want to apply or reapply it manually.

**Expected result:** the theme uses the terminal's default foreground/background and ANSI palette. Automatic and manual application keep the same mapping; the command does not fetch a separate RGB palette.

## 1. Load the package

Choose the host you actually use. Pi and Gentle Shell normally have separate package configurations.

### Install from npm

For Pi:

```sh
pi install npm:pi-plexusterm-themes
pi
```

For Gentle Shell:

```sh
gentle-shell install npm:pi-plexusterm-themes
gentle-shell
```

Install in both hosts only if you use both. Installation makes resources available; it does not select the theme for you.

### Try the local checkout without installing

From this repository's root, choose one:

```sh
pi -e .
```

```sh
gentle-shell -e .
```

The dot means the current directory. From somewhere else, replace it with the absolute path to this package.

`-e` loads the package only for that invocation. Keep using it on subsequent launches, or register the local checkout permanently:

```sh
pi install /absolute/path/to/pi-plexusterm-themes
```

```sh
gentle-shell install /absolute/path/to/pi-plexusterm-themes
```

Pi resolves local packages directly from that checkout: keep the directory available. These are installation commands, not publication commands.

## 2. Select the theme

1. Open `/settings` in the interactive TUI.
2. Open **Theme**.
3. Select **plexusterm**.

Pi saves the selection through its ordinary settings mechanism. On initial TUI startup, the extension reapplies the registered theme only if `plexusterm` is already active. It does not override another selected theme.

A saved theme name does not install its package. If you used `-e .`, include that option next time as well.

## 3. Use the command when needed

| Command | Result |
|---|---|
| `/plexusterm-theme` | Apply or reapply the registered terminal-relative theme in the current session. |
| `/plexusterm-theme help` | Explain the command without changing the theme. |
| `/reload` | Reload host resources. The extension deliberately performs no automatic theme application during this event. |

The manual command also works when another theme is active. It does **not** save the selection; use the picker if you want `plexusterm` after restarting.

Automatic and manual application now use the same registered object. Running the command should not replace terminal-relative backgrounds with the old green RGB panel or change the mapping to Pi's `system` theme.

## 4. Change the PlexusTerm palette

1. Choose another color scheme in PlexusTerm.
2. Inspect Pi or Gentle Shell. The terminal interprets the theme's ANSI indices and default foreground/background values.
3. If a host view looks stale, try `/reload`.
4. Optionally run `/plexusterm-theme` to reapply the same registered theme.

The command does not query PlexusTerm, fetch colors, or clone `system`. Do not treat it as a palette detector. Some cached host views may need a process restart; no universal refresh behavior or exact contrast is guaranteed.

## 5. Check that it worked

- The theme picker lists `plexusterm`.
- `/plexusterm-theme help` describes applying the registered theme, not creating a system snapshot.
- Successful manual application reports: `Applied the registered "plexusterm" theme for this session.` followed by selection guidance.
- Applying the command should retain the same terminal-relative mapping as the packaged theme loaded by `/reload`.

The corrected manual behavior was visually accepted in one Gentle Shell/PlexusTerm session. That observation does not certify every palette, panel, restart, or terminal combination.

## Troubleshooting

| Symptom | What to check |
|---|---|
| npm displays `Temporary Holding Version` / `0.0.0-stage` | That page shows npm's staging placeholder, not the verified `0.1.0` release. Check `npm view pi-plexusterm-themes version` and open the `0.1.0` version page. The public registry has the complete README; do not republish an unchanged version to fix a stale web page. |
| `/plexusterm-theme` is unknown | Confirm the package is loaded in this host, not only in the other host. For local testing, launch from the package root with `-e .`, or use an absolute package path. Read any extension-loading errors printed at startup. |
| `Theme not found: plexusterm` | Pi remembers the name but cannot find the resource in this invocation. Load/install the package in this host, or select another available theme. |
| The theme is missing after restarting | A prior `-e .` was temporary. Repeat it or install the local/npm package for future launches. |
| The command still mentions a system snapshot | Older extension code is loaded. Restart with the corrected package path; do not assume `/reload` replaces every module cache. |
| A header or sidebar keeps old colors | This may be a host cache. Try `/reload`, then restart if needed. Report the host, affected view, and steps; do not assume the whole theme failed. |
| The command is unavailable in RPC/headless mode | It requires the interactive TUI and deliberately does not apply a theme in non-TUI modes. |

## Remove the package

Select another available theme first. Then remove the same source you installed, in the relevant host.

For an npm installation:

```sh
pi remove npm:pi-plexusterm-themes
```

```sh
gentle-shell remove npm:pi-plexusterm-themes
```

For a local installation, use its installed source path instead. `pi list` or `gentle-shell list` shows the configured sources.

If you only used `-e .`, there is no persistent package declaration to remove. Stop passing that option, but choose another theme first if `plexusterm` was saved as your default.

## Compatibility and verification

The package uses Pi's public theme APIs; no Gentle Shell-specific patch is required. Pi 1.2.0 is the tested API baseline. The host peer range is `*`, not a claim that every Pi or Gentle Shell version has been verified.

The current suite passes 21 tests, including unchanged ANSI/default sequences for all 56 roles and guarded automatic/manual application. Resource loading and the theme schema have also been checked. Restart persistence, other palettes and every cached host view are not universally certified.

The npm package contains the extension, theme, this standalone guide and the license. Additional design and evidence documents are available as `docs/options.md` and `docs/verification.md` in the source checkout, not in the tarball.

## License

[MIT](LICENSE) — Copyright (c) 2026 Jorge Alonso.
