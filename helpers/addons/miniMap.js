module.exports = () => {
    const config = new (require('electron-store'))();
    if(!config.get('minimapHider', false)) return;
    let style = document.createElement('style');
    style.textContent = '#miniMapOverlay { display: none !important; }';
    document.head.append(style);
}