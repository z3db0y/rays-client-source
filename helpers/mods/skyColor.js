const Store = require('electron-store');
const config = new Store();

module.exports = props => {
    let RENDER = props.renderer;
    let ue = RENDER.updateEnvironment;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let img = new Image();
    let vid = document.createElement('video');
    let isImage = false;
    function updateSky(image) {
        log('Updating sky');
        if(!image) return;
        img.src = image;
        img.onload = () => {
            isImage = true;
            canvas.width = img.width;
            canvas.height = img.height;
            img.onload = null;
        };
        img.onerror = () => {
            isImage = false;
            vid.src = image;
            img.src = "";
            vid.onloadeddata = () => {
                canvas.width = vid.videoWidth;
                canvas.height = vid.videoHeight;
                vid.loop = true;
                vid.play();
            };
            img.onerror = null;
        };
    }
    let originalMaterial = null;
    RENDER.updateEnvironment = function() {
        if((!img.src && !vid.src) || !RENDER.skyDome) return ue.apply(this, arguments);
        let _r1 = ue.apply(RENDER, arguments);
        if(RENDER.skyDome && !RENDER.skyDome.baseMesh.material.map) {
            originalMaterial = RENDER.skyDome.baseMesh.material;
            RENDER.skyDome.baseMesh.material = new RENDER.THREE.MeshBasicMaterial({ map: new RENDER.THREE.CanvasTexture(canvas), side: 1 });
        }

        if(RENDER.skyDome && !config.get('skyImage', '') && RENDER.skyDome.baseMesh.material.map && originalMaterial) {
            RENDER.skyDome.baseMesh.material = originalMaterial;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if(isImage) {
            try { ctx.drawImage(img, 0, 0); }
            catch(e) { isImage = false; }
        } else {
            try { ctx.drawImage(vid, 0, 0); }
            catch(e) { isImage = true; }
        }

        if(RENDER.skyDome && RENDER.skyDome.baseMesh.material.map) RENDER.skyDome.baseMesh.material.map.needsUpdate = true;
        return _r1;
    };
    updateSky(config.get('skyImage', ''));
    window.updateSkyImage = () => updateSky(config.get('skyImage', ''));
};