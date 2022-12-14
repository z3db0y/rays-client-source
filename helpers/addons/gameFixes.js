// Fix for knife menu not closing after selecting a knife
window.equip = false;

// Fix for server browser input
let showWindow = window.showWindow;
window.showWindow = function() {
    if(arguments[0] == 2 && document.getElementById('serverSearch')) return;
    return showWindow.apply(this, arguments);
};