const path = require('path');
const Store = require('electron-store');
const config = new Store();

module.exports = function () {
    // wait for "windows" to be a valid object
    if (typeof windows === 'undefined') {
        setTimeout(module.exports, 100);
        return;
    }

    let settings = require(path.join(__dirname, '../../settings.json'));
    settings.sort((a, b) => a.category.localeCompare(b.category));
    let tabIndexes = {
        basic: windows[0].tabs.basic.push({ name: 'Client', categories: [] }) - 1,
        advanced: windows[0].tabs.advanced.push({ name: 'Client', categories: [] }) - 1
    };

    let oGetSett = windows[0].getSettings;
    windows[0].getSettings = function () {
        let oSett = oGetSett.call(this);
        let categories = [];
        let isClientTab = this.settingType === 'basic' && this.tabIndex === tabIndexes.basic || this.settingType === 'advanced' && this.tabIndex === tabIndexes.advanced;
        let cSett = '';

        for(var sett of settings) {
            if(!categories.includes(sett.category)) categories.push(sett.category);
        }

        for(var category of categories) {
            let catSearch = (this.settingSearch && category.toLowerCase().indexOf(this.settingSearch.toLowerCase()) !== -1);
            let settSearch = settings.filter(x => x.category === category).filter(x => (catSearch || isClientTab) ? true : (this.settingSearch && x.name.toLowerCase().indexOf(this.settingSearch.toLowerCase()) !== -1));
            if(settSearch.length > 0) {
                cSett += `<div class="setHed" id="setHed_${category.toLowerCase().replace(/"/g, '\\"')}" onclick="windows[0].collapseFolder(this)"><span class="material-icons plusOrMinus">keyboard_arrow_down</span>${category}</div>`;
                cSett += `<div class="setBodH" id="setBod_${category.toLowerCase().replace(/"/g, '\\"')}">`;

                for(var sett of settSearch) {
                    let settHTML = `<div class="settName clientSett" style="display: flex"><span style="color: #fff; display: inline-block">${sett.name}`;
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
                            settHTML += `<div onclick="${sett.onclick.replace(/"/g, '\\"')}" style="width: auto" class="settingsBtn">${sett.label}</div></div>`;
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
                        case 'custom':
                            settHTML += sett.customHTML + '</div>';
                            break;
                    }
                    cSett += settHTML;
                }

                cSett += `</div>`;
            }
        }

        return oSett == "<div class='setHed'>No settings found</div>" ? (!cSett ? oSett : cSett) : oSett + cSett;
    }

    require(path.join(__dirname, 'easyCss.js'));
}