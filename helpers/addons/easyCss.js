const path = require('path');
const properties = require(path.join(__dirname, '../../properties.json'));
const config = new (require('electron-store'))();
module.exports = () => {
    // wait for "windows" to be a valid object
    if (typeof windows === 'undefined') {
        return new Promise(resolve => setTimeout(() => resolve(module.exports()), 100));
    }

    let tabIndexes = {
        basic: windows[0].tabs.basic.push({ name: 'CSS', categories: [] }) - 1,
        advanced: windows[0].tabs.advanced.push({ name: 'CSS', categories: [] }) - 1
    };

    let cssMenuStyle = document.createElement('style');
    cssMenuStyle.innerHTML = `
        .cssMenu {
            background-color: #000000CC;
            background-blend-mode: multiply;
            background-size: cover;
            background-position: center;
            height: 10vw;
            width: 10vw;
            display: flex;
            flex-direction: column;
            border: 4px solid #FFFFFF7F;
            justify-content: center;
            align-items: center;
            margin: 5px;
        }
    
        .cssMenu * {
            color: #FFF;
        }
    
        .cssMenu .cssName {
            margin-top: auto;
        }
    
        .cssMenu .buttonCont {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
        }
    
        .cssMenu button {
            width: 100%;
            color: #fff;
            cursor: pointer;
            padding: 4% 0;
            border: none;
        }
    
        .cssMenu button:hover {
            color: #000;
            background: #FFF;
        }
    
        .cssMenu .applyButton {
            background: #2196F3;
        }
    
        .cssMenu .deleteButton {
            background: #F44336;
            width: 40%;
        }
    
        .cssMenu .editButton {
            background: #4CAF50;
            width: 60%;
        }
    
        .cssMenu .customButtonHolder {
            display: flex;
            width: 100%;
        }
    
        .cssMenu .cssAuthor {
            cursor: pointer;
        }
    
        .cssMenu .cssAuthor:hover {
            text-decoration: underline;
        }
    
        .cssMenu:hover .cssAdd {
            text-decoration: underline;
        }
    
        .cssMenu span {
            text-align: center;
        }
    
        #cssPopup {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            width: 400px;
            background-color: #353535;
            border-radius: 10px;
            pointer-events: all;
            overflow: hidden;
            padding: 10px;
        }
    
        #cssPopup * {
            color: #FFF;
        }
    
        #cssPopup .cssPopTitle {
            margin-bottom: 10px;
            padding: 10px;
            background-color: #000000CC;
            width: 420px;
            margin-left: -10px;
            margin-top: -10px;
        }
    
        #cssPopup .cssNameLabel, #cssPopup #cssNameInput, #cssPopup .cssCodeLabel, #cssPopup #cssCodeInput {
            margin-bottom: 10px;
        }
    
        #cssPopup textarea {
            border-radius: 5px;
        }
    
        #cssPopup button {
            width: 100%;
            color: #fff;
            background: #2196F3;
            cursor: pointer;
            padding: 10px 0;
            border: none;
            border-radius: 5px;
        }
    `;
    document.head.insertAdjacentElement('afterbegin', cssMenuStyle);

    let cssVarEl = document.createElement('style');
    document.body.insertAdjacentElement('afterbegin', cssVarEl);

    let isColor = val => CSS.supports('color', val);
    let isURL = val => { try { new URL(val); return true } catch { return false } };
    let isPosition = val => CSS.supports('top', val);
    let isNumber = val => !isNaN(val);

    function getType(val) {
        if (isColor(val)) return 'color';
        else if (isURL(val)) return 'url';
        else if (isPosition(val)) return 'position';
        else if (isNumber(val)) return 'number';
        return 'string';
    }

    function getColor(val) {
        let temp = document.createElement('canvas');
        let ctx = temp.getContext('2d');
        ctx.fillStyle = val;
        let color = ctx.fillStyle;
        temp.remove();
        return color;
    }

    function getCustomVars() {
        let vars = {};
        Array.from(Array.from(document.styleSheets).find(x => x.ownerNode.isSameNode(cssVarEl)).cssRules).forEach(rule => {
            if (rule.selectorText === ':root') {
                Array.from(rule.style).forEach(prop => {
                    vars[prop.slice(2)] = rule.style.getPropertyValue(prop).trim();
                });
            }
        });
        return vars;
    }

    async function parseRootVars() {
        let allrules = Array.from(Array.from(document.styleSheets).find(x => x.ownerNode.isSameNode(styleElement)).cssRules);
        let rootVars = {};
        let customVars = getCustomVars();

        async function parseRules(rules) {
            await Promise.all(rules.map(async rule => {
                if (rule.selectorText === ':root') {
                    Array.from(rule.style).forEach(prop => {
                        if (customVars[prop.slice(2)]) rootVars[prop.slice(2)] = customVars[prop.slice(2)];
                        else rootVars[prop.slice(2)] = rule.style.getPropertyValue(prop).trim();
                    });
                } else if (rule instanceof CSSImportRule) {
                    async function waitForRules() {
                        if (!rule.styleSheet || !rule.styleSheet.cssRules) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            await waitForRules();
                        } else parseRules(Array.from(rule.styleSheet.cssRules));
                    }
                    await waitForRules();
                }
            }));
        }
        await parseRules(allrules);

        let html = '';
        for (let prop in rootVars) {
            let val = rootVars[prop];
            let type = getType(val);
            html += '<div class="settName">' + prop + '<button class="settingsBtn" onclick="resetCSSVar(Array.from(this.parentElement.childNodes).find(x => x.nodeType === 3).textContent)" style="float:right;border:none">Reset</button>';
            switch (type) {
                case 'color':
                    html += '<input type="color" style="float:right;margin-top:-4px" value="' + getColor(val) + '" onchange="setCSSVar(Array.from(this.parentElement.childNodes).find(x => x.nodeType === 3).textContent, this.value)">';
                    break;
                case 'url':
                case 'position':
                case 'string':
                    html += '<input type="text" class="inputGrey2" value="' + val + '" onchange="setCSSVar(Array.from(this.parentElement.childNodes).find(x => x.nodeType === 3).textContent, this.value)">';
                    break;
                case 'number':
                    html += '<input type="number" class="inputGrey2" value="' + val + '" onchange="setCSSVar(Array.from(this.parentElement.childNodes).find(x => x.nodeType === 3).textContent, this.value)">';
                    break;
            }
            html += '</div>';
        }

        document.getElementById('setBod_rootvars').innerHTML = html || '<div class="settName">Nothing found</div>';
    }

    function updateCustomVars(vars) {
        let css = '';
        for (let prop in vars) {
            css += `--${prop}: ${vars[prop]} !important; `;
        }
        cssVarEl.textContent = ':root {' + css + '}';
    }

    window.setCSSVar = (prop, val) => {
        let cssVars = config.get('cssVars', {});
        cssVars[prop] = val;
        config.set('cssVars', cssVars);
        updateCustomVars(cssVars);
        parseRootVars();
    };

    window.resetCSSVar = prop => {
        let cssVars = config.get('cssVars', {});
        delete cssVars[prop];
        config.set('cssVars', cssVars);
        updateCustomVars(cssVars);
        parseRootVars();
    };

    let oGetSett = windows[0].getSettings;
    windows[0].getSettings = function () {
        let oSett = oGetSett.call(this);
        let isCSSTab = this.tabIndex === tabIndexes[this.settingType];

        if (isCSSTab) {
            let html = '<div style="width: 100%; display: flex; justify-content: center; align-items: center; flex-wrap: wrap"><div class="cssMenu"><span class="cssName">None</span><div class="buttonCont"><button class="applyButton" onclick="setCSS(-1)">Apply</button></div></div>' +
                properties.css.map((css, i) => `<div class="cssMenu" style="background-image: url(${css.imageURL?.replace(/"/g, '\\"')})"><span class="cssName">${css.name}</span><span>by <strong class="cssAuthor" onclick="window.open('${css.authorURL.replace(/'/g, "\\'" || '')}', '_blank')">${css.author}</strong></span><div class="buttonCont"><button class="applyButton" onclick="setCSS(0, ${i})">Apply</button></div></div>`).join('') +
                config.get('cssPresets', []).map((css, i) => `<div class="cssMenu"><span class="cssName">${css.name}</span><div class="buttonCont"><div class="customButtonHolder"><button onclick="editCustomCSS(${i})" class="editButton">Edit</button><button onclick="removeCustomCSS(${i})" class="deleteButton">Delete</button></div><button class="applyButton" onclick="setCSS(1, ${i})">Apply</button></div></div>`).join('') +
                '<div class="cssMenu" onclick="addCustomCSS()" style="cursor: pointer"><span style="font: 5vw \'Material Icons\';">add</span><span class="cssAdd">Add custom</span></div></div><div class="setHed" id="setHed_rootvars" onclick="window.windows[0].collapseFolder(this)"><span class="material-icons plusOrMinus">keyboard_arrow_down</span> :root Variables (Advanced)</div><div class="setBodH" id="setBod_rootvars"></div>';
            parseRootVars();
            return html;
        } else return oSett;
    };

    let styleElement = document.createElement('style');
    document.body.insertAdjacentElement('afterbegin', styleElement);

    function saveCSS() {
        let i = parseInt(document.getElementById('cssSave').dataset.index) !== NaN ? parseInt(document.getElementById('cssSave').dataset.index) : config.get('cssPresets', []).length;
        let cssName = document.getElementById('cssNameInput').value;
        let cssCode = document.getElementById('cssCodeInput').value;
        if (!cssName) return;
        let css = config.get('cssPresets', []);
        css[i] = { name: cssName, css: cssCode };

        config.set('cssPresets', css);
        window.clearPops();
        if(window.windows[0].tabIndex == tabIndexes[window.windows[0].settingType]) window.windows[0].changeTab(tabIndexes[window.windows[0].settingType]);
    }

    function openPopup(title) {
        if (!document.getElementById('cssPopup')) {
            document.getElementById('popupHolder').insertAdjacentHTML('beforeend', '<div id="cssPopup"><div class="cssPopTitle"></div><div class="cssNameLabel">CSS Name</div><textarea id="cssNameInput" rows="1" style="resize: none; color: #000"></textarea><div class="cssCodeLabel">CSS Code</div><textarea id="cssCodeInput" rows="20" style="resize: none; color: #000"></textarea><button id="cssSave">Save</button></div>');
        }

        document.getElementById('cssNameInput').value = '';
        document.getElementById('cssCodeInput').value = '';
        document.getElementById('cssPopup').style.display = 'flex';
        document.getElementById('popupHolder').style.display = 'block';
        document.getElementById('cssPopup').getElementsByClassName('cssPopTitle')[0].innerText = title;
    }

    let clearPops = window.clearPops;
    window.clearPops = function () {
        clearPops.call(this);
        if (document.getElementById('cssPopup')) {
            document.getElementById('cssPopup').style.display = 'none';
            document.getElementById('cssSave').removeEventListener('click', saveCSS);
        }
    };

    window.setCSS = function (type, i) {
        config.set('easyCSS', {
            type: type,
            index: i
        });

        if (type === -1) {
            styleElement.innerHTML = '';
            if(window.windows[0].tabIndex == tabIndexes[window.windows[0].settingType]) window.windows[0].changeTab(tabIndexes[window.windows[0].settingType]);
            return styleElement.disabled = true;
        } else if (type === 0) { // Use preset CSS
            styleElement.innerHTML = properties.css[i].css;
        } else if (type === 1) { // Use custom CSS
            styleElement.innerHTML = config.get('cssPresets', [])[i].css;
        }
        styleElement.disabled = false;
        if(window.windows[0].tabIndex == tabIndexes[window.windows[0].settingType]) window.windows[0].changeTab(tabIndexes[window.windows[0].settingType]);
    }

    window.addCustomCSS = function () {
        openPopup('Add Custom CSS');
        document.getElementById('cssSave').addEventListener('click', saveCSS);
        document.getElementById('cssSave').dataset.index = config.get('cssPresets', []).length;
    }

    window.removeCustomCSS = function (i) {
        if(!confirm('Are you sure you want to delete this CSS?')) return;
        let css = config.get('cssPresets', []);
        css.splice(i, 1);
        config.set('cssPresets', css);
        if(window.windows[0].tabIndex == tabIndexes[window.windows[0].settingType]) window.windows[0].changeTab(tabIndexes[window.windows[0].settingType]);
        if (config.get('easyCSS.type', -1) === 1 && config.get('easyCSS.index', 0) === i) window.setCSS(-1);
    }

    window.editCustomCSS = function (i) {
        openPopup('Edit Custom CSS');
        document.getElementById('cssNameInput').value = config.get('cssPresets', [])[i]?.name || '';
        document.getElementById('cssCodeInput').value = config.get('cssPresets', [])[i]?.css || '';
        document.getElementById('cssSave').dataset.index = i;

        document.getElementById('cssSave').addEventListener('click', saveCSS);
    }

    window.setCSS(config.get('easyCSS.type', -1), config.get('easyCSS.index', 0));
    updateCustomVars(config.get('cssVars', {}));
}