const fs = require("fs");
const browserify = require("browserify");
const tsify = require("tsify");
const watchify = require("watchify");
const copyfiles = require("copyfiles");

let file = "dist/vs.js";

var b = browserify({
    entries: ["src/VerySimple.ts"],
    cache: {},
    packageCache: {},
    plugin: [tsify, watchify]
});

process.argv.forEach(function (val, index, array) {
    if (val == "minify") {
        b.transform('uglifyify', { global: false });
        //file = "dist/vs.min.js";
        file = "../VerySimpleDemo/dist/vs.min.js";
    }
});

b.on("update", bundle);
bundle();

function bundle() {
    console.log("building...");

    b.bundle()
        .on('error', console.error)
        .pipe(fs.createWriteStream(file).on("close", () => { copy() }));

    console.log("built!");
}

function copy() {
    // copyfiles([file, "test/dist"], 1, () => { });
    copyfiles([file, "../VerySimpleDemo/dist"], 1, () => { });
}