let insertCopyLinkBtns = () => {
    let els = [...document.getElementsByClassName('settNameIn')];
    for(let i = 0; i < els.length; i++) {
        let btn = document.createElement('div');
        let gameID = [...els[i].getAttribute('onclick').matchAll(/["'`]([^"'`]*)["'`]/g)][0];
        if(!gameID) continue;
        gameID = gameID[1];
        btn.textContent = 'Copy Link';
        btn.className = 'buttonP quickJoin';
        btn.style.cssText = 'margin-left:10px;margin-right:0';
        btn.onclick = event => {
            event.stopImmediatePropagation();
            navigator.clipboard.writeText('https://krunker.io/?game=' + gameID);
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy Link', 1000);
        };
        els[i].children[0].insertAdjacentElement('beforebegin', btn);
    }

    let setHeds = [...document.getElementsByClassName('setHed')];
    for(var i = 0; i < setHeds.length; i++) {
        setHeds[i].addEventListener('click', insertCopyLinkBtns);
    }
};

let hookIn = () => {
    if(!window.windows || !window.windows[1]) return setTimeout(hookIn, 100);
    let win = window.windows[1];
    let oGen = win.gen;
    win.gen = function gen() {
        setTimeout(insertCopyLinkBtns);
        return oGen.apply(this, arguments);
    };
};
hookIn();