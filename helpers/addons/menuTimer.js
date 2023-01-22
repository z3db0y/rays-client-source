module.exports = () => {
    const config = new (require('electron-store'))();
    if(!config.get('menuTimer', false)) return;
    let timerVal = document.getElementById('timerVal');
    let instructions = document.getElementById('instructions');
    let lastVal = '';

    new MutationObserver(_ => {
        instructions.textContent = timerVal.textContent;
        lastVal = timerVal.textContent;
    }).observe(timerVal, { childList: true });
    new MutationObserver(_ => {
        if(instructions.textContent != lastVal) instructions.textContent = timerVal.textContent;
    }).observe(instructions, { childList: true });
    instructions.textContent = timerVal.textContent || '00:00';
}