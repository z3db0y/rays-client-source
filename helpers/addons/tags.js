module.exports = _ => {
    if(
        !document.getElementById('menuClassNameTag') ||
        !document.getElementById('newLeaderDisplay')
    ) return setTimeout(module.exports, 100);
    const leaderboard = document.getElementById('newLeaderDisplay');
    const oldLeaderboard = document.getElementById('leaderDisplay');
    const menuName = document.getElementById('menuClassNameTag');

    const { ipcRenderer } = require('electron');
    const config = new (require('electron-store'))();

    let applyBadges = config.get('badges', true);
    let applyClans = config.get('clans', true);

    // if(!applyBadges && !applyClans) return; // TODO: potentially add toggle for death cards

    let badges = [];
    let clans = [];
    let self = [];
    let deathCards = [];
    let customDeathCards = config.get('customDeathCards', []);

    ipcRenderer.on('getBadges', (event, data) => {
        badges = data;
    });
    ipcRenderer.send('getBadges');

    ipcRenderer.send('getSelf');
    ipcRenderer.on('getSelf', (event, data) => {
        self = data;
    });

    ipcRenderer.send('getClans');
    ipcRenderer.on('getClans', (event, data) => {
        clans = data;
    });

    ipcRenderer.send('getDeathCards');
    ipcRenderer.on('getDeathCards', (event, data) => {
        deathCards = data;
    });

    function find(array, func) {
        for(var i = 0; i < array.length; i++) if(func(array[i])) return array[i];
    }

    let newLeaderDisplay = document.getElementById('newLeaderDisplay');

    function map(array, func) {
        let newa = [];
        for(var i = 0; i < array.length; i++) newa.push(func(array[i]));
        return newa;
    }

    new MutationObserver(_ => {
        // let playerEls = [...map([...leaderboard.children[0].children[0].children[0].children].slice(2), child => child.children[0].children[0].lastChild), ...map([...oldLeaderboard.children[0].children], child => child.children[child.children.length - 2])];
        let playerEls = [...map([...leaderboard.getElementsByTagName('tbody')], t => map([...t.children].slice(2), child => child.children[0].children[0].lastChild)).flat(), ...map([...oldLeaderboard.children[0].children], child => child.children[child.children.length - 2])];
        window.log(playerEls);

        for(let i = 0; i < playerEls.length; i++) {
            let playerEl = playerEls[i];
            let playerNode = find([...playerEl.childNodes], x => x.nodeType == 3);
            let playerName = playerNode?.textContent.trim();
            let player = find(badges, x => x.name == playerName);
            let playerBadges = badges ? player?.badges || [] : [];
            if(!player) continue;

            if(applyBadges) {
                playerBadges.forEach(badge => {
                    let html = `<img class="badge" src="${badge}" style="height: 23px; margin-top: 3px; vertical-align: middle">`;
                    if(!playerEl.parentElement.innerHTML.includes(html)) playerEl.insertAdjacentHTML('beforebegin', html);
                });
            }
            
            if(!applyClans) continue;
            let playerClan = playerEl.querySelector('span')?.textContent.trim().slice(1, -1).toLowerCase();
            let clan = clans ? find(clans, x => x.name.toLowerCase() === playerClan) : null;
            if(!clan?.style && !clan?.addonHTML) continue;

            for(var key in clan.style) playerEl.querySelector('span').style[key] = clan.style[key];
            if(clan.addonHTML && !playerEl.innerHTML.includes(clan.addonHTML)) playerEl.querySelector('span').insertAdjacentHTML('afterend', clan.addonHTML);
        }
    }).observe(newLeaderDisplay, { childList: true });

    let deathUIHolder = document.getElementById('deathUIHolder');
    new MutationObserver(_ => {
        if(!deathUIHolder.style.display || deathUIHolder.style.display == 'none') return;

        let playerCards = [...deathUIHolder.getElementsByClassName('death-row-bottom')];
        for(let i = 0; i < playerCards.length; i++) {
            let playerCard = playerCards[i];
            let playerName = playerCard.querySelector('.death-row-user-text').textContent.trim();
            let player = find(badges, x => x[i == 0 ? 'name' : 'uname'] == playerName);
            if(!player) continue;
            let customCard = player.deathCard;
            if(!customCard) continue;
            let playerBG = playerCard.querySelector('.death-row-bottom-bg');
            if(!playerBG) {
                playerBG = document.createElement('img');
                playerBG.className = 'death-row-bottom-bg';
                playerCard.insertAdjacentElement('afterbegin', playerBG);
            }
            playerBG.src = customCard;
        }
    }).observe(deathUIHolder, { attributes: true, attributeFilter: ['style'] });

    let winHooked = false;
    let hookShowWin = () => {
        if(!window.windows || !window.windows[51]) return setTimeout(hookShowWin, 100);
        window.log('hooking showWindow');
        if(winHooked) return;
        winHooked = true;
        let oldGen = window.windows[51].gen;
        window.windows[51].gen = function () {
            setTimeout(insertCustomDeathCards);
            return oldGen.apply(this, arguments);
        };
        let oldGen2 = window.windows[2].gen;
        window.windows[2].gen = function () {
            setTimeout(selectDeathCard);
            return oldGen2.apply(this, arguments);
        }
    };
    hookShowWin();

    function insertCustomDeathCards() {
        let anim = !(localStorage.getItem('kro_setngss_disableRarityAnim') == 'true');
        let firstEl = document.getElementById('menuWindow').querySelector('.skinCard[data-index]');

        let addCustomBtn = document.createElement('div');
        addCustomBtn.className = 'noBtnCard skinCard';
        addCustomBtn.setAttribute('onmouseenter', 'playTick()');
        addCustomBtn.style.cssText = 'border:5px solid lightgrey';
        addCustomBtn.innerHTML = `<div style="color: #fff;margin-top: 50%; transform: translateY(-25%)">ADD<br>CUSTOM</div>`;
        if(self && self.isPremium) firstEl.insertAdjacentElement('beforebegin', addCustomBtn);

        addCustomBtn.addEventListener('click', () => {
            window.windows[40].newPop();
            let pop = document.getElementById('genericPop');
            pop.querySelector('.pubHed').textContent = 'New Custom Death Card';
            let btn = pop.querySelector('.mapFndB');
            btn.removeAttribute('onclick');
            btn.addEventListener('click', () => {
                let errorHTML = `<div style="width:100%;text-align:center"><div><i class="material-icons" style="font-size:80px;color:#e33b3b">clear</i></div><div style="font-size:20px;color:rgba(255,255,255,0.5)">Something Went Wrong</div></div>`;
                let showError = () => {
                    pop.className = 'responsePop';
                    pop.innerHTML = errorHTML;
                };
                let name = document.getElementById('newCustomName').value;
                let url = document.getElementById('newCustomImg').value;
                if(!name || !url) return showError();
                
                customDeathCards = config.get('customDeathCards', []);
                customDeathCards.push({ name, url });
                config.set('customDeathCards', customDeathCards);
                window.clearPops();
                window.updateWindow(52);
            });
        });

        if(self && self.isPremium) for(let i = 0; i < customDeathCards.length; i++) {
            let selectCard = () => {
                if(!self || !self.isPremium) return;
                config.set('deathCard', [1, i]);
                window.selectPlayerCard(-1000); // Unselect in-game card & go back to customize window
            };

            let deathCard = customDeathCards[i];
            let div = document.createElement('div');
            div.className = 'skinCard blackShad';
            if(anim) div.classList.add('rainbow');
            div.style.color = '#fff53d';
            div.style.border = '5px solid #fff53d';
            div.setAttribute('onmouseenter', 'playTick()');
            let html = `${deathCard.name}<div class="itemOwn" style="z-index: 3;position: relative;">Custom client skin</div><div class="itemSea"></div><img loading="lazy" draggable="false" class="skinImgP" src="${deathCard.url}"><div class="selctDelBtn" style="bottom:10px;top:unset;right:10px" onmouseenter="playTick()">X</div>`;

            div.addEventListener('click', selectCard);

            div.innerHTML = html;
            div.querySelector('.selctDelBtn').addEventListener('click', e => {
                e.stopPropagation();
                customDeathCards = config.get('customDeathCards', []);
                customDeathCards.splice(i, 1);
                config.set('customDeathCards', customDeathCards);
                window.updateWindow(52);
            });
            firstEl.insertAdjacentElement('beforebegin', div);
        }

        for(let i = 0; i < deathCards.length; i++) {
            let selectCard = () => {
                config.set('deathCard', [0, i]);
                window.selectPlayerCard(-1000); // Unselect in-game card & go back to customize window
            };
            
            let deathCard = deathCards[i];
            let div = document.createElement('div');
            div.className = 'skinCard blackShad';
            if(anim) div.classList.add('rainbow');
            div.style.color = '#fff53d';
            div.style.border = '5px solid #fff53d';
            div.setAttribute('onmouseenter', 'playTick()');
            let html = `${deathCard.name}<div class="itemOwn" style="z-index: 3;position: relative;">[RAYS] Client skin</div><div class="itemSea"></div><img loading="lazy" draggable="false" class="skinImgP" src="${deathCard.url}">`;
            
            div.addEventListener('click', selectCard);

            div.innerHTML = html;
            firstEl.insertAdjacentElement('beforebegin', div);
        }
    }

    function selectDeathCard() {
        let unselect = () => config.set('deathCard', [-1, -1]);
        let playerCardI = window.localStorage.getItem('playerCardIndex');
        if(playerCardI != -1000) return unselect();
        
        let anim = !(localStorage.getItem('kro_setngss_disableRarityAnim') == 'true');

        let div = document.getElementById('menuWindow').querySelector('div[onclick="showWindow(52)"]');
        if(!div) return;
        let cardName = div.querySelector('.custLabel');
        let rnd = div.querySelector('.selRandom');
        
        let cardT = config.get('deathCard')[0];
        let cardI = config.get('deathCard')[1];
        let card = cardT == 0 ? deathCards[cardI] : customDeathCards[cardI];

        rnd.outerHTML = `<img class="custIconCard" style="margin-top: 0px;" src="${card.url}">`;
        cardName.textContent = card.name;

        cardName.style.color = '#fff53d';
        if(anim) cardName.classList.add('rainbow');
    }
};