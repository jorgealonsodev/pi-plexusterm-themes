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
const manualSuccessMessage =
	'Applied the registered "plexusterm" theme for this session. Select "plexusterm" in Pi\'s theme picker to persist that choice.';
const automaticSuccessMessage = 'Reapplied the registered "plexusterm" theme for this session.';
const automaticWarningMessage =
	'Could not reapply the registered "plexusterm" theme. Load the local package with `gentle-shell -e .` if the theme is unavailable.';
const missingThemeMessage =
	'Could not access the registered "plexusterm" theme; load the local package with `gentle-shell -e .` before using this command. No theme was applied.';
const applyFailedMessage = 'Could not apply the registered "plexusterm" theme; no theme was applied.';

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

	registerPlexusTermThemeCommand(pi);
	assert.deepEqual(calls, ["registerCommand", "on:session_start"]);
	assert.equal(registrations.length, 1);
	assert.equal(registrations[0].name, "plexusterm-theme");
	assert.match(registrations[0].description, /apply or reapply/i);
	return { handler: registrations[0].handler, sessionStart: handlers.session_start };
}

async function makeRegisteredPlexusTermTheme() {
	const resource = JSON.parse(await readFile(new URL("../themes/plexusterm.json", import.meta.url), "utf8"));
	const resolveVariable = (value) => {
		let resolved = value;
		while (typeof resolved === "string" && Object.hasOwn(resource.vars, resolved)) {
			resolved = resource.vars[resolved];
		}
		return resolved;
	};
	const foreground = {};
	const background = {};
	for (const [token, value] of Object.entries(resource.colors)) {
		if (BACKGROUND_TOKENS.includes(token)) {
			background[token] = resolveVariable(value);
		} else {
			foreground[token] = resolveVariable(value);
		}
	}
	return new Theme(foreground, background, "truecolor", {
		name: resource.name,
		appearance: resource.appearance,
	});
}

function makeSyntheticSystemTheme(seed) {
	const foreground = Object.fromEntries(
		ALL_TOKENS.filter((token) => !BACKGROUND_TOKENS.includes(token)).map((token, index) => [
			token,
			colorFor(seed + index + 1),
		]),
	);
	const background = Object.fromEntries(
		BACKGROUND_TOKENS.map((token, index) => [token, colorFor(seed + index + 101)]),
	);
	return new Theme(foreground, background, "truecolor", { name: "system", appearance: "dark" });
}

function colorFor(index) {
	const channels = [(index * 37) % 256, (index * 61) % 256, (index * 83) % 256];
	return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function makeContext(
	themes,
	{ mode = "tui", selectedName = "dark", setResult = { success: true }, setError, lookupError } = {},
) {
	const priorTheme = { name: selectedName };
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
				return themes[name];
			},
			setTheme(theme) {
				events.push({ type: "setTheme", theme });
				if (!theme || typeof theme !== "object") throw new TypeError("setTheme must receive a Theme object");
				if (setError) throw setError;
				if (setResult.success) this.activeTheme = theme;
				return setResult;
			},
			activeTheme: priorTheme,
		},
	};
	return { ctx, events, priorTheme, settings };
}

function captureAnsi(theme) {
	return Object.fromEntries(
		ALL_TOKENS.map((token) => [token, BACKGROUND_TOKENS.includes(token) ? theme.getBgAnsi(token) : theme.getFgAnsi(token)]),
	);
}

function notifications(events) {
	return events.filter((event) => event.type === "notify").map(({ message, level }) => ({ message, level }));
}

function assertUnchanged(events, state, expectSetCall = false) {
	assert.equal(state.ctx.ui.activeTheme, state.priorTheme);
	assert.deepEqual(state.settings, { theme: "persisted-choice" });
	assert.equal(events.some((event) => event.type === "setTheme"), expectSetCall);
}

test("package advertises the parent-owned terminal-relative theme resource", async () => {
	const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
	const resource = JSON.parse(await readFile(new URL("../themes/plexusterm.json", import.meta.url), "utf8"));
	assert.notEqual(packageJson.private, true);
	assert.equal(packageJson.license, "MIT");
	assert.deepEqual(packageJson.publishConfig, { registry: "https://registry.npmjs.org/", access: "public" });
	assert.ok(packageJson.keywords.includes("pi-package"));
	assert.equal(packageJson.version, "0.1.0");
	assert.deepEqual(packageJson.files, ["extensions", "themes", "README.md"]);
	assert.deepEqual(packageJson.scripts, { test: "node --test tests/*.test.mjs" });
	assert.deepEqual(packageJson.dependencies, undefined);
	assert.deepEqual(packageJson.peerDependencies, { "@earendil-works/pi-coding-agent": "*" });
	assert.deepEqual(packageJson.pi.themes, ["./themes/*.json"]);
	assert.deepEqual(packageJson.pi.extensions, ["./extensions/plexusterm-theme/index.mjs"]);
	assert.equal(resource.name, "plexusterm");
	assert.deepEqual(Object.keys(resource.colors).sort(), [...ALL_TOKENS].sort());
	assert.equal(resource.appearance, undefined);
	assert.equal(resource.export, undefined);
	assert.deepEqual(resource.vars, {
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
	for (const value of Object.values(resource.colors)) {
		assert.equal(typeof value, "string");
		assert.ok(Object.hasOwn(resource.vars, value));
	}
});

test("extension registration only installs its command and startup handler", async () => {
	const extension = await registerCommand();
	assert.equal(typeof extension.sessionStart, "function");
});

test("manual command reapplies the registered theme object with all 56 ANSI sequences unchanged", async () => {
	const registeredTheme = await makeRegisteredPlexusTermTheme();
	const systemTheme = makeSyntheticSystemTheme(193);
	const { handler } = await registerCommand();
	const state = makeContext({ plexusterm: registeredTheme, system: systemTheme });
	const originalAnsi = captureAnsi(registeredTheme);

	await handler("", state.ctx);

	const appliedEvent = state.events.find((event) => event.type === "setTheme");
	assert.ok(appliedEvent);
	assert.equal(typeof appliedEvent.theme, "object");
	assert.strictEqual(appliedEvent.theme, registeredTheme);
	assert.deepEqual(captureAnsi(appliedEvent.theme), originalAnsi);
	assert.equal(appliedEvent.theme.getBgAnsi("toolSuccessBg"), "\x1b[49m");
	assert.equal(appliedEvent.theme.getBgAnsi("toolPendingBg"), "\x1b[49m");
	assert.equal(appliedEvent.theme.getFgAnsi("mdHeading"), "\x1b[38;5;2m");
	assert.deepEqual(captureAnsi(registeredTheme), originalAnsi);
	assert.deepEqual(state.events.filter((event) => event.type === "getTheme").map((event) => event.name), ["plexusterm"]);
	assert.deepEqual(notifications(state.events), [{ message: manualSuccessMessage, level: "info" }]);
	assert.deepEqual(state.settings, { theme: "persisted-choice" });
	assert.equal(state.ctx.ui.activeTheme, registeredTheme);
});

test("selected-theme startup reapplies the registered theme object with all ANSI sequences unchanged", async () => {
	const registeredTheme = await makeRegisteredPlexusTermTheme();
	const systemTheme = makeSyntheticSystemTheme(197);
	const { sessionStart } = await registerCommand();
	const state = makeContext(
		{ plexusterm: registeredTheme, system: systemTheme },
		{ selectedName: "plexusterm" },
	);
	const originalAnsi = captureAnsi(registeredTheme);

	await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);

	const appliedEvent = state.events.find((event) => event.type === "setTheme");
	assert.ok(appliedEvent);
	assert.strictEqual(appliedEvent.theme, registeredTheme);
	assert.deepEqual(captureAnsi(appliedEvent.theme), originalAnsi);
	assert.deepEqual(captureAnsi(registeredTheme), originalAnsi);
	assert.deepEqual(state.events.filter((event) => event.type === "getTheme").map((event) => event.name), ["plexusterm"]);
	assert.deepEqual(notifications(state.events), [{ message: automaticSuccessMessage, level: "info" }]);
	assert.deepEqual(state.settings, { theme: "persisted-choice" });
});

test("automatic application ignores other selections, reload, and non-TUI sessions", async (t) => {
	const { sessionStart } = await registerCommand();
	await t.test("another theme is selected", async () => {
		const state = makeContext({ plexusterm: await makeRegisteredPlexusTermTheme() }, { selectedName: "dark" });
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assert.equal(state.events.filter((event) => event.type === "activeThemeRead").length, 1);
		assert.equal(state.events.some((event) => event.type === "getTheme" || event.type === "setTheme"), false);
		assert.deepEqual(notifications(state.events), []);
	});
	await t.test("reload does not reapply automatically", async () => {
		const state = makeContext({ plexusterm: await makeRegisteredPlexusTermTheme() }, { selectedName: "plexusterm" });
		await sessionStart({ type: "session_start", reason: "reload" }, state.ctx);
		assert.equal(
			state.events.some((event) => event.type === "activeThemeRead" || event.type === "getTheme" || event.type === "setTheme"),
			false,
		);
		assert.deepEqual(notifications(state.events), []);
	});
	await t.test("non-TUI startup does not inspect or change themes", async () => {
		const state = makeContext(
			{ plexusterm: await makeRegisteredPlexusTermTheme() },
			{ mode: "rpc", selectedName: "plexusterm" },
		);
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assert.equal(
			state.events.some((event) => event.type === "activeThemeRead" || event.type === "getTheme" || event.type === "setTheme"),
			false,
		);
		assert.deepEqual(notifications(state.events), []);
	});
});

test("help and unexpected arguments preserve the current theme without theme reads", async () => {
	const { handler } = await registerCommand();
	for (const [args, expected] of [
		[
			"help",
			{
				message:
					'/plexusterm-theme applies or reapplies the registered "plexusterm" theme object unchanged for this session. It uses terminal ANSI/default colors, does not read the "system" theme, and does not persist a theme selection.',
				level: "info",
			},
		],
		["dark", { message: "Usage: /plexusterm-theme [help]", level: "warning" }],
		["help extra", { message: "Usage: /plexusterm-theme [help]", level: "warning" }],
	]) {
		const state = makeContext({ plexusterm: await makeRegisteredPlexusTermTheme() });
		await handler(args, state.ctx);
		assertUnchanged(state.events, state);
		assert.equal(state.events.some((event) => event.type === "getTheme"), false);
		assert.deepEqual(notifications(state.events), [expected]);
	}
});

test("non-TUI command invocation retains its warning and performs no theme reads", async () => {
	const { handler } = await registerCommand();
	const state = makeContext({ plexusterm: await makeRegisteredPlexusTermTheme() }, { mode: "rpc" });
	await handler("", state.ctx);
	assertUnchanged(state.events, state);
	assert.equal(state.events.some((event) => event.type === "getTheme"), false);
	assert.deepEqual(notifications(state.events), [
		{ message: "This command is available only in Pi's interactive TUI.", level: "warning" },
	]);
});

test("missing or throwing named-theme lookups fail without applying or claiming success", async (t) => {
	const { handler } = await registerCommand();
	await t.test("registered theme is missing", async () => {
		const state = makeContext({});
		await handler("", state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [{ message: missingThemeMessage, level: "error" }]);
	});
	await t.test("lookup throws", async () => {
		const state = makeContext({ plexusterm: await makeRegisteredPlexusTermTheme() }, { lookupError: new Error("lookup failed") });
		await handler("", state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [{ message: missingThemeMessage, level: "error" }]);
	});
});

test("theme application failures or exceptions do not report success or change saved selection", async (t) => {
	const { handler } = await registerCommand();
	for (const failure of [
		{ label: "false result", options: { setResult: { success: false, error: "not applied" } } },
		{ label: "exception", options: { setError: new Error("set failed") } },
	]) {
		await t.test(failure.label, async () => {
			const state = makeContext({ plexusterm: await makeRegisteredPlexusTermTheme() }, failure.options);
			await handler("", state.ctx);
			assert.equal(state.events.filter((event) => event.type === "setTheme").length, 1);
			assertUnchanged(state.events, state, true);
			assert.deepEqual(notifications(state.events), [{ message: applyFailedMessage, level: "error" }]);
		});
	}
});

test("automatic lookup and apply failures retain the active theme and avoid false success", async (t) => {
	const { sessionStart } = await registerCommand();
	await t.test("registered theme is missing", async () => {
		const state = makeContext({}, { selectedName: "plexusterm" });
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
	await t.test("lookup throws", async () => {
		const state = makeContext(
			{ plexusterm: await makeRegisteredPlexusTermTheme() },
			{ selectedName: "plexusterm", lookupError: new Error("lookup failed") },
		);
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
	await t.test("setTheme returns false", async () => {
		const state = makeContext(
			{ plexusterm: await makeRegisteredPlexusTermTheme() },
			{ selectedName: "plexusterm", setResult: { success: false } },
		);
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state, true);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
	await t.test("setTheme throws", async () => {
		const state = makeContext(
			{ plexusterm: await makeRegisteredPlexusTermTheme() },
			{ selectedName: "plexusterm", setError: new Error("set failed") },
		);
		await sessionStart({ type: "session_start", reason: "startup" }, state.ctx);
		assertUnchanged(state.events, state, true);
		assert.deepEqual(notifications(state.events), [{ message: automaticWarningMessage, level: "warning" }]);
	});
});
