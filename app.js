(function () {
  var C = window.MF, app = document.getElementById('app');
  var venues = [], map = null, layer = null, markers = {};
  var F = { cuisine: '', pmin: '', pmax: '' };
  var order = [];

  document.getElementById('ig').href = C.INSTAGRAM;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function eur(n) { return n + ' €'; }
  function stars(r) { var h = '<div class="stars" aria-label="Voto ' + r + ' su 10">'; for (var i = 0; i < 10; i++) h += '<i class="' + (i < r ? 'on' : '') + '"></i>'; return h + '<b>' + r + '/10</b></div>'; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function byId(id) { return venues.filter(function (v) { return v.id === id; })[0]; }
  function filtered() {
    return venues.filter(function (v) {
      if (F.cuisine && v.cuisine !== F.cuisine) return false;
      if (F.pmin !== '' && v.price < +F.pmin) return false;
      if (F.pmax !== '' && v.price > +F.pmax) return false;
      return true;
    });
  }

  // ---- dati: prima Supabase, se non risponde il file locale ----
  function load() {
    var ctl = new AbortController(); var t = setTimeout(function () { ctl.abort(); }, 5000);
    return fetch(C.SUPABASE_URL + '/rest/v1/venues?select=*&order=created_at.desc', { headers: { apikey: C.SUPABASE_KEY, Authorization: 'Bearer ' + C.SUPABASE_KEY }, signal: ctl.signal })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('db'); return r.json(); })
      .then(function (d) { if (!d.length) throw new Error('vuoto'); return d; })
      .catch(function () { return fetch('data/venues.json').then(function (r) { return r.json(); }); });
  }

  // ---- anteprima sulla mappa ----
  function popup(v) {
    return '<div class="pp"><div class="ph"><img src="' + esc(v.photos[0]) + '" alt=""></div><div class="bd"><div class="t">' + esc(v.name) + '</div><div class="s">' + esc(v.cuisine) + ' · ' + eur(v.price) + ' a testa</div>' + stars(v.rating) + '<a class="btn" href="#/locale/' + esc(v.id) + '">Apri la scheda completa</a></div></div>';
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
    function opts(arr, cur, first) { return '<option value="">' + first + '</option>' + arr.map(function (n) { return '<option value="' + n + '"' + (String(cur) === String(n) ? ' selected' : '') + '>' + (typeof n === 'number' ? eur(n) : esc(n)) + '</option>'; }).join(''); }
    return '<div class="filters"><div class="f"><label for="fc">Tipo di cucina</label><select id="fc">' + opts(cu, F.cuisine, 'Tutte le cucine') + '</select></div>' +
      '<div class="f"><label for="fa">Prezzo speso da</label><select id="fa">' + opts([5, 10, 15, 20, 30, 40], F.pmin, 'Qualsiasi') + '</select></div>' +
      '<div class="f"><label for="fb">Prezzo speso a</label><select id="fb">' + opts([10, 15, 20, 30, 40, 50, 100], F.pmax, 'Qualsiasi') + '</select></div>' +
      '<button class="link" id="reset" type="button">Azzera filtri</button><a class="btn" id="count" href="#mappa-box">Mostra ' + filtered().length + ' locali</a></div>';
  }
  function bindFilters() {
    function on() { F.cuisine = document.getElementById('fc').value; F.pmin = document.getElementById('fa').value; F.pmax = document.getElementById('fb').value; refreshPins(); if (document.getElementById('cards')) cards(); }
    ['fc', 'fa', 'fb'].forEach(function (i) { document.getElementById(i).addEventListener('change', on); });
    document.getElementById('reset').addEventListener('click', function () { F = { cuisine: '', pmin: '', pmax: '' }; render(); });
  }
  function card(v) {
    var tx = v.text.length > 110 ? v.text.slice(0, 108) + '…' : v.text;
    return '<a class="card" href="#/locale/' + esc(v.id) + '" style="text-decoration:none"><div class="ph"><img loading="lazy" src="' + esc(v.photos[0]) + '" alt="' + esc(v.name) + '"></div><div class="bd"><div class="t">' + esc(v.name) + '</div><div class="s">' + esc(v.cuisine) + ' · ' + eur(v.price) + ' a testa</div>' + stars(v.rating) + '<div class="tx">' + esc(tx) + '</div></div></a>';
  }
  function cards() {
    var ids = filtered().map(function (v) { return v.id; });
    var pick = order.filter(function (id) { return ids.indexOf(id) >= 0; }).slice(0, 3);
    document.getElementById('cards').innerHTML = pick.map(function (id) { return card(byId(id)); }).join('') || '<p>Nessun locale con questi filtri.</p>';
  }

  // ---- pagine ----
  function home() {
    app.innerHTML = '<section class="wood hero"><div class="hero-in"><h1>Dove si mangia davvero.</h1><p>Recensioni sincere dei posti che provo, sulla mappa. Cerca per cucina e per quanto si spende.</p></div></section>' +
      '<div class="wrap">' + filterBar() + '</div><div class="wrap" id="mappa-box" style="padding-top:0"><div class="mapbox"><div id="map"></div></div><p class="note">Muovi e ingrandisci la mappa: tocca uno spillo per l\'anteprima.</p>' +
      '<h2>Recensioni da leggere</h2><div class="cards" id="cards"></div><div class="more"><button class="btn" id="reroll" type="button">Mostrane altre</button></div></div>';
    bindFilters(); drawMap('map', 12); cards();
    document.getElementById('reroll').addEventListener('click', function () { order = shuffle(order); cards(); });
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
      '<div><h1>' + esc(v.name) + '</h1>' + stars(v.rating) + '<div class="chips"><span class="chip">' + esc(v.cuisine) + '</span><span class="chip">' + eur(v.price) + ' a testa</span></div>' +
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
    venues = d.map(function (v) { if (!v.photos || !v.photos.length) v.photos = ['photos/placeholder.jpg']; return v; });
    order = shuffle(venues.map(function (v) { return v.id; }));
    render();
  });
})();
