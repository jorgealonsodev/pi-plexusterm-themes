# PlexusTerm theme — public API feasibility spike

## Historical result — strict automatic freshness proposal

This section records the original Stage 0 result, before the user accepted best-effort startup plus manual recovery. It is not the current task status: T1 is complete for that narrower scope, and the implementation is described in [options.md](options.md). The stricter readiness/freshness gap below remains unresolved; no claim of fully synchronized automatic updates is made.

**Original gate result: T1 was incomplete; T2 could not proceed under the strict automatic design.** Pi 1.2.0 has a supported static theme-resource path and public theme accessors/setters, but the inspected public API does not connect a registered `plexusterm` resource to fresh, resolved `system` colors after startup/reload queries. A `Theme` object's `name` is not registration. Applying a `Theme` object is in-memory and deliberately does not persist or auto-refresh it. This is a source-based limitation of the inspected Pi 1.2.0 API, not a claim that no private or undocumented mechanism exists; those are out of scope.

A static JSON companion can be discoverable in the normal picker and a name selected through Pi's string setter persists. It cannot inherit the runtime `system` palette: theme JSON is strict, and `resources_discover` supplies file paths, not in-memory `Theme` objects or a registry mutation. An extension could apply a constructed object after a timely startup query, but late replies have no public readiness/refresh callback; on `/reload`, the user's manual command re-queries only after extension startup/resource discovery and Pi then reapplies its configured theme. Thus the named-clone lifecycle is not established. The package need not invoke `/reload`; the user's clarification that they invoke it manually is incorporated here.

No Pi app, PlexusTerm app, model/provider, live terminal input, Pi settings, or host files were changed. PlexusTerm source research was not repeated; its OSC and input-routing evidence remains the parent-provided, runtime-unverified evidence. The parent confirmed `https://registry.npmjs.org/pi-onehalf/latest`: `pi-onehalf@0.1.0` declares `pi.themes: ["./themes/*.json"]`, keyword `pi-package`, description “static One Half Dark/Light port”, and repository `jorgealonsodev/onehalf`. The parent also read the authorized local reference repo's `package.json`, `README.md`, and theme JSON files: it contains two static JSON themes and no extension, runtime dependency, or hook; its README targets Pi 1.3.0. These findings confirm conventional static theme packaging only, not dynamic registration/readiness. Neither reference package nor local repo was installed, copied, or edited. The local README's Pi 1.3.0 target does not establish runtime compatibility with the Pi 1.2.0 harness inspected here. There were no Pi host read failures.

## Public API evidence

Pi installation inspected read-only: `/home/jorge/.gentle-shell/versions/4.3.0-1.2.0/node_modules/.pnpm/@earendil-works+pi-coding-agent@1.2.0_@aws-sdk+credential-provider-node@3.972.86_@smithy+signature-v4@5.7.4_ws@8.22.0/node_modules/@earendil-works/pi-coding-agent`.

| Gate | Observed evidence | Feasibility |
|---|---|---|
| Named discovery and collision | `docs/packages.md:44-72` describes package `themes/` and explicit JSON theme paths. `examples/extensions/dynamic-resources/index.ts:8-13` returns `themePaths`; `dynamic.json` is a static theme file. `dist/core/extensions/types.d.ts:551-560` limits `ResourcesDiscoverResult` to `skillPaths`, `promptPaths`, and `themePaths` string arrays. `dist/core/resource-loader.js:802-829,867-869` loads theme paths as JSON files/directories; `:919-943` deduplicates by name and reports collisions. `docs/themes.md:75,81,138` requires unique names, strict theme fields, and reports duplicate names. | **Static `plexusterm` is supported.** Dynamic in-memory registration/replacement through `resources_discover` is not part of this contract. A collision is diagnosed; do not shadow it. |
| Public UI surface | `dist/core/extensions/types.d.ts:72-193` defines `ExtensionUIContext`: `theme`, `getAllThemes()`, `getTheme(name)`, and `setTheme(string | Theme)`, but no theme registration, terminal-color query, readiness promise, or color-change subscription. `dist/index.d.ts:37` exports `Theme`; it does not export the internal registry/readiness helpers. `package.json:12-20` exposes only the package root and `./rpc-entry`, not internal theme modules. | Accessing themes and setting them is public; dynamic registry/readiness control is not exposed by the inspected public contract. |
| Resolved `system` colors | `dist/modes/interactive/theme/theme.js:406-415,424-437` generates a fresh reserved `system` theme from recorded terminal colors when looked up. `:167-185` shows `Theme.colors` resolves tokens to `Color` objects; `dist/modes/interactive/theme/theme.d.ts:49,67` declares constructor inputs as foreground/background token maps of `string | number`, while `colors` returns `Color` objects. | The current resolved values are readable through the UI API, but an adapter is needed to construct a theme; a named object alone does not insert it into the registry. |
| Name vs registration | `dist/modes/interactive/theme/theme.js:127-132` stores `options.name` on a `Theme`; registry storage is a separate `registeredThemes` map populated by internal `setRegisteredThemes()` at `:523-530`. The public root test below confirms that the root entry does not export that setter. | `new Theme(..., { name: "plexusterm" })` is not a registered picker resource. |
| Persistence | `dist/modes/interactive/interactive-mode.js:2088-2099` routes a string to `setThemeName()` and, on success, `settingsManager.setTheme(name)`. A `Theme` object takes the separate `setThemeInstance()` path at `:2090-2093`. `dist/modes/interactive/theme/theme-controller.js:104-108` marks that object `<in-memory>` and disables auto-sync. | Selecting a static resource by name can persist. Applying a constructed object does not persist the name. |
| Startup readiness | `dist/modes/interactive/interactive-mode.js:706-713` starts the TUI, applies settings, then awaits internal `waitForTerminalColors()` before binding extensions at `:787`. `dist/modes/interactive/theme/theme-controller.js:7-18,86-87` has an internal 100 ms timeout and applies later replies too. That wait/query helper is not on `ExtensionUIContext` or exported from the package root. A timeout can therefore finish before an extension's `session_start`, while a valid late reply arrives afterward with no public extension notification. | Initial synchronous success may be usable; late-response-safe cloning is not established. Do not replace this gap with a delay, polling, raw input, or internal import. |
| Manual `/reload` order | User-invoked `/reload` is documented at `docs/slash-commands.md:49-50`. `dist/core/agent-session.js:2968-3000` reloads resources, emits `session_start`, then asks extensions for resource paths. `:2630-2659` likewise establishes `session_start` before `resources_discover`. Back in `dist/modes/interactive/interactive-mode.js:5404,5411-5413`, Pi registers loaded themes, applies runtime settings, then calls `themeController.applyFromSettings()`, which starts a new terminal-color query (`theme-controller.js:147-149`). | The human can invoke `/reload`; the package need not. But extension code has no public hook after this host re-query/readiness, and the host's later settings application can replace an earlier in-memory clone. Fresh colors after manual `/reload` remain unproven and cannot be claimed. |
| Late reply and user change | `dist/modes/interactive/theme/theme-controller.js:155-177` applies terminal replies and re-applies the configured theme, but returns early for `<in-memory>`. This avoids applying a stale configured theme over an extension object, but also means a captured in-memory clone is not refreshed by a late reply. | No safe public late-refresh route was found; do not claim late-reply or reload support. |

Relevant documentation was read in full: installed `docs/themes.md`, `docs/extensions.md`, `docs/packages.md`, plus `docs/settings.md` and `docs/slash-commands.md`; examples read: `examples/extensions/README.md`, `dynamic-resources/index.ts`, `dynamic-resources/dynamic.json`, and `mac-system-theme.ts`. `themes.md:7-22,30-35` describes `system` color derivation, late replies, and persisted theme selection. The docs and source agree that static resources and string selection are supported; neither documents a dynamic theme-registration or color-ready extension API.

## Minimal public-interface experiment

`spike/public-api.test.mjs` imports only the installed public root entry (`dist/index.js`), not a private theme module. It checks the actual root exports and constructs a real `Theme` with the public constructor. It demonstrates that the name and resolved `Color` values exist on an object while registry/readiness helpers are absent from the root; it does **not** pretend to instantiate an extension UI context or prove all possible undocumented host behavior.

Test-first exception: this is a passive feasibility/negative-capability experiment, not a production behavior change; there is no meaningful RED implementation stage. The public API test is the proportionate evidence.

Commands and observed results (the Node test runner output is TAP):

- `node --test --test-name-pattern='public root|named Theme' spike/public-api.test.mjs` — exit **0**:

  ```text
  TAP version 13
  # Subtest: public root exposes Theme but not registry or terminal-readiness helpers
  ok 1 - public root exposes Theme but not registry or terminal-readiness helpers
  # Subtest: a named Theme instance has resolved Color objects but no registration operation
  ok 2 - a named Theme instance has resolved Color objects but no registration operation
  1..2
  # tests 2
  # suites 0
  # pass 2
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  # duration_ms 711.107864
  ```

- `node --test spike` — exit **1** before test discovery. Observed error: `Error: Cannot find module '/mnt/480GB/Proyectos/Personales/20261015_plexusterm/20261015_plexusterm_git/pi-plexusterm-themes/spike'`; Node.js v22.22.2 treated the directory as a module. This was an invalid directory argument, not an unavailable runner.
- `node --test spike/*.test.mjs` — exit **0**, full applicable spike suite:

  ```text
  TAP version 13
  # Subtest: public root exposes Theme but not registry or terminal-readiness helpers
  ok 1 - public root exposes Theme but not registry or terminal-readiness helpers
  # Subtest: a named Theme instance has resolved Color objects but no registration operation
  ok 2 - a named Theme instance has resolved Color objects but no registration operation
  1..2
  # tests 2
  # suites 0
  # pass 2
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  # duration_ms 578.865881
  ```

## S# coverage and limits

- **S1:** Scope/authorization respected: this is only the explicitly authorized feasibility spike; no production package, manifest, or task/PRD edit.
- **S2:** Public named-resource, resolved-system-color, and persistence APIs examined. Static discovery/persistence is feasible; the required refreshed named clone is not established.
- **S3:** Startup, Pi restart implications, and user-invoked `/reload` ordering examined from Pi source. No live restart or reload was run; freshness after late replies or reload is unproven.
- **S4:** No settings or host mutation performed. The source distinguishes persisted string selection from in-memory object application; runtime rejection/failure behavior and actual configuration immutability were not exercised.
- **S5:** Feasibility gate evaluated. Because public registration/readiness/refresh for the named clone is incomplete, **T1 must not be marked complete and T2 must not start** on this path.
- **S6:** No PlexusTerm/Pi end-to-end or local rendering evidence was generated. OSC routing, input safety, and Linux colors remain runtime-unverified as established by parent context.
- **S7:** User's One Half example is treated as JSON/package structure only. Conditional future structure records Pi's public schema and the requested package/test/docs layout; no One Half palette was copied and no production files were added.

## Conditional packaging direction (not production work in T1)

If a supported dynamic path is established in a separately authorized follow-up, use the user's requested structure: `package.json` with `pi.themes: ["./themes/*.json"]`, `themes/plexusterm.json` using Pi's public `$schema`/`name`/`appearance`/`vars`/`colors`/`export` format, dependency-free `tests/*.test.mjs`, and README/LICENSE with attribution appropriate to the actual palette/source. Do not copy the One Half palette. A static JSON resource alone must not be represented as a system-derived clone; add an extension only if its required API is genuinely public and supported. This conditional structure does not bypass the current T1 gate or authorize production edits here.

## Remaining decision

For a future task, choose one of the PRD's bounded outcomes:

1. Separately authorize investigation/implementation of another integration path (new scope required; no architecture is assumed here).
2. Accept Pi's built-in `system` theme as a fallback, explicitly dropping the named `plexusterm` outcome.
3. Stop named-theme work.

No architecture, fallback, or production behavior is selected by this spike. No `/reload` limitation is attributed to the package's inability to invoke the command; the blocker is refresh ordering/readiness even when the user invokes it.
