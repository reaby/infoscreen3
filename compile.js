import fs from "fs-extra";

console.log("Copying files...");
const toCopy = ["data", "locales", "templates", "tmp", "trash"];

for (const dir of toCopy) {
    console.log(`Copying ${dir}...`);
    fs.cpSync(`./${dir}`, `./dist/${dir}`, {
        recursive: true
    });        
}

console.log(`Copying .env`);
fs.cpSync(`./.env.example`, `./dist/.env`);
console.log("Packaged infoscreen3 to /dist");
