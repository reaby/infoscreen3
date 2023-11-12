import { execSync } from 'child_process';
import fs from "fs-extra";

console.log("Copying files...");
const toCopy = ["data", "locales", "templates", "tmp", "trash", ".env"];

for (const dir of toCopy) {
    console.log(`Copying ${dir}...`);
    fs.cpSync(`./${dir}`, `./dist/${dir}`, {
        recursive: true
    });
    console.log("done.");
}