const config = new (require('electron-store'))();

let nukeTimer = document.createElement('div');
nukeTimer.id = 'nukeTimer';
nukeTimer.style.display = 'none';
nukeTimer.style.lineHeight = '65px';
nukeTimer.style.fontSize = '35px';
nukeTimer.style.background = '#0000004C';
nukeTimer.style.color = '#FFFFFF';
nukeTimer.style.textAlign = 'center';
nukeTimer.style.padding = '7px 10px 8px 10px';
nukeTimer.style.borderRadius = '6px';

let bottomRight = document.getElementById('bottomRight');
new MutationObserver((_, observer) => {
    let ksHolder = document.getElementById('killStreakHolder');
    if(!ksHolder) return;
    ksHolder.insertAdjacentElement('afterend', nukeTimer);
    observer.disconnect();
}).observe(bottomRight, { childList: true, subtree: true });

function showNukeTimer(time) {
    if(!config.get('nukeTimer', false)) return hideNukeTimer();
    nukeTimer.style.display = 'inline-block';
    nukeTimer.textContent = time.toFixed(1);
}

function hideNukeTimer() {
    nukeTimer.style.display = 'none';
}

let i = 0;
module.exports = props => {
    document.onkeydown = (e) => {
        if(!props.game?.players?.list) return;
        let player = props.game.players.list.find(x => x.isYou);
        if(!player) return;
        let hasNuke = player.streaks[0]?.cnt > 0;
        let nukeBound = (window.localStorage.getItem('streakIndex3') || -1) == 0;
        let nukeKey = window.localStorage.getItem('cont_20') || 51;
        let nukeKey2 = window.localStorage.getItem('cont_20_alt') || -1;
        let accCheck = player.accid != 0;
        window.log('Nuke timer:', 'hasNuke:', hasNuke, 'nukeBound:', nukeBound, 'nukeKey:', nukeKey, 'nukeKey2:', nukeKey2, 'streak:', player.streaks[0]);
        if((e.which == nukeKey || e.which == nukeKey2) && nukeBound && accCheck && hasNuke && i == 0) {
            let int = setInterval(() => {
                if(i >= 100) {
                    clearInterval(int), i = 0, hideNukeTimer();
                    return;
                }
                showNukeTimer(10 - i/10);
                i++;
            }, 100);
        }
    };
};