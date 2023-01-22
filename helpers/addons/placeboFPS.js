module.exports = () => {
    const config = new (require('electron-store'))();
    let multiplier = config.get('placeboFPS', 1);
    if(multiplier == 1) return;
    let ingameFPS = document.getElementById('ingameFPS');
    let menuFPS = document.getElementById('menuFPS');
    let lastVal = '';
    new MutationObserver(_ => {
        if(ingameFPS.textContent == lastVal) return;
        let randomAdd = Math.floor(Math.random() * multiplier * 2) - multiplier;
        ingameFPS.textContent = Math.floor(parseInt(ingameFPS.textContent) * multiplier + randomAdd);
        menuFPS.textContent = Math.floor(parseInt(menuFPS.textContent) * multiplier + randomAdd);
        lastVal = ingameFPS.textContent;
    }).observe(ingameFPS, { childList: true });
}