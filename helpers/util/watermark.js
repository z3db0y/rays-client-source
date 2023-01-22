const tooltip = document.createElement('div');
tooltip.className = 'youNewDiv';
tooltip.setAttribute('onmouseenter', 'playTick()');
tooltip.innerHTML = '<div style="display:inline-block;width:65px;height:65px;background-image:url(client-asset://icon.png);background-size:cover;margin:-5px;margin-bottom:-10px"></div><div class="helpTxtHol" style="margin-left:10px!important">Need help?<div class="helpGuidOpn">Join our discord!</div></div>';
if(document.getElementById('battlepassAd')) document.getElementById('battlepassAd').insertAdjacentElement('beforebegin', tooltip);
else document.getElementById('tlInfHold').appendChild(tooltip);
tooltip.onclick = () => {
    window.playSelect?.call();
    window.open('https://discord.gg/C4k9uVnPwP', '_blank');
};

const watermark = document.createElement('div');
watermark.innerHTML = '[RAYS] Client';
watermark.id = 'clientWatermark';
watermark.style.color = '#fff';
watermark.style.marginBottom = '5px';

new MutationObserver((_, o) => {
    if(document.getElementById('clientWatermark')) return;
    document.getElementById('curGameInfo').insertAdjacentElement('afterbegin', watermark);
}).observe(document.getElementById('curGameInfo'), { childList: true });