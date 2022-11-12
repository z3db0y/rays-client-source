console.log('Compiling...');

const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

function recursive(dir = __dirname) {
    let dirListing = fs.readdirSync(dir, { withFileTypes: true });
    for (let item of dirListing) {
        if (item.isDirectory() && path.join(dir, item.name) !== path.join(__dirname, 'node_modules')) {
            recursive(path.join(dir, item.name));
        } else if (item.isFile() && item.name.endsWith('.js') && path.join(dir, item.name) !== path.join(__dirname, 'compile.js')) {
            let filePath = path.join(dir, item.name);
            console.log(`Compiling ${filePath}`);
            bytenode.compileFile(filePath, filePath + 'c');
            fs.unlinkSync(filePath);
            fs.writeFileSync(filePath, `require('bytenode');\nmodule.exports = require('./${item.name}c');`);
        } else {
            console.log(`Skipping ${item.name}`);
        }
    }
}
recursive();

console.log('Done compiling.');
// Unlink self
fs.unlinkSync(path.join(__dirname, __filename));
process.exit();