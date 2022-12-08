const path = require('path');
const { BrowserWindow, screen, nativeImage } = require('electron').remote;
const http = require('http');
const fs = require('fs');
const Store = require('electron-store');
const config = new Store();

let TWITCH_CLIENT_ID = '5nqlrrrqri992wx4eyftoufhghqvzf'; // [RAYS] Client client_id
let channel_id;
let tmi_client;

let addons = {
    '7TV': 1 << 0,
    'BTTV': 1 << 1,
    'FFZ': 1 << 2,
};

let command = '<td class="clientItem"><input type="text" class="commandName"></td><td class="clientItem"><input type="text" class="commandRes"></td><td class="clientItem"><button onmouseenter="playTick()" class="deleteBtn"><span class="material-icons">delete</span></button></td>';
let commandObj = { name: '', response: '' };
let chatMsg = '<div data-tab="-1" class="twitchMsg"><div class="chatItem" style="color: $COLOR">$USERNAME: <span class="chatMsg">$MESSAGE</span></div><br></div>';

let shiftDown = false;
let chatInput = document.getElementById('chatInput');
chatInput.addEventListener('keydown', e => {
    if(e.key == 'Shift') shiftDown = true;
    if(e.key == 'Enter' && shiftDown) {
        if(!tmi_client || tmi_client.readyState() !== 'OPEN') return;
        e.preventDefault();
        e.stopPropagation();
        tmi_client.say(tmi_client.getChannels()[0], chatInput.value);
        chatInput.value = '';
        chatInput.blur();
    }
});
document.addEventListener('keyup', e => {
    if(e.key == 'Shift') shiftDown = false;
});

async function getChannel() {
    let res = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
            'Authorization': `Bearer ${window.atob(config.get('twitch_oauth_token'), 'base64')}`,
            'Client-ID': TWITCH_CLIENT_ID
        }
    }).catch(err => {});

    if(res.ok) {
        try {
            return (await res.json()).data[0];
        } catch(_) { return null }
    }
}

async function getGlobalBadges() {
    let res = await fetch('https://badges.twitch.tv/v1/badges/global/display').catch(err => {});

    if(res.ok) {
        try {
            return (await res.json()).badge_sets;
        } catch(_) { return null }
    }
}

async function getChannelBadges(channel_id) {
    let res = await fetch(`https://badges.twitch.tv/v1/badges/channels/${channel_id}/display`).catch(err => {});

    if(res.ok) {
        try {
            return (await res.json()).badge_sets;
        } catch(_) { return null }
    }
}

async function format_7tv_emotes(message, channel_id) {
    let channel_emotes = await fetch_7tv_emotes(channel_id).catch(err => {});
    if(channel_emotes) {
        for(let i = 0; i < channel_emotes.length; i++) {
            let emote = channel_emotes[i];
            message = message.replace(new RegExp(emote.name + '(\\s|$)', 'g'), `<img class="emote" src="https://cdn.7tv.app/emote/${emote.id}/1x">`);
        }
    }
    return message;
}

async function format_bttv_emotes(message, channel_id) {
    let channel_emotes = await fetch_bttv_emotes(channel_id).catch(err => {});

    if(channel_emotes) {
        for(let i = 0; i < channel_emotes.length; i++) {
            let emote = channel_emotes[i];
            message = message.replace(new RegExp(emote.code + '(\\s|$)', 'g'), `<img class="emote" src="https://cdn.betterttv.net/emote/${emote.id}/1x">`);
        }
    }

    return message;
}

async function format_ffz_emotes(message, channel_id) {
    let channel_emotes = await fetch_ffz_emotes(channel_id).catch(err => {});

    if(channel_emotes) {
        for(let i = 0; i < channel_emotes.length; i++) {
            let emote = channel_emotes[i];
            message = message.replace(new RegExp(emote.name + '(\\s|$)', 'g'), `<img class="emote" src="https://cdn.frankerfacez.com/emoticon/${emote.id}/1">`);
        }
    }

    return message;
}

async function format(message, userstate) {
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

        let emoteAtI_id = userstate.emotes ? Object.keys(userstate.emotes).find(emote => userstate.emotes[emote].find(range => range.split('-')[0] == i)) : null;
        if(emoteAtI_id) {
            let emoteAtI = userstate.emotes[emoteAtI_id].find(range => range.split('-')[0] == i).split('-');
            let emoteAtI_url = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteAtI_id}/default/dark/1.0`;
            formatted += `<img class="emote" src="${emoteAtI_url}">`;
            i = emoteAtI[1];
        } else {
            formatted += message[i];
        }
    }
    if(config.get('twitch_chat_addons', 0) & addons['7TV']) { formatted = await format_7tv_emotes(formatted, userstate['room-id']); }
    if(config.get('twitch_chat_addons', 0) & addons['BTTV']) { formatted = await format_bttv_emotes(formatted, userstate['room-id']); }
    if(config.get('twitch_chat_addons', 0) & addons['FFZ']) { formatted = await format_ffz_emotes(formatted, userstate['room-id']); }

    return formatted;
}

async function fetch_emote_sets(sets) {
    let endpoint = 'https://api.twitch.tv/helix/chat/emotes/set?emote_set_id=';
    let data = null;
    for(var i = 0; i < sets.length; i+=25) {
        let res = await fetch(endpoint + sets.slice(i, i+25).join('&emote_set_id='), {
            headers: {
                'Authorization': `Bearer ${window.atob(config.get('twitch_oauth_token'))}`,
                'Client-ID': TWITCH_CLIENT_ID
            }
        }).catch(err => {});
        if(res.ok) {
            try {
                if(data) data = [...data, ...(await res.json()).data];
                else data = (await res.json()).data;
            } catch(_) {}
        }
    }
    return data;
}

function escapeRegex(str) {
    return str.replace(/[\[\]\(\)\{\}\*\+\?\!\^\$\.\\\-\|]/g, '\\$&');
}

async function inject_emote_sets(message, userstate) {
    let emote_sets = await fetch_emote_sets(userstate['emote-sets'].split(','));
    if(emote_sets) {
        for(let i = 0; i < emote_sets.length; i++) {
            let emote = emote_sets[i];
            let regex = new RegExp(escapeRegex(emote.name) + '(\\s|$)', 'g');
            let matches = [...message.matchAll(regex)];
            if(matches.length > 0) {
                userstate['emotes'][emote.id] = [];
                for(let match of matches) userstate['emotes'][emote.id].push(`${match.index}-${match.index + emote.name.length - 1}`);
            }
        }
    }
}

async function initTMIClient() {
    if(tmi_client && tmi_client.readyState != 'CLOSED') return;
    let token = window.atob(config.get('twitch_oauth_token', ''));
    let channel = await getChannel();
    if(!channel) return;
    let channel_name = channel.login;
    let channel_id = channel.id;
    tmi_client = new (require('tmi.js').Client)({
        channels: [ channel_name ],
        identity: {
            username: channel_name,
            password: `oauth:${token}`
        }
    });
    let globalBadges = await getGlobalBadges();
    let channelBadges = await getChannelBadges(channel_id);

    let messages = document.getElementById('chatList');
    tmi_client.on('chat', async (channel, userstate, message, myself) => {
        if(channel == `#${channel_name}` && !userstate['room-id']) userstate['room-id'] = channel_id;
        if(userstate['emote-sets']) await inject_emote_sets(message, userstate);

        let author = '';

        for(var badge in userstate.badges) {
            if(badge) {
                let badgeHTML = document.createElement('img');
                if(channelBadges[badge]) {
                    badgeHTML.src = channelBadges[badge].versions[userstate.badges[badge]].image_url_1x;
                } else if(globalBadges[badge]) {
                    badgeHTML.src = globalBadges[badge].versions[userstate.badges[badge]].image_url_1x;
                }
                author += badgeHTML.outerHTML;
            }
        }

        if(!author) {
            let twitchLogo = document.createElement('img');
            twitchLogo.src = 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png';
            author += twitchLogo.outerHTML;
        }
        author += userstate['display-name'];
        
        messages.innerHTML += chatMsg.parse({
            COLOR: userstate.color,
            USERNAME: author,
            MESSAGE: await format(message, userstate)
        });

        messages.scrollTop = messages.scrollHeight;

        let commands = config.get('twitch_commands', []);
        if(!myself) {
            for(var cmd of commands) {
                if(message.toLowerCase().startsWith(cmd.name.toLowerCase())) {
                    tmi_client.say(channel, cmd.response.parse({
                        link: window.location.href,
                        username: document.getElementById('menuAccountUsername').innerHTML,
                        timer: document.getElementById('timerVal').innerHTML || '00:00',
                        sky: config.get('skyImage', '')
                    }));
                }
            }
        }
    });
    tmi_client.connect();
}

if(config.get('twitch_oauth_token', '')) initTMIClient();

function fetch_7tv_emotes(channel) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.7tv.app/v2/users/${channel}/emotes`).then(res => {
            if(res.ok) {
                res.json().then(data => {
                    resolve(data);
                })
            } else {
                reject(res);
            }
        });
    });
}

function fetch_bttv_emotes(channel) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.betterttv.net/3/cached/users/twitch/${channel}`).then(res => {
            if(res.ok) {
                res.json().then(data => {
                    if(data.sharedEmotes && data.channelEmotes) resolve([...data.sharedEmotes, ...data.channelEmotes]);
                });
            } else {
                reject();
            }
        });
    });
}

function fetch_ffz_emotes(channel) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.frankerfacez.com/v1/room/id/${channel}`).then(res => {
            if(res.ok) {
                res.json().then(data => {
                    if(data.sets && data.sets[data.room.set] && data.sets[data.room.set].emoticons) resolve(data.sets[data.room.set].emoticons);
                });
            } else {
                reject();
            }
        });
    });
}

function saveCommand() {
    let commands = config.get('twitch_commands', []);
    commands[this.parentNode.parentNode.rowIndex - 1] = {
        name: this.parentNode.parentNode.getElementsByClassName('commandName')[0].value,
        response: this.parentNode.parentNode.getElementsByClassName('commandRes')[0].value
    };
    config.set('twitch_commands', commands);
}

function deleteCommand() {
    playSelect();
    let commands = config.get('twitch_commands', []);
    commands.splice(this.parentNode.parentNode.rowIndex - 1, 1);
    config.set('twitch_commands', commands);
    this.parentNode.parentNode.remove();
}

function addCommand() {
    let commandHTML = document.createElement('tr');
    commandHTML.innerHTML = command;
    commandHTML.getElementsByClassName('commandName')[0].oninput = saveCommand;
    commandHTML.getElementsByClassName('commandRes')[0].oninput = saveCommand;
    commandHTML.getElementsByClassName('deleteBtn')[0].onclick = deleteCommand;
    document.getElementById('twitchCommands').appendChild(commandHTML);
    config.set('twitch_commands', config.get('twitch_commands', []).concat(Object.assign({}, commandObj)));
}

function loadCommands() {
    let commands = config.get('twitch_commands', []);
    let commandsTable = document.getElementById('twitchCommands');
    for(let i = 0; i < commands.length; i++) {
        let commandHTML = document.createElement('tr');
        commandHTML.innerHTML = command;
        window.log(commandHTML.getElementsByClassName('commandName'));
        commandHTML.getElementsByClassName('commandName')[0].value = commands[i].name;
        commandHTML.getElementsByClassName('commandRes')[0].value = commands[i].response;
        commandHTML.getElementsByClassName('commandName')[0].oninput = saveCommand;
        commandHTML.getElementsByClassName('commandRes')[0].oninput = saveCommand;
        commandHTML.getElementsByClassName('commandRes')[0].onclick = deleteCommand;
        commandsTable.appendChild(commandHTML);
    }
}

async function updateInfo() {
    if(!document.getElementById('twitchInfo') || !document.getElementById('twitchAvatar') || !document.getElementById('twitchLogin')) return;
    let info = document.getElementById('twitchInfo');
    let avatar = document.getElementById('twitchAvatar');
    let loginBtn = document.getElementById('twitchLogin');
    let streamTitle = document.getElementById('twitchStreamTitle');
    let streamCategory = document.getElementById('twitchStreamCategory');
    let updateStreamInfo = document.getElementById('twitchUpdateStreamInfo');
    let addCommandBtn = document.getElementById('addTwitchCommand');

    document.getElementById('7tvA').checked = config.get('twitch_chat_addons', 0) & addons['7TV'] ? true : false;
    document.getElementById('bttvA').checked = config.get('twitch_chat_addons', 0) & addons['BTTV'] ? true : false;
    document.getElementById('ffzA').checked = config.get('twitch_chat_addons', 0) & addons['FFZ'] ? true : false;

    addCommandBtn.onclick = _ => { playSelect(); addCommand(); };
    loadCommands();
    if(config.get('twitch_oauth_token', '')) {
        initTMIClient();
        let data = await getChannel();

        if(data) {
            // Success
            loginBtn.onclick = twitch_logout;
            loginBtn.textContent = 'Log Out';

            channel_id = data.id;
            avatar.src = data.profile_image_url;
            avatar.style.display = '';
            info.innerHTML = `${data.display_name}`;
            updateStreamInfo.onclick = update_stream_info;

            let res1 = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${data.id}&first=1`, {
                headers: {
                    'Authorization': `Bearer ${window.atob(config.get('twitch_oauth_token'))}`,
                    'Client-ID': TWITCH_CLIENT_ID
                }
            }).catch(err => {});
            if(res1 && res1.ok) {
                let data1 = await res1.json();
                info.innerHTML += `\n${data1.total} followers`;
            }

            let res2 = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${data.id}`, {
                headers: {
                    'Authorization': `Bearer ${window.atob(config.get('twitch_oauth_token'))}`,
                    'Client-ID': TWITCH_CLIENT_ID
                }
            }).catch(err => {});
            if(res2 && res2.ok) {
                let data2 = await res2.json();
                data2 = data2.data;
                if(data2) data2 = data2[0];
                if(data2) {
                    streamTitle.value = data2.title;
                    streamCategory.value = data2.game_name;
                }
            }
            return;
        }
    }
    // Not logged in / Error
    avatar.style.display = 'none';
    loginBtn.onclick = twitch_login;
    loginBtn.textContent = 'Log In';
    info.textContent = 'Not logged in';
    streamTitle.value = '';
    streamCategory.value = '';
    updateStreamInfo.onclick = undefined;
}

async function update_stream_info() {
    let title = document.getElementById('twitchStreamTitle').value;
    let game = document.getElementById('twitchStreamCategory').value;
    let updateBtn = document.getElementById('twitchUpdateStreamInfo');
    let gameError = document.getElementById('twitchCategoryError');
    let success = document.getElementById('twitchInfoUpdateSuccess');
    let error = document.getElementById('twitchInfoUpdateError');
    [success, error].forEach(icon => {
        icon.style.display = 'none'
        icon.style.animation = '';
    });
    updateBtn.style.animation = '';
    gameError.style.visibility = 'hidden';


    updateBtn.textContent = 'Updating.';
    let dots = 2;
    let progress = setInterval(() => {
        if(dots > 3) dots = 1;
        updateBtn.textContent = 'Updating' + '.'.repeat(dots);
        dots ++;
    }, 300);

    let res = await fetch('https://api.twitch.tv/helix/games?name=' + game, {
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${window.atob(config.get('twitch_oauth_token'), 'base64')}`
        }
    }).catch(err => {});
    if(res && res.ok && channel_id) {
        let data;
        try {
            data = await res.json();
            if(data) data = data.data;
            if(data) data = data[0];
        } catch(_) {}
        if(data) {
            let game_id = data.id;
            let res1 = await fetch('https://api.twitch.tv/helix/channels?broadcaster_id=' + channel_id, {
                method: 'PATCH',
                body: new URLSearchParams({ title, game_id }).toString(),
                headers: {
                    'Client-ID': TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${window.atob(config.get('twitch_oauth_token'), 'base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).catch(err => {});
            if(res1 && res1.ok) {
                clearInterval(progress);
                updateBtn.textContent = 'Update';
                success.style.display = '';
                success.style.animation = 'fade 2s';
                setTimeout(() => success.style.display = 'none', 2000);
                return;
            }
        } else {
            gameError.style.visibility = '';
        }
        clearInterval(progress);
        error.style.display = '';
        error.style.animation = 'fade 2s';
        setTimeout(() => error.style.display = 'none', 2000);
        updateBtn.textContent = 'Update';
    }
}

function twitch_login () {
    let server = http.createServer((req, res) => {
        res.end('OK')
    });
    server.on('error', () => {
        // The server isn't really needed,
        // because the client's browser detects
        // the redirect and the token is received
        // there
    });
    let serverPort = 21573;
    server.listen(serverPort);

    let twitchEndpoint = 'https://id.twitch.tv/oauth2/authorize'; // Official twitch OAuth2 endpoint
    let params = {
        'response_type': 'token',
        'client_id': TWITCH_CLIENT_ID,
        'scope': 'chat:edit chat:read channel:manage:broadcast', // For reading chat and sending messages as user, editing stream information
        'redirect_uri': `http://localhost:${serverPort}`, // Redirect back here so that the window has the token etc.
        'state': 'x'.repeat(32).replace(/x/g, () => '0123456789abcdefghijklmopqrstuvwxyz'.charAt(Math.floor(Math.random() * 35))) // Randomly generated
    };

    let screenSize = screen.getPrimaryDisplay().workAreaSize;
    let windowSize = {
        width: Math.floor(Math.max(screenSize.width, screenSize.height)/4/16*9),
        height: Math.floor(Math.max(screenSize.width, screenSize.height)/4)
    }

    let authWindow = new BrowserWindow({
        width: windowSize.width,
        height: windowSize.height,
        title: '[RAYS] Client - Twitch authorization',
        webPreferences: {
            webSecurity: true,
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            devTools: false
        },
        show: false,
        autoHideMenuBar: true,
        icon: nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAU9JREFUWEftVzFywjAQXPEjKmoaU+cBzPCCJHoB5AUZoKFlQk+bOE0mHZ2f4CekppAYYAxG6O5saUQTq/CMLZ92b09aSQpMW2Z2aoAZ909o30uu1DH29PC1lOBHPJaAD/z5KzTX27jF6PxOEqAyfwgBTvbkBKSaJycwz6zlqkwRqGrq9kvf7+ZAR6BToFMgVIG2Bk1a8b8g8LsCii2xGaVWYLcBdh9ncAO86VydzhmX80BKAhT4QwjcgFvM9bd6rU/cpAo4ma91ribuqmlMwA2s7351IN+yNIAXvFUJKAISOIDC7DHUP+rPRy5KgVjwKAUG4+uyItywNHv0qcyrmGAFBAsuTQ9D/alKyapTEGgMzl5MXOaEUbUCYyehJJWHQGF6eGoiMzc2eTUTFGCXlpSM1wmloEoBzlSkMaJLYDxeHgIapMB7ZmfVFhoLWo8/AFjQCjDE6JfwAAAAAElFTkSuQmCC'
            ) // Twitch logo
    });
    authWindow.webContents.on('page-title-updated', (ev) => ev.preventDefault());
    authWindow.webContents.on('will-navigate', (ev, u) => {
        let url = new URL(u);
        let uParams = new URLSearchParams(url.hash ? url.hash.substring(1) : url.search.substring(1));
        if(uParams.get('state') == params.state && uParams.has('access_token')) {
            // Success
            server.close();
            authWindow.close();
            config.set('twitch_oauth_token', window.btoa(uParams.get('access_token')));
            updateInfo();
        } else if(uParams.get('state') == params.state && uParams.has('error')) {
            // Fail silently
            server.close();
            authWindow.close();
        }
    });

    authWindow.once('ready-to-show', () => authWindow.show());
    authWindow.webContents.session.cookies.get({ url: 'https://www.twitch.tv' }).then(cookies => {
        Promise.all(cookies.map(cookie => authWindow.webContents.session.cookies.remove('https://www.twitch.tv', cookie.name))).then(() => {
            authWindow.loadURL(twitchEndpoint + '?' + new URLSearchParams(params).toString());
        });
    });
}

function twitch_logout () {
    config.delete('twitch_oauth_token');
    updateInfo();
}

window.open_twitch_settings = function () {
    document.getElementById('clientPopup').innerHTML = fs.readFileSync(path.join(__dirname, '../../html/twitch.html'));
    updateInfo();
}

window.twitchAddonTog = function (addon) {
    addon = 1 << addon;
    let addons = config.get('twitch_chat_addons', 0);
    addons ^= addon;
    config.set('twitch_chat_addons', addons);
}