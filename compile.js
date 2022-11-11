const p = {
    i: '  \x1b[32m•\x1b[0m',
    e: '  \x1b[31m•\x1b[0m'
};
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async (context) => {
    if(context) {
        const asar = require('asar');
        console.log = new Proxy(console.log, {
            apply: (target, thisArg, args) => {
                target.apply(thisArg, [p.i, ...args]);
            }
        });
        
        console.error = new Proxy(console.error, {
            apply: (target, thisArg, args) => {
                target.apply(thisArg, [p.e, ...args]);
            }
        });

        console.log('Running in builder');
        let outDir = context.appOutDir;
        let execName = context.packager.executableName || context.packager.appInfo.productFilename;
        if(context.packager.platform.nodeName === 'win32') execName += '.exe';
        if(context.packager.platform.nodeName === 'darwin') execName += '.app';
        let execPath = path.join(outDir, execName);
        let asarPath = context.packager.platform.nodeName === 'darwin' ? path.join(outDir, 'Contents', 'Resources', 'app.asar') : path.join(outDir, 'resources', 'app.asar');
        let isPackaged = context.packager.platform.nodeName === 'darwin' ? path.join(execPath, 'Contents', 'Resources', 'app') : path.join(execPath, 'resources', 'app');

        console.log('outDir:', outDir);
        console.log('asarPath:', asarPath);
        console.log('attempting to spawn: ', execPath);
        let child = exec((context.packager.platform.nodeName === 'darwin' ? 'open ' : '') + '"' + execPath + ' --run-compile"');

        let exitCode = await new Promise(resolve => {
            [child.stdout, child.stderr].forEach(s => s.on('data', data => {
                if(data.trim()) console.log(data.trim());
            }));
    
            ['SIGINT', 'SIGTERM', 'exit'].forEach(code => { process.on(code, () => {
                child.kill();
            })});

            child.on('close', resolve);
        });
        console.log('child exited with code', exitCode);

        if(exitCode !== 0) {
            console.error('failed to compile');
            process.exit(exitCode);
        }

        fs.renameSync(path.join(asarPath, '../compiled'), path.join(asarPath, '../app'));
        if(isPackaged) {
            console.log('packing asar...');
            asar.createPackage(path.join(asarPath, '../app'), asarPath);
        }

        console.log('done compiling');
    } else {
        console.log('compiling...');

        var outDir = __dirname.endsWith('.asar') ? path.join(__dirname, '../compiled') : path.join(__dirname, 'compiled');
        const bytenode = require('bytenode');

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
                console.log('copied', srcPath, 'to', dstPath);
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