module.exports = () => {
    if(!document.getElementById('streamItems')) return setTimeout(() => module.exports(), 1000);
    let featuredStreamers = [];
    let ccBadge = 'https://cdn.z3db0y.com/rays-badges/cc.png';

    function getStreams() {
        fetch('https://api.z3db0y.com/rays/streams').then(res => res.json()).then(data => {
            if(!data || !data.streams) return;
            featuredStreamers = data.streams.sort((a, b) => b.viewers - a.viewers);
        });
    }
    getStreams();
    setInterval(getStreams, 1000 * 60);

    let container = document.getElementById('streamItems');

    let observer = new MutationObserver(updateStreams);
    observer.observe(container, { childList: true, subtree: true });
        
    function updateStreams() {
        observer.disconnect();
        let streamerEls = [...container.children].filter(el => el.id);
        let filteredFeatured = featuredStreamers.filter(x => !streamerEls.some(y => y.children[1].children[0].innerText == x.username));
        streamerEls.forEach((el, i) => {
            if(filteredFeatured[i]) {
                if(el.children[1].children[0].classList.contains('raysBadge')) el.children[1].children[0].remove();
                el.setAttribute('onclick', `onTwitchClick('${filteredFeatured[i].username}')`);
                el.children[0].src = filteredFeatured[i].pfp;
                el.children[1].children[0].innerText = filteredFeatured[i].username;
                el.children[1].children[0].style.display = '';
                el.children[1].children[1].style.display = filteredFeatured[i].t == 2 ? 'inline-block' : 'none';
                el.children[1].children[2].innerText = el.children[1].children[2].innerText.replace(/\d+/, filteredFeatured[i].viewers);

                let badge = document.createElement('img');
                badge.classList.add('raysBadge');
                badge.src = ccBadge;
                badge.style.height = '1em';
                badge.style.verticalAlign = 'middle';
                el.children[1].insertAdjacentElement('afterbegin', badge);
            }
        });

        observer.observe(container, { childList: true, subtree: true });
    }
};