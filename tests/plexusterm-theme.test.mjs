import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const piRoot =
	process.env.PI_CODING_AGENT_ROOT ??
	"/home/jorge/.gentle-shell/versions/4.3.0-1.2.0/node_modules/.pnpm/@earendil-works+pi-coding-agent@1.2.0_@aws-sdk+credential-provider-node@3.972.86_@smithy+signature-v4@5.7.4_ws@8.22.0/node_modules/@earendil-works/pi-coding-agent";
const { Theme } = await import(pathToFileURL(resolve(piRoot, "dist/index.js")).href);
const moduleUrl = new URL("../extensions/plexusterm-theme/snapshot.mjs", import.meta.url);

const ALL_TOKENS = [
	"accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text",
	"thinkingText", "scrollbarTrack", "scrollbarThumb", "selectedBg", "searchMatchBg", "searchMatchText",
	"userMessageBg", "userMessageText", "customMessageBg", "customMessageText", "customMessageLabel",
	"toolPendingBg", "toolSuccessBg", "toolErrorBg", "toolTitle", "toolOutput", "mdHeading", "mdLink", "mdLinkUrl",
	"mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder", "mdHr", "mdListBullet",
	"toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "syntaxComment", "syntaxKeyword", "syntaxFunction",
	"syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
	"thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh",
	"thinkingMax", "bashMode",
];
const BACKGROUND_TOKENS = [
	"selectedBg", "searchMatchBg", "userMessageBg", "customMessageBg", "toolPendingBg", "toolSuccessBg", "toolErrorBg",
];
const successMessage =
	"Applied a PlexusTerm snapshot of Pi's current system theme for this session. Repeat /plexusterm-theme after /reload or restarting Pi if desired.";
const automaticSuccessMessage =
	"Applied a best-effort startup snapshot of Pi's current system theme. Run /plexusterm-theme after /reload or if the colors look stale.";
const automaticWarningMessage =
	"Automatic PlexusTerm snapshot was unavailable. The named ANSI fallback remains active; run /plexusterm-theme to retry from Pi's current system theme.";

async function registerCommand() {
	const { registerPlexusTermThemeCommand } = await import(moduleUrl.href);
	const registrations = [];
	const calls = [];
	const handlers = {};
	const pi = {
		registerCommand(name, command) {
			calls.push("registerCommand");
			registrations.push({ name, ...command });
		},
		on(event, handler) {
			calls.push(`on:${event}`);
			handlers[event] = handler;
		},
		registerTool() {
			calls.push("registerTool");
		},
	};
	registerPlexusTermThemeCommand(pi, Theme);
	assert.deepEqual(calls, ["registerCommand", "on:session_start"]);
	assert.equal(registrations.length, 1);
	assert.equal(registrations[0].name, "plexusterm-theme");
	assert.ok(registrations[0].description.length > 20);
	return { handler: registrations[0].handler, sessionStart: handlers.session_start };
}

function makeSource(appearance, seed, mode = "truecolor") {
	const tokens = ALL_TOKENS;
	const backgrounds = new Set(BACKGROUND_TOKENS);
	const colorFor = (index) => {
		const r = (seed + index * 37) % 256;
		const g = (seed * 3 + index * 61) % 256;
		const b = (seed * 7 + index * 83) % 256;
		return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
	};
	const foreground = Object.fromEntries(
		tokens.filter((token) => !backgrounds.has(token)).map((token, index) => [token, colorFor(index + 1)]),
	);
	const background = Object.fromEntries(
		tokens.filter((token) => backgrounds.has(token)).map((token, index) => [token, colorFor(index + 101)]),
	);
	return new Theme(foreground, background, mode, { name: "system", appearance });
}

function makeContext(
	source,
	{ mode = "tui", selectedName = "dark", setResult = { success: true }, setError, lookupError } = {},
) {
	const priorTheme = { name: "prior-theme" };
	const settings = { theme: "persisted-choice" };
	const events = [];
	const ctx = {
		mode,
		ui: {
			get theme() {
				events.push({ type: "activeThemeRead" });
				return { name: selectedName };
			},
			notify(message, level) {
				events.push({ type: "notify", message, level });
			},
			getTheme(name) {
				events.push({ type: "getTheme", name });
				if (lookupError) throw lookupError;
				return source;
			},
			setTheme(theme) {
				events.push({ type: "setTheme", theme });
				if (setError) throw setError;
				if (setResult.success) this.activeTheme = theme;
				return setResult;
			},
			activeTheme: priorTheme,
		},
	};
	return { ctx, events, priorTheme, settings };
}

function notifications(events) {
	return events.filter((event) => event.type === "notify").map(({ message, level }) => ({ message, level }));
}

function assertUnchanged(events, state, expectSetCall = false) {
	assert.equal(state.ctx.ui.activeTheme, state.priorTheme);
	assert.deepEqual(state.settings, { theme: "persisted-choice" });
	assert.equal(events.some((event) => event.type === "setTheme"), expectSetCall);
}

test("package advertises the parent-owned ANSI fallback theme, not a fixed palette", async () => {
	const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
	const fallback = JSON.parse(await readFile(new URL("../themes/plexusterm.json", import.meta.url), "utf8"));
	assert.equal(packageJson.private, true);
	assert.equal(packageJson.version, "0.1.0");
	assert.deepEqual(packageJson.files, ["extensions", "themes", "README.md"]);
	assert.deepEqual(packageJson.scripts, { test: "node --test tests/*.test.mjs" });
	assert.deepEqual(packageJson.dependencies, undefined);
	assert.deepEqual(packageJson.peerDependencies, { "@earendil-works/pi-coding-agent": "*" });
	assert.deepEqual(packageJson.pi.themes, ["./themes/*.json"]);
	assert.deepEqual(packageJson.pi.extensions, ["./extensions/plexusterm-theme/index.mjs"]);
	assert.equal(fallback.name, "plexusterm");
	assert.deepEqual(Object.keys(fallback.colors).sort(), [...ALL_TOKENS].sort());
	assert.equal(fallback.appearance, undefined);
	assert.equal(fallback.export, undefined);
	assert.deepEqual(fallback.vars, {
		background: "",
		foreground: "",
		red: 1,
		green: 2,
		yellow: 3,
		blue: 4,
		magenta: 5,
		cyan: 6,
		muted: 8,
	});
	for (const value of Object.values(fallback.colors)) {
		assert.equal(typeof value, "string");
		assert.ok(Object.hasOwn(fallback.vars, value));
	}
});

test("extension registration only installs its command and startup handler", async () => {
	const extension = await registerCommand();
	assert.equal(typeof extension.sessionStart, "function");
});

test("startup applies a best-effort snapshot only when the named fallback is active", async () => {
	const { sessionStart } = await registerCommand();
	const source = makeSource("dark", 15);
	const state = makeContext(source, { selectedName: "plexusterm" });
	await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
	const activeRead = state.events.findIndex((event) => event.type === "activeThemeRead");
	const systemRead = state.events.findIndex((event) => event.type === "getTheme");
	assert.ok(activeRead >= 0 && activeRead < systemRead, "check active name before reading system colors");
	const applied = state.events.find((event) => event.type === "setTheme")?.theme;
	assert.ok(applied instanceof Theme);
	assert.equal(applied.name, "plexusterm");
	assert.equal(applied.appearance, source.appearance);
	assert.equal(applied.getColorMode(), source.getColorMode());
	assert.deepEqual(notifications(state.events), [{ message: automaticSuccessMessage, level: "info" }]);
	assert.deepEqual(state.settings, { theme: "persisted-choice" });
});

test("startup ignores another selected theme; reload and non-TUI starts do no automatic work", async (t) => {
	const { sessionStart } = await registerCommand();
	await t.test("another theme is selected", async () => {
		const state = makeContext(makeSource("dark", 25), { selectedName: "dark" });
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assert.equal(state.events.filter((event) => event.type === "activeThemeRead").length, 1);
		assert.equal(state.events.some((event) => event.type === "getTheme" || event.type === "setTheme"), false);
		assert.deepEqual(notifications(state.events), []);
	});
	await t.test("reload does not snapshot potentially stale system colors", async () => {
		const state = makeContext(makeSource("dark", 27), { selectedName: "plexusterm" });
		await sessionStart({ type: "session_start", reason: "reload" }, state.ctx);
		assert.equal(state.events.some((event) => event.type === "activeThemeRead" || event.type === "getTheme" || event.type === "setTheme"), false);
		assert.deepEqual(notifications(state.events), []);
	});
	await t.test("non-TUI mode does not inspect or change themes", async () => {
		const state = makeContext(makeSource("dark", 29), { mode: "rpc", selectedName: "plexusterm" });
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assert.equal(state.events.some((event) => event.type === "activeThemeRead" || event.type === "getTheme" || event.type === "setTheme"), false);
		assert.deepEqual(notifications(state.events), []);
	});
});

test("automatic snapshot failures keep fallback and provide the manual retry", async (t) => {
	const { sessionStart } = await registerCommand();
	await t.test("system theme unavailable", async () => {
		const state = makeContext(undefined, { selectedName: "plexusterm" });
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
	await t.test("setTheme returns failure", async () => {
		const state = makeContext(makeSource("dark", 35), {
			selectedName: "plexusterm",
			setResult: { success: false, error: "not applied" },
		});
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state, true);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
	await t.test("setTheme throws", async () => {
		const state = makeContext(makeSource("dark", 37), {
			selectedName: "plexusterm",
			setError: new Error("set failed"),
		});
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state, true);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
});

test("snapshots all public tokens for dark, light, and alternate-dark source themes", async (t) => {
	const { handler } = await registerCommand();
	const cases = [
		{ label: "dark", appearance: "dark", seed: 13, mode: "truecolor" },
		{ label: "light", appearance: "light", seed: 57, mode: "truecolor" },
		{ label: "alternate dark", appearance: "dark", seed: 121, mode: "truecolor" },
	];
	const applied = [];

	for (const item of cases) {
		await t.test(item.label, async () => {
			const source = makeSource(item.appearance, item.seed, item.mode);
			const originalColors = Object.fromEntries(
				Object.entries(source.colors).map(([token, color]) => [token, [color.r, color.g, color.b]]),
			);
			const state = makeContext(source);
			await handler("", state.ctx);
			const set = state.events.find((event) => event.type === "setTheme");
			assert.ok(set, JSON.stringify(notifications(state.events)));
			const snapshot = set.theme;
			assert.ok(snapshot instanceof Theme);
			assert.notEqual(snapshot, source);
			assert.equal(snapshot.name, "plexusterm");
			assert.equal(snapshot.appearance, source.appearance);
			assert.equal(snapshot.getColorMode(), source.getColorMode());
			assert.deepEqual(Object.keys(snapshot.colors).sort(), Object.keys(source.colors).sort());
			assert.deepEqual(
				Object.fromEntries(Object.entries(snapshot.colors).map(([token, color]) => [token, [color.r, color.g, color.b]])),
				originalColors,
			);
			assert.deepEqual(notifications(state.events), [{ message: successMessage, level: "info" }]);
			assert.deepEqual(state.settings, { theme: "persisted-choice" });
			assert.deepEqual(
				Object.fromEntries(Object.entries(source.colors).map(([token, color]) => [token, [color.r, color.g, color.b]])),
				originalColors,
			);
			applied.push(snapshot);
		});
	}
	assert.notDeepEqual(applied[0].colors.text, applied[2].colors.text);
});

test("help and unexpected arguments preserve the current theme without reading system colors", async () => {
	const { handler } = await registerCommand();
	for (const [args, expected] of [
		[
			"help",
			{
				message:
					"/plexusterm-theme snapshots Pi's current system-theme colors into a PlexusTerm theme for this session only. It does not detect the terminal palette or persist a theme name. After /reload or restarting Pi, run /plexusterm-theme again if desired.",
				level: "info",
			},
		],
		["dark", { message: "Usage: /plexusterm-theme [help]", level: "warning" }],
	]) {
		const state = makeContext(makeSource("dark", 21));
		await handler(args, state.ctx);
		assertUnchanged(state.events, state);
		assert.equal(state.events.some((event) => event.type === "getTheme"), false);
		assert.deepEqual(notifications(state.events), [expected]);
	}
});

test("non-TUI invocation reports inability without reading or applying a theme", async () => {
	const { handler } = await registerCommand();
	const state = makeContext(makeSource("dark", 19), { mode: "rpc" });
	await handler("", state.ctx);
	assertUnchanged(state.events, state);
	assert.equal(state.events.some((event) => event.type === "getTheme"), false);
	assert.deepEqual(notifications(state.events), [
		{ message: "This command is available only in Pi's interactive TUI.", level: "warning" },
	]);
});

test("missing or invalid system colors fail without success or selection mutation", async (t) => {
	const { handler } = await registerCommand();
	await t.test("missing system theme", async () => {
		const state = makeContext(undefined);
		await handler("", state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [
			{ message: "Could not read Pi's current system theme; no theme was applied.", level: "error" },
		]);
	});
	await t.test("invalid RGB token", async () => {
		const source = makeSource("dark", 31);
		const invalid = {
			appearance: source.appearance,
			colors: { ...source.colors, accent: { r: 999, g: 0, b: 0 } },
			getColorMode: () => source.getColorMode(),
		};
		const state = makeContext(invalid);
		await handler("", state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [
			{ message: "Could not create a valid PlexusTerm snapshot from Pi's system theme; no theme was applied.", level: "error" },
		]);
	});
	await t.test("system lookup throws", async () => {
		const state = makeContext(makeSource("dark", 33), { lookupError: new Error("lookup failed") });
		await handler("", state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [
			{ message: "Could not read Pi's current system theme; no theme was applied.", level: "error" },
		]);
	});
	await t.test("snapshot construction input throws", async () => {
		const source = {
			appearance: "dark",
			colors: makeSource("dark", 39).colors,
			getColorMode() {
				throw new Error("mode unavailable");
			},
		};
		const state = makeContext(source);
		await handler("", state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [
			{ message: "Could not create a valid PlexusTerm snapshot from Pi's system theme; no theme was applied.", level: "error" },
		]);
	});
});

test("setTheme failure or exception never reports success or changes the prior selection", async (t) => {
	const { handler } = await registerCommand();
	for (const failure of [
		{ label: "false result", options: { setResult: { success: false, error: "not applied" } } },
		{ label: "exception", options: { setError: new Error("set failed") } },
	]) {
		await t.test(failure.label, async () => {
			const state = makeContext(makeSource("dark", 43), failure.options);
			await handler("", state.ctx);
			assert.equal(state.events.filter((event) => event.type === "setTheme").length, 1);
			assertUnchanged(state.events, state, true);
			assert.deepEqual(notifications(state.events), [
				{ message: "Could not apply the PlexusTerm snapshot; no theme was applied.", level: "error" },
			]);
		});
	}
});
