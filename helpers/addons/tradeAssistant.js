module.exports = () => {
    const { ipcRenderer } = require('electron');
    const config = new (require('electron-store'))();
    if(!config.get('tradeAssistant', true)) return;
    if(!window.windows || !window.createTip) return setTimeout(module.exports, 100);
    let priceCache = {};

    let tip1;
    let tip2;

    let oCreateTip = window.createTip;
    window.createTip = function createTip(elem) {
        let _r = oCreateTip.apply(this, arguments);
        tooltipMod(elem.dataset.index);
        return _r;
    }

    let oAddItem = window.windows[36].addItem;
    window.windows[36].addItem = function addItem(id, invI) {
        let _r = oAddItem.apply(this, arguments);
        recalculatePrices();
        return _r;
    }

    let oRemoveItem = window.windows[36].removeItem;
    window.windows[36].removeItem = function removeItem(id, invI) {
        let _r = oRemoveItem.apply(this, arguments);
        recalculatePrices();
        return _r;
    }

    function unboostedPrice(prices, lastSold) {
        let avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        let filtered = prices.filter(x => x < avg * 2 && x > avg * 0.25);
        return Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length + lastSold) / 2);
    }

    function getItemPrice(itemId) {
        if(priceCache[itemId]) return priceCache[itemId];
        if(Object.keys(priceCache).length >= 30) delete priceCache[Object.keys(priceCache)[0]]; // Limit price cache to 30 items
        priceCache[itemId] = new Promise((resolve) => {
            ipcRenderer.send('krunkerws.getSkinAsync', itemId);
            let l = async (event, id, r) => {
                if(id != itemId) return;
                if(r instanceof Error) return resolve(await getItemPrice(itemId));
                ipcRenderer.off('krunkerws.getSkinAsync', l);
                let lastSale = r.sort((a, b) => new Date(b.d) - new Date(a.d))[0];
                let avg = Math.round(r.reduce((a, b) => a + (b.f/b.t), 0) / r.length) || 0;
                let itemInfo = {
                    lastSold: Math.round(lastSale.f/lastSale.t) || 0,
                    averagePrice: avg,
                    unboostedPrice: unboostedPrice(r.map(i => i.f / i.t), (lastSale.f/lastSale.t || avg)) || 0,
                    totalSold: r.length,
                    sales: r.map(i => ({ date: i.d, price: i.f / i.t }))
                };
                resolve(itemInfo);
            };
            ipcRenderer.on('krunkerws.getSkinAsync', l);
        });
        return priceCache[itemId];
    }

    async function tooltipMod(itemId) {
        let tooltip = document.querySelector('.tooltip');
        if(!tooltip) return;
        // Don't fetch locked items to stop websocket from getting spammed
        let itemEl = (document.getElementById('trd_inv_0_' + itemId) || document.getElementById('trd_inv_1_' + itemId) || document.getElementById('trd_sel_0_' + itemId) || document.getElementById('trd_sel_1_' + itemId));
        if(!itemEl || [...itemEl.children].some(x => x.classList.contains('tItemBound'))) return;
        let anchorPoint = tooltip.getBoundingClientRect().top + tooltip.clientHeight;
        let tt = document.createElement('div');
        tt.className = 'tooltipSub';
        tt.style.fontSize = '10px';
        tt.id = 'tradeAssistant_tooltip';
        tooltip.appendChild(tt);
        tt.innerHTML = 'Please wait...';
        tooltip.style.transition = 'none';
        tooltip.style.top = (anchorPoint - tooltip.clientHeight) + 'px';
        let currentCoords = tooltip.getBoundingClientRect();
        let itemStats = await getItemPrice(itemId);
        window.log(itemStats);
        if(!itemStats || tooltip.getBoundingClientRect().top != currentCoords.top || tooltip.getBoundingClientRect().left != currentCoords.left) return;
        tt = document.getElementById('tradeAssistant_tooltip');
        tt.innerHTML = 'Last sold <span style="color:#0f0">' + itemStats.lastSold.toLocaleString() + '</span> KR<br>Avg sale price <span style="color:#00f">' + itemStats.averagePrice.toLocaleString() + '</span> KR<br>Total sold <span style="color:#f0f">' + itemStats.totalSold.toLocaleString() + '</span><br>TradeAssistant™️ price <span style="color: #40c4ff">' + itemStats.unboostedPrice.toLocaleString() + '</span> KR';
        tooltip.style.transition = 'none';
        tooltip.style.top = (anchorPoint - tooltip.clientHeight) + 'px';
    }

    async function recalculatePrices() {
        [tip1, tip2].forEach(tip => tip.innerHTML = 'Please wait...');
        let offer1 = [...document.getElementById('tradeList0').children].map(child => child.id.split('_').reverse()[0]);
        let offer2 = [...document.getElementById('tradeList1').children].map(child => child.id.split('_').reverse()[0]);        
        let offer1Prices = await Promise.all(offer1.map(getItemPrice));
        let offer2Prices = await Promise.all(offer2.map(getItemPrice));

        tip1.innerHTML = 'Last sold value <span style="color:#0f0">' + offer1Prices.reduce((a, b) => a + (b ? b.lastSold : 0), 0).toLocaleString() + '</span> KR<br>' + 
        'Avg price value <span style="color:#00f">' + offer1Prices.reduce((a, b) => a + (b ? b.averagePrice : 0), 0).toLocaleString() + '</span> KR<br>' + 
        'TradeAssistant™️ value <span style="color: #40c4ff">' + offer1Prices.reduce((a, b) => a + (b ? b.unboostedPrice : 0), 0).toLocaleString() + '</span> KR';

        tip2.innerHTML = 'Last sold value <span style="color:#0f0">' + offer2Prices.reduce((a, b) => a + (b ? b.lastSold : 0), 0).toLocaleString() + '</span> KR<br>' +
        'Avg price value <span style="color:#00f">' + offer2Prices.reduce((a, b) => a + (b ? b.averagePrice : 0), 0).toLocaleString() + '</span> KR<br>' +
        'TradeAssistant™️ value <span style="color: #40c4ff">' + offer2Prices.reduce((a, b) => a + (b ? b.unboostedPrice : 0), 0).toLocaleString() + '</span> KR';
    }

    let oGen = window.windows[36].gen;
    window.windows[36].gen = function gen() {
        let _r = oGen.apply(this, arguments);
        setTimeout(() => {
            tip1 = document.createElement('div');
            tip2 = document.createElement('div');
            [tip1, tip2].forEach(tip => tip.classList = 'estOfferVal');

            document.getElementById('offerVal0').insertAdjacentElement('afterend', tip1);
            document.getElementById('offerVal1').insertAdjacentElement('afterend', tip2);

            [tip1, tip2].forEach(tip => tip.innerHTML = 'Last sold value <span style="color:#0f0">0</span> KR<br>Avg price value <span style="color:#00f">0</span> KR<br>TradeAssistant™️ value <span style="color:#40c4ff">0</span> KR');
        });
        return _r;
    }
};