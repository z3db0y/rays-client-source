const Store = require('electron-store');
const config = new Store();
const TWITCH_CLIENT_ID = '5nqlrrrqri992wx4eyftoufhghqvzf';
if(typeof window === 'undefined') main();

function fetchTwitchUser(token) {
    return new Promise((resolve, reject) => {
        require('https').get('https://api.twitch.tv/helix/users', {
            headers: {
                'authorization': `Bearer ${token}`,
                'client-id': TWITCH_CLIENT_ID
            }
        }).on('response', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    data = JSON.parse(data);
                    if(data.data[0]) resolve(data.data[0]);
                    else reject();
                } catch(e) {
                    reject();
                }
            });
        }).on('error', _ => reject());
    });
}

function fetchChannelBadges(channelId, token) {
    return new Promise((resolve, reject) => {
        require('https').get(`https://badges.twitch.tv/v1/badges/channels/${channelId}/display`, {
            headers: {
                authorization: `Bearer ${token}`,
                'client-id': TWITCH_CLIENT_ID
            }
        }).on('response', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    data = JSON.parse(data);
                    resolve(data.badge_sets);
                } catch(e) {
                    reject();
                }
            });
        }).on('error', _ => reject());
    });
}

function fetchGlobalBadges(token) {
    return new Promise((resolve, reject) => {
        require('https').get('https://badges.twitch.tv/v1/badges/global/display', {
            headers: {
                authorization: `Bearer ${token}`,
                'client-id': TWITCH_CLIENT_ID
            }
        }).on('response', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    data = JSON.parse(data);
                    resolve(data.badge_sets);
                } catch(e) {
                    reject();
                }
            });
        }).on('error', _ => reject());
    });
}

function fetchEmoteSets(sets, token) {
    let endpoint = 'https://api.twitch.tv/helix/chat/emotes/set?emote_set_id=';
    let data = [];
    return new Promise((resolve, reject) => {
        for(let i = 0; i < sets.length; i+=25) {
            require('https').get(endpoint + sets.slice(i, i+25).join('&emote_set_id='), {
                headers: {
                    authorization: `Bearer ${token}`,
                    'client-id': TWITCH_CLIENT_ID
                }
            }).on('response', res => {
                let d = '';
                res.on('data', chunk => d += chunk);
                res.on('end', () => {
                    try {
                        d = JSON.parse(d);
                        data.push(...d.data);
                    } catch(e) {}
                    if(i === Math.floor(sets.length/25)*25) resolve(data);
                });
            }).on('error', _ => {});
        }
    });
}

function fetchBTTVEmotes(channelId) {
    return new Promise((resolve, reject) => {
        require('https').get(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`, {
            agent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        }).on('response', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    data = JSON.parse(data);
                    resolve(data);
                } catch(e) {
                    reject();
                }
            });
        }).on('error', _ => reject());
    });
}

function fetchFFZEmotes(channelId) {
    return new Promise((resolve, reject) => {
        require('https').get(`https://api.frankerfacez.com/v1/room/id/${channelId}`, {
            agent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        }).on('response', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    data = JSON.parse(data);
                    resolve(data);
                } catch(e) {
                    reject();
                }
            });
        }).on('error', _ => reject());
    });
}

function fetch7TVEmotes(channelId) {
    return new Promise((resolve, reject) => {
        require('https').get(`https://api.7tv.app/v2/users/${channelId}/emotes`, {
            agent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        }).on('response', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    data = JSON.parse(data);
                    resolve(data);
                } catch(e) {
                    reject();
                }
            });
        }).on('error', _ => (console.log(_),reject()));
    });
}

let channelBadges;
let globalBadges;

async function getAuthorText(tags, token) {
    let author = '';

    if(!channelBadges) channelBadges = await fetchChannelBadges(tags['room-id'], token).catch(_ => {});
    if(!globalBadges) globalBadges = await fetchGlobalBadges(token).catch(_ => {});

    for(let badge in tags['badges']) {
        if(channelBadges[badge]) {
            author += `<img src="${channelBadges[badge].versions[tags['badges'][badge]].image_url_1x}">`;
        } else if(globalBadges[badge]) {
            author += `<img src="${globalBadges[badge].versions[tags['badges'][badge]].image_url_1x}">`;
        }
    }

    if(!author) author += '<img src="https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png">';
    author += tags['display-name'];

    return author;
}

async function injectBTTVEmotes(message, tags) {
    let emotes = await fetchBTTVEmotes(tags['room-id']).catch(_ => {});
    if(!emotes) return message;

    for(let emote of emotes.channelEmotes) {
        message = message.replace(new RegExp(escapeRegex(emote.code), 'g'), `<img src="https://cdn.betterttv.net/emote/${emote.id}/1x">`)
    }

    for(let emote of emotes.sharedEmotes) {
        message = message.replace(new RegExp(escapeRegex(emote.code), 'g'), `<img src="https://cdn.betterttv.net/emote/${emote.id}/1x">`)
    }

    return message;
}

async function injectFFZEmotes(message, tags) {
    let emotes = await fetchFFZEmotes(tags['room-id']).catch(_ => {});
    if(!emotes) return message;

    for(let emote of emotes.sets[emotes.room.set].emoticons) {
        message = message.replace(new RegExp(escapeRegex(emote.name), 'g'), `<img src="https://cdn.frankerfacez.com/emoticon/${emote.id}/1">`)
    }

    return message;
}

async function inject7TVEmotes(message, tags) {
    let emotes = await fetch7TVEmotes(tags['room-id']).catch(_ => {});
    console.log(emotes);
    if(!emotes) return message;

    for(let emote of emotes) {
        message = message.replace(new RegExp(escapeRegex(emote.name), 'g'), `<img src="https://cdn.7tv.app/emote/${emote.id}/1x">`)
    }

    return message;
}

async function injectEmotes(message, tags) {
    let formatted = '';
    for(let i = 0; i < message.length; i++) {

        if(message[i] == '<') {
            formatted += '&lt;';
            continue;
        } else if(message[i] == '>') {
            formatted += '&gt;';
            continue;
        } else if(message[i] == '&') {
            formatted += '&amp;';
            continue;
        } else if(message[i] == '"') {
            formatted += '&quot;';
            continue;
        } else if(message[i] == "'") {
            formatted += '&#039;';
            continue;
        }

        let emoteAtI_id = tags.emotes ? Object.keys(tags.emotes).find(emote => tags.emotes[emote].find(range => range.split('-')[0] == i)) : null;
        if(emoteAtI_id && config.get('twitch.emotes.twitch', true)) {
            let emoteAtI = tags.emotes[emoteAtI_id].find(range => range.split('-')[0] == i).split('-');
            let emoteAtI_url = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteAtI_id}/default/dark/1.0`;
            formatted += `<img class="emote" src="${emoteAtI_url}">`;
            i = emoteAtI[1];
        } else {
            formatted += message[i];
        }
    }

    if(config.get('twitch.emotes.bttv', false)) formatted = await injectBTTVEmotes(formatted, tags);
    if(config.get('twitch.emotes.ffz', false)) formatted = await injectFFZEmotes(formatted, tags);
    if(config.get('twitch.emotes.7tv', false)) formatted = await inject7TVEmotes(formatted, tags);

    return formatted;
}

function escapeRegex(str) {
    return str.replace(/[\[\]\(\)\{\}\*\+\?\!\^\$\.\\\-\|]/g, '\\$&');
}

async function injectEmoteSets(message, tags, token) {
    let sets = await fetchEmoteSets(tags['emote-sets'].split(','), token);

    for(let emote of sets) {
        let regex = new RegExp(escapeRegex(emote.name) + '(\\s|$)', 'g');
        let matches = [...message.matchAll(regex)];
        if(matches.length > 0) {
            tags['emotes'][emote.id] = [];
            for(let match of matches) tags['emotes'][emote.id].push(`${match.index}-${match.index + emote.name.length - 1}`);
        }
    }
}

async function main() {
    const chatMsg = '<div data-tab="-1" class="twitchMsg"><div class="chatItem" style="color: ${COLOR}">${USERNAME}: <span class="chatMsg">${MESSAGE}</span></div><br></div>';

    const TMI = require('tmi.js');
    const { ipcMain, BrowserWindow, ipcRenderer } = require('electron');

    function getter(obj, name) {
        return name.split('.').reduce((o, i) => o[i], obj);
    }

    String.prototype.parse = function(obj) {
        return this.replace(/\$\{([^\}]+)\}/g, (match, p1) => {
            return getter(obj, p1) || (getter(obj, p1) === 0 ? 0 : '${' + p1 + '}');
        });
    }

    let userData;
    let client;
    async function login() {
        userData = await fetchTwitchUser(Buffer.from(config.get('twitch.token', ''), 'base64').toString()).catch(console.error);
        if(!userData?.login) return;
        BrowserWindow.getAllWindows()[0].send('twitchLoggedIn');
        if(config.get('twitch.enable', false)) {
            client = new TMI.Client({
                identity: {
                    username: userData.login,
                    password: 'oauth:' + Buffer.from(config.get('twitch.token', ''), 'base64').toString()
                },
                channels: [userData.login]
            });
            client.connect().catch(console.error);
            client.on('chat', async (channel, tags, message, myself) => {
                tags['username'] = tags['username'] || channel.slice(1);
                tags['display-name'] = tags['display-name'] || userData.display_name || tags['username'];
                if(channel === '#' + userData.login && !tags['room-id']) tags['room-id'] = userData.id;

                let cmds = config.get('twitch.commands', []).filter(cmd => cmd.enabled && message.toLowerCase().startsWith(cmd.name.toLowerCase()));
                ipcMain.once('twitchCommandVars', (_, vars) => {
                    vars.sender = tags['username'];
                    cmds.forEach(cmd => client.say(channel, cmd.response.parse(vars)));
                });
                BrowserWindow.getAllWindows()[0].webContents.send('getTwitchCommandVars');

                if(tags['emote-sets']) await injectEmoteSets(message, tags, Buffer.from(config.get('twitch.token', ''), 'base64').toString());
                
                message = await injectEmotes(message, tags);
                let author = await getAuthorText(tags, Buffer.from(config.get('twitch.token', ''), 'base64').toString());
                let color = tags['color'] || '#50f';

                BrowserWindow.getAllWindows()[0].webContents.send('twitchChatMessage', chatMsg.parse({
                    COLOR: color,
                    USERNAME: author,
                    MESSAGE: message
                }));
            });
        } else {
            if(client) client.disconnect();
            client = null;
        }
    }
    await login();
    
    ipcMain.handle('getTwitchUser', _ => userData);
    ipcMain.on('twitchLogin', async _ => await login());
    ipcMain.on('sendTwitchMsg', (_, msg) => {
        if(!client) return;
        client.say('#' + userData.login, msg);
    });
}

function loadTwitchData() {
    const { ipcRenderer } = require('electron');
    const { BrowserWindow } = require('electron').remote;
    const path = require('path');
    let twitchLoginBtn = document.getElementById('twitchLogin');
    let twitchLogin = twitchLoginBtn.parentElement;

    document.getElementById('twitch.enable').addEventListener('click', _ => ipcRenderer.send('twitchLogin'));
    document.getElementById('editTwitchCommands').onclick = _ => openCommandWindow();

    let loginToTwitch = async _ => {
        twitchLoginBtn.onclick = _ => {};
        let authWindow = new BrowserWindow({
            width: 500,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false
            },
            icon: path.join(__dirname, '../../assets/icon.png')
        });
        authWindow.setMenu(null);
        let params = {
            'response_type': 'token',
            'client_id': TWITCH_CLIENT_ID,
            'scope': 'chat:edit chat:read channel:manage:broadcast', // For reading chat and sending messages as user, editing stream information
            'redirect_uri': `http://localhost:21573`, // Redirect back here so that the window has the token etc.
            'state': 'x'.repeat(32).replace(/x/g, () => '0123456789abcdefghijklmopqrstuvwxyz'.charAt(Math.floor(Math.random() * 35))) // Randomly generated
        };

        await Promise.all((await authWindow.webContents.session.cookies.get({ url: 'https://web.twitch.tv' })).map(cookie => {
            return authWindow.webContents.session.cookies.remove('https://web.twitch.tv', cookie.name);
        }));
        authWindow.loadURL('https://id.twitch.tv/oauth2/authorize?' + new URLSearchParams(params).toString());
        authWindow.once('ready-to-show', _ => authWindow.show());
        authWindow.webContents.on('will-navigate', (event, u) => {
            let url = new URL(u);
            if(url.hostname !== 'localhost') return;
            let hash = new URLSearchParams(url.hash ? url.hash.substring(1) : url.search.substring(1));
            authWindow.close();
            if(hash.get('state') !== params.state) return;
            if(hash.get('error')) return;
            config.set('twitch.token', window.btoa(hash.get('access_token')));
            ipcRenderer.send('twitchLogin');
        });
    };

    ipcRenderer.invoke('getTwitchUser').then(userData => {
        twitchLogin.childNodes[0].textContent = 'Account: ' + userData.display_name + (userData.broadcaster_type ? ' (' + userData.broadcaster_type.substring(0, 1).toUpperCase() + userData.broadcaster_type.substring(1) + ')' : '')
        twitchLoginBtn.textContent = 'Logout';
        twitchLoginBtn.onclick = _ => {
            config.delete('twitch.token');
            ipcRenderer.send('twitchLogin');
            twitchLogin.childNodes[0].textContent = 'Not logged in';
            twitchLoginBtn.textContent = 'Login';
            twitchLoginBtn.onclick = loginToTwitch;
        };
    });

    twitchLoginBtn.onclick = loginToTwitch;
}

function popup(title, inputPlaceholders, inputValues, submitButtonName, afterTitle) {
    let menuWindow = document.getElementById('menuWindow');

    menuWindow.innerHTML = `<div id="referralHeader">${title}</div>${afterTitle || ''}<input class="accountInput" id="input1" value="${(inputValues[0] && inputValues[0].replace(/"/g, '\\"')) || ''}" placeholder="${(inputPlaceholders[0] && inputPlaceholders[0].replace(/"/g, '\\"')) || ''}"><input class="accountInput" id="input2" value="${(inputValues[1] && inputValues[1].replace(/"/g, '\\"')) || ''}" placeholder="${(inputPlaceholders[1] && inputPlaceholders[1].replace(/"/g, '\\"')) || ''}"><div id="saveBtn" class="button buttonG" style="width:calc(100% - 55px);padding:12px 20px;position:relative;left:50%;transform:translateX(-50%);margin-top:20px" onmouseenter="playTick()">${submitButtonName}</div>`;

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';

    return new Promise(resolve => {
        let input1 = document.getElementById('input1');
        let input2 = document.getElementById('input2');

        let onclose = _ => {
            document.getElementById('windowCloser').removeEventListener('click', onclose);
            resolve(null);
        };

        document.getElementById('windowCloser').addEventListener('click', onclose);
        document.getElementById('saveBtn').onclick = _ => {
            document.getElementById('windowCloser').removeEventListener('click', onclose);
            document.getElementById('saveBtn').onclick = _ => {};
            resolve([input1.value, input2.value]);
        };
    });
}

function editCommand(id) {
    window.playSelect?.call();

    let tip = '<div class="setBodH"><div style="margin-top:20px;margin-bottom:20px;text-align:center;color:rgba(255,255,255,0.5)">Tip: you can use variables in the response<br>' +
    '${link} - Link to the game<br>' +
    '${username} - Your krunker username<br>' +
    '${clan} - Your clan name<br>' +
    '${level} - Your level<br>' +
    '${score} - Your experience (xp)<br>' +
    '${kills} - Your total kills<br>' +
    '${deaths} - Your total deaths<br>' +
    '${kdr} - Your K/D ratio<br>' +
    '${time} - Your total playtime<br>' +
    '${wins} - Your total wins<br>' +
    '${losses} - Your total losses<br>' +
    '${games} - Your total games<br>' +
    '${wlr} - Your W/L ratio<br>' +
    '${hits} - Your total hits<br>' +
    '${misses} - Your total misses<br>' +
    '${shots} - Your total shots<br>' +
    '${headshots} - Your total headshots<br>' +
    '${accuracy} - Your accuracy<br>' +
    '${followers} - Your krunker hub follower count<br>' +
    '${following} - Your krunker hub following count<br>' +
    '${class.level} - Your class level, replace "class" with the class name, eg. ${runngun.level}<br>' +
    '${class.score} - Your class experience (xp), replace "class" with the class name, eg. ${runngun.score}<br>' +
    '${nukes} - Your total nukes<br>' +
    '${juggernauts} - Your total juggernauts<br>' +
    '${airdrops} - Your total airdrops<br>' +
    '${slimers} - Your total slimers<br>' +
    '${sender} - The name of the person who sent the command<br>' +
    '</div></div>';

    popup((id !== undefined ? 'Edit' : 'Add') + ' Command', ['Enter command', 'Enter response'], (id !== undefined ? [config.get('twitch.commands')[id].name, config.get('twitch.commands')[id].response] : []), 'Save', tip).then(data => {
        if(!data) return;
        let commands = config.get('twitch.commands') || [];
        if(id !== undefined) commands[id] = { name: data[0], response: data[1], enabled: commands[id].enabled };
        else commands.push({ name: data[0], response: data[1], enabled: true });
        if(data[0] && data[1]) config.set('twitch.commands', commands);
        openCommandWindow();
    });
}

function openCommandWindow() {
    let menuWindow = document.getElementById('menuWindow');

    menuWindow.innerHTML = `<div id="referralHeader">Commands</div><div id="twitchCommands" class="setBodH"></div><div id="addCmd" class="button buttonP" style="width:calc(100% - 55px);padding:12px 16px;position:relative;left:50%;transform:translateX(-50%)" onmouseenter="playTick()">Add New</div>`;

    let commands = config.get('twitch.commands') || [];
    let twitchCommands = document.getElementById('twitchCommands');
    for(let i = 0; i < commands.length; i++) {
        let command = commands[i];

        let cmd = document.createElement('div');
        cmd.classList = 'settName';
        cmd.innerHTML = command.name;
        twitchCommands.appendChild(cmd);

        let toggleBtn = document.createElement('div');
        toggleBtn.classList = 'settingsBtn';
        toggleBtn.innerHTML = command.enabled ? 'Disable' : 'Enable';
        toggleBtn.setAttribute('onmouseenter', 'playTick()');
        toggleBtn.style.background = command.enabled ? '#fa0' : '#0a0';
        toggleBtn.onclick = _ => {
            window.playSelect?.call();
            command.enabled = !command.enabled;
            config.set('twitch.commands', commands);
            openCommandWindow();
        };

        let editBtn = document.createElement('div');
        editBtn.classList = 'settingsBtn';
        editBtn.innerHTML = 'Edit';
        editBtn.setAttribute('onmouseenter', 'playTick()');
        editBtn.onclick = () => editCommand(i);

        let deleteBtn = document.createElement('div');
        deleteBtn.classList = 'settingsBtn';
        deleteBtn.innerHTML = 'Delete';
        deleteBtn.setAttribute('onmouseenter', 'playTick()');
        deleteBtn.style.background = '#f00';
        deleteBtn.onclick = () => {
            window.playSelect?.call();
            commands.splice(i, 1);
            config.set('twitch.commands', commands);
            openCommandWindow();
        };

        cmd.appendChild(deleteBtn);
        cmd.appendChild(editBtn);
        cmd.appendChild(toggleBtn);
    }

    if(commands.length == 0) twitchCommands.innerHTML = '<div class="settName">No commands added.</div>';
    document.getElementById('addCmd').onclick = _ => editCommand();

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';
}

module.exports = () => {
    if(!window.windows) return setTimeout(module.exports, 100);

    function formatTime(ms) {
        let sec = Math.floor(ms / 1000);
        let str = '';

        let years = Math.floor(sec / 31536000);
        if(years) str += years + 'y ';
        sec -= years * 31536000;

        let months = Math.floor(sec / 2592000);
        if(months) str += months + 'mo ';
        sec -= months * 2592000;

        let days = Math.floor(sec / 86400);
        if(days) str += days + 'd ';
        sec -= days * 86400;

        let hours = Math.floor(sec / 3600);
        if(hours) str += hours + 'h ';
        sec -= hours * 3600;

        let minutes = Math.floor(sec / 60);
        if(minutes) str += minutes + 'm ';
        sec -= minutes * 60;

        return str.trim();
    }

    const { ipcRenderer } = require('electron');
    let oSwitchTab = window.windows[0].changeTab;
    window.windows[0].changeTab = function (tab) {
        let _r = oSwitchTab.call(this, tab);
        if(document.getElementById('twitchLogin')) loadTwitchData();
        return _r;
    };
    let oGen = window.windows[0].gen;
    window.windows[0].gen = function (id) {
        let _r = oGen.call(this, id);
        return (setTimeout(() => {
            if(document.getElementById('twitchLogin')) loadTwitchData();
        }), _r);
    };

    let player;

    function updatePlayer() {
        return new Promise(resolve => {
            if(!window.localStorage.getItem('krunker_username')) return (player = null, resolve(null));
            fetch('https://api.z3db0y.com/krunker/r/profile/' + window.localStorage.getItem('krunker_username')).then(r => r.json()).then(r => ((r = r[3] || {}), r.stats = JSON.parse(r.player_stats), player = r, resolve(r)));
        });
    }

    let customChatList = document.getElementById('chatList_custom');
    ipcRenderer.on('twitchChatMessage', (_, message) => (customChatList.insertAdjacentHTML('beforeend', message), customChatList.scrollTop = customChatList.scrollHeight));
    ipcRenderer.on('getTwitchCommandVars', async (event) => {
        if(!player) await updatePlayer();
        if(player && window.localStorage.getItem('krunker_username') != player.player_name) await updatePlayer();
        player ? player.stats = Object.assign({
            c0: 0,
            c1: 0,
            c2: 0,
            c3: 0,
            c4: 0,
            c5: 0,
            c6: 0,
            c7: 0,
            c8: 0,
            c9: 0,
            c11: 0,
            c12: 0,
            c13: 0,
            c15: 0,
            n: 0,
            sl: 0,
            jg: 0,
            ad: 0
        }, player.stats) : null;

        let stats = player ? {
            username: player.player_name,
            clan: player.player_clan,
            level: Math.floor(Math.sqrt((player.player_score + 1) / 1111)),
            score: player.player_score.toLocaleString('en-US'),
            kills: player.player_kills.toLocaleString('en-US'),
            deaths: player.player_deaths.toLocaleString('en-US'),
            kdr: (player.player_kills / player.player_deaths).toFixed(2),
            time: formatTime(player.player_timeplayed),
            wins: player.player_wins.toLocaleString('en-US'),
            losses: (player.player_games_played - player.player_wins).toLocaleString('en-US'),
            games: player.player_games_played.toLocaleString('en-US'),
            wlr: (player.player_wins / (player.player_games_played - player.player_wins)).toFixed(4),
            following: player.player_following.toLocaleString('en-US'),
            followers: player.player_followed.toLocaleString('en-US'),
            hits: player.stats.h.toLocaleString('en-US'),
            misses: (player.stats.s - player.stats.h).toLocaleString('en-US'),
            shots: player.stats.s.toLocaleString('en-US'),
            headshots: player.stats.hs.toLocaleString('en-US'),
            accuracy: (player.stats.h / player.stats.s * 100).toFixed(2) + '%',
            nukes: player.stats.n.toLocaleString('en-US'),
            slimers: player.stats.sl.toLocaleString('en-US'),
            juggernauts: player.stats.jg.toLocaleString('en-US'),
            airdrops: player.stats.ad.toLocaleString('en-US'),
            triggerman: {
                score: player.stats['c0'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c0'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            hunter: {
                score: player.stats['c1'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c1'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            runngun: {
                score: player.stats['c2'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c2'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            spraynpray: {
                score: player.stats['c3'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c3'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            vince: {
                score: player.stats['c4'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c4'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            detective: {
                score: player.stats['c5'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c5'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            marksman: {
                score: player.stats['c6'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c6'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            rocketeer: {
                score: player.stats['c7'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c7'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            agent: {
                score: player.stats['c8'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c8'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            runner: {
                score: player.stats['c9'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c9'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            bowman: {
                score: player.stats['c11'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c11'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            commando: {
                score: player.stats['c12'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c12'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            trooper: {
                score: player.stats['c13'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c13'] + 1) / 1111) + 1).toLocaleString('en-US')
            },
            infiltrator: {
                score: player.stats['c15'].toLocaleString('en-US'),
                level: Math.floor(Math.sqrt((player.stats['c15'] + 1) / 1111) + 1).toLocaleString('en-US')
            }
        } : {};
        event.sender.send('twitchCommandVars', Object.assign(stats, {
            link: window.location.href
        }));
    });

    let shiftDown = false;
    document.getElementById('chatInput').addEventListener('keydown', e => {
        if(e.key === 'Shift') return shiftDown = true;
        if(e.key === 'Enter' && shiftDown && config.get('twitch.sendOnShiftEnter', false)) {
            e.preventDefault();
            ipcRenderer.send('sendTwitchMsg', document.getElementById('chatInput').value);
            document.getElementById('chatInput').value = '';
        }
    });
    document.addEventListener('keyup', e => (e.key === 'Shift' && (shiftDown = false)));

    ipcRenderer.on('twitchLoggedIn', _ => loadTwitchData());
    updatePlayer();
};