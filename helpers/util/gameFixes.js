// Fix for knife menu not closing after selecting a knife
window.equip = false;

// Fix for server browser input
function applyServerBrowserFix() {
    if(!window['windows']) return setTimeout(applyServerBrowserFix, 100);
    let o = window['windows'][1].genList;
    window['windows'][1].genList = function () {
        let s = this['serverSearch'];
        let ss = document.getElementById('serverSearch');
        let hasFocus = document.activeElement.id === 'serverSearch';
        setTimeout(() => hasFocus && document.getElementById('serverSearch').focus());
        return o.apply(this, arguments).replace(/id='serverSearch'/g, `id="serverSearch" value="${s || ''}"`);
    };
}
applyServerBrowserFix();