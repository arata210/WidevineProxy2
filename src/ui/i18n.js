(() => {
    const dict = {
        en: {
            settings:"Settings", enabled:"Enabled", disabled:"Disabled", enabledState:"Enabled", darkMode:"Dark mode",
            proxyMode:"Proxy mode", event:"Event", property:"Property", serviceCert:"Service certificate", never:"Never",
            whenUsed:"When used", deviceType:"Device type", widevineDevice:"Widevine device", remoteCdm:"Remote CDM",
            chooseFile:"Choose device file", noDeviceLoaded:"No device loaded", chooseRemote:"Choose remote.json",
            noRemoteLoaded:"No remote CDM loaded", drmStatus:"DRM status", mediaKeys:"MediaKeys", session:"Session",
            generated:"Generated", challenge:"Challenge", license:"License", commandOptions:"Command options",
            packager:"Packager", quotes:"Quotes", saveName:"Save name", none:"None", title:"Title", url:"URL",
            executableName:"Executable name", additionalArguments:"Additional arguments", exePlaceholder:"N_m3u8DL-RE",
            argsPlaceholder:"-M format=mkv", passHeaders:"Pass headers to N_m3u8DL-RE",
            headersNote:"manifest.headers → generated command only", keysRecent:"Keys (last 5 min.)", history:"History",
            noKeys:"No keys captured", keyHistory:"Key history", entriesStored:"{n} entries stored",
            showingOf:"Showing {shown} of {total}", searchPlaceholder:"Search URL, PSSH, KID/key, command…",
            all:"All", other:"Other", export:"Export", clearAll:"Clear all", noHistory:"No keys have been captured yet.",
            noMatch:"No entries match your search.", confirmClear:"Delete all {n} stored key entries?", copy:"Copy",
            copied:"Copied", unknownPage:"Unknown page", keyCountOne:"1 key", keyCountMany:"{n} keys",
            pssh:"PSSH", keys:"Keys", manifest:"Manifest", command:"Command", deleteEntry:"Delete entry",
            download:"Download", remove:"Remove", waiting:"waiting", success:"success", failed:"failed",
            serviceCertHint:"Encrypt the client ID only when required",
            propertyRemoteIncompatible:"Property proxy mode is incompatible with Remote CDM"
        },
        zh: {
            settings:"设置", enabled:"启用", disabled:"已停用", enabledState:"已启用", darkMode:"深色模式",
            proxyMode:"代理模式", event:"事件", property:"属性", serviceCert:"服务证书", never:"从不",
            whenUsed:"使用时", deviceType:"设备类型", widevineDevice:"Widevine 设备", remoteCdm:"远程 CDM",
            chooseFile:"选择设备文件", noDeviceLoaded:"未加载设备", chooseRemote:"选择 remote.json",
            noRemoteLoaded:"未加载远程 CDM", drmStatus:"DRM 状态", mediaKeys:"MediaKeys", session:"会话",
            generated:"已生成", challenge:"挑战", license:"许可证", commandOptions:"命令选项",
            packager:"封装工具", quotes:"引号", saveName:"保存名称", none:"无", title:"标题", url:"URL",
            executableName:"可执行文件名", additionalArguments:"附加参数", exePlaceholder:"N_m3u8DL-RE",
            argsPlaceholder:"-M format=mkv", passHeaders:"将 Headers 传递给 N_m3u8DL-RE",
            headersNote:"仅将 manifest.headers 写入生成的命令", keysRecent:"最近 5 分钟的 Keys", history:"历史记录",
            noKeys:"暂无捕获的 Keys", keyHistory:"Key 历史", entriesStored:"已保存 {n} 条记录",
            showingOf:"显示 {shown} / {total}", searchPlaceholder:"搜索 URL、PSSH、KID/Key、命令…",
            all:"全部", other:"其他", export:"导出", clearAll:"全部清除", noHistory:"尚未捕获任何 Key。",
            noMatch:"没有符合搜索条件的记录。", confirmClear:"确定删除全部 {n} 条已保存的 Key 记录吗？",
            copy:"复制", copied:"已复制", unknownPage:"未知页面", keyCountOne:"1 个 Key", keyCountMany:"{n} 个 Key",
            pssh:"PSSH", keys:"Keys", manifest:"清单", command:"命令", deleteEntry:"删除记录", download:"下载",
            remove:"移除", waiting:"等待中", success:"成功", failed:"失败",
            serviceCertHint:"仅在需要时加密客户端 ID", propertyRemoteIncompatible:"属性代理模式与远程 CDM 不兼容"
        },
        ja: {
            settings:"設定", enabled:"有効", disabled:"無効", enabledState:"有効", darkMode:"ダークモード",
            proxyMode:"プロキシモード", event:"イベント", property:"プロパティ", serviceCert:"サービス証明書",
            never:"使用しない", whenUsed:"使用時", deviceType:"デバイスタイプ", widevineDevice:"Widevine デバイス",
            remoteCdm:"リモート CDM", chooseFile:"デバイスファイルを選択", noDeviceLoaded:"デバイス未読込",
            chooseRemote:"remote.json を選択", noRemoteLoaded:"リモート CDM 未読込", drmStatus:"DRM ステータス",
            mediaKeys:"MediaKeys", session:"セッション", generated:"生成", challenge:"チャレンジ", license:"ライセンス",
            commandOptions:"コマンド設定", packager:"パッケージャー", quotes:"引用符", saveName:"保存名", none:"なし",
            title:"タイトル", url:"URL", executableName:"実行ファイル名", additionalArguments:"追加引数",
            exePlaceholder:"N_m3u8DL-RE", argsPlaceholder:"-M format=mkv", passHeaders:"Headers を N_m3u8DL-RE に渡す",
            headersNote:"manifest.headers は生成するコマンドにのみ追加", keysRecent:"過去 5 分間の Keys", history:"履歴",
            noKeys:"取得した Keys はありません", keyHistory:"Key 履歴", entriesStored:"{n} 件保存",
            showingOf:"{total} 件中 {shown} 件を表示", searchPlaceholder:"URL、PSSH、KID/Key、コマンドを検索…",
            all:"すべて", other:"その他", export:"エクスポート", clearAll:"すべて削除",
            noHistory:"まだ Key は取得されていません。", noMatch:"検索条件に一致する項目はありません。",
            confirmClear:"保存されている {n} 件の Key をすべて削除しますか？", copy:"コピー", copied:"コピー済み",
            unknownPage:"不明なページ", keyCountOne:"1 件の Key", keyCountMany:"{n} 件の Key", pssh:"PSSH", keys:"Keys",
            manifest:"マニフェスト", command:"コマンド", deleteEntry:"項目を削除", download:"ダウンロード", remove:"削除",
            waiting:"待機中", success:"成功", failed:"失敗", serviceCertHint:"必要な場合のみクライアント ID を暗号化",
            propertyRemoteIncompatible:"プロパティプロキシモードはリモート CDM と併用できません"
        }
    };

    const browserLang = (navigator.language || "en").toLowerCase();
    const detected = browserLang.startsWith("zh") ? "zh" : browserLang.startsWith("ja") ? "ja" : "en";
    let current = "en";
    const t = key => (dict[current] && dict[current][key]) || dict.en[key] || key;

    function apply(lang) {
        current = dict[lang] ? lang : "en";
        document.documentElement.lang = current === "zh" ? "zh-CN" : current === "ja" ? "ja" : "en";
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const textNode = Array.from(el.childNodes).find(
                node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
            );
            if (textNode) textNode.textContent = t(el.dataset.i18n) + " ";
            else el.textContent = t(el.dataset.i18n);
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
        document.querySelectorAll("[data-i18n-title]").forEach(el => el.title = t(el.dataset.i18nTitle));
        const select = document.getElementById("languageSelect");
        if (select) select.value = current;
        window.dispatchEvent(new CustomEvent("wp2-language-change", { detail:{ language:current } }));
    }

    const ready = new Promise(resolve => {
        const start = () => {
            const select = document.getElementById("languageSelect");
            const done = stored => {
                apply(stored || detected);
                if (select) select.addEventListener("change", () => {
                    apply(select.value);
                    if (typeof chrome !== "undefined" && chrome.storage?.sync)
                        chrome.storage.sync.set({ language:select.value });
                });
                resolve();
            };
            if (typeof chrome !== "undefined" && chrome.storage?.sync)
                chrome.storage.sync.get(["language"], s => done(s.language));
            else done(detected);
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
        else start();
    });

    window.WP2I18n = { t, apply, ready };
})();