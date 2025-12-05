import fs from "fs-extra";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const platforms = [
    { target: "windows-x64-20.18.1", platform: "win32", arch: "x64", ext: ".exe" },
    { target: "linux-x64-20.18.1", platform: "linux", arch: "x64", ext: "" }
];

const toCopy = ["data", "locales", "templates", "tmp", "trash"];

console.log("🚀 Starting nexe cross-platform build process...\n");

// Clean dist directory
console.log("🧹 Cleaning dist directory...");
if (fs.existsSync("./dist")) {
    fs.rmSync("./dist", { recursive: true });
}
fs.mkdirSync("./dist", { recursive: true });

// Build webpack bundle
console.log("📦 Building webpack bundle...");
try {
    execSync("npx webpack", { stdio: "inherit" });
} catch (error) {
    console.error("❌ Webpack build failed:", error.message);
    process.exit(1);
}

// Copy common files
console.log("\n📋 Copying common files...");
for (const dir of toCopy) {
    if (fs.existsSync(`./${dir}`)) {
        console.log(`  ✓ Copying ${dir}...`);
        fs.cpSync(`./${dir}`, `./dist/${dir}`, { recursive: true });
    }
}

if (fs.existsSync("./.env.example")) {
    console.log("  ✓ Copying .env example...");
    fs.cpSync("./.env.example", "./dist/.env");
}

// Build for each platform
for (const { target, platform, arch, ext } of platforms) {
    console.log(`\n🔨 Building for ${target}...`);

    const platformDir = `./dist/${platform}-${arch}`;
    fs.mkdirSync(platformDir, { recursive: true });

    const outputFile = path.join(platformDir, `infoscreen3${ext}`);

    // Prepare sqlite3 native bindings for the target platform
    console.log(`  ⚙️  Preparing native modules for ${platform}...`);

    const isCurrentPlatform =
        (platform === "win32" && process.platform === "win32") ||
        (platform === "linux" && process.platform === "linux");

    if (!isCurrentPlatform) {
        console.log(`  ⚠️  Warning: Cross-compiling from ${process.platform} to ${platform}`);
        console.log(`     Native bindings will need to be rebuilt on target platform or provided manually`);
    } else {
        // Rebuild native modules for Node.js 20.18.0 specifically
        console.log(`  ⚙️  Rebuilding native modules for Node.js 20.18.1...`);
        try {
            const nodeVersion = "20.18.1";
            const rebuildCmd = `npm rebuild better-sqlite3 --build-from-source --target=${nodeVersion} --target_arch=x64 --dist-url=https://nodejs.org/download/release`;
            execSync(rebuildCmd, { stdio: "inherit" });

            // Verify and create versioned binding path for better-sqlite3
            const bindingPath = path.join("node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
            if (fs.existsSync(bindingPath)) {
                const versionedDir = path.join("node_modules", "better-sqlite3", "lib", "binding", "node-v115-win32-x64");
                fs.mkdirSync(versionedDir, { recursive: true });
                fs.copyFileSync(bindingPath, path.join(versionedDir, "better_sqlite3.node"));
                console.log(`  ✅ better-sqlite3 rebuilt and versioned binding created`);
            }
        } catch (error) {
            console.warn(`  ⚠️  Could not rebuild better-sqlite3: ${error.message}`);
        }
    }

    // Build with nexe
    console.log(`  📦 Running nexe for ${target}...`);
    console.log(`  ⚠️  Note: Using --build will compile Node.js from source (this may take 10-30 minutes)...`);
    try {
        const nexeCmd = `nexe ./webpack/bundle.cjs -t ${target} -o "${outputFile}" --build --verbose`;
        console.log(`  Executing: ${nexeCmd}`);
        execSync(nexeCmd, { stdio: "inherit" });
        console.log(`  ✅ Successfully built ${target}`);
    } catch (error) {
        console.error(`  ❌ Failed to build ${target}:`, error.message);
        continue;
    }

    // Copy runtime files to platform directory
    console.log(`  📂 Copying runtime files to ${platformDir}...`);
    for (const dir of toCopy) {
        if (fs.existsSync(`./${dir}`)) {
            fs.cpSync(`./${dir}`, `${platformDir}/${dir}`, { recursive: true });
        }
    }

    if (fs.existsSync("./.env.example")) {
        fs.cpSync("./.env.example", `${platformDir}/.env`);
    }

    // Copy native modules directory structure
    const nativeModules = [
        "node_modules/better-sqlite3",
        "node_modules/bufferutil",
        "node_modules/utf-8-validate"
    ];

    for (const modulePath of nativeModules) {
        if (fs.existsSync(modulePath)) {
            const targetPath = path.join(platformDir, modulePath);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.cpSync(modulePath, targetPath, { recursive: true });
            console.log(`  ✓ Copied ${modulePath}`);
        }
    }

    // Create platform-specific README
    const readmeContent = `# Infoscreen3 - ${platform} ${arch}

## Installation

1. Extract this archive to your desired location
2. Edit the .env file with your configuration
3. Run the executable:
   ${platform === "win32" ? "   .\\infoscreen3.exe" : "   ./infoscreen3"}

## Notes

- All data will be stored in the 'data' directory
- Logs and temporary files are in 'tmp' and 'trash' directories
- Translations are in the 'locales' directory
- Templates are in the 'templates' directory
- Native modules (better-sqlite3, etc.) are included in node_modules/

## Native Modules

This build includes native modules. If you encounter issues:
1. The native modules were compiled for ${platform}-${arch}
2. You may need to rebuild them on the target system if cross-compiled
3. Run: npm rebuild better-sqlite3 bufferutil utf-8-validate --build-from-source

For more information, visit: https://github.com/reaby/infoscreen3
`;

    fs.writeFileSync(`${platformDir}/README.txt`, readmeContent);

    console.log(`  ✅ Platform package complete: ${platformDir}`);
}

console.log("\n🎉 Nexe cross-platform build completed successfully!");
console.log("\n📦 Build outputs:");
platforms.forEach(({ platform, arch }) => {
    const dir = `./dist/${platform}-${arch}`;
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const exe = files.find(f => f.startsWith("infoscreen3"));
        console.log(`  ✓ ${dir}${exe ? ` (${exe})` : ""}`);
    }
});
