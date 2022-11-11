const { app } = require('electron');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');
const p = '  \x1b[32m•\x1b[0m';

module.exports = async function (ctx) {
    if(!app && !!ctx) {
        const asar = require('asar');
        console.log(p, 'compiler called...');
        // if(ctx.packager.platform.nodeName == 'darwin') return console.log(p, 'COMPILER NOT SUPPORTED ON MACOS');
        var outDir = ctx.appOutDir;
        let execName = ctx.packager.executableName || ctx.packager.appInfo.productFilename;
        let execPath = path.join(outDir, execName);
        if(ctx.packager.platform.nodeName === 'win32') execPath += '.exe';
        if(ctx.packager.platform.nodeName === 'darwin') execPath += '.app';

        let asarPath = ctx.packager.platform.nodeName !== 'darwin' ? path.join(outDir, 'resources/app.asar') : path.join(outDir, 'Contents/Resources/app.asar');
        let isPackaged = fs.existsSync(asarPath);
        console.log(p, 'isPackaged:', isPackaged);
        console.log(p, 'asarPath:', asarPath);
        console.log(p, 'asarExists:', fs.existsSync(asarPath));
        await new Promise((resolve, reject) => {
            let child = child_process.exec('"' + execPath + '" run-compile', resolve);

            ['SIGINT', 'SIGTERM', 'exit'].forEach(code => { process.on(code, () => {
                child.kill();
                reject();
            })});

            [child.stdout, child.stderr].forEach(s => s.on('data', data => {
                if(data.trim()) console.log(p, data.trim());
            }));
        }).catch(() => {});

        fs.renameSync(path.join(asarPath, '../compiled'), path.join(asarPath, '../app'));
        if(isPackaged) {
            console.log(p, 'packing asar...');
            await asar.createPackage(path.join(asarPath, '../app'), asarPath);
            fs.rmdirSync(path.join(asarPath, '../app'), { recursive: true });
        }
        console.log(p, 'done compiling!');
    } else {
        console.log('compiling...');
        var outDir = __dirname.endsWith('.asar') ? path.join(__dirname, '../compiled') : path.join(__dirname, 'compiled');
        if(!fs.existsSync(outDir)) fs.mkdirSync(outDir);

        function copyDir(src, dst) {
            if(!fs.existsSync(dst)) fs.mkdirSync(dst);
            fs.readdirSync(src).forEach(file => {
                let srcPath = path.join(src, file);
                let dstPath = path.join(dst, file);
                if(fs.statSync(srcPath).isDirectory()) {
                    copyDir(srcPath, dstPath);
                } else {
                    fs.copyFileSync(srcPath, dstPath);
                }
            });
        }

        function compileDir(dir = __dirname) {
            for(var file of fs.readdirSync(dir)) {
                let absPath = path.join(dir, file);
                if(path.join(dir.replace(__dirname, ''), file) == path.basename(__filename)) continue;
                if(!fs.existsSync(path.join(outDir, dir.replace(__dirname, '')))) fs.mkdirSync(path.join(outDir, dir.replace(__dirname, '')));
                if(fs.statSync(absPath).isDirectory()) {
                    if(path.join(dir.replace(__dirname, ''), file) !== 'node_modules') compileDir(absPath);
                    else copyDir(absPath, path.join(outDir, dir.replace(__dirname, ''), file));
                }
                else {
                    if(absPath.endsWith('.js')) {
                        bytenode.compileFile(absPath, path.join(outDir, dir.replace(__dirname, ''), file + 'c'));
                        fs.writeFileSync(path.join(outDir, dir.replace(__dirname, ''), file), 'require("bytenode");\nconst path = require("path");\nmodule.exports = require(path.join(__dirname, "./' + file + 'c"));');
                        console.log('compiled', path.join(dir.replace(__dirname, ''), file));
                    } else {
                        fs.writeFileSync(path.join(outDir, absPath.replace(__dirname, '')), fs.readFileSync(absPath));
                        console.log('copied', path.join(dir.replace(__dirname, ''), file));
                    }
                }
            };
        }
        compileDir();
    }
}