import { ICON_TRASH } from "./icons.js";

const tr = (key, fallback) => window.WP2I18n?.t(key) || fallback || key;

function copyToClipboard(btn, text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    const prev = btn.textContent;
    btn.classList.add("copied");
    btn.textContent = tr("copied", "Copied");
    setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = prev;
    }, 1200);
}

export function normalizeType(type) {
    const t = (type || "").toLowerCase();
    if (t.includes("dash") || t.includes("mpd")) return "DASH";
    if (t.includes("hls") || t.includes("m3u8")) return "HLS";
    if (t.includes("mss") || t.includes("smooth") || t.includes("ism")) return "MSS";
    return "OTHER";
}

export function manifests(entry) {
    return (entry && entry.manifests) || [];
}

export function keyLines(entry) {
    return ((entry && entry.keys) || []).map((k) =>
        typeof k === "string" ? k : k.kid + ":" + k.k
    );
}

function shellQuote(value, single) {
    const s = String(value == null ? "" : value);
    return single ? "'" + s.replace(/'/g, "'\\''") + "'" : '"' + s.replace(/"/g, "\\"") + '"';
}

function sanitizeName(s) {
    let name = String(s == null ? "" : s)
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f]+/g, "")
        .replace(/[<>:"/\\|?*]+/g, "")
        .replace(/\s+/g, " ")
        .replace(/_{2,}/g, "_")
        .replace(/^[\s._]+|[\s._]+$/g, "")
        .slice(0, 120)
        .replace(/[\s._]+$/g, "");
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = "_" + name;
    return name;
}

function slugFromUrl(u) {
    try {
        const parsed = new URL(u);
        let base = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
        base = sanitizeName(decodeURIComponent(base.replace(/\.[a-z0-9]+$/i, "")));
        return base || sanitizeName(parsed.hostname);
    } catch (e) {
        return "";
    }
}

function saveName(mode, entry) {
    if (mode === "url") return slugFromUrl(entry.url);
    if (mode === "title") return entry.title ? sanitizeName(entry.title) : slugFromUrl(entry.url);
    return "";
}

export function buildCommand(entry, settings, manifestIndex) {
    settings = settings || {};
    entry = entry || {};
    const exe = settings.exe_name || "N_m3u8DL-RE";
    const q = (s) => shellQuote(s, !!settings.use_single_quotes);
    const mans = manifests(entry);
    const manifest = mans[manifestIndex || 0] || mans[0] || {};
    const parts = [exe];

    if (manifest.url) parts.push(q(manifest.url));

    const name = saveName(settings.save_name, entry);
    if (name) parts.push("--save-name " + q(name));

    if (settings.pass_headers !== false) {
        Object.keys(manifest.headers || {}).forEach(h => {
            parts.push("-H " + q(h + ": " + manifest.headers[h]));
        });
    }

    keyLines(entry).forEach(kv => parts.push("--key " + kv));
    if (settings.use_shaka) parts.push("--use-shaka-packager");
    parts.push(settings.additional_args || "-M format=mkv");
    return parts.join(" ");
}

function kvRow(label, valueNode, copyText) {
    const row = document.createElement("div");
    row.className = "kv-row";

    const labelEl = document.createElement("span");
    labelEl.className = "kv-label";
    labelEl.textContent = label;
    row.append(labelEl, valueNode);

    if (copyText) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "kv-copy";
        copyBtn.textContent = tr("copy", "Copy");
        copyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            copyToClipboard(copyBtn, typeof copyText === "function" ? copyText() : copyText);
        });
        row.append(copyBtn);
    }
    return row;
}

function inputVal(str) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "kv-input";
    input.readOnly = true;
    input.value = str || "-";
    return input;
}

function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts < 1e12 ? ts * 1000 : ts);
    if (isNaN(d)) return "";
    const pad = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
        " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export function renderKeyEntry(entry, settings, onDelete) {
    entry = entry || {};
    const item = document.createElement("div");
    item.className = "key-item";
    if (entry.pssh_data) item.dataset.pssh = entry.pssh_data;

    const head = document.createElement("div");
    head.className = "key-head";
    head.setAttribute("role", "button");
    head.tabIndex = 0;

    const caret = document.createElement("span");
    caret.className = "key-caret";
    caret.textContent = "▸";

    const url = document.createElement("span");
    url.className = "key-url";
    url.textContent = entry.url || tr("unknownPage", "Unknown page");
    url.title = entry.url || "";
    head.append(caret, url);

    if (entry.type) {
        const pill = document.createElement("span");
        pill.className = "key-type " + String(entry.type).toLowerCase();
        pill.textContent = String(entry.type).toUpperCase();
        if (entry.timestamp) pill.title = fmtTime(entry.timestamp);
        head.append(pill);
    }

    const lines = keyLines(entry);
    if (lines.length) {
        const chip = document.createElement("span");
        chip.className = "key-chip";
        chip.textContent = lines.length === 1
            ? tr("keyCountOne", "1 key")
            : tr("keyCountMany", "{n} keys").replace("{n}", lines.length);
        head.append(chip);
    }

    if (typeof onDelete === "function") {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "key-del";
        del.title = tr("deleteEntry", "Delete entry");
        del.setAttribute("aria-label", del.title);
        del.innerHTML = ICON_TRASH;
        del.addEventListener("click", e => {
            e.stopPropagation();
            onDelete(entry.pssh_data, item);
        });
        head.append(del);
    }

    const body = document.createElement("div");
    body.className = "key-body";
    body.append(kvRow("PSSH", inputVal(entry.pssh_data), entry.pssh_data));

    if (lines.length) {
        const keySel = document.createElement("select");
        keySel.className = "kv-select";
        lines.forEach((line, i) => {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = line;
            keySel.append(option);
        });
        keySel.addEventListener("click", e => e.stopPropagation());
        body.append(kvRow("Keys", keySel, () => lines.map(line => "--key " + line).join(" ")));
    } else {
        body.append(kvRow("Keys", inputVal(""), ""));
    }

    const mans = manifests(entry);
    if (mans.length) {
        const manifestSel = document.createElement("select");
        manifestSel.className = "kv-select";
        mans.forEach((m, i) => {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = normalizeType(m.type) + " · " + (m.url || "");
            manifestSel.append(option);
        });

        body.append(kvRow(tr("manifest", "Manifest"), manifestSel,
            () => mans[Number(manifestSel.value)]?.url || ""));

        const cmdInput = inputVal(buildCommand(entry, settings, 0));
        body.append(kvRow(tr("command", "Command"), cmdInput, () => cmdInput.value));

        item.refreshCmd = () => {
            cmdInput.value = buildCommand(entry, settings, Number(manifestSel.value));
        };
        manifestSel.addEventListener("click", e => e.stopPropagation());
        manifestSel.addEventListener("change", item.refreshCmd);
    }

    item.append(head, body);
    head.addEventListener("click", () => item.classList.toggle("open"));
    head.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            item.classList.toggle("open");
        }
    });
    return item;
}

export function entriesFromMap(map) {
    return Object.values(map || {}).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function searchText(entry) {
    entry = entry || {};
    const parts = [entry.url, entry.pssh_data, entry.type];
    manifests(entry).forEach(m => parts.push(m.url, m.type));
    return parts.concat(keyLines(entry)).filter(Boolean).join(" ").toLowerCase();
}

export function refreshCommands(root) {
    (root || document).querySelectorAll(".key-item").forEach(el => {
        if (typeof el.refreshCmd === "function") el.refreshCmd();
    });
}