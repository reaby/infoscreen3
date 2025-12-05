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

// Copy common files to dist directory (shared by all platforms)
console.log("\n📋 Copying shared files to dist directory...");
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

// Rebuild native modules for Node.js 20.18.1 BEFORE copying
console.log("\n⚙️  Rebuilding native modules for Node.js 20.18.1...");
try {
    const nodeVersion = "20.18.1";
    const modules = ["better-sqlite3", "bufferutil", "utf-8-validate"];

    for (const module of modules) {
        console.log(`  📦 Rebuilding ${module}...`);
        const rebuildCmd = `npm rebuild ${module} --build-from-source --target=${nodeVersion} --target_arch=x64 --dist-url=https://nodejs.org/download/release`;
        execSync(rebuildCmd, { stdio: "inherit" });
    }

    // Verify and create versioned binding path for better-sqlite3
    const bindingPath = path.join("node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
    if (fs.existsSync(bindingPath)) {
        const versionedDir = path.join("node_modules", "better-sqlite3", "lib", "binding", "node-v115-win32-x64");
        fs.mkdirSync(versionedDir, { recursive: true });
        fs.copyFileSync(bindingPath, path.join(versionedDir, "better_sqlite3.node"));
        console.log(`  ✅ better-sqlite3 versioned binding created`);
    }

    console.log("  ✅ All native modules rebuilt successfully");
} catch (error) {
    console.error(`  ❌ Failed to rebuild native modules: ${error.message}`);
    console.error("     Executables may not work correctly!");
}

// Copy native modules to dist (shared by all platforms)
console.log("\n📦 Copying native modules to dist...");
const nativeModules = [
    "node_modules/better-sqlite3",
    "node_modules/bufferutil",
    "node_modules/utf-8-validate"
];

for (const modulePath of nativeModules) {
    if (fs.existsSync(modulePath)) {
        const targetPath = path.join("./dist", modulePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.cpSync(modulePath, targetPath, { recursive: true });
        console.log(`  ✓ Copied ${modulePath}`);
    }
}

// Build for each platform
for (const { target, platform, arch, ext } of platforms) {
    console.log(`\n🔨 Building for ${target}...`);

    const outputFile = path.join("./dist", `infoscreen3-${platform}-${arch}${ext}`);

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
}

// Create README
console.log("\n📝 Creating README...");
const readmeContent = `# Infoscreen3

## Installation

1. Extract this archive to your desired location
2. Edit the .env file with your configuration
3. Run the appropriate executable for your platform:
   - Windows: .\\infoscreen3-win32-x64.exe
   - Linux: ./infoscreen3-linux-x64

## Directory Structure

- data/ - All application data will be stored here
- tmp/ - Temporary files
- trash/ - Deleted items
- locales/ - Translation files
- templates/ - Template files
- node_modules/ - Native modules (better-sqlite3, bufferutil, utf-8-validate)

## Notes

- All executables share the same data directories
- The .env file contains configuration settings
- Native modules are included and should work on their respective platforms
- If you encounter issues with native modules, rebuild them:
  npm rebuild better-sqlite3 bufferutil utf-8-validate --build-from-source

For more information, visit: https://github.com/reaby/infoscreen3
`;

fs.writeFileSync("./dist/README.txt", readmeContent);

console.log("\n🎉 Nexe cross-platform build completed successfully!");
console.log("\n📦 Build outputs in ./dist:");
const distFiles = fs.readdirSync("./dist");
const executables = distFiles.filter(f => f.startsWith("infoscreen3"));
executables.forEach(exe => {
    const stats = fs.statSync(path.join("./dist", exe));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`  ✓ ${exe} (${sizeMB} MB)`);
});
console.log("\n📂 Shared directories:");
toCopy.forEach(dir => {
    if (fs.existsSync(`./dist/${dir}`)) {
        console.log(`  ✓ ${dir}/`);
    }
});
