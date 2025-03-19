#!/usr/bin/env node

const {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    rmSync,
    cpSync,
    readdirSync,
    statSync,
    renameSync // Added for potential use in compressToPak
} = require("fs");
const { join, resolve, relative } = require("path");
const { execSync } = require("child_process");
const { argv } = require("process");

const args = argv.slice(2);
const environment =
    args.find((arg) => arg.startsWith("--env="))?.split("=")[1] ||
    process.env.MODE ||
    "dev";
const version = "main";
const isHelpRequested = args.includes("--help");

const validEnvironments = ["prod", "dev"];

if (isHelpRequested) {
    console.log(`
Usage: node build.js [--env=prod|dev] [--help]
--env=prod|dev                      Sets the environment (default: prod).
--help                              Displays this help message.
`);
    process.exit(0);
}

if (!validEnvironments.includes(environment)) {
    console.error(
        `ERROR: Invalid --env value '${environment}'. Must be one of: ${validEnvironments.join(", ")}`,
    );
    process.exit(1);
}

const rootDirectory = resolve(__dirname, "..");
const sourceDirectory = join(rootDirectory, "src");
const manifestFile = join(sourceDirectory, "mod.manifest");
const temporaryBuildDirectory = join(rootDirectory, "temp_build");
const tempLocalizationDirectory = join(rootDirectory, "temp_build_localization");

if (!existsSync(manifestFile)) {
    console.error("ERROR: mod.manifest not found in src!");
    process.exit(1);
}

const manifestContent = readFileSync(manifestFile, "utf8");
const modIdentifier = /<modid>(.+?)<\/modid>/.exec(manifestContent)?.[1];
const modVersion = /<version>(.+?)<\/version>/.exec(manifestContent)?.[1];
const modName = /<name>(.+?)<\/name>/.exec(manifestContent)?.[1];

if (!modIdentifier || !modVersion || !modName) {
    console.error("ERROR: Missing required fields in mod.manifest.");
    process.exit(1);
}

function cleanBuildDirectory() {
    console.log("Cleaning build directory...");
    rmSync(temporaryBuildDirectory, { recursive: true, force: true });
    mkdirSync(temporaryBuildDirectory, { recursive: true });
    console.log("Created temp_build");
}

function prepareBuild() {
    console.log("Preparing build...");
    const sourceDataDir = join(sourceDirectory, "Data");
    const destDataDir = join(temporaryBuildDirectory, "Data");
    if (existsSync(sourceDataDir)) {
        cpSync(sourceDataDir, destDataDir, { recursive: true });
        console.log("Copied Data to temp_build");
    }
    cpSync(manifestFile, join(temporaryBuildDirectory, "mod.manifest"));
    console.log("Copied mod.manifest to temp_build");
    console.log("temp_build contents after copy:", readdirSync(temporaryBuildDirectory));

    const eulaFile = join(sourceDirectory, "modding_eula.txt");
    const destEulaFile = join(temporaryBuildDirectory, "modding_eula.txt");
    if (existsSync(eulaFile)) {
        cpSync(eulaFile, destEulaFile);
        console.log(`Copied modding_eula.txt to ${destEulaFile}`);
    } else {
        console.warn(`Warning: modding_eula.txt not found at ${eulaFile}`);
    }

    const luaFilePath = join(
        temporaryBuildDirectory,
        "Data",
        "Scripts",
        "ScaledXPHardship",
        `main.lua`,
    );
    if (!existsSync(luaFilePath)) {
        console.error(`ERROR: '${luaFilePath}' not found.`);
        process.exit(1);
    }

    const isProduction = environment === "prod";
    const luaContent = readFileSync(luaFilePath, "utf8")
        .replace(/modName = "([^"]+)"/, `modName = "${modName}"`)
        .replace(/isProduction\s*=\s*(true|false)/, `isProduction = ${isProduction}`);
    writeFileSync(luaFilePath, luaContent, "utf8");
    console.log("Updated main.lua");
}

function compressToPak(sourceDir, pakOutputPath) {
    const fileList = [];

    function buildFileList(dir) {
        const items = readdirSync(dir);
        for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                buildFileList(fullPath);
            } else if (!fullPath.toLowerCase().endsWith(".pak")) {
                fileList.push(fullPath);
            }
        }
    }

    buildFileList(sourceDir);

    if (fileList.length === 0) {
        console.error(`ERROR: No files found in '${sourceDir}' to pack.`);
        process.exit(1);
    }

    console.log(`Packing ${fileList.length} files into ${pakOutputPath}`);

    const maxSizeBytes = 2 * 1024 * 1024 * 1024;
    let fileIdx = 0;
    let pakPartNo = 0;
    let totalFiles = fileList.length;

    while (fileIdx < totalFiles) {
        let pakPath = pakOutputPath;
        if (pakPartNo > 0) {
            pakPath = pakOutputPath.replace(".pak", `-part${pakPartNo}.pak`);
        }

        let pakSize = 0;
        const filesToPack = [];

        for (let i = fileIdx; i < totalFiles; i++) {
            const file = fileList[i];
            const fileSize = statSync(file).size;
            if (pakSize + fileSize > maxSizeBytes) break;
            pakSize += fileSize;
            const relPath = relative(sourceDir, file);
            filesToPack.push(relPath);
            fileIdx++;
        }

        const cmd = `zip -r -9 -X "${pakPath}" ${filesToPack.map((f) => `"${f}"`).join(" ")}`;
        console.log(`Creating pak part ${pakPartNo}: ${cmd}`);
        execSync(cmd, { cwd: sourceDir, stdio: "inherit" });

        if (!existsSync(pakPath)) {
            console.error(`ERROR: Failed to create '${pakPath}'.`);
            process.exit(1);
        }

        if (fileIdx < totalFiles) {
            if (pakPartNo === 0) {
                const newPath = pakOutputPath.replace(".pak", "-part0.pak");
                renameSync(pakPath, newPath);
            }
            pakPartNo++;
        }
    }
}

function packData() {
    console.log("Packing data...");
    const dataDirectory = join(temporaryBuildDirectory, "Data");
    const modPakFile = join(dataDirectory, `${modIdentifier}.pak`);
    compressToPak(dataDirectory, modPakFile);

    const libsDir = join(dataDirectory, "Libs");
    const scriptsDir = join(dataDirectory, "Scripts");
    if (existsSync(libsDir)) {
        rmSync(libsDir, { recursive: true, force: true });
        console.log("Removed Data/Libs directory");
    }
    if (existsSync(scriptsDir)) {
        rmSync(scriptsDir, { recursive: true, force: true });
        console.log("Removed Data/Scripts directory");
    }

    const localizationBaseDir = join(temporaryBuildDirectory, "Localization");
    mkdirSync(localizationBaseDir, { recursive: true });

    if (environment === "dev") {
        const sourceEnglishXml = join(sourceDirectory, "Localization", "text_ui_soul__scaledxphardship.xml");
        if (!existsSync(sourceEnglishXml)) {
            console.error(`ERROR: Source English XML not found at '${sourceEnglishXml}'`);
            process.exit(1);
        }

        const englishDir = join(localizationBaseDir, "English");
        mkdirSync(englishDir, { recursive: true });
        cpSync(sourceEnglishXml, join(englishDir, "text_ui_soul__scaledxphardship.xml"));

        const languagePakFile = join(localizationBaseDir, "English_xml.pak");
        compressToPak(englishDir, languagePakFile);

        rmSync(englishDir, { recursive: true, force: true });
        console.log(`Packed English into ${languagePakFile} from source XML`);
    } else {
        console.log(`Loading translations from: ${tempLocalizationDirectory}`);

        if (!existsSync(tempLocalizationDirectory)) {
            console.error("ERROR: temp_build_localization directory missing! Did you run the translation script?");
            process.exit(1);
        }

        const existingDirs = readdirSync(tempLocalizationDirectory).filter(dir =>
            statSync(join(tempLocalizationDirectory, dir)).isDirectory()
        );
        console.log(`Found translation dirs: ${existingDirs.join(", ")}`);

        const validLanguages = [
            "Chinese",
            "French",
            "Japanese",
            "Russian",
            "Chineset",
            "German",
            "Korean",
            "Spanish",
            "Czech",
            "Italian",
            "Polish",
            "Portuguese",
            "Turkish",
            "Ukrainian",
            "English"
        ];

        if (existingDirs.length === 0) {
            console.error("ERROR: No language directories found in temp_build_localization! Run the translation script first.");
            process.exit(1);
        }

        validLanguages.forEach(language => {
            const sourceDir = join(tempLocalizationDirectory, language);
            if (existsSync(sourceDir)) {
                const tempDir = join(localizationBaseDir, language);
                mkdirSync(tempDir, { recursive: true });
                cpSync(sourceDir, tempDir, { recursive: true });

                const languagePakFile = join(localizationBaseDir, `${language}_xml.pak`);
                compressToPak(tempDir, languagePakFile);

                rmSync(tempDir, { recursive: true, force: true });
                console.log(`Packed ${language} into ${languagePakFile} and removed ${tempDir}`);
            } else {
                console.warn(`Warning: Translation directory for ${language} not found in temp_build_localization`);
            }
        });
    }

    const localizationContents = readdirSync(localizationBaseDir);
    localizationContents.forEach(item => {
        const fullPath = join(localizationBaseDir, item);
        if (!item.endsWith(".pak") && statSync(fullPath).isFile()) {
            rmSync(fullPath, { force: true });
            console.log(`Removed stray file: ${fullPath}`);
        }
    });
}

function packMod(outputFileName) {
    console.log("Packing mod...");
    const finalZipPath = join(
        rootDirectory,
        `${outputFileName}_${modVersion}.zip`,
    );
    if (existsSync(finalZipPath)) {
        console.log(`Existing zip found at ${finalZipPath}, deleting it...`);
        rmSync(finalZipPath);
    }

    // Create a new temporary directory structure with modIdentifier as the root
    const modRootDir = join(temporaryBuildDirectory, modIdentifier);
    mkdirSync(modRootDir, { recursive: true });

    // Move Data, Localization, mod.manifest, and modding_eula.txt into modIdentifier directory
    const dataDir = join(temporaryBuildDirectory, "Data");
    const localizationDir = join(temporaryBuildDirectory, "Localization");
    const manifestPath = join(temporaryBuildDirectory, "mod.manifest");
    const eulaPath = join(temporaryBuildDirectory, "modding_eula.txt");

    if (existsSync(dataDir)) {
        cpSync(dataDir, join(modRootDir, "Data"), { recursive: true });
        rmSync(dataDir, { recursive: true, force: true });
        console.log(`Moved Data to ${join(modRootDir, "Data")}`);
    }
    if (existsSync(localizationDir)) {
        cpSync(localizationDir, join(modRootDir, "Localization"), { recursive: true });
        rmSync(localizationDir, { recursive: true, force: true });
        console.log(`Moved Localization to ${join(modRootDir, "Localization")}`);
    }
    if (existsSync(manifestPath)) {
        cpSync(manifestPath, join(modRootDir, "mod.manifest"));
        rmSync(manifestPath);
        console.log(`Moved mod.manifest to ${join(modRootDir, "mod.manifest")}`);
    }
    if (existsSync(eulaPath)) {
        cpSync(eulaPath, join(modRootDir, "modding_eula.txt"));
        rmSync(eulaPath);
        console.log(`Moved modding_eula.txt to ${join(modRootDir, "modding_eula.txt")}`);
    }

    console.log(`Mod directory contents before zipping: ${readdirSync(modRootDir)}`);

    // Zip the modIdentifier directory
    const sevenZipBinary = join(
        rootDirectory,
        "node_modules",
        "7z-bin",
        "linux",
        "7zzs",
    );
    const sevenZipCommand = `"${sevenZipBinary}" a -r "${finalZipPath}" "${modRootDir}"`;
    console.log(`Zipping final mod: ${sevenZipCommand}`);
    execSync(sevenZipCommand);

    console.log("Cleaning up temp_build...");
    rmSync(temporaryBuildDirectory, { recursive: true, force: true });
    console.log(`Built ${outputFileName} mod: ${finalZipPath}`);
    console.log(`ZIP_FILE:${finalZipPath}`);
    return finalZipPath;
}

if (environment === "prod") {
    console.log(`Building production version (${version})...`);
    cleanBuildDirectory();
    prepareBuild();
    packData();
    packMod(`${modName}_${version}`);
} else if (environment === "dev") {
    console.log(`Building development version (${version})...`);
    cleanBuildDirectory();
    prepareBuild();
    packData();
    packMod(`${modName}_${version}`);
}