const path = require('path');
const Store = require('electron-store');
const defaultSettings = require(path.join(__dirname, '../../properties.json')).defaultSettings;
const config = new Store();

function getter(obj, path) {
    return path.split('.').reduce((o, i) => o[i], obj);
}

module.exports = function () {
    // wait for "windows" to be a valid object and easy CSS injection
    if (typeof windows === 'undefined' || !windows[0].tabs.basic.find(x => x.name === 'CSS')) {
        return new Promise(resolve => setTimeout(() => resolve(module.exports()), 100));
    }

    let settings = require(path.join(__dirname, '../../settings.json'));
    let addonSettings = require(path.join(__dirname, '../../addons.json'));
    let tabIndexes = {
        basic: windows[0].tabs.basic.push({ name: 'Client', categories: [] }) - 1,
        advanced: windows[0].tabs.advanced.push({ name: 'Client', categories: [] }) - 1
    };

    let addonTabIndexes = {
        basic: windows[0].tabs.basic.push({ name: 'Addons', categories: [] }) - 1,
        advanced: windows[0].tabs.advanced.push({ name: 'Addons', categories: [] }) - 1
    };

    let oGetSett = windows[0].getSettings;

    window.clientControlInput = function (el) {
        el.innerText = 'Press Any Key';
        let listener = (ev) => {
            ev.stopImmediatePropagation();
            document.removeEventListener('keydown', listener);
            config.set(el.id, ev.key);
            el.innerText = ev.key.length == 1 ? ev.key.toUpperCase() : ev.key;
        };
        document.addEventListener('keydown', listener);
    };

    window.resetClientControl = function (id) { config.set(id, getter(defaultSettings, id) || 'Unbound'); document.getElementById(id).innerText = getter(defaultSettings, id) || 'Unbound'; }
    window.unbindClientControl = function (id) { config.set(id, 'Unbound'); document.getElementById(id).innerText = 'Unbound'; }
    window.setClientSetting = (id, value) => config.set(id, value);

    windows[0].getSettings = function () {
        let oSett = oGetSett.call(this);
        let isClientTab = this.tabIndex === tabIndexes[this.settingType];
        let isAddonTab = this.tabIndex === addonTabIndexes[this.settingType];
        let cSett = (isClientTab || isAddonTab) ? '<div class="setBodH"><div class="settName"><sup style="color:#f00">*</sup>Requires restart</div><div class="settName"><sup style="color:#0f0">*</sup>Requires refresh</div></div>' : '';
        [addonSettings, settings].forEach((sType, i) => {
            for(var category in sType) {
                let catSearch = (this.settingSearch && category.toLowerCase().indexOf(this.settingSearch.toLowerCase()) !== -1);
                let settSearch = sType[category].filter(x => (catSearch || (i == 0 ? isAddonTab : isClientTab)) ? true : (this.settingSearch && x.name.toLowerCase().indexOf(this.settingSearch.toLowerCase()) !== -1));
                if(settSearch.length > 0) {
                    cSett += `<div class="setHed" id="setHed_${category.toLowerCase().replace(/"/g, '\\"')}" onclick="windows[0].collapseFolder(this)"><span class="material-icons plusOrMinus">keyboard_arrow_down</span>${category}</div>`;
                    cSett += `<div class="setBodH" id="setBod_${category.toLowerCase().replace(/"/g, '\\"')}">`;

                    for(var sett of settSearch) {
                        let settHTML = `<div class="settName clientSett" style="display: flex"><span style="color: #fff; display: inline-block">${sett.name}${sett.restart ? '<sup style="color:#f00">*</sup>' : ''}${sett.refresh ? '<sup style="color:#0f0">*</sup>' : ''}`;
                        if(sett.description) settHTML += `<span class="settDesc" style="font-size: 17px; display: block; color: #888">${sett.description}</span>`;
                        settHTML += `</span>`;
                        switch(sett.type) {
                            case 'toggle':
                                settHTML += `<label class="switch" style="margin-left:10px"><input type="checkbox" id="${sett.id.replace(/"/g, '\\"')}" ${config.get(sett.id, false) ? 'checked' : ''} onclick="setClientSetting(this.id, this.checked)"><span class="slider" style="width: 65px"><span class="grooves"></span></span></label></div>`;
                                break;
                            case 'input':
                                settHTML += `<input type="input" id="${sett.id.replace(/"/g, '\\"')}" placeholder="${sett.placeholder.replace(/"/g, '\\"')}" oninput="setClientSetting(this.id, this.value)" class="inputGrey2" value="${config.get(sett.id, '').replace(/"/g, '\\"')}"></div>`;
                                break;
                            case 'select':
                                settHTML += `<select id="${sett.id.replace(/"/g, '\\"')}" onchange="setClientSetting(this.id, (isNaN(parseInt(this.value)) ? this.value : parseInt(this.value)))" class="inputGrey2"">`;
                                for(var option of sett.options) {
                                    settHTML += `<option value="${option.value.toString().replace(/"/g, '\\"')}" ${config.get(sett.id) === option.value ? 'selected' : ''}>${option.name}</option>`;
                                }
                                settHTML += `</select></div>`;
                                break;
                            case 'button':
                                settHTML += `<div onclick="${sett.onclick && sett.onclick.replace(/"/g, '\\"')}" id="${sett.id && sett.id.replace(/"/g, '\\"')}" style="width: auto; display: inline-table" class="settingsBtn">${sett.label}</div></div>`;
                                break;
                            case 'slider':
                                settHTML += `<div class="slidecontainer" style="margin-left: auto"><input type="range" id="${sett.id.replace(/"/g, '\\"')}_slider" min="${sett.min}" max="${sett.max}" step="${sett.step}" value="${config.get(sett.id, 1)}" class="sliderM" oninput="setClientSetting('${sett.id.replace(/'/g, '\\\'')}', parseFloat(this.value)), (document.getElementById('${sett.id.replace(/'/g, '\\\'')}').value = this.value)"></div><input type="number" class="sliderVal" id="${sett.id.replace(/"/g, '\\"')}" min="${sett.min}" max="${sett.max}" value="${config.get(sett.id, 1)}" oninput="!isNaN(parseFloat(this.value)) && (parseFloat(this.min) <= parseFloat(this.value) && parseFloat(this.max) >= parseFloat(this.value) ? (this.prevValue = this.value, true) : (this.value = this.prevValue, false)) && (document.getElementById('${sett.id.replace(/'/g, '\\\'')}_slider').value = this.value) && setClientSetting(this.id, parseFloat(this.value))" style="margin-right:0px;margin-left:0 !important;border-width:0px"></div>`;
                                break;
                            case 'select_with_color':
                                settHTML += `<div class="container" style="margin-left: auto"><select style="height: 100%" id="${sett.id.replace(/"/g, '\\"')}" onchange="setClientSetting(this.id, (this.value === '0' ? document.getElementById(this.id + '_c').value : this.value)) || (document.getElementById(this.id + '_c').style.display = (this.value === '0' ? '' : 'none'))" class="inputGrey2"">`;
                                for(var option of sett.options) {
                                    settHTML += `<option value="${option.value.toString().replace(/"/g, '\\"')}" ${(config.get(sett.id) === option.value || !sett.options.find(x => x.value == option.value)) ? 'selected' : ''}>${option.name}</option>`;
                                }
                                settHTML += `</select><input type="color" id="${sett.id.replace(/"/g, '\\"')}_c" style="${sett.options.find(x => x.value == config.get(sett.id)) ? 'display: none' : ''}" onchange="document.getElementById(this.id.slice(0, -2)).value === '0' ? setClientSetting(this.id.slice(0, -2), this.value) : null" ${!sett.options.find(x => x.value == config.get(sett.id)) ? 'value=' + config.get(sett.id) : ''}></div></div>`;
                                break;
                            case 'color':
                                settHTML += `<input type="color" id="${sett.id.replace(/"/g, '\\"')}" onchange="setClientSetting(this.id, this.value)" ${config.get(sett.id) ? 'value=' + config.get(sett.id) : ''}></div>`;
                                break;
                            case 'control':
                                settHTML += `<div><span class="keyIcon" style="cursor:pointer;vertical-align:middle;margin:0 4px" onclick="clientControlInput(this)" id="${sett.id.replace(/"/g, '\\"')}">${config.get(sett.id, 'Unbound').length == 1 ? config.get(sett.id).toUpperCase() : config.get(sett.id, 'Unbound')}</span><span class="material-icons" style="font-size:40px;color:var(--red);vertical-align:middle;cursor:pointer" onclick="unbindClientControl('${sett.id.replace(/"/g, '\\"').replace(/'/g, "\\'")}')" id="${sett.id.replace(/"/g, '\\"')}">delete_forever</span><span class="material-icons" style="font-size:40px;color:var(--yellow);vertical-align:middle;cursor:pointer" onclick="resetClientControl('${sett.id.replace(/"/g, '\\"').replace(/'/g, "\\'")}')" id="${sett.id.replace(/"/g, '\\"')}">refresh</span></div></div>`;
                                break;
                            case 'custom':
                                settHTML += sett.customHTML + '</div>';
                                break;
                        }
                        cSett += settHTML;
                    }

                    cSett += `</div>`;
                }
            }
        });

        setTimeout(injectBtns);
        return oSett == "<div class='setHed'>No settings found</div>" ? (!cSett ? oSett : cSett) : oSett + cSett;
    }

    function injectBtns() {
        let buttonContainer = document.getElementsByClassName('settingsHeader')[0].getElementsByTagName('div')[0];
        if(document.getElementById('clearCache')) return;
        buttonContainer.style.inlineSize = 'calc(100% - 450px)';
        let style = document.createElement('style');
        style.innerHTML = `.settingsHeader > div:first-child * { margin: 5px }`;
        document.head.appendChild(style);
        buttonContainer.insertAdjacentHTML('afterbegin', `<div style="background:#f00" id="clearCache" class="settingsBtn" onclick="clearCache()">Clear cache</div><div class="settingsBtn" onclick="resetClientSettings()">Reset (Client)</div><div class="settingsBtn" onclick="exportClientSettings()">Export (Client)</div><div class="settingsBtn" onclick="importClientSettingsPopup()">Import (Client)</div>`);
    }

    document.addEventListener('keydown', e => {
        if(e.key == config.get('controls.settings', 'F1')) {
            document.exitPointerLock();
            showWindow(1);
            windows[0].changeTab(tabIndexes[windows[0].settingType]);
        }
    });
}