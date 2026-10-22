import { Theme } from "@earendil-works/pi-coding-agent";
import { registerPlexusTermThemeCommand } from "./snapshot.mjs";

export default function plexusTermThemeExtension(pi) {
	registerPlexusTermThemeCommand(pi, Theme);
}
