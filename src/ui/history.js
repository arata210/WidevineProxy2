import { renderKeyEntry, entriesFromMap, normalizeType, manifests, searchText } from "./keys-render.js";

const root = document.documentElement;
const listEl = document.getElementById("history-list");
const searchEl = document.getElementById("search");
const typeFilterEl = document.getElementById("typeFilter");
const clearAllBtn = document.getElementById("clearAll");
const exportBtn = document.getElementById("exportAll");
const totalCountEl = document.getElementById("totalCount");
const resultCountEl = document.getElementById("resultCount");

let entries = [];
let settings = {};
let query = "";
let typeFilter = "all";

const t = (key, fallback) => window.WP2I18n?.t(key) || fallback || key;

function matches(entry) {
    const type = normalizeType((manifests(entry)[0] || {}).type);
    if (typeFilter !== "all" && type !== typeFilter) return false;
    return !(query && searchText(entry).indexOf(query) === -1);
}

function render() {
    const shown = entries.filter(matches);
    listEl.innerHTML = "";

    totalCountEl.textContent = t("entriesStored", "{n} entries stored").replace("{n}", entries.length);
    resultCountEl.textContent = entries.length
        ? t("showingOf", "Showing {shown} of {total}")
            .replace("{shown}", shown.length)
            .replace("{total}", entries.length)
        : "";

    if (!entries.length) {
        listEl.innerHTML = '<div class="hist-empty">' + t("noHistory", "No keys have been captured yet.") + "</div>";
        return;
    }

    if (!shown.length) {
        listEl.innerHTML = '<div class="hist-empty">' + t("noMatch", "No entries match your search.") + "</div>";
        return;
    }

    shown.forEach(entry => listEl.append(
        renderKeyEntry(entry, settings, pssh => deleteEntry(pssh))
    ));
}

function deleteEntry(pssh) {
    if (pssh) chrome.storage.local.remove(pssh, loadKeys);
}

function loadKeys() {
    chrome.storage.local.get(null, map => {
        entries = entriesFromMap(map);
        render();
    });
}

function loadSettings() {
    chrome.storage.sync.get(null, stored => {
        settings = stored || {};
        root.setAttribute("data-theme", settings.dark_mode ? "dark" : "light");
        render();
    });
}

searchEl.addEventListener("input", () => {
    query = searchEl.value.trim().toLowerCase();
    render();
});

typeFilterEl.addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    typeFilter = btn.dataset.type;
    typeFilterEl.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b === btn));
    render();
});

exportBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, map => {
        const blob = new Blob([JSON.stringify(map)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "widevineproxy2-keys.json";
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
});

clearAllBtn.addEventListener("click", () => {
    if (!entries.length) return;
    const message = t("confirmClear", "Delete all {n} stored key entries?")
        .replace("{n}", entries.length);
    if (!window.confirm(message)) return;
    chrome.storage.local.clear(() => {
        entries = [];
        render();
    });
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local") loadKeys();
        else if (areaName === "sync") loadSettings();
    });
}

window.addEventListener("wp2-language-change", render);

async function boot() {
    if (window.WP2I18n?.ready) await window.WP2I18n.ready;
    if (typeof chrome !== "undefined" && chrome.storage) {
        loadSettings();
        loadKeys();
    } else {
        render();
    }
}

boot();