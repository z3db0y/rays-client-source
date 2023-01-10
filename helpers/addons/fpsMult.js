const path = require('path');
const Store = require('electron-store');
const config = new Store();

let ingameFPS = document.getElementById('ingameFPS');
let menuFPS = document.getElementById('menuFPS');

// let o = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
// Object.defineProperty(Node.prototype, 'textContent', {
//     set: function (value) {
//         if(ingameFPS && ingameFPS.isSameNode(this)) {
//             if(config.get('fpsMult', 1) != 1) {
//                 value = parseInt(value) * config.get('fpsMult', 1);
//             }
//         } else if(menuFPS && menuFPS.isSameNode(this)) {
//             if(config.get('fpsMult', 1) != 1) {
//                 value = parseInt(value) * config.get('fpsMult', 1);
//             }
//         }
//         o.set.call(this, value);
//     }
// });