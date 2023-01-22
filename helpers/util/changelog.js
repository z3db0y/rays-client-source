const { app } = require('electron').remote;

function parser(changelog) {
    let updatesParsed = [...changelog.matchAll(/== UPDATE v?([^\s]*) ==([\s\S]*?)(?===)/g)];
    return updatesParsed.map(update => {
        let version = update[1];
        let category = 'Other';
        let changes = {};
        update[2].split('\n').forEach(line => {
            if(line.trim().startsWith('*')) {
                category = line.trim().replace('*', '').trim();
            } else if(line.trim().startsWith('-')) {
                if(!changes[category]) changes[category] = [];
                changes[category].push(line.trim().replace('-', '').trim());
            }
        });
        return { version, changes };
    });
}

window.openChangelog = function() {
    let menuWindow = document.getElementById('menuWindow');
    menuWindow.innerHTML = `<div class="logVersionHed">v${app.getVersion()} Changelog</div><div class="setHed">Please wait...</div><div class="viewAllUpdates" id="viewClientUpdates">View all updates</div>`;

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';

    let changelog;

    fetch('https://raw.githubusercontent.com/z3db0y/rays-client/main/CHANGELOG.txt').then(res => res.ok && res.text()).then(changelogUnparsed => {
        if(!changelogUnparsed) return menuWindow.getElementsByClassName('setHed')[0].innerHTML = 'Failed to fetch changelog.';
        changelog = parser(changelogUnparsed);
        let thisVersion = changelog.find(update => update.version === app.getVersion());

        document.getElementById('viewClientUpdates').addEventListener('click', _ => {
            let categories = changelog.map(update => update.version).reduce((acc, cur) => {
                let sub = cur.split('.')[0] + '.x';
                if(!acc.includes(sub)) acc.push(sub);
                return acc;
            }, []).sort((a, b) => b.split('.')[0] - a.split('.')[0]);
            menuWindow.innerHTML = '<div style="height:20px"></div><div class="bigMenTabs"></div><div id="mailList"></div>';
            let tabs = menuWindow.getElementsByClassName('bigMenTabs')[0];
            categories.forEach((category, i) => {
                let tab = document.createElement('div');
                tab.classList = 'bigMenTab' + (i === 0 ? ' bigMenTabA' : '');
                tab.innerHTML = 'v' + category;
                tab.onclick = function() { genChanges(category, changelog, this); }
                tabs.appendChild(tab);
            });
            genChanges(categories[0], changelog, tabs.children[0]);
        });

        if(!thisVersion) return menuWindow.getElementsByClassName('setHed')[0].innerHTML = 'This release was not found in the changelog, it is most likely a development release.';
        let changes = thisVersion.changes;
        let html = '';
        for(var category in changes) {
            let changesList = changes[category].map(change => change.replace(/\[(.*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')).map(change => `- <span style="color:rgba(255,255,255,0.6)">${change}</span><div></div>`).join('');
            html += `<div class="mapListCat">${category}</div><div class="setBodH" style="padding-top:20px;padding-bottom:20px">${changesList}</div>`;
        }
        if(html === '') html = '<div class="setBodH" style="padding-top:20px;padding-bottom:20px">No changes found.</div>';
        menuWindow.getElementsByClassName('setHed')[0].outerHTML = html;
    }).catch(_ => menuWindow.getElementsByClassName('setHed')[0].innerHTML = 'Failed to fetch changelog.');
};

function genChanges(category, changelog, elem) {
    elem.parentElement.querySelectorAll('.bigMenTab').forEach(tab => tab.classList = 'bigMenTab');
    elem.classList = 'bigMenTab bigMenTabA';

    let versions = changelog.filter(update => update.version.startsWith(category.split('.')[0]));
    let mailList = document.getElementById('mailList');
    mailList.innerHTML = '';

    versions.forEach((update, i) => {
        let isLatest = update.version == changelog[0].version;
        let mailObj = document.createElement('div');
        mailObj.classList = 'mailObj';
        mailList.insertAdjacentElement('beforeend', mailObj);
        let changeArray = Object.values(update.changes).flat().map(change => change.replace(/\[(.*)\]\(([^)]*)\)/g, '<a onclick="event.stopPropagation()" href="$2">$1</a>'));
        mailObj.innerHTML += `<i class="material-icons" style="vertical-align:middle;margin-top:-10px;font-size:50px;float:right;margin-right:10px;color:#fff">${isLatest ? 'arrow_drop_up' : 'arrow_drop_down'}</i><div class="mailFrom" style="color:#0a0">${isLatest ? 'LATEST ' : ''}UPDATE ${update.version}</div><div style="margin-top:10px;display:${isLatest ? 'block' : 'none'}">${changeArray.map(change => `<li class="changeText" style="color: rgba(255, 255, 255, 0.5);">${change}</li>`).join('')}</div>`;
        mailObj.addEventListener('click', _ => {
            let iEl = mailObj.getElementsByTagName('i')[0];
            iEl.innerHTML = iEl.innerHTML == 'arrow_drop_up' ? 'arrow_drop_down' : 'arrow_drop_up';
            if(iEl.innerHTML == 'arrow_drop_up') mailObj.getElementsByTagName('div')[1].style.display = 'block';
            else mailObj.getElementsByTagName('div')[1].style.display = 'none';
        });
    });
}