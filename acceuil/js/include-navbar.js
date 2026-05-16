(function () {
    const isInPages = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    const fetchPath = isInPages ? '../navbar.html' : 'navbar.html';

    function isExternalLink(h) {
        if (!h) return false;
        const s = h.toLowerCase();
        return s.startsWith('http') || s.startsWith('mailto:') || s.startsWith('javascript:') || s.startsWith('#') || s.startsWith('data:');
    }

    fetch(fetchPath)
        .then(res => {
            if (!res.ok) throw new Error('Failed to load navbar');
            return res.text();
        })
        .then(html => {
            const holder = document.getElementById('navbar-placeholder');
            if (!holder) return;
            holder.innerHTML = html;

            // Rewrite anchors
            holder.querySelectorAll('a').forEach(a => {
                try {
                    const raw = a.getAttribute('href');
                    if (!raw) return;
                    if (isExternalLink(raw)) return;

                    const normalized = raw.replace(/^\/+/, '');

                    if (normalized.indexOf('pages/') === 0) {
                        // links like 'pages/gym.html' or '/pages/gym.html'
                        const filename = normalized.split('/').pop();
                        a.setAttribute('href', isInPages ? filename : ('pages/' + filename));
                        return;
                    }

                    if (normalized === 'index.html' || normalized.indexOf('index.html') === 0) {
                        // keep hash if present
                        const hash = normalized.includes('#') ? '#' + normalized.split('#').slice(1).join('#') : '';
                        a.setAttribute('href', isInPages ? ('../index.html' + hash) : ('index.html' + hash));
                        return;
                    }

                    // For other relative paths (assets or same-folder pages)
                    // Ensure image/page asset paths point to correct location
                    // Leave untouched if they contain a slash (assumed correct)
                } catch (e) {
                    console.error('Error rewriting anchor', e);
                }
            });

            // Rewrite image/src paths inside navbar
            holder.querySelectorAll('img').forEach(img => {
                try {
                    const raw = img.getAttribute('src');
                    if (!raw) return;
                    if (raw.toLowerCase().startsWith('http') || raw.toLowerCase().startsWith('data:')) return;
                    const normalized = raw.replace(/^\/+/, '');
                    img.setAttribute('src', isInPages ? ('../' + normalized) : normalized);
                } catch (e) {
                    console.error('Error rewriting img src', e);
                }
            });
        })
        .catch(err => console.error('Error loading navbar:', err));
})();

(function(){
  function adjustBodyPadding(){
    const nav = document.querySelector('#navbar-placeholder .navbar.fixed-top') || document.querySelector('#navbar-placeholder .navbar');
    if(!nav) return;
    const h = Math.ceil(nav.getBoundingClientRect().height);
    if(document.body.style.paddingTop !== (h + 'px')){
      document.body.style.paddingTop = h + 'px';
    }
  }
  const debounce = (fn,ms=100)=>{ let t; return ()=>{ clearTimeout(t); t = setTimeout(fn, ms); }; };
  adjustBodyPadding();
  window.addEventListener('resize', debounce(adjustBodyPadding,100));
  const holder = document.getElementById('navbar-placeholder');
  if(holder){
    const mo = new MutationObserver(debounce(adjustBodyPadding,80));
    mo.observe(holder, { childList:true, subtree:true, attributes:true });
  }
})();