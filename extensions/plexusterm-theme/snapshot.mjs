const foregroundTokens = [
	"accent",
	"border",
	"borderAccent",
	"borderMuted",
	"success",
	"error",
	"warning",
	"muted",
	"dim",
	"text",
	"thinkingText",
	"scrollbarTrack",
	"scrollbarThumb",
	"searchMatchText",
	"userMessageText",
	"customMessageText",
	"customMessageLabel",
	"toolTitle",
	"toolOutput",
	"mdHeading",
	"mdLink",
	"mdLinkUrl",
	"mdCode",
	"mdCodeBlock",
	"mdCodeBlockBorder",
	"mdQuote",
	"mdQuoteBorder",
	"mdHr",
	"mdListBullet",
	"toolDiffAdded",
	"toolDiffRemoved",
	"toolDiffContext",
	"syntaxComment",
	"syntaxKeyword",
	"syntaxFunction",
	"syntaxVariable",
	"syntaxString",
	"syntaxNumber",
	"syntaxType",
	"syntaxOperator",
	"syntaxPunctuation",
	"thinkingOff",
	"thinkingMinimal",
	"thinkingLow",
	"thinkingMedium",
	"thinkingHigh",
	"thinkingXhigh",
	"thinkingMax",
	"bashMode",
];

const backgroundTokens = [
	"selectedBg",
	"searchMatchBg",
	"userMessageBg",
	"customMessageBg",
	"toolPendingBg",
	"toolSuccessBg",
	"toolErrorBg",
];

function colorToHex(color, token) {
	if (!color || typeof color !== "object") {
		throw new TypeError(`Missing RGB color for ${token}`);
	}
	const channels = [color.r, color.g, color.b];
	if (channels.some((channel) => typeof channel !== "number" || !Number.isFinite(channel) || channel < 0 || channel > 255)) {
		throw new TypeError(`Invalid RGB color for ${token}`);
	}
	return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function createPlexusTermSnapshot(source, Theme) {
	if (!source || typeof source !== "object" || typeof Theme !== "function") {
		throw new TypeError("A source theme and public Theme constructor are required");
	}
	const appearance = source.appearance;
	if (appearance !== "dark" && appearance !== "light") {
		throw new TypeError("The source theme has no supported appearance");
	}
	if (!source.colors || typeof source.colors !== "object" || typeof source.getColorMode !== "function") {
		throw new TypeError("The source theme has no resolved colors or color mode");
	}

	const foreground = Object.create(null);
	const background = Object.create(null);
	for (const token of foregroundTokens) {
		foreground[token] = colorToHex(source.colors[token], token);
	}
	for (const token of backgroundTokens) {
		background[token] = colorToHex(source.colors[token], token);
	}

	return new Theme(foreground, background, source.getColorMode(), {
		name: "plexusterm",
		appearance,
	});
}

const messages = {
	usage: "Usage: /plexusterm-theme [help]",
	nonTui: "This command is available only in Pi's interactive TUI.",
	missing: "Could not read Pi's current system theme; no theme was applied.",
	invalid: "Could not create a valid PlexusTerm snapshot from Pi's system theme; no theme was applied.",
	applyFailed: "Could not apply the PlexusTerm snapshot; no theme was applied.",
	help: "/plexusterm-theme snapshots Pi's current system-theme colors into a PlexusTerm theme for this session only. It does not detect the terminal palette or persist a theme name. After /reload or restarting Pi, run /plexusterm-theme again if desired.",
	manualSuccess:
		"Applied a PlexusTerm snapshot of Pi's current system theme for this session. Repeat /plexusterm-theme after /reload or restarting Pi if desired.",
	automaticSuccess:
		"Applied a best-effort startup snapshot of Pi's current system theme. Run /plexusterm-theme after /reload or if the colors look stale.",
	automaticWarning:
		"Automatic PlexusTerm snapshot was unavailable. The named ANSI fallback remains active; run /plexusterm-theme to retry from Pi's current system theme.",
};

function notify(ctx, message, level) {
	try {
		ctx?.ui?.notify?.(message, level);
	} catch {
		// UI notification is best-effort; failures must never become a success report.
	}
}

function applyCurrentSystemSnapshot(ctx, Theme) {
	let source;
	try {
		source = ctx.ui.getTheme("system");
	} catch {
		return "missing";
	}
	if (!source) return "missing";

	let snapshot;
	try {
		snapshot = createPlexusTermSnapshot(source, Theme);
	} catch {
		return "invalid";
	}

	try {
		return ctx.ui.setTheme(snapshot)?.success === true ? "applied" : "apply-failed";
	} catch {
		return "apply-failed";
	}
}

export function registerPlexusTermThemeCommand(pi, Theme) {
	pi.registerCommand("plexusterm-theme", {
		description: "Snapshot Pi's current system theme into a session-only PlexusTerm theme",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				notify(ctx, messages.nonTui, "warning");
				return;
			}

			const argument = args == null ? "" : typeof args === "string" ? args.trim() : undefined;
			if (argument === "help") {
				notify(ctx, messages.help, "info");
				return;
			}
			if (argument !== "") {
				notify(ctx, messages.usage, "warning");
				return;
			}

			const result = applyCurrentSystemSnapshot(ctx, Theme);
			if (result === "applied") {
				notify(ctx, messages.manualSuccess, "info");
			} else {
				const message =
					result === "missing" ? messages.missing : result === "invalid" ? messages.invalid : messages.applyFailed;
				notify(ctx, message, "error");
			}
		},
	});

	pi.on("session_start", (event, ctx) => {
		if (ctx.mode !== "tui" || event.reason !== "startup") return;

		let selectedName;
		try {
			selectedName = ctx.ui.theme?.name;
		} catch {
			return;
		}
		if (selectedName !== "plexusterm") return;

		const result = applyCurrentSystemSnapshot(ctx, Theme);
		if (result === "applied") {
			notify(ctx, messages.automaticSuccess, "info");
		} else {
			notify(ctx, messages.automaticWarning, "warning");
		}
	});
}
