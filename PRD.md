# PRD: PlexusTerm Theme for Pi

- **Status:** The S10 terminal-relative apply/reapply behavior is implemented; live visual acceptance remains unverified.
- **Product target:** An installable Pi package with a registered `plexusterm` theme, guarded automatic startup reapplication, and an explicit `/plexusterm-theme` apply/reapply command.
- **Audience:** Pi users running inside PlexusTerm or Gentle Shell, package implementers, and reviewers.

## 1. Outcome and user path

The approved correction (S10, user: “si”) is to make startup and `/plexusterm-theme` apply the same registered `plexusterm` resource. The command must not replace the accepted appearance with a conversion of Pi's `system` theme. The theme resource is terminal-relative: its ANSI-indexed and terminal-default values are interpreted by the terminal when rendered.

The intended path is:

1. Load the local package only if the user chooses. It registers the named `plexusterm` theme and does not force activation.
2. Optionally select `plexusterm` through Pi's normal theme picker; Pi persists that choice through its usual settings.
3. On TUI `session_start` with reason `startup`, if the active name is already exactly `plexusterm`, the extension gets that registered theme object and passes the same object to `setTheme(object)`.
4. `/plexusterm-theme` explicitly gets and applies the same registered object for the current session, regardless of the currently active theme. Use it after `/reload` if a manual reapply is desired; automatic reload handling is intentionally a no-op.

Neither path reads `system`, constructs or clones a theme, converts ANSI/default values to RGB, queries the terminal, or writes global settings. Startup does not select a theme for the user. The command can change the current session's appearance but does not persist a theme name; select `plexusterm` in the picker for normal persistence.

Applying the same `Theme` object preserves its ANSI/default escape sequences. This does not guarantee contrast, exact visual output, refresh of every cached view, or a particular PlexusTerm palette identity. Gentle Shell compatibility is intended through the same public Pi theme APIs; no shell-specific integration is included.

## 2. Product decisions and boundaries

| Topic | Requirement / boundary |
|---|---|
| Pi theme identity | Provide the selectable name `plexusterm`, distinct from Pi’s reserved `system` theme. |
| Palette behavior | Apply the registered terminal-relative theme object unchanged. Do not clone or RGB-map `system`, maintain a copied palette, or query the terminal. |
| Selection | The user selects the named theme through Pi’s ordinary picker; selection persists normally. Install/load and the command never force or persist selection. |
| Automatic behavior | Only on TUI `session_start` reason `startup`, and only when `ctx.ui.theme.name === "plexusterm"`; apply the exact object returned by `getTheme("plexusterm")`. |
| `/reload` | Automatic handling is skipped. A user may explicitly invoke the command afterward to reapply the same named resource; no system lookup or new snapshot is performed. |
| Manual command | `/plexusterm-theme` explicitly applies that exact registered object even if another theme is currently active. Help and unexpected-argument behavior remain bounded and side-effect free. |
| Failures | Missing/throwing named lookup and failed/throwing `setTheme` must not report success or intentionally alter saved selection. A missing resource directs the user to load the local package with `gentle-shell -e .`. |
| Environment | Support intent includes Pi running in PlexusTerm and Gentle Shell through the same public Pi theme APIs. Local rendering, shell header/sidebar refresh, SSH, and multiplexers remain unverified and are not unconditional support claims. |

### Names that must not be conflated

- `system` is a distinct Pi theme name and is not an input to this feature.
- `plexusterm` is the package's registered Pi theme resource and the only name used for automatic and manual apply.
- PlexusTerm's own built-in palette ID is not read or detected by this package, even if its string matches the Pi resource name.

The package does not implement a system-theme alias or dynamically inherit a current RGB palette. It reapplies its own registered resource, whose terminal-relative ANSI/default values are interpreted by the terminal.

## 3. Decision history and current limits

Earlier S2/S7/S8 research explored converting Pi's public `system` theme into a runtime snapshot. S10 supersedes those snapshot requirements after the user observed that the manual command changed the accepted appearance. The old source/API and transport research remains in section 4 as historical context only; it is not the current architecture or an acceptance requirement.

The following freshness/readiness criteria were researched for the earlier system-snapshot design. They are preserved for history, not as acceptance criteria after S10:

1. Discover a unique `plexusterm` resource in Pi’s normal picker without silently replacing a name collision.
2. Persist selection by that name through Pi’s normal setting, separately from the in-memory `Theme` object.
3. Use values from the current terminal query, including late replies, rather than a stale/fallback `system` snapshot.
4. Prevent stale results or host theme application from replacing fresh values or a later user theme choice.
5. Refresh from current values on `/reload` if reload support is claimed.

Pi 1.2.0 publicly exposes `ctx.ui.theme`, `getAllThemes()`, `getTheme(name)`, and `setTheme(string | Theme)`. `Theme` and related color/token types are exported. These are confirmed APIs, but no public dynamic theme-registration API or color-ready completion/refresh subscription has been established. A theme object’s `name` alone does not register a resource or make its selection persistent. The string and object `setTheme` paths also differ: selecting by string persists the global setting; applying a `Theme` object is in-memory.

**Current implementation:** The extension uses public `getTheme("plexusterm")` and passes the returned object unchanged to public `setTheme(object)`. Automatic startup retains the active-name guard; the command explicitly applies the same registered resource. The code does not import the `Theme` constructor, enumerate tokens, validate or clone the resource, inspect settings, or use a separate implementation path. Tests compare all 56 ANSI/default sequences, but cannot certify live rendering, contrast, or cached host views.

## 4. Historical evidence and confidence (system-snapshot exploration)

This section preserves research collected for the earlier system-snapshot proposal. “Source-confirmed” means supported by the inspected source/API, not demonstrated end to end; these findings do not authorize or describe the current apply path.

| Finding | Evidence and limit |
|---|---|
| Pi public theme API | Pi 1.2.0 `dist/core/extensions/types.d.ts:177-192` exposes theme accessors and setters; `dist/index.d.ts:37` exports `Theme` and theme token/color types. Public API existence does not establish dynamic registration or readiness. |
| Pi selection persistence | `dist/modes/interactive/interactive-mode.js:2090-2099` and `dist/core/settings-manager.js:576-579`: selecting by theme name persists the global setting. `setTheme(Theme)` applies an object in memory through `dist/modes/interactive/theme/theme-controller.js:102-109`. |
| Pi startup timing | `dist/modes/interactive/interactive-mode.js:705-713`: UI starts, settings theme is applied, then `waitForTerminalColors` is awaited. The wait has a 100 ms timeout; late replies are possible. A reliable public readiness hook is not established. |
| Pi `/reload` order | `interactive-mode.js:5404,5411-5413`: reload awaits session reload (which emits `session_start`), registers resource-loader themes, applies runtime settings, then applies the theme from settings and starts native color querying. Host re-query is source-confirmed; whether an extension clone refreshes from that result or survives later host application is runtime-unverified. |
| Pi system theme | Pi `themes.md` documents semantic mapping and contrast adjustments; `dist/modes/interactive/theme/theme-controller.js:150-210` handles terminal colors and light/dark notifications. This does not prove arbitrary palette-change detection, especially dark-to-different-dark. |
| PlexusTerm palette/settings | `src/features/terminal/themes.ts:5-51` defines theme entries and the internal registry. `src/features/settings/useSettings.ts:8-39` and `src/features/settings/settings.ts:402-455` load/save the selected ID and handle defaults. These are app internals, not a package contract. |
| PlexusTerm applies palette | `src/features/terminal/TerminalView.tsx:361-364,1102-1114` initializes and updates xterm’s theme. |
| xterm OSC support | `node_modules/@xterm/xterm/src/common/InputHandler.ts:299-308` handles OSC 4/10/11; `node_modules/@xterm/xterm/src/browser/CoreBrowserTerminal.ts:184-217` replies from current ThemeService colors and emits terminal data. Dependency capability does not prove app transport. |
| PlexusTerm data route | `TerminalView.tsx:911-912` routes `onData` through the typed handler; its path calls `write(data)` and `backend.write(sessionId, data)` (`TerminalView.tsx:618-620,778-788`). The handler also has input/tracking side effects and suppresses writes during `cancelConnect`; full filtering behavior and live query/reply delivery have not been verified. |
| Existing documentation | Pi themes/packages/extensions docs describe package themes and APIs. PlexusTerm `docs/user-guide.md:332` says terminal theme changes update immediately; it does not say Pi receives or refreshes those colors. |

The parent independently checked the installed Pi 1.2.0 declarations and runtime paths during that earlier research. This material is historical context; there has been no live visual acceptance test for the current behavior.

### Evidence interpretation

- OSC support and a plausible data route are source-confirmed; end-to-end delivery, filtering, and input safety are runtime-unverified.
- Pi’s `/reload` host behavior was researched for the former snapshot path; the current extension makes no system lookup on reload.
- The former `system` snapshot could not prove raw PlexusTerm palette values; it is not used by the current implementation.
- `TERM`/`COLORTERM` values are not palette identity. Do not report a detected PlexusTerm theme ID.
- Gentle Shell compatibility is intended through the same public Pi `Theme`/`setTheme` APIs. Shell header/sidebar cached views and rendered behavior have not been tested.

## 5. Scope

### In scope

- A standard Pi package theme resource named `plexusterm` with terminal-relative ANSI/default colors, plus the public extension.
- Explicit user selection and persistence through Pi’s normal picker mechanism.
- Reapply the registered `plexusterm` object at initial TUI startup only when the active theme name is exactly `plexusterm`.
- The explicit `/plexusterm-theme` command to apply/reapply the same registered object for the current session, including after `/reload`.
- Tests for public command/event registration, same-object application and all 56 ANSI/default sequences, the selected-name guard, unsupported modes, and failure behavior.
- Documentation of terminal-relative colors, apply/reapply behavior, limitations, and compatibility intent for Pi in PlexusTerm and Gentle Shell through the same APIs.

### Out of scope

- Implementing or changing PlexusTerm, Pi host code, xterm, Gentle Shell, or sibling repositories.
- Reading PlexusTerm’s `settings.json`, importing its TypeScript registry, or assuming a stable private path.
- Shipping a copied PlexusTerm/One Half fixed RGB palette or claiming the ANSI fallback is a system-derived clone.
- Automatic activation on install/load when another theme is selected, or automatic snapshotting on `/reload`.
- Custom raw-stdin query loops, polling, delays, direct terminal queries, private imports, or shell-specific integration code.
- Guaranteed color freshness, late-response refresh, pixel/hex equality, terminal-theme identity detection, or arbitrary live palette updates.
- Unconditional compatibility claims for cached Gentle Shell views, remote/multiplexed sessions, or untested platforms.

## 6. Requirements and acceptance criteria

The original `R#` IDs are retained for traceability. S10 supersedes the system-snapshot portions of S2/S7/S8; current pass conditions below describe the accepted terminal-relative apply/reapply behavior, not the former freshness design.

| Requirement ID / area | Pass condition |
|---|---|
| R1 — Discovery and identity | The normal Pi picker exposes one unambiguous resource named `plexusterm`; it is distinct from `system` and does not silently shadow a name collision. The app’s fixed palette ID is not treated as package identity. |
| R2 — Install/load safety | Passive load and automatic startup do not write user configuration or persist a selection. Manual object application is session-only. No private settings read, copied registry, package self-rewrite, or generated user-theme collision is used. |
| R3 — Explicit selection | Selecting `plexusterm` through Pi’s normal picker selects that resource and persists the name across Pi restart. No extra enable command is required. |
| R4 — Initial palette | On guarded startup and explicit command, the exact registered `plexusterm` object is applied unchanged; all 56 `getFgAnsi`/`getBgAnsi` results, including terminal-default resets, match the resource. No `system` RGB mapping occurs. |
| R5 — Restart distinction | Pi restores its normally persisted `plexusterm` picker choice; eligible startup reapplies the registered object. PlexusTerm app restart and its palette persistence are separate and are not modified or verified here. |
| R6 — `/reload` | Automatic handling on reload is a no-op. If the user runs `/plexusterm-theme` afterward, it reapplies the same registered `plexusterm` object; it does not switch appearance by mapping `system`. |
| R7 — Missing/failed public action | Missing or throwing named lookup and false/throwing `setTheme` do not report success. The extension performs no asynchronous terminal query or late-response work. Missing resource instructions point to loading the local package. |
| R8 — Input and conversation safety | This package adds no OSC query or terminal input handling. It makes no claim about unrelated host input routing and does not add competing queries. |
| R9 — Non-TUI | RPC/headless or other non-TUI loading causes no theme mutation and makes no claim of successful visual selection. |
| R10 — User changes | Automatic application is guarded by the active name; manual application is an explicit command and can apply `plexusterm` regardless of current selection. Neither path persists a name; rejected or failed actions do not report success. |
| R11 — Compatibility claims | Initial target is local interactive Pi in PlexusTerm on Linux. Expand platform, SSH, or multiplexer claims only with separate observed evidence. |

### Current bounded-path acceptance and evidence

| ID | Pass condition | Evidence/status |
|---|---|---|
| B1 — Resource | Package manifest exposes the parent-owned `themes/plexusterm.json`; fallback uses ANSI/default roles rather than fixed RGB values. | Unit test checks manifest and JSON role/value structure; parent independently reports schema structural RED/GREEN. Live picker discovery and collisions remain unverified. |
| B2 — Passive load | Extension registration adds only `/plexusterm-theme` and `session_start`; no theme read, setting write, timer, or query during factory registration. | Unit test using captured registrations and fake Pi API. |
| B3 — Startup apply | Only TUI `session_start` reason `startup` with active `ctx.ui.theme.name === "plexusterm"` gets `plexusterm` and applies that same object. | Focused tests compare object identity and all 56 ANSI/default sequences; other selection, reload, and non-TUI are no-ops. |
| B4 — Unchanged resource | Pass the object returned by `getTheme("plexusterm")` directly to `setTheme`; do not clone or mutate it. | Focused tests construct the registered baseline from repository JSON with Pi's public `Theme` export and verify all 56 ANSI getters. |
| B5 — Manual apply and errors | `/plexusterm-theme` explicitly applies the named object; help/unknown args, missing/throwing lookup, and failed/throwing setter do not report success or change the fake saved selection. | Focused fake-context tests; current theme application is session-only. |
| B6 — Reapply | Startup and command use the same named resource. Automatic reload handling is skipped; a missing resource message directs the user to load the package with `gentle-shell -e .`. | Focused tests cover lookup/apply failures and reload no-op. Live host rendering remains unverified. |
| B7 — Compatibility intent | Use the same public Pi theme interfaces in PlexusTerm and Gentle Shell, with no shell-specific code. | Source architecture supports this intent; shell header/sidebar caching and rendered appearance are untested. |

## 7. Implemented terminal-relative architecture

`themes/plexusterm.json` registers the terminal-relative `plexusterm` resource. The extension registers a command and one `session_start` handler, with no theme reads during factory registration. At `reason === "startup"`, it checks TUI mode and the active name; only an exact `plexusterm` match proceeds to call `getTheme("plexusterm")` and pass the returned object unchanged to `setTheme(object)`. The command explicitly repeats that same operation regardless of the current selection. Automatic reload handling is a no-op.

Registered `plexusterm` JSON resource → public `getTheme("plexusterm")` → same object passed to public `setTheme(object)` → in-memory TUI application.

The public apply path and unit behavior are implemented. Visible rendered results, exact contrast, and shell cached-view updates remain unverified. Unit tests do not establish a live visual result.

## 8. Delivery and release gate

### Historical Stage 0 — System-snapshot feasibility (superseded by S10)

1. Prove a supported way to register/discover and persist the named resource without collisions or private imports.
2. Determine how a companion can obtain the resolved system semantic values after current query results, including late replies, without a fixed-delay guess.
3. Test startup ordering and verify stale results or host theme application cannot overwrite the current clone or a user’s later selection.
4. Test initial dark, light, and alternate-dark palettes in the local Linux PlexusTerm/Pi TUI path; record versions, selected palette, query/reply evidence, and visible result.
5. Separately test `/reload` after a palette change, especially dark-to-dark. Host re-query alone is not a pass.
6. Exercise unsupported, delayed, and late replies plus conversation input retention.

**Historical note:** These criteria applied to the superseded system-snapshot design. They are not required for the current terminal-relative apply/reapply behavior, which makes no freshness or terminal-query claim.

### Stage 1 — Registered terminal-relative resource (implemented)

- Package the registered terminal-relative resource and extension through Pi’s manifest.
- At initial TUI startup, apply only when `plexusterm` is already active; leave reload reapplication explicit.
- Apply the public registered theme object in memory; never write theme settings or select a theme automatically.
- Run focused command/event tests and package checks; retain the private/unpublished experimental status.

### Stage 2 — Local acceptance (not run)

- With user authorization, use Pi’s picker and restart flow to inspect automatic reapplication in PlexusTerm.
- Test `/plexusterm-theme` after `/reload` and a later manual theme choice.
- Record Gentle Shell separately; same API use is the support intent, but cached header/sidebar and rendered views require observation before compatibility claims.

### Later work — separate decision

Arbitrary live palette changes, additional operating systems, remote sessions, or a producer-side export bridge require separate evidence and scope approval. Do not add polling, private file readers, raw terminal watchers, or host deep imports as shortcuts.

## 9. Risks and unresolved questions

| Risk / unknown | Why it matters | Response |
|---|---|---|
| No exact contrast/rendering guarantee | The terminal interprets ANSI/default colors, and host views may cache rendered content. | Preserve the registered resource unchanged; do not claim exact contrast or universal view refresh. |
| Startup and `/reload` ordering | Pi may reapply its persisted resource during reload, so an explicit reapply may be useful afterward. | Guard startup by the active name, skip automatic reload, and let the user invoke the command to apply the same resource. |
| Theme name collision | Existing Pi resources may already use `plexusterm`. | Check registry behavior and fail safely; never silently replace a resource. |
| Terminal-relative appearance | The same ANSI/default escapes may render differently across terminals and palettes. | Describe the resource as terminal-relative; make no exact contrast or pixel-equivalence promise. |
| Host rendering and cached views | Unit tests cannot show whether every TUI or shell surface refreshes. | Keep visual and Gentle Shell panel acceptance explicitly unverified; do not add terminal queries. |
| Explicit command changes current session | The user may run the command while another theme is active. | Keep it an explicit user action, apply only the registered object, and do not persist the name. |
| Terminal or forwarding differences | ANSI/default rendering can vary by terminal and forwarding layer. | Scope claims to the shared public Pi APIs; require human visual evidence before broader compatibility claims. |

Product direction is resolved: guarded automatic startup and explicit manual apply use one registered terminal-relative resource. Remaining evidence is live picker behavior, rendered appearance, and Gentle Shell cached views. The implementation does not claim these have passed.

## 10. Validation and review record

The implementation uses a dependency-free ESM extension, the parent-owned registered `plexusterm` resource, and fake-context tests built with Pi's public `Theme` export. The pre-fix focused regression run exited 1 with 25 passing tests and both new regression tests failing on object identity and ANSI/default escape mismatch. After the fix, the focused suite passed 21/21 and `npm test` passed 21/21. The tests do not launch Pi, PlexusTerm, or Gentle Shell. No terminal query, model, host setting, or live session was touched.

The requested `git archive` differential scratch check was not run because `.artifacts/base-visual-fix` is outside the allowed edit surfaces; no comparison result is claimed. A/B/C screenshots and the synthetic public-command probe are defect-diagnosis evidence, not a live retest of this correction. Picker behavior, rendered output, and Gentle Shell cached views remain unverified; see `docs/verification.md` for exact evidence and the human retest boundary.

Three independent read-only reviewers contributed prior findings. Their source evidence remains preserved above as historical research, not review of the corrected implementation.

## 11. References

### Pi 1.2.0 documentation and runtime

- Installed documentation: `themes.md`, `packages.md`, `extensions.md`, `tui.md`, `terminal-setup.md`, `configuration.md`, and `settings.md`.
- Installed runtime: `dist/core/extensions/types.d.ts:177-192`; `dist/index.d.ts:37`; `dist/modes/interactive/interactive-mode.js:705-713,2090-2099,5404,5411-5413`; `dist/core/settings-manager.js:576-579`; `dist/modes/interactive/theme/theme-controller.js:102-109,150-210`.
- Official documentation: [Themes](https://pi.dev/docs/latest/themes), [Packages](https://pi.dev/docs/latest/packages), and [Extensions](https://pi.dev/docs/latest/extensions). Online docs may evolve beyond the inspected Pi 1.2.0 runtime.
- Theme JSON schema: <https://pi.dev/schemas/theme.schema.json>.
- Context7 documentation references already consulted: `/earendil-works/pi` and `/websites/pi_dev`.

### PlexusTerm and xterm sources

Application paths are relative to `/mnt/480GB/Proyectos/Personales/20261015_plexusterm/20261015_plexusterm_git/PlexusTerm`.

- `src/features/terminal/themes.ts:5-51`.
- `src/features/settings/useSettings.ts:8-39`; `src/features/settings/settings.ts:402-455`.
- `src/features/terminal/TerminalView.tsx:361-364,618-620,778-788,911-912,1102-1114`.
- `node_modules/@xterm/xterm/src/common/InputHandler.ts:299-308`.
- `node_modules/@xterm/xterm/src/browser/CoreBrowserTerminal.ts:184-217`.
- xterm protocol reference: <https://xtermjs.org/docs/api/vtfeatures/>.
- PlexusTerm user guide: `docs/user-guide.md:332` (terminal theme update behavior; no claim that Pi refreshes).

**Evidence boundary:** Sources establish documented APIs and component capabilities. They do not establish dynamic named-theme registration, readiness, end-to-end query/reply delivery, rendered color equivalence, refresh timing, or live theme-switch behavior.
