const fs = require('fs');
const path = require('path');
const version = require('electron').remote.app.getVersion();

window.open_client_changelog = function() {
    document.getElementById('clientPopup').innerHTML = fs.readFileSync(path.join(__dirname, '../../html/changelog.html'));
    document.getElementById('changelogTitle').innerHTML += ' (v' + version + ')';

    fetch(`https://api.github.com/repos/z3db0y/rays-client/releases/tags/v${version}`).then(r => r.json()).catch(err => {
        document.getElementById('clientChangelog').innerHTML = '';
        document.getElementById('changelogWarn').textContent = 'Changelog unavailable!';
        document.getElementById('changelogWarn').style.display = '';
    }).then(data => {
        if(data.body) {
            let patchNotes = data.body.slice(
                data.body.indexOf('# Patch Notes\r\n') + 16,
                data.body.indexOf('\r\n\r\n')
            );

            document.getElementById('clientChangelog').innerHTML = patchNotes.split('\r\n').map(x => '<li>' + x.replace('- ', '') + '</li>').join('');
        } else {
            document.getElementById('clientChangelog').innerHTML = '';
            document.getElementById('changelogWarn').textContent = 'This is a development release! No changelog is available.';
            document.getElementById('changelogWarn').style.display = '';
        }
    });
}