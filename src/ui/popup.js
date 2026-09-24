import { ICON_DOWNLOAD, ICON_TRASH } from "./icons.js";
import { renderKeyEntry, entriesFromMap, refreshCommands } from "./keys-render.js";

const root = document.documentElement;
const darkToggle = document.getElementById("darkModeToggle");
const enabled = document.getElementById("enabled");
const statePill = document.getElementById("statePill");
const stateText = document.getElementById("stateText");
const wvdSelect = document.getElementById("wvd_select");
const remoteSelect = document.getElementById("remote_select");
const wvdPanel = document.getElementById("wvd");
const remotePanel = document.getElementById("remote");
const passHeaders = document.getElementById("passHeaders");
let booting = true;
let settings = {};

const t = (key, fallback) => window.WP2I18n?.t(key) || fallback || key;

(() => {
    const el = document.getElementById("version");
    try {
        const version = chrome.runtime.getManifest().version;
        if (version && el) el.textContent = "v" + version;
    } catch (e) {}
})();

function saveSync(obj) {
    if (booting) return;
    if (typeof chrome !== "undefined" && chrome.storage?.sync) chrome.storage.sync.set(obj);
    Object.assign(settings, obj);
}

function applyTheme(dark) {
    root.setAttribute("data-theme", dark ? "dark" : "light");
    darkToggle.checked = dark;
}

darkToggle.addEventListener("change", () => {
    applyTheme(darkToggle.checked);
    saveSync({ dark_mode: darkToggle.checked });
});

const certNever = document.getElementById("cert_never");
const certWhen = document.getElementById("cert_when");
const setServerCert = on => {
    certWhen.checked = on;
    certNever.checked = !on;
};
[certNever, certWhen].forEach(r => r.addEventListener("change", () => saveSync({ server_cert: certWhen.checked })));

const proxyEvent = document.getElementById("proxy_event");
const proxyProperty = document.getElementById("proxy_property");
const setProxyMode = mode => {
    proxyProperty.checked = mode === "property";
    proxyEvent.checked = !proxyProperty.checked;
};
const currentProxyMode = () => proxyProperty.checked ? "property" : "event";
const applyCompat = () => {
    if (remoteSelect.checked && proxyProperty.checked) {
        setProxyMode("event");
        saveSync({ proxy_mode: "event" });
    }

    const disableProperty = remoteSelect.checked;
    const disableRemote = proxyProperty.checked;
    proxyProperty.disabled = disableProperty;
    remoteSelect.disabled = disableRemote;

    const propertyLabel = document.querySelector('label[for="proxy_property"]');
    const remoteLabel = document.querySelector('label[for="remote_select"]');
    [propertyLabel, remoteLabel].forEach((label, i) => {
        if (!label) return;
        label.classList.toggle("disabled", i === 0 ? disableProperty : disableRemote);
        label.title = (i === 0 ? disableProperty : disableRemote)
            ? t("propertyRemoteIncompatible", "Property proxy mode is incompatible with Remote CDM")
            : "";
    });
};
[proxyEvent, proxyProperty].forEach(r => r.addEventListener("change", () => {
    saveSync({ proxy_mode: currentProxyMode() });
    applyCompat();
}));

function applyEnabled() {
    const on = enabled.checked;
    statePill.classList.toggle("on", on);
    stateText.textContent = on ? t("enabledState", "Enabled") : t("disabled", "Disabled");
}
enabled.addEventListener("change", () => {
    applyEnabled();
    saveSync({ enabled: enabled.checked });
});

function applyDeviceType() {
    const showWvd = wvdSelect.checked;
    const showRemote = remoteSelect.checked;
    const none = !showWvd && !showRemote;
    wvdPanel.style.display = none || showWvd ? "" : "none";
    remotePanel.style.display = none || showRemote ? "" : "none";
}
const onDeviceTypeChange = () => {
    applyDeviceType();
    saveSync({ device_type: wvdSelect.checked ? "WVD" : "REMOTE" });
    applyCompat();
};
[wvdSelect, remoteSelect].forEach(r => r.addEventListener("change", onDeviceTypeChange));

const pkgMp4 = document.getElementById("pkg_mp4");
const pkgShaka = document.getElementById("pkg_shaka");
const setPackager = shaka => {
    pkgShaka.checked = shaka;
    pkgMp4.checked = !shaka;
};
[pkgMp4, pkgShaka].forEach(r => r.addEventListener("change", () => {
    saveSync({ use_shaka: pkgShaka.checked });
    refreshCommands();
}));

const quoteCmd = document.getElementById("quote_cmd");
const quoteBash = document.getElementById("quote_bash");
const setQuotes = bash => {
    quoteBash.checked = bash;
    quoteCmd.checked = !bash;
};
[quoteCmd, quoteBash].forEach(r => r.addEventListener("change", () => {
    saveSync({ use_single_quotes: quoteBash.checked });
    refreshCommands();
}));

const saveNone = document.getElementById("save_none");
const saveTitle = document.getElementById("save_title");
const saveUrl = document.getElementById("save_url");
const setSaveName = mode => {
    saveTitle.checked = mode === "title";
    saveUrl.checked = mode === "url";
    saveNone.checked = !saveTitle.checked && !saveUrl.checked;
};
[saveNone, saveTitle, saveUrl].forEach(r => r.addEventListener("change", () => {
    saveSync({ save_name: saveTitle.checked ? "title" : saveUrl.checked ? "url" : "none" });
    refreshCommands();
}));

passHeaders.addEventListener("change", () => {
    saveSync({ pass_headers: passHeaders.checked });
    refreshCommands();
});

const cmdSection = document.getElementById("command-options");
cmdSection.querySelector(".collapse-head").addEventListener("click", () => {
    const collapsed = cmdSection.classList.toggle("collapsed");
    saveSync({ command_options_collapsed: collapsed });
});

const drmStatusEl = document.getElementById("drmStatus");
function setEmeStatusField(cell, st) {
    cell.classList.remove("ok", "fail", "pending");
    if (!st) {
        cell.classList.add("pending");
        cell.title = cell.dataset.eme + " - " + t("waiting", "waiting");
        return;
    }
    cell.classList.add(st.success ? "ok" : "fail");
    cell.title = cell.dataset.eme + " - " +
        (st.success ? t("success", "success") : t("failed", "failed")) +
        (st.args !== undefined ? "\n" + st.args : "");
}

async function refreshEmeStatuses(tabId) {
    if (tabId == null) return;
    try {
        const statuses = await chrome.tabs.sendMessage(tabId, { type: "EME_STATUS_ACTIVE" });
        if (!statuses || !Object.keys(statuses).length) return;
        drmStatusEl.querySelectorAll(".drm-step").forEach(cell => {
            setEmeStatusField(cell, statuses[cell.dataset.eme]);
        });
    } catch (e) {}
}

function listenEmeStatus(tabId) {
    if (tabId == null) return;
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.tab?.id !== tabId || message.type !== "EME_STATUS_REACTIVE") return;
        const payload = message.payload;
        const cell = drmStatusEl.querySelector('.drm-step[data-eme="' + payload.type + '"]');
        if (cell) setEmeStatusField(cell, payload.data);
    });
}

const exeName = document.getElementById("downloader-name");
const addArgs = document.getElementById("downloader-args");
exeName.addEventListener("input", () => saveSync({ exe_name: exeName.value }));
addArgs.addEventListener("input", () => saveSync({ additional_args: addArgs.value }));

const wvdCombo = document.getElementById("wvd-combobox");
const remoteCombo = document.getElementById("remote-combobox");
wvdCombo.addEventListener("change", () => saveSync({ selected: wvdCombo.value }));
remoteCombo.addEventListener("change", () => saveSync({ selected_remote_cdm: remoteCombo.value }));

function populateSelect(sel, names, selected) {
    sel.innerHTML = "";
    (names || []).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        sel.append(option);
    });
    if (selected != null) sel.value = selected;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
}

const comboFor = kind => kind === "wvd" ? wvdCombo : remoteCombo;

function openPicker(kind) {
    const mobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const type = {
        wvd: mobile ? "OPEN_PICKER_WVD_MOBILE" : "OPEN_PICKER_WVD",
        remote: mobile ? "OPEN_PICKER_REMOTE_MOBILE" : "OPEN_PICKER_REMOTE"
    }[kind];
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage)
        chrome.runtime.sendMessage({ type });
    window.close();
}

const sanitize = s => (s || "file").replace(/[\\/:*?"<>|]+/g, "_");

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadEntry(kind, name) {
    const data = settings[name];
    if (!name || data == null) return;
    if (kind === "wvd") {
        const bin = atob(data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        saveBlob(new Blob([bytes], { type: "application/octet-stream" }), sanitize(name) + ".wvd");
    } else {
        saveBlob(new Blob([JSON.stringify(data, null, 4)], { type: "application/json" }), sanitize(name) + ".json");
    }
}

function removeEntry(kind, name) {
    if (!name) return;
    const listKey = kind === "wvd" ? "devices" : "remote_cdms";
    const selKey = kind === "wvd" ? "selected" : "selected_remote_cdm";
    const list = (settings[listKey] || []).filter(n => n !== name);
    const patch = { [listKey]: list };
    if (settings[selKey] === name) patch[selKey] = list[0] || "";

    delete settings[name];
    Object.assign(settings, patch);

    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        chrome.storage.sync.set(patch);
        chrome.storage.sync.remove(name);
    }

    populateSelect(comboFor(kind), list, patch[selKey] !== undefined ? patch[selKey] : settings[selKey]);
}

const closers = [];

function glyph(kind, key) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "dd-glyph " + (kind === "dl" ? "dl" : "rm");
    el.title = t(key, key);
    el.setAttribute("aria-label", el.title);
    el.innerHTML = kind === "dl" ? ICON_DOWNLOAD : ICON_TRASH;
    return el;
}

function initDropdown(host) {
    const select = host.querySelector('[data-role="select"]');
    const kind = host.dataset.kind;
    const addLabel = () => t(host.dataset.i18nAdd, kind === "wvd" ? "Choose device file" : "Choose remote.json");
    const emptyLabel = () => t(host.dataset.i18nEmpty, kind === "wvd" ? "No device loaded" : "No remote CDM loaded");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dd-trigger";

    const name = document.createElement("span");
    name.className = "dd-name";

    const actions = document.createElement("span");
    actions.className = "dd-actions";

    const dl = glyph("dl", "download");
    const rm = glyph("rm", "remove");
    actions.append(dl, rm);

    const caret = document.createElement("span");
    caret.className = "dd-caret";
    caret.textContent = "▾";
    trigger.append(name, actions, caret);

    const menu = document.createElement("div");
    menu.className = "dd-menu";
    host.append(trigger, menu);

    const selectedOption = () => select.options[select.selectedIndex] || null;

    function refreshTrigger() {
        const option = selectedOption();
        const empty = !option;
        trigger.classList.toggle("dd-empty", empty);

        dl.title = t("download", "Download");
        rm.title = t("remove", "Remove");
        dl.setAttribute("aria-label", dl.title);
        rm.setAttribute("aria-label", rm.title);

        if (empty) {
            name.textContent = emptyLabel();
            name.classList.add("placeholder");
            dl.classList.add("disabled");
            rm.classList.add("disabled");
        } else {
            name.textContent = option.textContent || option.value;
            name.classList.remove("placeholder");
            dl.classList.remove("disabled");
            rm.classList.remove("disabled");
        }
    }

    function close() {
        menu.classList.remove("open");
        trigger.classList.remove("open");
    }

    function buildMenu() {
        menu.innerHTML = "";
        Array.from(select.options).forEach((option, i) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "dd-item" + (i === select.selectedIndex ? " selected" : "");

            const nm = document.createElement("span");
            nm.className = "dd-name";
            nm.textContent = option.textContent || option.value;

            const acts = document.createElement("span");
            acts.className = "dd-actions";
            const idl = glyph("dl", "download");
            const irm = glyph("rm", "remove");
            acts.append(idl, irm);
            item.append(nm, acts);

            item.addEventListener("click", () => { select.selectedIndex = i; select.dispatchEvent(new Event("change", { bubbles: true })); close(); });
            idl.addEventListener("click", e => { e.stopPropagation(); downloadEntry(kind, option.value); close(); });
            irm.addEventListener("click", e => { e.stopPropagation(); removeEntry(kind, option.value); close(); });
            menu.append(item);
        });

        const add = document.createElement("button");
        add.type = "button";
        add.className = "dd-add";
        const plus = document.createElement("span");
        plus.className = "plus";
        plus.textContent = "+";
        add.append(plus, document.createTextNode(addLabel()));
        add.addEventListener("click", () => openPicker(kind));
        menu.append(add);
    }

    function open() {
        closers.forEach(c => c());
        buildMenu();
        menu.classList.add("open");
        trigger.classList.add("open");
    }

    host.refreshUi = () => {
        refreshTrigger();
        if (menu.classList.contains("open")) buildMenu();
    };

    closers.push(close);
    trigger.addEventListener("click", e => {
        e.stopPropagation();
        menu.classList.contains("open") ? close() : open();
    });
    dl.addEventListener("click", e => {
        e.stopPropagation();
        if (!dl.classList.contains("disabled")) downloadEntry(kind, select.value);
    });
    rm.addEventListener("click", e => {
        e.stopPropagation();
        if (!rm.classList.contains("disabled")) removeEntry(kind, select.value);
    });

    select.addEventListener("change", refreshTrigger);
    new MutationObserver(() => {
        refreshTrigger();
        if (menu.classList.contains("open")) buildMenu();
    }).observe(select, { childList: true });

    refreshTrigger();
}

document.querySelectorAll("[data-dropdown]").forEach(initDropdown);
document.addEventListener("click", () => closers.forEach(c => c()));

const keyContainer = document.getElementById("key-container");
const openHistoryBtn = document.getElementById("openHistory");

function keysEmptyState() {
    keyContainer.innerHTML = '<div class="empty" data-i18n="noKeys">' + t("noKeys", "No keys captured") + "</div>";
}

function renderInto(entry) {
    const empty = keyContainer.querySelector(".empty");
    if (empty) empty.remove();

    if (entry?.pssh_data) {
        const existing = keyContainer.querySelector('.key-item[data-pssh="' + CSS.escape(entry.pssh_data) + '"]');
        if (existing) existing.remove();
    }
    keyContainer.prepend(renderKeyEntry(entry, settings));
}

function loadKeys() {
    chrome.storage.local.get(null, map => {
        const list = entriesFromMap(map);
        keyContainer.innerHTML = "";
        const now = Date.now();
        const recent = list.filter(e => (now - e.timestamp) / 1000 <= 5 * 60);
        if (!recent.length) return keysEmptyState();
        recent.forEach(e => keyContainer.append(renderKeyEntry(e, settings)));
    });
}

function onStorageChanged(changes, areaName) {
    if (areaName === "local") {
        Object.entries(changes).forEach(([pssh, change]) => {
            if (change.newValue) renderInto(change.newValue);
            else keyContainer.querySelector('.key-item[data-pssh="' + CSS.escape(pssh) + '"]')?.remove();
        });
        if (!keyContainer.querySelector(".key-item")) keysEmptyState();
    } else if (areaName === "sync") {
        Object.entries(changes).forEach(([key, change]) => settings[key] = change.newValue);
        refreshCommands();
    }
}

function loadSettings() {
    chrome.storage.sync.get(null, stored => {
        settings = stored || {};
        enabled.checked = !!(settings.enabled ?? true);
        applyEnabled();
        applyTheme(!!settings.dark_mode);
        remoteSelect.checked = settings.device_type === "REMOTE";
        wvdSelect.checked = !remoteSelect.checked;
        applyDeviceType();
        setServerCert(!!settings.server_cert);
        setProxyMode(settings.proxy_mode ?? "event");
        exeName.value = settings.exe_name || "";
        addArgs.value = settings.additional_args || "";
        setPackager(!!settings.use_shaka);
        setQuotes(!!settings.use_single_quotes);
        setSaveName(settings.save_name || "none");
        passHeaders.checked = settings.pass_headers !== false;
        cmdSection.classList.toggle("collapsed", settings.command_options_collapsed !== false);
        populateSelect(wvdCombo, settings.devices, settings.selected);
        populateSelect(remoteCombo, settings.remote_cdms, settings.selected_remote_cdm);
        booting = false;
        applyCompat();
        loadKeys();
    });
}

openHistoryBtn.addEventListener("click", () => {
    const url = chrome.runtime.getURL("ui/history.html");
    chrome.tabs.create({ url }, () => window.close());
});

window.addEventListener("wp2-language-change", () => {
    document.querySelectorAll("[data-dropdown]").forEach(host => host.refreshUi?.());
    applyEnabled();
    applyCompat();
    loadKeys();
});

async function boot() {
    if (window.WP2I18n?.ready) await window.WP2I18n.ready;
    if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.onChanged.addListener(onStorageChanged);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        loadSettings();
        if (tab?.id != null) {
            listenEmeStatus(tab.id);
            refreshEmeStatuses(tab.id);
        }
    } else {
        booting = false;
        keysEmptyState();
    }
}

boot();