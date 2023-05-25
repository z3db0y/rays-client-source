const fs = require('fs');
const path = require('path');
const Store = require('electron-store');
const config = new Store();

let gameHistoryPath;

module.exports = () => {
    if(!config.get('statTrack.enabled', false)) return;
    const { app } = require('electron').remote;
    gameHistoryPath = path.join(app.getPath('userData'), 'stattrack');

    let killFeed = document.getElementById('killFeed');
    let chatList = document.getElementById('chatList');
    let endMidHolder = document.getElementById('endMidHolder');
    let acc = document.getElementById('menuAccountUsername');
    let hostBtn = document.getElementById('menuBtnHost');
    let gameCanvas = [...document.getElementsByTagName('canvas')];
    gameCanvas = gameCanvas.find(x => x.width === window.innerWidth && x.height === window.innerHeight && !x.id.includes('overlay'));
    if(!killFeed || !chatList || !gameCanvas || !endMidHolder || !hostBtn) return setTimeout(module.exports, 100);

    hostBtn.insertAdjacentHTML('beforebegin', `<div class="button small buttonP" id="statTrackBtn" onmouseenter="playTick()" onclick="playSelect()" style="border-color:#5af !important">StatTrack</div>`);
    document.getElementById('statTrackBtn').addEventListener('click', () => openUI());

    let gameStarted = false;
    gameCanvas.addEventListener('click', () => {
        if(!gameStarted) {
            gameStarted = true;
            let extra = {};
            if(typeof window.getGameActivity === 'function') {
                let activity = window.getGameActivity();
                if(activity) {
                    extra.map = activity.map;
                    extra.mode = activity.mode;
                }
            }
            gameStartEvent(Date.now(), acc.innerText.trim(), extra);
        }
    });

    let endMidObserver = new MutationObserver(_ => {
        if(endMidHolder.style.display !== 'none') {
            if(!gameStarted) return;
            gameStarted = false;
            gameEndEvent(Date.now());
        }
    });

    function processMsg(node) {
        let killerEl = node.childNodes[0];
        let victimEl = node.childNodes[node.childNodes.length - 1];

        let weapEl = [...node.childNodes].find(x => x.nodeName === 'IMG' && !x.classList.contains('thrownChatIcon'));
        if(!weapEl) return;
        let extraEl = [...node.childNodes].slice(1, -1).filter(x => x !== weapEl);

        let weap = new URL(weapEl.src);
        weap.search = '';

        let meta = {
            weap,
            headshot: extraEl.some(x => x.classList.contains('headShotChatIcon') && x.src.includes('headshot')),
            wallbang: extraEl.some(x => x.classList.contains('headShotChatIcon') && x.src.includes('wallbang'))
        };

        if(killerEl.style.cssText === 'color: rgb(255, 255, 255);') {
            // Kill
            killEvent(Date.now(), {
                ...meta,
                target: victimEl.childNodes[0].textContent.replace(/\u200E/g, '')
            });
        } else if(victimEl.style.cssText === 'color: rgb(255, 255, 255);') {
            // Death
            deathEvent(Date.now(), {
                ...meta,
                target: killerEl.childNodes[0].textContent.replace(/\u200E/g, '')
            });
        }
    }

    let killFeedObserver = new MutationObserver(mutations => {
        for(let i = 0; i < mutations.length; i++) {
            for(let j = 0; j < mutations[i].addedNodes.length; j++) {
                let node = mutations[i].addedNodes[j];
                if(!node.childNodes[0]) continue;
                node = node.childNodes[0];
                if(!node.childNodes[0]) continue;
                node = node.childNodes[0];
                if(node.childNodes.length < 3) continue;

                processMsg(node);
            }
        }
    });

    let chatListObserver = new MutationObserver(mutations => {
        for(let i = 0; i < mutations.length; i++) {
            for(let j = 0; j < mutations[i].addedNodes.length; j++) {
                let node = mutations[i].addedNodes[j];
                if(!node.childNodes[0]) continue;
                node = node.childNodes[0];
                if(!node.childNodes[0]) continue;
                node = node.childNodes[0];
                if(node.childNodes.length < 3) continue;

                processMsg(node);
            }
        }
    });

    killFeedObserver.observe(killFeed, { childList: true });
    chatListObserver.observe(chatList, { childList: true });
    endMidObserver.observe(endMidHolder, { attributes: true, attributeFilter: ['style'] });
};

let currGame = null;

function gameStartEvent(timestamp, ign, extraDetails = {}) {
    currGame = {
        startTime: timestamp,
        playerName: ign,
        ...extraDetails,
        kills: [],
        deaths: []
    };
}

function gameEndEvent(timestamp) {
    if(!currGame) return;
    currGame.endTime = timestamp;
    saveGame(currGame, gameHistoryPath);
    currGame = null;
}

function killEvent(timestamp, details) {
    if(!currGame) return;
    currGame.kills.push({
        timestamp,
        ...details
    });
}

function deathEvent(timestamp, details) {
    if(!currGame) return;
    currGame.deaths.push({
        timestamp,
        ...details
    });
}

function saveGame(game) {
    let maxGames = config.get('statTrack.maxGames', 10);
    if(!fs.existsSync(gameHistoryPath)) fs.mkdirSync(gameHistoryPath);
    let savedGames = fs.readdirSync(gameHistoryPath).map(x => parseFloat(x.replace(/\.json/g, ''))).sort((a, b) => a - b);
    if(savedGames.length >= maxGames) {
        let toDelete = savedGames.slice(0, savedGames.length - maxGames + 1);
        for(let i = 0; i < toDelete.length; i++) {
            let gamePath = path.join(gameHistoryPath, `${toDelete[i]}.json`);
            fs.unlinkSync(gamePath);
        }
    }

    let gamePath = path.join(gameHistoryPath, `${game.startTime}.json`);
    fs.writeFileSync(gamePath, JSON.stringify(game));

    let customChatList = document.getElementById('chatList_custom');
    if(customChatList) {
        customChatList.insertAdjacentHTML('beforeend', `<div data-tab="-1"><div class="chatItem"><span class="chatMsg" style="color:#5af">[StatTrack] Game saved.</span></div><br></div>`);
        customChatList.scrollTop = customChatList.scrollHeight;
    }
}

function openUI() {
    let games = fs.readdirSync(gameHistoryPath).map(x => parseFloat(x.replace(/\.json/g, ''))).sort((a, b) => a - b).map(x => fs.readFileSync(path.join(gameHistoryPath, `${x}.json`), 'utf8')).map(x => { try { return JSON.parse(x); } catch(e) { return null; } }).filter(x => x);
    games.sort((a, b) => b.startTime - a.startTime);

    let menuWindow = document.getElementById('menuWindow');
    let windowHolder = document.getElementById('windowHolder');

    menuWindow.className = 'dark';
    menuWindow.style.width = '1000px';
    windowHolder.className = 'popupWin';
    windowHolder.style.display = 'block';

    menuWindow.innerHTML = ``;

    let importCont = document.createElement('div');
    importCont.style.display = 'flex';

    let importBtn = document.createElement('div');
    importBtn.className = 'settingsBtn';
    importBtn.style.background = '#0a0';
    importBtn.style.marginLeft = 'auto';
    importBtn.id = 'statTrack_import';
    importBtn.textContent = 'Import Match';
    importBtn.onclick = () => {
        window.importSettingsPopup();
        let importPop = document.getElementById('genericPop');
        importPop.children[0].textContent = 'Import Match';
        importPop.children[1].textContent = 'Copy Paste Match Text Here';
        let btn = importPop.children[importPop.children.length - 1];
        btn.removeAttribute('onclick');
        btn.onclick = () => {
            document.getElementById('popupHolder').style.display = 'none';
            if(!importPop.children[2].value) return;
            try {
                gameViewer(JSON.parse(importPop.children[2].value), true);
            } catch(e) {
                alert('Failed to parse match data');
            }
        };
    };
    importCont.appendChild(importBtn);
    menuWindow.appendChild(importCont);

    menuWindow.insertAdjacentHTML('beforeend', `
        <style>
            .stGame {
                padding: 20px;
                margin-top: 20px;
                border-radius: 10px;
                border: 3px solid;
                display: flex;
                align-items: center;
            }

            .stGameBtn {
                margin-left: auto;
                padding: 10px;
                border-radius: 5px;
                border: 3px solid #1af;
                cursor: pointer;
                transition: .2s;
            }

            .stGameBtn:hover {
                border-color: #fff;
            }
        </style>
    `);

    if(games.length == 0) {
        menuWindow.insertAdjacentHTML('beforeend', `<div class="setHed">No games saved</div>`);
        return;
    } else {
        for(let i = 0; i < games.length; i++) {
            let game = games[i];
            let gameDiv = document.createElement('div');
            gameDiv.className = 'stGame';
            gameDiv.innerHTML = `${game.mode} - ${game.map}<br>${new Date(game.startTime).toLocaleString()}`;
            let viewBtn = document.createElement('div');
            viewBtn.textContent = 'View';
            viewBtn.className = 'stGameBtn';

            viewBtn.onclick = () => gameViewer(game);

            gameDiv.appendChild(viewBtn);
            menuWindow.appendChild(gameDiv);
        }
    }
}

function gameViewer(game, imported = false) {
    let menuWindow = document.getElementById('menuWindow');
    let windowHolder = document.getElementById('windowHolder');

    menuWindow.className = 'dark';
    windowHolder.className = 'popupWin';
    windowHolder.style.display = 'block';

    menuWindow.innerHTML = `
        <style>
            #stTimeline {
                margin-top: 20px;
                display: grid;
                grid-template-columns: 1fr 3px 1fr;
            }

            #stTimeline > .mid {
                position: relative;
                background: #fff;
                margin: 0;
            }

            #stTimeline > .mid.end .circle {
                transform: translate(-50%, -50%);
                top: 100%;
            }

            #stTimeline .mid .circle {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #fff;
            }

            #stTimeline > div {
                margin: 15px 0;
            }

            .mid .icns {
                display: flex;
                height: 30px;
                margin: 10px 0;
                position: absolute;
                top: 0;
                left: 50%;
            }

            .mid .icns > img {
                height: 100%;
                width: auto;
            }

            #stTimeline .r {
                text-align: right;
            }

            .mid .icns.kill {
                transform: translateX(calc(-100% - 10px));
            }

            .mid .icns.death {
                transform: translateX(10px);
            }

            .mid .icns .weapIcn {
                transform: rotateY(180deg);
            }
        </style>
    `;

    let btnCont = document.createElement('div');
    btnCont.style.display = 'flex';

    let exportBtn = document.createElement('div');
    exportBtn.className = 'settingsBtn';
    exportBtn.style.background = '#0a0';
    exportBtn.style.marginLeft = 'auto';
    exportBtn.textContent = 'Export Match';
    exportBtn.onclick = () => {
        let blob = new Blob([JSON.stringify(game)], {type: 'text/plain'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `match.txt`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    };

    let deleteBtn = document.createElement('div');
    deleteBtn.className = 'settingsBtn';
    deleteBtn.style.background = '#a00';
    deleteBtn.textContent = 'Delete Match';
    deleteBtn.onclick = () => {
        if(!confirm('Are you sure you want to delete this match?')) return;
        let gamePath = path.join(gameHistoryPath, `${game.startTime}.json`);
        fs.unlinkSync(gamePath);
        openUI();
    };

    let backBtn = document.createElement('div');
    backBtn.className = 'settingsBtn';
    backBtn.style.background = '#1af';
    backBtn.textContent = 'Back';
    backBtn.onclick = () => openUI();

    if(!imported) {
        btnCont.appendChild(exportBtn);
        btnCont.appendChild(deleteBtn);
    }
    if(imported) backBtn.style.marginLeft = 'auto';

    btnCont.appendChild(backBtn);
    menuWindow.appendChild(btnCont);

    menuWindow.insertAdjacentHTML('beforeend', `<div style="font-size:32px">${game.mode} - ${game.map}</div><div>Played on ${game.playerName || 'unknown'}</div>`);

    menuWindow.insertAdjacentHTML('beforeend', `<div id="stTimeline"></div>`);
    let timeline = document.getElementById('stTimeline');

    let events = game.kills.map(x => { return {
        type: 'kill',
        ...x
    } }).concat(game.deaths.map(x => { return {
        type: 'death',
        ...x
    } }));

    events.sort((a, b) => a.timestamp - b.timestamp);

    timeline.insertAdjacentHTML('beforeend', `<div>Game Start</div><div class="mid"><div class="circle"></div></div><div class="r">${new Date(game.startTime).toLocaleString()}</div>`);

    let wallbangIcon = './img/wallbang_0.png';
    let headshotIcon = './img/headshot_0.png';

    for(let i = 0; i < events.length; i++) {
        let event = events[i];
        timeline.insertAdjacentHTML('beforeend', `
            <div style="${event.type == 'death' ? 'color:#f00' : ''}">${event.type == 'kill' ? 'You' : event.target}</div>
            <div class="mid"><div class="icns ${event.type}"><img class="weapIcn" src="${event.weap}">${event.wallbang ? `<img src="${wallbangIcon}">` : ''}${event.headshot ? `<img src="${headshotIcon}">` : ''}</div></div>
            <div class="r" style="${event.type == 'kill' ? 'color:#f00' : ''}">${event.type == 'death' ? 'You' : event.target}</div>
        `);
    }

    timeline.insertAdjacentHTML('beforeend', `<div>Game End</div><div class="mid end"><div class="circle"></div></div><div class="r">${new Date(game.endTime).toLocaleString()}</div>`);

    let statDiv = document.createElement('div');

    let stats = {
        kills: game.kills.length,
        deaths: game.deaths.length,
        highestStreak: 0,
        lowestStreak: Infinity,
        mostKilled: {
            c: 0,
            n: ''
        },
        mostDied: {
            c: 0,
            n: ''
        },
        headshotPercent: (game.kills.filter(x => x.headshot).length / game.kills.length * 100).toFixed(2)
    };

    let streak = 0;
    let killFreq = {};
    let deathFreq = {};
    for(let i = 0; i < events.length; i++) {
        let event = events[i];
        if(event.type == 'kill') streak++;
        
        if(event.type == 'death' || i == events.length - 1) {
            if(streak > stats.highestStreak) stats.highestStreak = streak;
            if(streak < stats.lowestStreak) stats.lowestStreak = streak;
            streak = 0;
        }

        if(event.type == 'kill') {
            if(!killFreq[event.target]) killFreq[event.target] = 0;
            killFreq[event.target]++;
        }
        
        if(event.type == 'death') {
            if(!deathFreq[event.target]) deathFreq[event.target] = 0;
            deathFreq[event.target]++;
        }
    }

    for(let i = 0; i < Object.keys(killFreq).length; i++) {
        let key = Object.keys(killFreq)[i];
        if(killFreq[key] > stats.mostKilled.c) {
            stats.mostKilled.c = killFreq[key];
            stats.mostKilled.n = key;
        }
    }

    for(let i = 0; i < Object.keys(deathFreq).length; i++) {
        let key = Object.keys(deathFreq)[i];
        if(deathFreq[key] > stats.mostDied.c) {
            stats.mostDied.c = deathFreq[key];
            stats.mostDied.n = key;
        }
    }

    let statHTML = '';
    statHTML += `<div>Kills: ${stats.kills}</div>`;
    statHTML += `<div>Deaths: ${stats.deaths}</div>`;
    statHTML += `<div>Highest Streak: ${stats.highestStreak}</div>`;
    statHTML += `<div>Lowest Streak: ${stats.lowestStreak}</div>`;
    statHTML += `<div>Headshot Percentage: ${stats.headshotPercent}%</div>`;
    statHTML += `<div>Most Killed: ${stats.mostKilled.n} (${stats.mostKilled.c} times)</div>`;
    statHTML += `<div>Most Died To: ${stats.mostDied.n} (${stats.mostDied.c} times)</div>`;

    statDiv.innerHTML = statHTML;
    statDiv.style.marginTop = '10px';
    menuWindow.appendChild(statDiv);
}