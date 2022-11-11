const { app } = require('electron');
const p = {
    i: '  \x1b[32m•\x1b[0m',
    e: '  \x1b[31m•\x1b[0m'
};
const { spawn } = require('child_process');
const path = require('path');

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

module.exports = async (context) => {
    if(!app || context) {
        console.log('Running in builder');
        let outDir = context.appOutDir;
        let execName = context.packager.executableName || context.packager.appInfo.productFilename;
        if(context.packager.platform.nodeName === 'win32') execName += '.exe';
        if(context.packager.platform.nodeName === 'darwin') execName += '.app';
        let execPath = path.join(outDir, execName);

        console.log('outDir:', outDir);
        console.log('attempting to spawn: ', execName);
        let child = spawn(execPath, [], {
            env: {
                'ELECTRON_RUN_AS_NODE': 1
            }
        });

        [child.stdout, child.stderr].forEach(s => s.on('data', data => {
            if(data.trim()) console.log(data.trim());
        }));

        ['SIGINT', 'SIGTERM', 'exit'].forEach(code => { process.on(code, () => {
            child.kill();
        })});

        let exitCode = await new Promise(resolve => {
            child.on('close', resolve);
        });
        console.log('child exited with code', exitCode);
    } else {
        console.log('Running in Electron');
    }
}