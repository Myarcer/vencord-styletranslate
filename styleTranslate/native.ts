/*
 * Vencord, a Discord client mod
 * StyleTranslate - Native bridge (runs in Node.js, NOT browser)
 * Copyright (c) 2026 Nyarc
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import { writeFileSync, unlinkSync, appendFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import * as https from "https";

const execFileAsync = promisify(execFile);

// ── Logging ────────────────────────────────────────────────────
const logFile = join(tmpdir(), "vc_translate_debug.log");
const log = (msg: string) => {
    try { appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};

// ── AnythingTranslate scraper ──────────────────────────────────

// Post IDs scraped from anythingtranslate.com (WP post IDs per translator)
const AT_TRANSLATORS: Record<string, { postId: number; label: string }> = {
    pirate:      { postId: 17189,  label: "Pirate" },
    shakespeare: { postId: 19793,  label: "Shakespeare" },
    gollum:      { postId: 42122,  label: "Gollum" },
    yoda:        { postId: 260645, label: "Yoda" },
    uwu:         { postId: 16453,  label: "UwU" },
    "old-english":    { postId: 337,   label: "Old English" },
    medieval:    { postId: 17757,  label: "Medieval English" },
    formal:      { postId: 16459,  label: "Formal English" },
    "gen-z":     { postId: 16308,  label: "Gen Z" },
    "valley-girl": { postId: 21686, label: "Valley Girl" },
    caveman:     { postId: 17190,  label: "Caveman" },
};

function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, res => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => resolve(data));
        }).on("error", reject);
    });
}

function httpsPost(url: string, body: string, headers: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: "POST",
            headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
        };
        const req = https.request(options, res => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

async function fetchNonce(slug: string): Promise<string> {
    const html = await httpsGet(`https://anythingtranslate.com/translators/${slug}-translator/`);
    const match = html.match(/translator_nonce["\s]*:?["\s]*value[="\s]*["']([a-f0-9]+)["']/)
        ?? html.match(/name="translator_nonce"\s+value="([a-f0-9]+)"/)
        ?? html.match(/"translator_nonce"\s*:\s*"([a-f0-9]+)"/);
    if (!match) throw new Error("Could not find nonce on anythingtranslate.com");
    return match[1];
}

export async function translateWithAnythingTranslate(
    _: any,
    style: string,
    text: string
): Promise<string> {
    const translator = AT_TRANSLATORS[style];
    if (!translator) throw new Error(`Unknown style: ${style}`);

    log(`AT START style=${style} postId=${translator.postId}`);

    const nonce = await fetchNonce(style === "old-english" ? "old-english" : style === "gen-z" ? "gen-z" : style === "valley-girl" ? "valley-girl" : style);
    log(`AT nonce=${nonce}`);

    // Build multipart/form-data body manually
    const boundary = "----VencordBoundary" + Date.now();
    const field = (name: string, value: string) =>
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;

    const body = [
        field("action", "do_translation"),
        field("translator_nonce", nonce),
        field("post_id", String(translator.postId)),
        field("to_translate", text),
        field("translation_model", "newest"),
        field("is_language_swapped", "0"),
        `--${boundary}--\r\n`,
    ].join("");

    const response = await httpsPost(
        "https://anythingtranslate.com/wp-admin/admin-ajax.php",
        body,
        {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "User-Agent": "Mozilla/5.0",
            "Referer": `https://anythingtranslate.com/translators/${style}-translator/`,
        }
    );

    log(`AT response=${response.slice(0, 120)}`);

    const parsed = JSON.parse(response);
    if (!parsed.success) throw new Error(`AnythingTranslate error: ${JSON.stringify(parsed)}`);
    return String(parsed.data).trim();
}

// ── Claude local ───────────────────────────────────────────────

export async function translateWithClaude(
    _: any,
    style: string,
    text: string
): Promise<string> {
    const tmp = tmpdir();
    const promptFile = join(tmp, `vc_translate_${Date.now()}.txt`);
    writeFileSync(promptFile, `${style}\n\nText to translate:\n${text}`, "utf8");

    log(`CLAUDE START style=${style.slice(0, 40)}`);

    let stdout = "";
    let stderr = "";

    try {
        const result = await execFileAsync(
            "powershell.exe",
            [
                "-NoProfile", "-NonInteractive", "-Command",
                `$null | claude --model claude-haiku-4-5-20251001 -p (Get-Content -Raw '${promptFile.replace(/'/g, "''")}')`,
            ],
            {
                timeout: 45000,
                maxBuffer: 1024 * 1024,
                env: { ...process.env },
                cwd: tmp,
            }
        );
        stdout = result.stdout;
        stderr = result.stderr;
        log(`CLAUDE done stdout=${stdout.slice(0, 80)}`);
    } catch (e: any) {
        const detail = e?.stderr?.trim() || e?.stdout?.trim() || e?.message || "claude failed";
        log(`CLAUDE ERROR: ${detail}`);
        throw new Error(detail);
    } finally {
        try { unlinkSync(promptFile); } catch { /* ignore */ }
    }

    if (!stdout && stderr) throw new Error(stderr.trim());
    return stdout.trim();
}
