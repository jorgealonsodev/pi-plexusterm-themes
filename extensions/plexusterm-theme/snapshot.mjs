const themeName = "plexusterm";

const messages = {
	usage: "Usage: /plexusterm-theme [help]",
	nonTui: "This command is available only in Pi's interactive TUI.",
	missing:
		'Could not access the registered "plexusterm" theme; load the local package with `gentle-shell -e .` before using this command. No theme was applied.',
	applyFailed: 'Could not apply the registered "plexusterm" theme; no theme was applied.',
	help:
		'/plexusterm-theme applies or reapplies the registered "plexusterm" theme object unchanged for this session. It uses terminal ANSI/default colors, does not read the "system" theme, and does not persist a theme selection.',
	manualSuccess:
		'Applied the registered "plexusterm" theme for this session. Select "plexusterm" in Pi\'s theme picker to persist that choice.',
	automaticSuccess: 'Reapplied the registered "plexusterm" theme for this session.',
	automaticWarning:
		'Could not reapply the registered "plexusterm" theme. Load the local package with `gentle-shell -e .` if the theme is unavailable.',
};

function notify(ctx, message, level) {
	try {
		ctx?.ui?.notify?.(message, level);
	} catch {
		// UI notification is best-effort; failures must never become a success report.
	}
}

function applyRegisteredTheme(ctx) {
	let theme;
	try {
		theme = ctx.ui.getTheme(themeName);
	} catch {
		return "missing";
	}
	if (!theme) return "missing";

	try {
		return ctx.ui.setTheme(theme)?.success === true ? "applied" : "apply-failed";
	} catch {
		return "apply-failed";
	}
}

export function registerPlexusTermThemeCommand(pi) {
	pi.registerCommand("plexusterm-theme", {
		description: "Apply or reapply the registered terminal-relative PlexusTerm theme",
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

			const result = applyRegisteredTheme(ctx);
			if (result === "applied") {
				notify(ctx, messages.manualSuccess, "info");
			} else {
				const message = result === "missing" ? messages.missing : messages.applyFailed;
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
		if (selectedName !== themeName) return;

		const result = applyRegisteredTheme(ctx);
		if (result === "applied") {
			notify(ctx, messages.automaticSuccess, "info");
		} else {
			notify(ctx, messages.automaticWarning, "warning");
		}
	});
}
