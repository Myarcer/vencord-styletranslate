# StyleTranslate — Vencord Plugin

Translate your Discord messages into fun styles before sending. Uses **AnythingTranslate** (free, no account needed) or your local **Claude Code** installation.

## Styles

Pirate · Shakespeare · Yoda · Gollum · UwU · Caveman · Medieval English · Old English · Formal English · Gen Z · Valley Girl

## Usage

Type `/translate` in any Discord channel, pick a style, type your message. The translated result gets sent as your message.

## Install

> **Requirements:** [Vencord](https://vencord.dev) must already be installed. That's it.

1. Download `INSTALL.bat` and `install.ps1` from this repo (put them in the same folder)
2. Double-click `INSTALL.bat`
3. The installer will automatically handle everything else:
   - Installs Node.js if missing
   - Installs Git if missing
   - Installs pnpm if missing
   - Clones Vencord + this plugin, builds, deploys
   - Enables the plugin in your Vencord settings
4. Discord relaunches with the plugin ready

## Update

Double-click `update.bat` to pull the latest version and rebuild. Discord will restart automatically.

## Settings

In Discord: **Vencord → Plugins → StyleTranslate**

| Setting | Description |
|---|---|
| **Backend** | `AnythingTranslate` — free, no setup. `Claude` — uses your local [Claude Code](https://claude.ai/code) install |
| **Send as message** | On = translation sends as your message (others see it). Off = only you see the result |

## How it works

- **AnythingTranslate backend:** Sends a request to [anythingtranslate.com](https://anythingtranslate.com) — a free community translation site. No account, no API key.
- **Claude backend:** Runs `claude -p` locally on your machine via Claude Code CLI. Requires Claude Code to be installed and logged in. Uses the Haiku model to keep usage low.

The plugin has two files:
- `index.ts` — runs inside Discord (UI, slash command, settings)
- `native.ts` — runs in Node.js (makes the web request or spawns claude)

## Uninstall

Restore your Vencord backup from `%AppData%\Vencord\dist.backup`, or reinstall Vencord normally.
