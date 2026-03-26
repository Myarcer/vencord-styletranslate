# Claude Translate

Translate your Discord messages into fun language styles using your local Claude Code installation.

## Usage

Type `/translate` in any chat and pick a style:

| Style | Example |
|---|---|
| **Shakespeare** | "Hark! What light through yonder window breaks?" |
| **Pirate** | "Arrr, ye scallywag!" |
| **Medieval** | "Prithee, good sir..." |
| **Yoda** | "Strong with this one, the force is." |
| **Formal** | "I would like to respectfully convey..." |
| **UwU** | "Hewwo! OwO" |

## Settings

- **Send as message**: OFF = only you see it (bot message). ON = sends as a real message everyone can see.

## Requirements

- [Vencord](https://vencord.dev) installed from source
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed: `npm install -g @anthropic-ai/claude-code`
- Claude Code authenticated (run `claude` in terminal once to set up)
- **Desktop Discord only** (not browser) — needs Node.js for the native bridge

## Installation

1. Copy the `claudeTranslate` folder into `Vencord/src/userplugins/`
2. Run `pnpm build` in your Vencord directory
3. Restart Discord
4. Enable "ClaudeTranslate" in Settings → Vencord → Plugins
