const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const config = new Store();
let getCategoryConfig = () => config.get('chatCategories', {});

module.exports = () => {
    let chatList = document.getElementById('chatList');
    let customChatList = document.createElement('div');
    customChatList.id = 'chatList_custom';
    let categoryList = document.createElement('div');
    categoryList.id = 'chatCategorySelector';
    categoryList.innerHTML = fs.readFileSync(path.join(__dirname, '../../html/chat_categories.html')).toString();

    let categoryConfig = getCategoryConfig();

    function hideShow(node, cat) {
        if(categoryConfig[cat] && (cat !== 'messages' || !config.get('msgFilter', []).some(word => new RegExp(word, 'g').test(node.querySelector('.chatMsg').textContent.toLowerCase())))) node.style.display = '';
        else node.style.display = 'none';
    }

    // Update visible contents
    function updateVisibleContents() {
        categoryConfig = getCategoryConfig();
        customChatList.childNodes.forEach(node => {
            let msgNode = node.firstChild;
            if(node.classList.contains('twitchMsg')) {
                hideShow(node, 'twitch');
            } else {
                if(msgNode.childNodes.length > 1) 
                    hideShow(node, 'messages');
                else {
                    if(msgNode.firstChild.childNodes.length > 1) {
                        for(var n of msgNode.firstChild.childNodes) {
                            if(n.textContent == ' unboxed ') {
                                hideShow(node, 'unboxings');
                                return;
                            }
                        }
                        hideShow(node, 'kills');
                    } else hideShow(node, 'other');
                }
            }
        });
    }

    new MutationObserver(_ => {
        customChatList.style.maxHeight = chatList.style.maxHeight;
        customChatList.style.display = chatList.style.display;
        
        _.forEach(m => [...m.addedNodes].forEach(n => {
            customChatList.appendChild(n);
            let msgNode = n.firstChild;
            if(msgNode.childNodes.length > 1) hideShow(n, 'messages');
            else {
                if(msgNode.firstChild.childNodes.length > 1) {
                    for(var n1 of msgNode.firstChild.childNodes) {
                        if(n1.textContent == ' unboxed ') {
                            hideShow(n, 'unboxings');
                            return;
                        }
                    }
                    hideShow(n, 'kills');
                } else hideShow(n, 'other');
            }
        }));

        customChatList.scrollTop = customChatList.scrollHeight;

        if(customChatList.childNodes.length > 50) {
            for(var i = 0; i < customChatList.childNodes.length - 50; i++) {
                customChatList.removeChild(customChatList.childNodes[i]);
            }
        }
    }).observe(chatList, { childList: true });

    document.getElementById('chatHolder').insertBefore(categoryList, chatList);
    document.getElementById('chatHolder').insertBefore(customChatList, chatList);

    // Init categories
    let categories = {
        messages: document.getElementById('chatCat_messages'),
        unboxings: document.getElementById('chatCat_unboxings'),
        kills: document.getElementById('chatCat_kills'),
        twitch: document.getElementById('chatCat_twitch'),
        other: document.getElementById('chatCat_other')
    };

    function addListener(category) {
        categories[category].onclick = function() {
            playSelect();
            this.classList.toggle('selected');
            config.set('chatCategories.' + category, this.classList.contains('selected'));

            updateVisibleContents();
        }
    }

    // Add selected class and listeners
    for(var cat in categories) {
        if(categoryConfig[cat]) categories[cat].classList.add('selected');
        else categories[cat].classList.remove('selected');

        addListener(cat);
    }

    window.editMsgFilter = function() {
        let menuWindow = document.getElementById('menuWindow');
    
        menuWindow.innerHTML = '<div id="referralHeader">Chat Message Filters</div><div class="setBodH" id="msgFilters"></div><div id="addFilter" class="button buttonP" style="width:calc(100% - 55px);padding:12px 16px;position:relative;left:50%;transform:translateX(-50%)" onmouseenter="playTick()">Add New</div>';
    
        let filtersEl = document.getElementById('msgFilters');
        let msgFilters = config.get('msgFilter', []);
        for(let i in msgFilters) {
            let filter = msgFilters[i];
            let filterEl = document.createElement('div');
            filterEl.classList = 'settName';
            
            let filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.value = filter;
            filterInput.style.width = '50%';
            filterInput.style.margin = '0';
            filterInput.style.float = 'none';
            filterInput.classList = 'inputGrey2';
            filterEl.appendChild(filterInput);
    
            let saveButton = document.createElement('div');
            saveButton.className = 'settingsBtn';
            saveButton.innerHTML = 'Save';
            saveButton.addEventListener('click', () => {
                msgFilters[i] = filterInput.value;
                config.set('msgFilter', msgFilters);
                window.editMsgFilter();
                updateVisibleContents();
            });
    
            let deleteButton = document.createElement('div');
            deleteButton.className = 'settingsBtn';
            deleteButton.innerHTML = 'Delete';
            deleteButton.style.backgroundColor = '#f00';
            deleteButton.addEventListener('click', () => {
                msgFilters.splice(msgFilters.indexOf(filter), 1);
                config.set('msgFilter', msgFilters);
                window.editMsgFilter();
                updateVisibleContents();
            });
    
            filterEl.appendChild(deleteButton);
            filterEl.appendChild(saveButton);
    
            filtersEl.appendChild(filterEl);
        }
        
        if(msgFilters.length == 0) filtersEl.innerHTML = '<div class="settName">You have no filters</div>';
        document.getElementById('addFilter').addEventListener('click', () => {
            msgFilters.push('');
            config.set('msgFilter', msgFilters);
            window.editMsgFilter();
        });
    
        let windowHolder = document.getElementById('windowHolder');
        windowHolder.style.display = 'block';
        windowHolder.classList = 'popupWin';
        menuWindow.style.width = '1000px';
        menuWindow.style.overflowY = 'auto';
        menuWindow.classList = 'dark';
    }
};