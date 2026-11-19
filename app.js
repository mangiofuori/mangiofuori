(function () {
  var C = window.MF, app = document.getElementById('app');
  var venues = [], map = null, layer = null, markers = {};
  var F = { cuisine: '', pmin: null, pmax: null };
  var B = { lo: 0, hi: 100 }, shown = 0, CH = 24;
  var order = [];

  document.getElementById('ig').href = C.INSTAGRAM;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function eur(n) { return n + ' €'; }
  var NUM = { 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei' };
  function spent(v) { var p = +v.people || 1; return eur(v.price) + (p === 1 ? ' da solo' : ' in ' + (NUM[p] || p + ' persone')); }
  function bounds() { var a = venues.map(function (v) { return v.price; }); if (!a.length) { B.lo = 0; B.hi = 100; return; } B.lo = Math.max(0, Math.floor(Math.min.apply(null, a) / 5) * 5); B.hi = Math.ceil(Math.max.apply(null, a) / 5) * 5; if (B.hi <= B.lo) B.hi = B.lo + 5; }
  function pLo() { return F.pmin == null ? B.lo : F.pmin; }
  function pHi() { return F.pmax == null ? B.hi : F.pmax; }
  function stars(r) { var h = '<div class="stars" aria-label="Voto ' + r + ' su 10">'; for (var i = 0; i < 10; i++) h += '<i class="' + (i < r ? 'on' : '') + '"></i>'; return h + '<b>' + r + '/10</b></div>'; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function byId(id) { return venues.filter(function (v) { return v.id === id; })[0]; }
  function filtered() {
    return venues.filter(function (v) {
      if (F.cuisine && v.cuisine !== F.cuisine) return false;
      if (v.price < pLo() || v.price > pHi()) return false;
      return true;
    });
  }

  // ---- dati: prima Supabase, se non risponde il file locale ----
  function load() {
    var ctl = new AbortController(); var t = setTimeout(function () { ctl.abort(); }, 5000);
    return fetch(C.SUPABASE_URL + '/rest/v1/venues?select=*&order=created_at.desc', { headers: { apikey: C.SUPABASE_KEY, Authorization: 'Bearer ' + C.SUPABASE_KEY }, signal: ctl.signal })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('db'); return r.json(); })
      .catch(function () { return fetch('venues.json').then(function (r) { return r.json(); }); });
  }

  // ---- anteprima sulla mappa ----
  function popup(v) {
    return '<div class="pp"><div class="ph"><img src="' + esc(v.photos[0]) + '" alt=""></div><div class="bd"><div class="t">' + esc(v.name) + '</div><div class="s">' + esc(v.cuisine) + ' · ' + spent(v) + '</div>' + stars(v.rating) + '<a class="btn" href="#/locale/' + esc(v.id) + '">Apri la scheda completa</a></div></div>';
  }
  function drawMap(elId, start) {
    if (map) { map.remove(); map = null; }
    map = L.map(elId, { worldCopyJump: true, minZoom: 2, scrollWheelZoom: true }).setView([45.4642, 9.19], start || 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    layer = L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 45,
      iconCreateFunction: function (c) { return L.divIcon({ html: '<div class="cl">' + c.getChildCount() + '</div>', className: '', iconSize: [42, 42] }); }
    });
    map.addLayer(layer);
    refreshPins();
  }
  function refreshPins() {
    if (!layer) return;
    layer.clearLayers();
    filtered().forEach(function (v) {
      var m = L.marker([v.lat, v.lon], { icon: L.divIcon({ html: '<div class="pin"></div>', className: '', iconSize: [30, 30], iconAnchor: [8, 30], popupAnchor: [7, -30] }), title: v.name });
      m.bindPopup(popup(v), { closeButton: true, autoPanPadding: [20, 60] });
      m.on('mouseover', function () { if (window.matchMedia('(hover:hover)').matches) m.openPopup(); });
      layer.addLayer(m);
    });
    var c = document.getElementById('count'); if (c) { var n = filtered().length; c.textContent = 'Mostra ' + n + (n === 1 ? ' locale' : ' locali'); }
  }

  function filterBar() {
    var cu = []; venues.forEach(function (v) { if (cu.indexOf(v.cuisine) < 0) cu.push(v.cuisine); }); cu.sort();
    var o = '<option value="">Tutte le cucine</option>' + cu.map(function (c) { return '<option value="' + esc(c) + '"' + (F.cuisine === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    return '<div class="filters"><div class="f"><label for="fc">Tipo di cucina</label><select id="fc">' + o + '</select></div>' +
      '<div class="f f2"><label>Prezzo speso: <span id="rl"></span></label><div class="range"><div class="rt"></div><div class="rf" id="rf"></div>' +
      '<input type="range" id="ra" min="' + B.lo + '" max="' + B.hi + '" step="1" value="' + pLo() + '" aria-label="Prezzo minimo"><input type="range" id="rb" min="' + B.lo + '" max="' + B.hi + '" step="1" value="' + pHi() + '" aria-label="Prezzo massimo"></div></div>' +
      '<button class="link" id="reset" type="button">Azzera filtri</button><a class="btn" id="count" href="#mappa-box">Mostra ' + filtered().length + ' locali</a></div>';
  }
  function paintRange() {
    var a = document.getElementById('ra'), b = document.getElementById('rb'); if (!a) return;
    var span = B.hi - B.lo, l = (+a.value - B.lo) / span * 100, r = (+b.value - B.lo) / span * 100;
    var f = document.getElementById('rf'); f.style.left = l + '%'; f.style.width = (r - l) + '%';
    document.getElementById('rl').textContent = 'da ' + a.value + ' € a ' + b.value + ' €';
  }
  function bindFilters() {
    var a = document.getElementById('ra'), b = document.getElementById('rb');
    function on() {
      if (+a.value > +b.value) { if (this === a) a.value = b.value; else b.value = a.value; }
      F.cuisine = document.getElementById('fc').value;
      F.pmin = +a.value <= B.lo ? null : +a.value; F.pmax = +b.value >= B.hi ? null : +b.value;
      paintRange(); refreshPins(); if (document.getElementById('cards')) list();
    }
    document.getElementById('fc').addEventListener('change', on);
    a.addEventListener('input', on); b.addEventListener('input', on);
    document.getElementById('reset').addEventListener('click', function () { F = { cuisine: '', pmin: null, pmax: null }; render(); });
    paintRange();
  }
  function card(v) {
    var tx = v.text.length > 110 ? v.text.slice(0, 108) + '…' : v.text;
    return '<a class="card" href="#/locale/' + esc(v.id) + '" style="text-decoration:none"><div class="ph"><img loading="lazy" src="' + esc(v.photos[0]) + '" alt="' + esc(v.name) + '"></div><div class="bd"><div class="t">' + esc(v.name) + '</div><div class="s">' + esc(v.cuisine) + ' · ' + spent(v) + '</div>' + stars(v.rating) + '<div class="tx">' + esc(tx) + '</div></div></a>';
  }
  function list() {
    var ids = filtered().map(function (v) { return v.id; });
    var items = order.filter(function (id) { return ids.indexOf(id) >= 0; });
    var box = document.getElementById('cards'); box.innerHTML = ''; box.scrollTop = 0; shown = 0;
    var info = document.getElementById('lcount'); if (info) info.textContent = items.length + (items.length === 1 ? ' recensione' : ' recensioni');
    if (!items.length) { box.innerHTML = '<p style="padding:10px">' + (venues.length ? 'Nessun locale con questi filtri.' : 'Le prime recensioni arrivano presto.') + '</p>'; return; }
    function more() { var html = items.slice(shown, shown + CH).map(function (id) { return card(byId(id)); }).join(''); shown += CH; box.insertAdjacentHTML('beforeend', '<div class="cards">' + html + '</div>'); }
    more();
    box.onscroll = function () { if (shown < items.length && box.scrollTop + box.clientHeight >= box.scrollHeight - 300) more(); };
  }

  // ---- pagine ----
  function home() {
    app.innerHTML = '<section class="wood hero"><div class="hero-in"><h1>Dove si mangia bene.</h1><p>Recensisco tutti i posti dove si beve e si mangia bene. Premi in alto a destra su «Contatta l\'admin» per scrivermi via mail posti da provare, o se volete invitarmi a mangiare.</p></div></section>' +
      '<div class="wrap">' + filterBar() + '</div><div class="wrap" id="mappa-box" style="padding-top:0"><div class="mapbox"><div id="map"></div></div><p class="note">Muovi e ingrandisci la mappa: tocca uno spillo per l\'anteprima.</p>' +
      '<h2>Recensioni da leggere</h2><div class="lhead"><span id="lcount" class="note" style="margin:0"></span><button class="btn" id="reroll" type="button" style="min-height:44px">Mischia</button></div><div class="scroller" id="cards"></div></div>';
    bindFilters(); drawMap('map', 12); list();
    document.getElementById('reroll').addEventListener('click', function () { order = shuffle(order); list(); });
  }
  function mappa() {
    app.innerHTML = '<div class="wrap mapfull">' + filterBar() + '<div class="mapbox" style="margin-top:18px"><div id="map"></div></div></div>';
    bindFilters(); drawMap('map', 12);
  }
  function locale(id) {
    var v = byId(id); if (!v) { location.hash = '#/'; return; }
    var i = 0, ph = v.photos;
    app.innerHTML = '<div class="wrap"><button class="back" type="button" id="b">← Torna alla mappa</button><div class="venue"><div><div class="gal"><img id="gi" src="' + esc(ph[0]) + '" alt="Foto da ' + esc(v.name) + '">' +
      (ph.length > 1 ? '<button id="gp" style="left:10px" aria-label="Foto precedente">‹</button><button id="gn" style="right:10px" aria-label="Foto successiva">›</button>' : '') + '</div></div>' +
      '<div><h1>' + esc(v.name) + '</h1>' + stars(v.rating) + '<div class="chips"><span class="chip">' + esc(v.cuisine) + '</span><span class="chip">' + spent(v) + '</span></div>' +
      '<div class="panel"><p style="margin:0">' + esc(v.text) + '</p></div><div class="panel"><b style="font-family:Inter,sans-serif">Indirizzo</b><br>' + esc(v.address) + '<br><a href="https://www.openstreetmap.org/?mlat=' + v.lat + '&mlon=' + v.lon + '#map=17/' + v.lat + '/' + v.lon + '" target="_blank" rel="noopener">Apri su OpenStreetMap</a></div></div></div></div>';
    document.getElementById('b').addEventListener('click', function () { location.hash = '#/'; });
    if (ph.length > 1) { var g = document.getElementById('gi'); document.getElementById('gp').onclick = function () { i = (i + ph.length - 1) % ph.length; g.src = ph[i]; }; document.getElementById('gn').onclick = function () { i = (i + 1) % ph.length; g.src = ph[i]; }; }
  }
  function contatti() {
    var m = C.CONTACT_EMAIL ? '<a href="mailto:' + esc(C.CONTACT_EMAIL) + '" style="color:var(--cream)">' + esc(C.CONTACT_EMAIL) + '</a>' : '<span>email in arrivo</span>';
    app.innerHTML = '<div class="wrap" style="max-width:760px"><h2 style="margin-top:10px">Contatta l\'admin</h2><div class="panel"><b style="font-family:Alfa Slab One,serif;font-size:22px;color:var(--green)">Consigliami un posto</b><p>Scrivimi il nome e l\'indirizzo del locale che secondo te devo provare.</p></div><div class="panel"><b style="font-family:Alfa Slab One,serif;font-size:22px;color:var(--green)">Invitami nel tuo locale</b><p>Presenta il locale e proponi una data: valuto ogni invito.</p></div><div class="mail"><span style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E0BD6A">Scrivi a</span>' + m + '</div></div>';
  }

  function render() {
    var h = location.hash || '#/'; var m = h.match(/^#\/locale\/(.+)$/);
    document.getElementById('nav-mappa').className = h === '#/mappa' ? 'on' : '';
    document.getElementById('nav-contatti').className = h === '#/contatti' ? 'on' : '';
    if (map) { map.remove(); map = null; layer = null; }
    if (m) locale(decodeURIComponent(m[1])); else if (h === '#/mappa') mappa(); else if (h === '#/contatti') contatti(); else home();
    if (!m) window.scrollTo(0, 0); else window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  load().then(function (d) {
    venues = d.map(function (v) { v.photos = (v.photos && v.photos.length ? v.photos : ['placeholder.jpg']).map(function (p) { return /^https?:/.test(p) ? p : p.split('/').pop(); }); return v; });
    order = shuffle(venues.map(function (v) { return v.id; })); bounds();
    render();
  });
})();
