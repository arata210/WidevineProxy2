(() => {
    const dict = {
        en: {
            settings:"Settings", enabled:"Enabled", disabled:"disabled", enabledState:"enabled", darkMode:"Dark mode", proxyMode:"Proxy mode", event:"Event", property:"Property",
            serviceCert:"Service cert", never:"Never", whenUsed:"When used", deviceType:"Device Type", widevineDevice:"Widevine Device", remoteCdm:"Remote CDM",
            chooseFile:"Choose File", noDeviceLoaded:"No device loaded", chooseRemote:"Choose remote.json", noRemoteLoaded:"No remote CDM loaded",
            drmStatus:"DRM Status", mediaKeys:"MediaKeys", session:"Session", generated:"Generated", challenge:"Challenge", license:"License",
            commandOptions:"Command Options", packager:"Packager", quotes:"Quotes", saveName:"Save name", executableName:"Executable name",
            additionalArguments:"Additional arguments", exePlaceholder:"N_m3u8DL-RE", argsPlaceholder:"-M format=mkv",
            passHeaders:"Pass Headers to N_m3u8DL-RE", keysRecent:"Keys (past 5 min.)", history:"History", noKeys:"no keys captured",
            keyHistory:"Key History", entriesStored:"entries stored", searchPlaceholder:"Search URL, PSSH, kid/key, command…", all:"All", other:"Other", export:"Export", clearAll:"Clear all",
            noHistory:"No keys have been captured yet.", noMatch:"No entries match your search.", confirmClear:"Delete all {n} stored key entries?"
        },
        zh: {
            settings:"设置", enabled:"启用", disabled:"已停用", enabledState:"已启用", darkMode:"深色模式", proxyMode:"代理模式", event:"Event", property:"Property",
            serviceCert:"服务证书", never:"从不", whenUsed:"使用时", deviceType:"设备类型", widevineDevice:"Widevine 设备", remoteCdm:"远程 CDM",
            chooseFile:"选择文件", noDeviceLoaded:"未加载设备", chooseRemote:"选择 remote.json", noRemoteLoaded:"未加载远程 CDM",
            drmStatus:"DRM 状态", mediaKeys:"MediaKeys", session:"会话", generated:"已生成", challenge:"Challenge", license:"License",
            commandOptions:"命令选项", packager:"封装器", quotes:"引号", saveName:"保存名称", executableName:"可执行文件名",
            additionalArguments:"附加参数", exePlaceholder:"N_m3u8DL-RE", argsPlaceholder:"-M format=mkv",
            passHeaders:"将 Headers 传递给 N_m3u8DL-RE", keysRecent:"最近 5 分钟的 Keys", history:"历史记录", noKeys:"暂无捕获的 Keys",
            keyHistory:"Key 历史记录", entriesStored:"条记录已保存", searchPlaceholder:"搜索 URL、PSSH、kid/key、命令…", all:"全部", other:"其他", export:"导出", clearAll:"全部清除",
            noHistory:"尚未捕获任何 Keys。", noMatch:"没有符合搜索条件的记录。", confirmClear:"确定删除全部 {n} 条已保存的 Key 记录吗？"
        },
        ja: {
            settings:"設定", enabled:"有効", disabled:"無効", enabledState:"有効", darkMode:"ダークモード", proxyMode:"プロキシモード", event:"Event", property:"Property",
            serviceCert:"サービス証明書", never:"なし", whenUsed:"使用時", deviceType:"デバイスタイプ", widevineDevice:"Widevine デバイス", remoteCdm:"リモート CDM",
            chooseFile:"ファイルを選択", noDeviceLoaded:"デバイス未読込", chooseRemote:"remote.json を選択", noRemoteLoaded:"リモート CDM 未読込",
            drmStatus:"DRM ステータス", mediaKeys:"MediaKeys", session:"セッション", generated:"生成済み", challenge:"Challenge", license:"License",
            commandOptions:"コマンド設定", packager:"パッケージャー", quotes:"引用符", saveName:"保存名", executableName:"実行ファイル名",
            additionalArguments:"追加引数", exePlaceholder:"N_m3u8DL-RE", argsPlaceholder:"-M format=mkv",
            passHeaders:"Headers を N_m3u8DL-RE に渡す", keysRecent:"過去 5 分間の Keys", history:"履歴", noKeys:"取得した Keys はありません",
            keyHistory:"Key 履歴", entriesStored:"件保存", searchPlaceholder:"URL、PSSH、kid/key、コマンドを検索…", all:"すべて", other:"その他", export:"エクスポート", clearAll:"すべて削除",
            noHistory:"まだ Keys は取得されていません。", noMatch:"検索条件に一致する項目はありません。", confirmClear:"保存されている {n} 件の Key をすべて削除しますか？"
        }
    };
    const browserLang = (navigator.language || "en").toLowerCase();
    const detected = browserLang.startsWith("zh") ? "zh" : browserLang.startsWith("ja") ? "ja" : "en";
    let current = "en";

    function t(key) { return (dict[current] && dict[current][key]) || dict.en[key] || key; }
    function apply(lang) {
        current = dict[lang] ? lang : "en";
        document.documentElement.lang = current === "zh" ? "zh-CN" : current === "ja" ? "ja" : "en";
        document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
        document.querySelectorAll("[data-i18n-add]").forEach(el => { el.dataset.addLabel = t(el.dataset.i18nAdd); });
        document.querySelectorAll("[data-i18n-empty]").forEach(el => { el.dataset.empty = t(el.dataset.i18nEmpty); });
        const sel = document.getElementById("languageSelect");
        if (sel) sel.value = current;
    }

    const ready = new Promise(resolve => {
        const start = () => {
            apply(detected);
            const sel = document.getElementById("languageSelect");
            const done = (stored) => {
                apply(stored || detected);
                if (sel) sel.addEventListener("change", () => { apply(sel.value); chrome.storage.sync.set({ language: sel.value }); });
                resolve();
            };
            if (chrome?.storage?.sync) chrome.storage.sync.get(["language"], s => done(s.language));
            else done(detected);
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
        else start();
    });
    window.WP2I18n = { t, apply, ready };
})();