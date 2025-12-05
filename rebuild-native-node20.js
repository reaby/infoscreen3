import { execSync } from "child_process";
import fs from "fs-extra";

console.log("🔧 Rebuilding native modules for Node.js 20.18.1 (ABI v115)...\n");

const nodeVersion = "20.18.1";
const nodeAbi = "115";
const arch = process.arch; // x64, arm64, etc.

console.log(`Target: Node.js ${nodeVersion} (ABI ${nodeAbi})`);
console.log(`Architecture: ${arch}`);
console.log(`Platform: ${process.platform}\n`);

try {
    console.log("📦 Rebuilding sqlite3...");
    execSync(`npm rebuild sqlite3 --build-from-source --target=${nodeVersion} --target_arch=${arch}`, {
        stdio: "inherit",
        env: {
            ...process.env,
            npm_config_target: nodeVersion,
            npm_config_arch: arch,
            npm_config_target_arch: arch,
            npm_config_runtime: "node",
            npm_config_disturl: "https://nodejs.org/dist"
        }
    });

    console.log("\n✅ Successfully rebuilt sqlite3");
} catch (error) {
    console.error("\n❌ Failed to rebuild sqlite3:", error.message);
    console.log("\n💡 Trying alternative method with node-gyp directly...");

    try {
        process.chdir("./node_modules/sqlite3");
        execSync(`node-gyp rebuild --target=${nodeVersion} --arch=${arch}`, {
            stdio: "inherit"
        });
        process.chdir("../..");
        console.log("\n✅ Successfully rebuilt sqlite3 using node-gyp");
    } catch (nodeGypError) {
        console.error("\n❌ node-gyp rebuild also failed:", nodeGypError.message);
        console.log("\n📝 Manual steps to fix:");
        console.log("1. Install node-gyp globally: npm install -g node-gyp");
        console.log("2. Install Python and Visual Studio Build Tools (Windows)");
        console.log("3. Run: cd node_modules/sqlite3 && node-gyp rebuild --target=20.18.0");
        process.exit(1);
    }
}

// Verify the build
console.log("\n🔍 Verifying native binding...");
const bindingPaths = [
    "./node_modules/sqlite3/build/Release/node_sqlite3.node",
    "./node_modules/sqlite3/lib/binding/node-v115-win32-x64/node_sqlite3.node",
    "./node_modules/sqlite3/lib/binding/node-v115-linux-x64/node_sqlite3.node"
];

let found = false;
for (const bindingPath of bindingPaths) {
    if (fs.existsSync(bindingPath)) {
        console.log(`✓ Found binding: ${bindingPath}`);
        const stats = fs.statSync(bindingPath);
        console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
        found = true;
    }
}

if (!found) {
    console.error("\n❌ Warning: No native binding found!");
    console.log("Expected locations:");
    bindingPaths.forEach(p => console.log(`  - ${p}`));
} else {
    console.log("\n🎉 Native modules are ready for Node.js 20.18.1!");
}
