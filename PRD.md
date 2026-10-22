# PRD: PlexusTerm Theme for Pi

- **Status:** Best-effort startup snapshot plus manual recovery implemented; full freshness/reload lifecycle acceptance remains unverified.
- **Product target:** An installable Pi package with a selectable `plexusterm` ANSI fallback, a best-effort startup snapshot from Pi’s public `system` theme, and an explicit `/plexusterm-theme` retry.
- **Audience:** Pi users running inside PlexusTerm, package implementers, and reviewers.

## 1. Outcome and user path

A user wants Pi’s interactive TUI to use colors from the palette exposed through Pi’s public `system` theme, without maintaining a hand-copied PlexusTerm palette or reading private PlexusTerm settings. The latest user direction is automatic-primary with a manual command when the automatic attempt is unavailable or stale. The implementation is deliberately best-effort, not a guarantee that Pi has received fresh terminal colors.

The intended path is:

1. Install/load the package only if the user chooses. It makes a selectable Pi theme named `plexusterm` available as a neutral ANSI fallback; it does not force activation.
2. Select `plexusterm` through Pi’s normal theme picker. Pi persists that name through its usual settings mechanism.
3. On an initial interactive TUI `session_start` with reason `startup`, if `plexusterm` is still the active named theme, the extension reads the currently available `system` theme and attempts one in-memory snapshot. It does not wait for or query the terminal.
4. If that attempt fails or looks stale, run `/plexusterm-theme`. After `/reload`, run the command manually: the extension intentionally skips automatic cloning on reload because Pi’s host theme/resource application order can replace an earlier object.

The automatic attempt never selects `plexusterm` for the user and never runs when another theme is active. Applying the constructed `Theme` object is session-only and does not write a persisted name. If the user separately selected `plexusterm` in the picker, that saved choice remains; Pi restores the packaged ANSI fallback on reload/restart before any eligible best-effort startup attempt.

PlexusTerm app restart is a separate lifecycle event; its saved palette choice is owned by PlexusTerm. Neither the startup attempt nor manual command proves that Pi’s current `system` values came from PlexusTerm or match a raw palette hex-for-hex. Pi maps terminal colors to semantic roles and may adjust contrast; it does not reproduce PlexusTerm’s window chrome.

## 2. Product decisions and boundaries

| Topic | Requirement / boundary |
|---|---|
| Pi theme identity | Provide the selectable name `plexusterm`, distinct from Pi’s reserved `system` theme. |
| Palette source | Snapshot the semantic values currently exposed by Pi’s public `system` theme; never read PlexusTerm’s private registry or copy a fixed RGB palette. The packaged resource is an ANSI-only fallback, not a resolved clone. |
| Selection | The user selects the named theme through Pi’s ordinary picker; selection persists normally. Install/load and the command never force or persist selection. |
| Update behavior | Attempt one in-memory refresh only on TUI `session_start` reason `startup`, and only while `ctx.ui.theme.name === "plexusterm"`. It must not affect another active theme. No late-reply refresh is promised. |
| `/reload` | Invoked manually by the user; the package does not invoke it. Automatic cloning is skipped on reload because Pi may reapply the configured theme after extension startup. Run `/plexusterm-theme` afterward; freshness remains best-effort. |
| Live changes | Arbitrary in-session palette changes are not promised. Test required cases separately before making any claim. |
| Provenance | The package must not claim to identify PlexusTerm’s selected theme or prove the source of received colors. |
| Environment | Support intent includes Pi running in PlexusTerm and Gentle Shell through the same public Pi theme APIs. Local rendering, shell header/sidebar refresh, SSH, and multiplexers remain unverified and are not unconditional support claims. |

### Names that must not be conflated

- Pi reserves the theme name `system`; it is the source of resolved semantic colors, not the deliverable selectable identity.
- `plexusterm` is both the Pi static fallback resource name and the name used by the in-memory snapshot. The Pi registry’s collision behavior must be verified in a live picker; never silently replace another resource.
- PlexusTerm source has a fixed built-in palette ID `plexusterm`. That app palette ID is unrelated to the dynamic Pi theme resource, even though the strings match.

There is no documented JSON theme alias/inheritance feature established by the reviewed sources. Do not describe this resource as an alias that automatically inherits `system`.

## 3. Feasibility and best-effort limits

A package theme manifest and public `Theme` constructor support the bounded implementation: a static named ANSI fallback, an explicit in-memory snapshot command, and one guarded best-effort startup attempt. They do **not** establish the stronger automatic named-clone lifecycle that the original proposal wanted. Public color readiness, late-reply refresh, and post-`/reload` ordering remain unresolved.

The original full automatic acceptance still requires evidence for all of the following:

1. Discover a unique `plexusterm` resource in Pi’s normal picker without silently replacing a name collision.
2. Persist selection by that name through Pi’s normal setting, separately from the in-memory `Theme` object.
3. Use values from the current terminal query, including late replies, rather than a stale/fallback `system` snapshot.
4. Prevent stale results or host theme application from replacing fresh values or a later user theme choice.
5. Refresh from current values on `/reload` if reload support is claimed.

Pi 1.2.0 publicly exposes `ctx.ui.theme`, `getAllThemes()`, `getTheme(name)`, and `setTheme(string | Theme)`. `Theme` and related color/token types are exported. These are confirmed APIs, but no public dynamic theme-registration API or color-ready completion/refresh subscription has been established. A theme object’s `name` alone does not register a resource or make its selection persistent. The string and object `setTheme` paths also differ: selecting by string persists the global setting; applying a `Theme` object is in-memory.

**Chosen bounded implementation:** A discoverable static ANSI JSON fallback plus a runtime extension that attempts a one-time public `system` snapshot at initial TUI startup only when `plexusterm` is already active. `/plexusterm-theme` is the user-invoked retry, including after `/reload`. This satisfies the latest automatic-primary/manual-fallback direction without claiming the stronger freshness gate has passed. Avoid self-rewriting, private imports, raw terminal queries, polling, and fixed-delay hacks.

## 4. Evidence and confidence

“Source-confirmed” means supported by the inspected source/API, not demonstrated end to end. “Runtime-unverified” means the actual PlexusTerm → Pi session has not been tested.

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

The parent independently checked the installed Pi 1.2.0 declarations and runtime paths. One of three read-only reviewers could inspect Pi documentation but not its installed runtime; that limitation is resolved for the APIs and source order above, but not for dynamic registration or runtime behavior. No end-to-end test has been run and no code has been built.

### Evidence interpretation

- OSC support and a plausible data route are source-confirmed; end-to-end delivery, filtering, and input safety are runtime-unverified.
- Pi’s `/reload` host re-query is source-confirmed; this extension deliberately skips automatic cloning on reload, and current values after the re-query are unverified.
- `system` semantic colors are not guaranteed to equal PlexusTerm’s raw palette values or chrome colors. A startup/manual snapshot may use whatever Pi currently exposes, including fallback or stale values.
- `TERM`/`COLORTERM` values are not palette identity. Do not report a detected PlexusTerm theme ID.
- Gentle Shell compatibility is intended through the same public Pi `Theme`/`setTheme` APIs. Shell header/sidebar cached views and rendered behavior have not been tested.

## 5. Scope

### In scope

- A standard Pi package theme resource named `plexusterm` containing a neutral ANSI fallback, plus the public extension.
- Explicit user selection and persistence through Pi’s normal picker mechanism.
- One best-effort `system` snapshot at initial TUI startup when the active theme name is exactly `plexusterm`.
- The explicit `/plexusterm-theme` command as a manual retry, including after `/reload`.
- Tests for public command/event registration, snapshot conversion, the selected-name guard, unsupported modes, and failure behavior.
- Documentation of fallback colors, snapshot semantics, limitations, and compatibility intent for Pi in PlexusTerm and Gentle Shell through the same APIs.

### Out of scope

- Implementing or changing PlexusTerm, Pi host code, xterm, Gentle Shell, or sibling repositories.
- Reading PlexusTerm’s `settings.json`, importing its TypeScript registry, or assuming a stable private path.
- Shipping a copied PlexusTerm/One Half fixed RGB palette or claiming the ANSI fallback is a system-derived clone.
- Automatic activation on install/load when another theme is selected, or automatic snapshotting on `/reload`.
- Custom raw-stdin query loops, polling, delays, direct terminal queries, private imports, or shell-specific integration code.
- Guaranteed color freshness, late-response refresh, pixel/hex equality, terminal-theme identity detection, or arbitrary live palette updates.
- Unconditional compatibility claims for cached Gentle Shell views, remote/multiplexed sessions, or untested platforms.

## 6. Requirements and acceptance criteria

Each `R#` records the original full named-theme requirement and its observable acceptance test. The best-effort implementation below is a bounded compromise; it does not make the freshness/readiness/reload requirements pass.

| Requirement ID / area | Pass condition |
|---|---|
| R1 — Discovery and identity | The normal Pi picker exposes one unambiguous resource named `plexusterm`; it is distinct from `system` and does not silently shadow a name collision. The app’s fixed palette ID is not treated as package identity. |
| R2 — Install/load safety | Install, load, and reload do not change the selected Pi theme or mutate user configuration. No private settings read, copied registry, package self-rewrite, or generated user-theme collision is used. |
| R3 — Explicit selection | Selecting `plexusterm` through Pi’s normal picker selects that resource and persists the name across Pi restart. No extra enable command is required. |
| R4 — Initial palette | With Pi stopped, choose a PlexusTerm dark palette and start Pi; repeat for light and a visibly different alternate dark palette. The selected named resource reflects the semantic colors resolved from the current terminal response, not a hard-coded/default-only result. |
| R5 — Restart distinction | Restart Pi alone after changing the PlexusTerm palette while Pi is stopped. Record PlexusTerm app restart separately; verify its own saved setting independently if tested. |
| R6 — `/reload` | Change the palette while Pi is running and run `/reload`; test a different palette, especially dark-to-different-dark. Pass only if the refreshed named resource uses current results after Pi’s host re-query and later theme application. Otherwise document the limitation and do not claim reload support. |
| R7 — Unsupported/delayed/late reply | Distinguish unavailable or fallback values from fresh terminal-derived values. Ignore stale responses; do not replace the selected theme after the user has chosen another theme. Do not invent a fallback color or timing claim. |
| R8 — Input and conversation safety | Verify OSC query replies traverse the normal PlexusTerm route without corrupting typed input, conversation content, or tracking behavior. Do not add competing custom queries. |
| R9 — Non-TUI | RPC/headless or other non-TUI loading causes no theme mutation and makes no claim of successful visual selection. |
| R10 — User changes | If the package refreshes the resource while `plexusterm` is selected, it may update that resource; after the user chooses another theme, later responses/reload/package activity must not switch back. Rejected or failed actions leave settings unchanged. |
| R11 — Compatibility claims | Initial target is local interactive Pi in PlexusTerm on Linux. Expand platform, SSH, or multiplexer claims only with separate observed evidence. |

### Current bounded-path acceptance and evidence

| ID | Pass condition | Evidence/status |
|---|---|---|
| B1 — Resource | Package manifest exposes the parent-owned `themes/plexusterm.json`; fallback uses ANSI/default roles rather than fixed RGB values. | Unit test checks manifest and JSON role/value structure; parent independently reports schema structural RED/GREEN. Live picker discovery and collisions remain unverified. |
| B2 — Passive load | Extension registration adds only `/plexusterm-theme` and `session_start`; no theme read, setting write, timer, or query during factory registration. | Unit test using captured registrations and fake Pi API. |
| B3 — Startup attempt | Only TUI `session_start` reason `startup` with active `ctx.ui.theme.name === "plexusterm"` reads `system` and attempts an in-memory snapshot. | Unit tests cover startup, another selected theme, reload, and non-TUI. No host lifecycle run. |
| B4 — Snapshot | Construct via public `Theme`, copy all 56 supported semantic RGB tokens, preserve source appearance/color mode, and leave the source instance unchanged. | Focused unit tests use Pi’s public root constructor for dark, light, and alternate-dark source themes. |
| B5 — Manual retry and errors | `/plexusterm-theme` is explicit; help/unknown args, missing/invalid source, and setter failures do not report success or mutate fake persisted settings/selection. | Focused fake-context tests. Actual Pi settings remain unobserved. |
| B6 — Recovery | Automatic failure retains the named JSON fallback and directs the user to the manual command; automatic reload handling is skipped. | Unit tests cover missing source, setter false/throw, and reload no-op. Real host reapplication remains unverified. |
| B7 — Compatibility intent | Use the same public Pi theme interfaces in PlexusTerm and Gentle Shell, with no shell-specific code. | Source architecture supports this intent; shell header/sidebar caching and rendered appearance are untested. |

## 7. Implemented bounded architecture; full freshness unverified

`themes/plexusterm.json` registers a neutral ANSI fallback. The extension registers a command and one `session_start` handler, with no startup work during factory registration. At `reason === "startup"`, it first checks TUI mode and the active theme name; only an exact `plexusterm` match proceeds to read Pi’s current public `system` theme, construct a named in-memory `Theme`, and call `setTheme(Theme)`. The command manually repeats that same operation at the user’s request. Reload is an explicit manual-recovery path, not an automatic snapshot hook.

`PlexusTerm palette (delivery/provenance unverified)` → terminal/Pi color handling → Pi’s currently available `system` semantic theme → guarded startup attempt or manual command → public `Theme` instance → in-memory TUI application.

The public path and unit behavior are implemented. The full query/reply delivery, readiness, current-result timing, visible rendered result, and shell cached-view updates remain unverified. Do not infer that a startup hook means terminal colors are ready.

## 8. Delivery and release gate

### Stage 0 — Full automatic freshness evidence (still open)

1. Prove a supported way to register/discover and persist the named resource without collisions or private imports.
2. Determine how a companion can obtain the resolved system semantic values after current query results, including late replies, without a fixed-delay guess.
3. Test startup ordering and verify stale results or host theme application cannot overwrite the current clone or a user’s later selection.
4. Test initial dark, light, and alternate-dark palettes in the local Linux PlexusTerm/Pi TUI path; record versions, selected palette, query/reply evidence, and visible result.
5. Separately test `/reload` after a palette change, especially dark-to-dark. Host re-query alone is not a pass.
6. Exercise unsupported, delayed, and late replies plus conversation input retention.

**Gate:** This gate applies to claims of fresh current colors, late-reply updates, and `/reload` synchronization. It does not block the separately authorized best-effort startup attempt plus manual fallback. Do not claim full named-theme freshness until the listed runtime and public-readiness criteria pass.

### Stage 1 — Bounded best-effort package (implemented)

- Package the static ANSI fallback and extension through Pi’s manifest.
- Keep the automatic attempt scoped to initial TUI startup while the named resource remains selected; leave reload recovery explicit.
- Apply only public `Theme` objects in memory; never write theme settings or select a theme automatically.
- Run focused command/event tests and package checks; retain the private/unpublished experimental status.

### Stage 2 — Local acceptance (not run)

- With user authorization, use Pi’s picker and restart flow to inspect the fallback and startup attempt in PlexusTerm.
- Test stale/unavailable source colors, manual recovery after `/reload`, and a later manual theme choice.
- Record Gentle Shell separately; same API use is the support intent, but cached header/sidebar and rendered views require observation before compatibility claims.

### Later work — separate decision

Arbitrary live palette changes, additional operating systems, remote sessions, or a producer-side export bridge require separate evidence and scope approval. Do not add polling, private file readers, raw terminal watchers, or host deep imports as shortcuts.

## 9. Risks and unresolved questions

| Risk / unknown | Why it matters | Response |
|---|---|---|
| No public color-readiness/late-refresh contract | The startup or manual `system` snapshot may be stale or fallback-only. | Keep the feature best-effort, use the packaged ANSI fallback, and provide `/plexusterm-theme`; do not claim freshness. |
| Startup and `/reload` ordering | Native replies can be late; Pi may reapply the persisted resource after extension startup on reload. | Attempt once on initial startup only; skip reload and tell users to invoke the command manually. No delay workaround. |
| Theme name collision | Existing Pi resources may already use `plexusterm`. | Check registry behavior and fail safely; never silently replace a resource. |
| Semantic contrast adjustment | Users may expect exact raw palette identity. | Explain mapping; compare semantic roles, not pixel/hex identity. |
| Query transport/filtering | xterm capability does not prove the typed/backend route is safe. | Exercise real query/reply and typed-input behavior before compatibility claims. |
| User changes theme during async work | Late responses could unexpectedly reactivate the package theme. | Apply only to the named resource and preserve any later manual selection. |
| Unsupported terminals or forwarding layers | Queries may be absent, delayed, or altered. | Distinguish fallback from fresh data; scope claims to tested environments. |

Product direction is resolved as automatic-primary plus manual recovery. Remaining open evidence is technical: live picker collision handling, actual terminal color delivery/freshness, rendered appearance, and Gentle Shell cached views. The implementation does not claim these have passed.

## 10. Validation and review record

The implementation adds a dependency-free ESM extension, an ANSI fallback resource owned by the parent, and fake-context tests that construct real public Pi `Theme` instances. The focused tests exercise startup/manual behavior but do not launch Pi, PlexusTerm, or Gentle Shell. No terminal query, model, host setting, or live session was touched. The user reports that the current shell is PlexusTerm; that is not evidence that this extension loaded or that Pi received its palette. Full readiness/freshness, picker collisions, live restart/reload results, rendered output, and Gentle Shell cached views remain unverified.

Three independent read-only reviewers contributed prior findings. Their source evidence remains preserved above; dynamic readiness and end-to-end behavior remain unverified.

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
