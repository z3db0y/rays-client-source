const path = require('path');
const crypto = require('crypto');
const SPOTIFY_CLIENT_ID = '281624bb93ef4de691632928e99a8b06';

class Spotify extends require('events') {

    #fetch(url, opts) {
        url = new URL(url);
        let lib = url.protocol === 'https:' ? require('https') : require('http');
        return new Promise((resolve, reject) => {
            let req = lib.request(url.toString(), opts, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', async () => {
                    if(res.statusCode >= 400) {
                        let newTokens = await Spotify.refreshToken(this._refresh, this._client_id);
                        newTokens.expires_at = Date.now() + newTokens.expires_in * 1000;
                        this._token = newTokens.access_token;
                        this._refresh = newTokens.refresh_token | this._refresh;
                        this.emit('refresh', newTokens);
                    } else {
                        try {
                            resolve(JSON.parse(data));
                        } catch(e) {
                            reject(e);
                        }
                    }
                });
            });
            req.on('error', reject);
            if(opts.body) req.write(opts.body);
            req.end();
        });
    }

    static fetch(url, opts) {
        url = new URL(url);
        let lib = url.protocol === 'https:' ? require('https') : require('http');
        return new Promise((resolve, reject) => {
            let req = lib.request(url.toString(), opts, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', async () => {
                    if(res.statusCode >= 400) {
                        reject(new Error("Invalid status code: " + res.statusCode));
                    } else {
                        try {
                            resolve(JSON.parse(data));
                        } catch(e) {
                            reject(e);
                        }
                    }
                });
            });
            req.on('error', reject);
            if(opts.body) req.write(opts.body);
            req.end();
        });
    }

    constructor(access_token, refresh_token, client_id) {
        super();
        this._token = access_token;
        this._refresh = refresh_token;
        this._client_id = client_id;
    }

    getProfile() {
        return this.#fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${this._token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    getCurrentTrack() {
        return this.#fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${this._token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    static getTokens(code, redirect_uri, client_id, verifier) {
        return Spotify.fetch('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri,
                client_id: client_id,
                code_verifier: verifier
            }).toString()
        });
    }

    static refreshToken(refresh_token, client_id) {
        return Spotify.fetch('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: client_id
            }).toString()
        });
    }
};

module.exports = () => {
    if(!window.windows) return setTimeout(module.exports, 100);

    const config = {
        get: (k, d) => {
            let v = require('electron').ipcRenderer.sendSync('config.get', k);
            if (typeof v === 'undefined') return d;
            return v;
        },
        set: (k, v) => require('electron').ipcRenderer.sendSync('config.set', k, v)
    };

    let oSwitchTab = window.windows[0].changeTab;
    window.windows[0].changeTab = function (tab) {
        let _r = oSwitchTab.call(this, tab);
        if(document.getElementById('spotifyLogin')) loadSpotifyData();
        return _r;
    };
    let oGen = window.windows[0].gen;
    window.windows[0].gen = function (id) {
        let _r = oGen.call(this, id);
        return (setTimeout(() => {
            if(document.getElementById('spotifyLogin')) loadSpotifyData();
        }), _r);
    };

    let spotifyInstance;
    let nowPlayingInterval;
    let nowPlayingOverlay;
    let nowPlayingImage;
    let nowPlayingTitle;
    let nowPlayingArtist;
    let progressBar;
    let progress = 0;
    let songLength = 0;
    let progressInterval;
    if(config.get('spotify.nowPlaying.enable', false)) {
        nowPlayingOverlay = document.createElement('div');
        nowPlayingOverlay.style.position = 'absolute';
        nowPlayingOverlay.style.top = config.get('spotify.nowPlaying.offsetY', 0) + '%';
        nowPlayingOverlay.style.left = config.get('spotify.nowPlaying.offsetX', 0) + '%';
        nowPlayingOverlay.style.minWidth = '9vw';
        nowPlayingOverlay.style.maxWidth = '20vw';
        nowPlayingOverlay.style.height = '3vw';
        nowPlayingOverlay.style.display = 'flex';
        nowPlayingOverlay.style.alignItems = 'center';
        nowPlayingOverlay.style.background = config.get('spotify.nowPlaying.background', '#000000');
        config.get('spotify.nowPlaying.background', '#000000') == 'rgb' ? nowPlayingOverlay.style.animation = 'rainbowBG 1s linear infinite' : nowPlayingOverlay.style.animation = 'none';
        nowPlayingOverlay.style.borderRadius = config.get('spotify.nowPlaying.borderRadius', 10) + 'px';
        nowPlayingOverlay.style.opacity = config.get('spotify.nowPlaying.opacity', 0.5);
        nowPlayingOverlay.style.transform = 'translate(-50%, -50%) scale(' + config.get('spotify.nowPlaying.scale', 1) + ')';
        nowPlayingOverlay.style.overflow = 'hidden';
        nowPlayingOverlay.id = 'nowPlayingOverlay';
        document.getElementById('inGameUI').appendChild(nowPlayingOverlay);
        nowPlayingImage = document.createElement('img');
        nowPlayingImage.style.width = 'auto';
        nowPlayingImage.style.height = '100%';
        nowPlayingImage.transition = 'background 0.1s ease-in-out';
        nowPlayingOverlay.appendChild(nowPlayingImage);
        let dataContainer = document.createElement('div');
        nowPlayingTitle = document.createElement('div');
        nowPlayingTitle.style.fontWeight = 'bold';
        nowPlayingTitle.style.fontSize = '130%';
        nowPlayingTitle.style.color = config.get('spotify.nowPlaying.textColor', '#ffffff');
        nowPlayingTitle.style.textAlign = 'center';
        config.get('spotify.nowPlaying.textColor', '#ffffff') == 'rgb' ? nowPlayingTitle.style.animation = 'rainbowT 1s linear infinite' : nowPlayingTitle.style.animation = 'none';
        dataContainer.appendChild(nowPlayingTitle);
        nowPlayingArtist = document.createElement('div');
        nowPlayingArtist.style.fontSize = '110%';
        nowPlayingArtist.style.color = config.get('spotify.nowPlaying.textColor', '#ffffff');
        nowPlayingArtist.style.textAlign = 'center';
        config.get('spotify.nowPlaying.textColor', '#ffffff') == 'rgb' ? nowPlayingArtist.style.animation = 'rainbowT 1s linear infinite' : nowPlayingArtist.style.animation = 'none';
        dataContainer.appendChild(nowPlayingArtist);
        dataContainer.style.display = 'flex';
        dataContainer.style.flexDirection = 'column';
        dataContainer.style.justifyContent = 'center';
        dataContainer.style.alignItems = 'center';
        dataContainer.style.padding = '10px';
        dataContainer.style.flex = '1';
        progressBar = document.createElement('div');
        progressBar.style.height = config.get('spotify.nowPlaying.progressThickness', 2) + 'px';
        progressBar.style.backgroundColor = config.get('spotify.nowPlaying.progressColor', '#ffffff');
        config.get('spotify.nowPlaying.progressColor', '#ffffff') == 'rgb' ? progressBar.style.animation = 'rainbowBG 1s infinite linear' : progressBar.style.animation = 'none';
        progressBar.style.position = 'absolute';
        progressBar.style.left = '0';
        progressBar.style.right = '0';
        progressBar.style.top = 'calc(100% - ' + config.get('spotify.nowPlaying.progressThickness', 2) + 'px)';
        progressBar.style.transition = 'width 1s ease-in-out';
        nowPlayingOverlay.appendChild(progressBar);
        nowPlayingOverlay.appendChild(dataContainer);
        let style = document.createElement('style');
        style.textContent = `
            #nowPlayingOverlay::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                width: attr(data-progress);
                height: attr(data-progress-thickness);
                background: attr(data-progress-color);
            }
        `;
        document.head.appendChild(style);
        nowPlayingOverlay.style.display = 'none';
    }

    async function instantiateSpotify() {
        destroySpotifyInstance();
        if(config.get('spotify.tokens.expires_at', 0) < Date.now()) {
            let tokens = await Spotify.refreshToken(config.get('spotify.tokens.refresh_token'), SPOTIFY_CLIENT_ID);
            tokens.expires_at = Date.now() + tokens.expires_in * 1000;
            config.set('spotify.tokens', tokens);
        }

        spotifyInstance = config.get('spotify.tokens.access_token', '') ? new Spotify(config.get('spotify.tokens.access_token'), config.get('spotify.tokens.refresh_token'), SPOTIFY_CLIENT_ID) : nulll;
        if(spotifyInstance) {
            spotifyInstance.on('refresh', tokens => {
                config.set('spotify.tokens', tokens);
            });
            if(config.get('spotify.nowPlaying.enable', false)) {
                nowPlayingInterval = setInterval(async () => {
                    let track = await spotifyInstance.getCurrentTrack();
                    if(track && track.is_playing) {
                        nowPlayingImage.src = track.item.album.images[0].url;
                        nowPlayingTitle.textContent = track.item.name;
                        nowPlayingArtist.textContent = track.item.artists.map(a => a.name).join(', ');
                        songLength = track.item.duration_ms;
                        progress = track.progress_ms;
                        nowPlayingOverlay.style.display = 'flex';
                    } else nowPlayingOverlay.style.display = 'none';
                }, 6900);
                progressInterval = setInterval(() => {
                    progress += 1000;
                    progressBar.style.width = `${progress / songLength * 100}%`;

                    // Update styling
                    nowPlayingOverlay.style.top = config.get('spotify.nowPlaying.offsetY', 0) + '%';
                    nowPlayingOverlay.style.left = config.get('spotify.nowPlaying.offsetX', 0) + '%';
                    nowPlayingOverlay.style.background = config.get('spotify.nowPlaying.background', '#000000');
                    config.get('spotify.nowPlaying.background', '#000000') == 'rgb' ? nowPlayingOverlay.style.animation = 'rainbowBG 1s infinite linear' : nowPlayingOverlay.style.animation = 'none';
                    nowPlayingOverlay.style.borderRadius = config.get('spotify.nowPlaying.borderRadius', 10) + 'px';
                    nowPlayingOverlay.style.opacity = config.get('spotify.nowPlaying.opacity', 0.5);
                    nowPlayingOverlay.style.transform = 'translate(-50%, -50%) scale(' + config.get('spotify.nowPlaying.scale', 1) + ')';

                    progressBar.style.height = config.get('spotify.nowPlaying.progressThickness', 2) + 'px';
                    progressBar.style.top = 'calc(100% - ' + config.get('spotify.nowPlaying.progressThickness', 2) + 'px)';
                    progressBar.style.backgroundColor = config.get('spotify.nowPlaying.progressColor', '#ffffff');
                    config.get('spotify.nowPlaying.progressColor', '#ffffff') == 'rgb' ? progressBar.style.animation = 'rainbowBG 1s infinite linear' : progressBar.style.animation = 'none';

                    nowPlayingTitle.style.color = config.get('spotify.nowPlaying.textColor', '#ffffff');
                    config.get('spotify.nowPlaying.textColor', '#ffffff') == 'rgb' ? nowPlayingTitle.style.animation = 'rainbowT 1s infinite linear' : nowPlayingTitle.style.animation = 'none';
                    nowPlayingArtist.style.color = config.get('spotify.nowPlaying.textColor', '#ffffff');
                    config.get('spotify.nowPlaying.textColor', '#ffffff') == 'rgb' ? nowPlayingArtist.style.animation = 'rainbowT 1s infinite linear' : nowPlayingArtist.style.animation = 'none';
                }, 1000);
            }
        }
    }
    instantiateSpotify();

    function destroySpotifyInstance() {
        if(spotifyInstance) {
            spotifyInstance = null;
            clearInterval(nowPlayingInterval);
            nowPlayingInterval = null;
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }

    async function loadSpotifyData() {
        let spotifyLogin = document.getElementById('spotifyLogin');
        if(config.get('spotify.tokens.access_token', '')) {
            // Logged in
            if(!spotifyInstance) await instantiateSpotify();
            spotifyLogin.parentNode.childNodes[0].textContent = 'Loading...';
            spotifyLogin.textContent = 'Logout';
            spotifyInstance.getProfile().then(profile => {
                spotifyLogin.parentNode.childNodes[0].textContent = `Account: ${profile.display_name} (${profile.product[0].toUpperCase() + profile.product.slice(1).toLowerCase()})`;
            });
            spotifyLogin.onclick = () => {
                config.set('spotify.tokens', {});
                destroySpotifyInstance();
                loadSpotifyData();
            };
        } else {
            // Not logged in
            spotifyLogin.parentNode.childNodes[0].textContent = 'Not logged in';
            spotifyLogin.textContent = 'Login';
            spotifyLogin.onclick = async () => {
                const { BrowserWindow } = require('electron').remote;
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
                let charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~';
                let codeVerifier = Array.from({ length: 128 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
                let params = {
                    client_id: SPOTIFY_CLIENT_ID,
                    response_type: 'code',
                    redirect_uri: 'http://localhost:21573',
                    scope: 'user-read-private user-read-currently-playing', // TODO: Add more scopes
                    code_challenge_method: 'S256',
                    code_challenge: crypto.createHash('sha256').update(codeVerifier).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
                }
                await Promise.all((await authWindow.webContents.session.cookies.get({ url: 'https://spotify.com' })).map(cookie => {
                    return authWindow.webContents.session.cookies.remove('https://spotify.com', cookie.name);
                }));
                authWindow.loadURL(`https://accounts.spotify.com/authorize?${new URLSearchParams(params).toString()}`);
                authWindow.once('ready-to-show', () => authWindow.show());
                authWindow.webContents.on('will-navigate', (e, url) => {
                    let u = new URL(url);
                    if(u.hostname !== 'localhost') return;
                    authWindow.close();
                    if(u.searchParams.get('error')) return;
                    let code = u.searchParams.get('code');
                    // TODO: Get access token
                    Spotify.getTokens(code, 'http://localhost:21573', SPOTIFY_CLIENT_ID, codeVerifier).then(tokens => {
                        tokens.expires_at = Date.now() + tokens.expires_in * 1000;
                        config.set('spotify.tokens', tokens);
                        loadSpotifyData();
                    });
                });
            };
        }
    }
};