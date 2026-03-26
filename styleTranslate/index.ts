/*
 * Vencord, a Discord client mod
 * StyleTranslate - Translate messages into fun styles via AnythingTranslate or Claude
 * Copyright (c) 2026 Nyarc
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { sendMessage } from "@utils/discord";

// ── Native bridge ──────────────────────────────────────────────
const Native = VencordNative.pluginHelpers.StyleTranslate as {
    translateWithClaude(style: string, text: string): Promise<string>;
    translateWithAnythingTranslate(style: string, text: string): Promise<string>;
};

// ── All styles (superset — AT has more, Claude covers all with prompts) ────
// Order: most fun first
const ALL_STYLES: { name: string; displayName: string }[] = [
    { name: "pirate",        displayName: "Pirate" },
    { name: "shakespeare",   displayName: "Shakespeare" },
    { name: "yoda",          displayName: "Yoda" },
    { name: "gollum",        displayName: "Gollum" },
    { name: "uwu",           displayName: "UwU" },
    { name: "caveman",       displayName: "Caveman" },
    { name: "medieval",      displayName: "Medieval English" },
    { name: "old-english",   displayName: "Old English" },
    { name: "formal",        displayName: "Formal English" },
    { name: "gen-z",         displayName: "Gen Z" },
    { name: "valley-girl",   displayName: "Valley Girl" },
];

// ── Claude prompts for every style ────────────────────────────
const CLAUDE_PROMPTS: Record<string, string> = {
    shakespeare:
        "Rewrite the following text in elaborate Shakespearean / Early Modern English. " +
        "Use thee/thou/thy, archaic verb forms (-eth, -est), and flowery metaphors. " +
        "Keep the original meaning. Output ONLY the translated text, nothing else.",
    pirate:
        "Rewrite the following text as a stereotypical pirate would say it. " +
        "Use 'arr', 'ye', 'matey', nautical terms. " +
        "Output ONLY the translated text, nothing else.",
    yoda:
        "Rewrite the following text in the speech pattern of Yoda from Star Wars. " +
        "Invert sentence structure. Output ONLY the translated text, nothing else.",
    gollum:
        "Rewrite the following text as Gollum from Lord of the Rings would say it. " +
        "Use 'we', 'precious', 'gollum gollum', hissing speech. " +
        "Output ONLY the translated text, nothing else.",
    uwu:
        "Rewrite the following text in 'uwu' internet speak. " +
        "Replace r/l with w, add stuttering, add emoticons like OwO UwU >w<. " +
        "Output ONLY the translated text, nothing else.",
    caveman:
        "Rewrite the following text as a caveman. Short words, broken grammar, 'me', 'ug', 'fire good'. " +
        "Output ONLY the translated text, nothing else.",
    medieval:
        "Rewrite the following text in medieval style, as if spoken by a knight or noble. " +
        "Use 'prithee', 'forsooth', 'hark'. Output ONLY the translated text, nothing else.",
    "old-english":
        "Rewrite the following text in Old English (Anglo-Saxon style). " +
        "Use archaic vocabulary. Output ONLY the translated text, nothing else.",
    formal:
        "Rewrite the following text in extremely formal, diplomatic English. " +
        "Output ONLY the translated text, nothing else.",
    "gen-z":
        "Rewrite the following text in Gen Z slang. Use 'no cap', 'bussin', 'slay', 'lowkey', 'fr fr', 'it's giving'. " +
        "Output ONLY the translated text, nothing else.",
    "valley-girl":
        "Rewrite the following text as a classic Valley Girl would say it. " +
        "Use 'like', 'oh my god', 'totally', 'whatever', 'as if'. " +
        "Output ONLY the translated text, nothing else.",
};

// ── Settings ───────────────────────────────────────────────────
const settings = definePluginSettings({
    backend: {
        type: OptionType.SELECT,
        description: "Translation backend",
        options: [
            { label: "AnythingTranslate (free, no setup required)", value: "anythingtranslate", default: true },
            { label: "Local Claude Code (requires Claude Code installed)", value: "claude" },
        ],
    },
    sendAsMessage: {
        type: OptionType.BOOLEAN,
        description: "Send translation as a real message visible to others (off = only you see it)",
        default: true,
    },
});

// ── Plugin ─────────────────────────────────────────────────────
export default definePlugin({
    name: "StyleTranslate",
    description: "Translate messages into fun styles via AnythingTranslate (free) or local Claude Code. Switch backend in plugin settings.",
    authors: [{ name: "Nyarc", id: 0n }],
    dependencies: ["CommandsAPI"],
    settings,

    commands: [
        {
            name: "translate",
            description: "Translate text into a fun style (switch backend in plugin settings)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "style",
                    description: "Translation style",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                    choices: ALL_STYLES.map(s => ({ name: s.name, displayName: s.displayName, value: s.name })),
                },
                {
                    name: "text",
                    description: "The text to translate",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                },
            ],

            async execute(args, ctx) {
                const style = findOption<string>(args, "style", "pirate");
                const text = findOption<string>(args, "text", "");

                if (!text) return sendBotMessage(ctx.channel.id, { content: "Please provide text to translate." });

                const backend = settings.store.backend ?? "anythingtranslate";
                sendBotMessage(ctx.channel.id, { content: `🔄 Translating to **${style}** via ${backend === "claude" ? "Claude" : "AnythingTranslate"}...` });

                try {
                    let result: string;
                    if (backend === "claude") {
                        const prompt = CLAUDE_PROMPTS[style] ?? `Rewrite the following text in ${style} style. Output ONLY the translated text.`;
                        result = await Native.translateWithClaude(prompt, text);
                    } else {
                        result = await Native.translateWithAnythingTranslate(style, text);
                    }

                    const cleaned = result.trim();
                    if (settings.store.sendAsMessage) {
                        sendMessage(ctx.channel.id, { content: cleaned });
                    } else {
                        sendBotMessage(ctx.channel.id, { content: `🎭 **${style.toUpperCase()}**:\n${cleaned}` });
                    }
                } catch (e: any) {
                    sendBotMessage(ctx.channel.id, {
                        content: `❌ Translation failed: ${e?.message ?? "Unknown error"}` +
                            (backend === "claude" ? "\n\nMake sure Claude Code is installed and accessible via the `claude` command." : ""),
                    });
                }
            },
        },
    ],
});
