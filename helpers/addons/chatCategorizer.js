const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const config = new Store();
let getCategoryConfig = () => config.get('chatCategories', {});

let chatList = document.getElementById('chatList');
let customChatList = document.createElement('div');
customChatList.id = 'chatList_custom';
let categoryList = document.createElement('div');
categoryList.id = 'chatCategorySelector';
categoryList.innerHTML = fs.readFileSync(path.join(__dirname, '../../html/chat_categories.html')).toString();

let categoryConfig = getCategoryConfig();

function hideShow(node, cat) {
    if(categoryConfig[cat]) node.style.display = '';
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

require(path.join(__dirname, '../eventUtil.js')).on('chatMsg', () => {
    customChatList.style.maxHeight = chatList.style.maxHeight;
    customChatList.style.display = chatList.style.display;
    
    chatList.childNodes.forEach(node => {
        if(!Array.from(customChatList.childNodes).includes(node)) {
            customChatList.appendChild(node);
        }
    });

    customChatList.scrollTop = customChatList.scrollHeight;

    if(customChatList.childNodes.length > 50) {
        for(var i = 0; i < customChatList.childNodes.length - 50; i++) {
            customChatList.removeChild(customChatList.childNodes[i]);
        }
    }

    updateVisibleContents();
});

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