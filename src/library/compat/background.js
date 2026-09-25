import "../main/protobuf.min.js";
import "../main/license_protocol.min.js";
import "../main/forge.min.js";
import { Session } from "../main/session.js";
import { RemoteCdm } from "../background/remote_cdm.js";

const { SignedMessage, LicenseRequest, License } = protobuf.roots.default.license_protocol;
const WIDEVINE_SYSTEM_ID = new Uint8Array([
    0x9a,0x04,0xf0,0x79,0x98,0x40,0x42,0x86,
    0xab,0x92,0xe6,0x5b,0xe0,0x88,0x5f,0x95
]);

const manifests = new Map();
const requests = new Map();
const sessions = new Map();
let logs = [];

const b64ToBytes = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const bytesToB64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
const bytesToHex = (b) => Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
const psshBoxB64 = (data) => {
    const bytes = new Uint8Array(data);
    const total = bytes.length + 32;
    const out = new Uint8Array(total);
    out[0]=(total>>>24)&255; out[1]=(total>>>16)&255; out[2]=(total>>>8)&255; out[3]=total&255;
    out.set([0x70,0x73,0x73,0x68],4);
    out.set(WIDEVINE_SYSTEM_ID,12);
    const n=bytes.length;
    out[28]=(n>>>24)&255; out[29]=(n>>>16)&255; out[30]=(n>>>8)&255; out[31]=n&255;
    out.set(bytes,32);
    return bytesToB64(out);
};

function remember(log) {
    logs.push(log);
    chrome.storage.local.set({ [log.pssh_data]: log });
}

function getTabUrl(sender) {
    return sender.tab?.url || null;
}

async function getSelectedDevice() {
    const s = await chrome.storage.sync.get(["selected"]);
    if (!s.selected) return null;
    const d = await chrome.storage.sync.get([s.selected]);
    if (!d[s.selected]) return null;
    return { name: s.selected, data: d[s.selected] };
}

function parseWvd(dataB64) {
    const bytes = b64ToBytes(dataB64);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const type = view.getUint8(4);
    const privateKeyLen = view.getUint16(7);
    const privateKey = bytes.slice(9, 9 + privateKeyLen);
    const clientIdLen = view.getUint16(9 + privateKeyLen);
    const clientId = bytes.slice(11 + privateKeyLen, 11 + privateKeyLen + clientIdLen);
    return { type, privateKey, clientId };
}

async function isEnabled() {
    const { enabled } = await chrome.storage.sync.get(["enabled"]);
    return enabled !== false;
}

async function generateLocalChallenge(body) {
    let signed;
    try { signed = SignedMessage.decode(b64ToBytes(body)); } catch { return body; }
    let req;
    try { req = LicenseRequest.decode(signed.msg); } catch { return body; }

    const psshData = req.contentId?.widevinePsshData?.psshData?.[0];
    if (!psshData) return body;

    const pssh = psshBoxB64(psshData);
    if (sessionsHasPssh(pssh)) return body;

    const device = await getSelectedDevice();
    if (!device) return body;

    const parsed = parseWvd(device.data);
    const pem = `-----BEGIN RSA PRIVATE KEY-----${bytesToB64(parsed.privateKey)}-----END RSA PRIVATE KEY-----`;
    const session = new Session({
        deviceType: parsed.type,
        privateKey: pem,
        identifierBlob: parsed.clientId
    });

    const result = session.getLicenseChallenge(b64ToBytes(body), false);
    if (!result) return body;

    sessions.set(result.requestId, { kind:"local", session, pssh });
    return bytesToB64(result.licenseRequest);
}

function sessionsHasPssh(pssh) {
    for (const s of sessions.values()) if (s.pssh === pssh) return true;
    return false;
}

async function getRemoteDevice() {
    const { selected_remote_cdm } = await chrome.storage.sync.get(["selected_remote_cdm"]);
    if (!selected_remote_cdm) return null;
    const obj = await chrome.storage.sync.get([selected_remote_cdm]);
    const value = obj[selected_remote_cdm];
    if (!value) return null;
    return { name:selected_remote_cdm, value };
}

async function generateRemoteChallenge(body) {
    let signed;
    try { signed = SignedMessage.decode(b64ToBytes(body)); } catch { return body; }
    let req;
    try { req = LicenseRequest.decode(signed.msg); } catch { return body; }
    const psshData = req.contentId?.widevinePsshData?.psshData?.[0];
    if (!psshData) return body;

    const pssh = psshBoxB64(psshData);
    if (sessionsHasPssh(pssh)) return body;

    const remote = await getRemoteDevice();
    if (!remote) return body;

    const obj = typeof remote.value === "string" ? JSON.parse(remote.value) : remote.value;
    const cdm = await RemoteCdm.open(obj.host, obj.secret, obj.device_name ?? obj.name);
    const challenge = await cdm.getLicenseChallenge(bytesToB64(psshData), true);
    const decoded = SignedMessage.decode(b64ToBytes(challenge));
    const challengeReq = LicenseRequest.decode(decoded.msg);
    const requestId = bytesToB64(challengeReq.contentId.widevinePsshData.requestId);

    sessions.set(requestId, { kind:"remote", cdm, pssh });
    return challenge;
}

async function parseClearKey(body, tabUrl) {
    const clear = JSON.parse(atob(body));
    const keys = clear.keys.map(key => ({
        ...key,
        kid: bytesToHex(b64ToBytes(key.kid.replace(/-/g,"+").replace(/_/g,"/") + "==")),
        k: bytesToHex(b64ToBytes(key.k.replace(/-/g,"+").replace(/_/g,"/") + "=="))
    }));
    const pssh = btoa(JSON.stringify({ kids: clear.keys.map(key => key.k) }));
    if (logs.some(x => x.pssh_data === pssh)) return;

    remember({
        type:"CLEARKEY",
        pssh_data:pssh,
        keys,
        url:tabUrl,
        timestamp:Date.now(),
        manifests:manifests.get(tabUrl) || []
    });
}

async function parseLicense(body, tabUrl) {
    const signed = SignedMessage.decode(b64ToBytes(body));
    if (signed.type !== SignedMessage.MessageType.LICENSE) return;

    const license = License.decode(signed.msg);
    const requestId = bytesToB64(license.id.requestId);
    const entry = sessions.get(requestId);
    if (!entry) return;

    let keys;
    if (entry.kind === "remote") {
        keys = await entry.cdm.parseLicense(body);
    } else {
        keys = entry.session.parseLicense(b64ToBytes(body));
    }

    remember({
        type:"WIDEVINE",
        pssh_data:entry.pssh,
        keys,
        url:tabUrl,
        timestamp:Date.now(),
        manifests:manifests.get(tabUrl) || []
    });
    sessions.delete(requestId);
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        if (details.method !== "GET" || details.tabId < 0) return;
        const headers = details.requestHeaders
            .filter(item => !(
                item.name.startsWith("sec-ch-ua") ||
                item.name.startsWith("Sec-Fetch") ||
                item.name.startsWith("Accept-") ||
                item.name.startsWith("Host") ||
                item.name === "Connection"
            ))
            .reduce((acc,item) => { acc[item.name]=item.value; return acc; }, {});
        requests.set(details.url, headers);
    },
    {urls:["<all_urls>"]},
    ["requestHeaders", chrome.webRequest.OnSendHeadersOptions.EXTRA_HEADERS].filter(Boolean)
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        const tabUrl = getTabUrl(sender);

        switch (message?.type) {
            case "REQUEST": {
                if (!(await isEnabled())) { sendResponse(message.body); return; }
                if (!message.body) { sendResponse(message.body); return; }

                try {
                    JSON.parse(atob(message.body));
                    sendResponse(message.body);
                    return;
                } catch {}

                try {
                    const { device_type } = await chrome.storage.sync.get(["device_type"]);
                    const out = device_type === "REMOTE"
                        ? await generateRemoteChallenge(message.body)
                        : await generateLocalChallenge(message.body);
                    sendResponse(out);
                } catch (e) {
                    console.error("[WidevineProxy2] REQUEST failed", e);
                    sendResponse(message.body);
                }
                return;
            }

            case "RESPONSE": {
                if (!(await isEnabled())) { sendResponse(message.body); return; }
                if (!message.body) { sendResponse(message.body); return; }

                try {
                    await parseClearKey(message.body, tabUrl);
                    sendResponse(message.body);
                } catch {
                    try { await parseLicense(message.body, tabUrl); }
                    catch (e) { console.error("[WidevineProxy2] RESPONSE failed", e); }
                    sendResponse(message.body);
                }
                return;
            }

            case "MANIFEST": {
                try {
                    const parsed = JSON.parse(message.body);
                    const item = {
                        type: parsed.type,
                        url: parsed.url,
                        headers: requests.get(parsed.url) || {}
                    };
                    const list = manifests.get(tabUrl) || [];
                    if (!list.some(x => x.url === item.url)) list.push(item);
                    manifests.set(tabUrl, list);
                } catch (e) {
                    console.error("[WidevineProxy2] MANIFEST failed", e);
                }
                sendResponse();
                return;
            }

            case "GET_LOGS":
                sendResponse(logs);
                return;

            case "CLEAR":
                logs = [];
                manifests.clear();
                sessions.clear();
                return;

            case "OPEN_PICKER_WVD":
                chrome.windows.create({
                    url: chrome.runtime.getURL("picker/wvd/filePicker.html"),
                    type:"popup", width:320, height:220
                });
                return;

            case "OPEN_PICKER_WVD_MOBILE":
                chrome.tabs.create({url:chrome.runtime.getURL("picker/wvd/filePicker.html")});
                return;

            case "OPEN_PICKER_REMOTE":
                chrome.windows.create({
                    url: chrome.runtime.getURL("picker/remote/filePicker.html"),
                    type:"popup", width:320, height:220
                });
                return;

            case "OPEN_PICKER_REMOTE_MOBILE":
                chrome.tabs.create({url:chrome.runtime.getURL("picker/remote/filePicker.html")});
                return;
        }
    })();
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(null, (stored) => {
        for (const [key, value] of Object.entries(stored || {})) {
            if (value?.pssh_data && value?.keys) logs.push(value);
        }
    });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && (changes.enabled || changes.selected || changes.device_type || changes.selected_remote_cdm)) {
        // Static document_start scripts are controlled by the manifest on this compatibility branch.
        console.log("[WidevineProxy2] settings changed", Object.keys(changes));
    }
});