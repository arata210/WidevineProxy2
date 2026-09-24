const manifest = require('./src/manifest.json');

const fs = require("fs");
const fsp = require('fs/promises');
const path = require("path");

const { loadEnvFile } = require("node:process");
const { spawn } = require("child_process");

const archiver = require("archiver");

const OUT = path.join(__dirname, "artifacts");
const NAME = `WidevineProxy2-${manifest.version}`;

const ignoreFiles = [
    "library/background/build.js",
    "library/background/background.js",
    "library/background/remote_cdm.js",
    "library/isolated/build.js",
    "library/isolated/storage.js",
    "library/isolated/util.js",
    "library/main/build.js",
    "library/main/cmac.js",
    "library/main/forge.min.js",
    "library/main/license_protocol.min.js",
    "library/main/page_eme.js",
    "library/main/page_web.js",
    "library/main/protobuf.min.js",
    "library/main/session.js",
    "library/main/util.js",
    "ui/build.js",
    "ui/icons.js",
    "ui/keys-render.js",
];

function asyncSpawn(args) {
    return new Promise((resolve, reject) => {
        const command = spawn(process.execPath, args, {
            stdio: "inherit",
            shell: false
        });

        command.on("error", reject);

        command.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });
    });
}

async function packageFirefox(sourceDir) {
    loadEnvFile(".env");

    const webExtCli = path.join(
        __dirname, "node_modules", "web-ext", "bin", "web-ext.js"
    );

    const args = [
        webExtCli,
        "sign",
        "-s", sourceDir,
        "-a", OUT,
        ...ignoreFiles.flatMap(file => ["-i", file]),
        "--api-key", process.env.API_KEY,
        "--api-secret", process.env.API_SECRET,
        "--channel", "unlisted"
    ];

    await asyncSpawn(args);

    const webExtOutputFile = path.join(OUT, `${NAME.toLowerCase()}.xpi`);
    const outputFile = path.join(OUT, `${NAME}.xpi`);

    await fsp.rename(webExtOutputFile, outputFile);
}

async function packageChrome(sourceDir) {
    const outputFile = path.join(OUT, `${NAME}.zip`);
    const output = fs.createWriteStream(outputFile);
    const archive = new archiver.ZipArchive("zip", {
        zlib: { level: 0 }
    });

    archive.on("error", (err) => {
        throw err;
    });

    archive.pipe(output);

    archive.glob("**/*", {
        cwd: sourceDir,
        ignore: ignoreFiles,
        dot: true
    });

    await archive.finalize();
}

(async () => {
    const runType = process.argv[2] ?? "both";

    await fsp.mkdir(OUT, { recursive: true });
    const sourceDir = path.join(OUT, NAME);

    await fsp.cp('src', sourceDir, { recursive: true });

    if (runType !== "firefox") {
        console.log("Packaging chrome...");
        await packageChrome(sourceDir);
    }
    if (runType !== "chrome") {
        console.log("Packaging firefox...");
        await packageFirefox(sourceDir);
    }

    await fsp.rm(sourceDir, {
        recursive: true
    });
})();