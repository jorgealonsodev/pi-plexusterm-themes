import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const piRoot =
	process.env.PI_CODING_AGENT_ROOT ??
	"/home/jorge/.gentle-shell/versions/4.3.0-1.2.0/node_modules/.pnpm/@earendil-works+pi-coding-agent@1.2.0_@aws-sdk+credential-provider-node@3.972.86_@smithy+signature-v4@5.7.4_ws@8.22.0/node_modules/@earendil-works/pi-coding-agent";
const pi = await import(pathToFileURL(resolve(piRoot, "dist/index.js")).href);

test("public root exposes Theme but not registry or terminal-readiness helpers", () => {
	assert.equal(typeof pi.Theme, "function");

	for (const name of [
		"getThemeByName",
		"setRegisteredThemes",
		"setThemeInstance",
		"onThemeChange",
		"requestTerminalColors",
	]) {
		assert.equal(Object.hasOwn(pi, name), false, `${name} must not be a root export`);
	}
});

test("a named Theme instance has resolved Color objects but no registration operation", () => {
	const theme = new pi.Theme(
		{ muted: "#888888", text: "#eeeeee", thinkingXhigh: "#ff00ff" },
		{ selectedBg: "#222222" },
		"truecolor",
		{ name: "plexusterm" },
	);

	assert.equal(theme.name, "plexusterm");
	assert.equal(typeof theme.colors.text, "object");
	assert.equal(typeof theme.colors.text.r, "number");
	assert.equal(typeof theme.colors.text.g, "number");
	assert.equal(typeof theme.colors.text.b, "number");
	assert.equal(typeof theme.register, "undefined");
});
