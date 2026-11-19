(function () {
  var C = window.MF, root = document.getElementById('root');
  var sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
  var venues = [], cur = null, map = null, marker = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(i) { return document.getElementById(i); }
  function slug(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6); }
  function imgUrl(p) { return /^https?:/.test(p) ? p : p.split('/').pop(); }
  function say(t, ok) { var m = $('msg'); if (m) { m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = t; } }

  function login() {
    root.innerHTML = '<div class="box"><b>Accedi</b><label>Email</label><input type="email" id="em" autocomplete="username"><label>Password</label><input type="password" id="pw" autocomplete="current-password"><button class="btn" id="go">Entra</button><div id="msg" class="msg"></div></div>';
    $('go').onclick = function () {
      sb.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value }).then(function (r) {
        if (r.error) say('Email o password non corrette.'); else list();
      });
    };
  }
  function list() {
    sb.from('venues').select('*').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) { say(r.error.message); return; }
      venues = r.data;
      root.innerHTML = '<div class="box"><button class="btn" id="new">+ Nuovo locale</button> <button class="btn sec" id="out">Esci</button><p style="font:14px Inter,sans-serif">' + venues.length + ' locali. Tocca un locale per modificarlo.</p>' +
        venues.map(function (v, i) { return '<div class="vl"><span>' + esc(v.name) + ' <small>· ' + esc(v.city) + '</small></span><button class="btn sec" style="margin:0;min-height:40px" data-i="' + i + '">Modifica</button></div>'; }).join('') + '</div>';
      $('new').onclick = function () { form({ id: '', name: '', city: 'Milano', country: 'Italia', cuisine: '', address: '', rating: 8, price: 20, people: 1, lat: 45.4642, lon: 9.19, photos: [], text: '' }); };
      $('out').onclick = function () { sb.auth.signOut().then(login); };
      Array.prototype.forEach.call(root.querySelectorAll('button[data-i]'), function (b) { b.onclick = function () { form(JSON.parse(JSON.stringify(venues[+b.getAttribute('data-i')]))); }; });
    });
  }
  function form(v) {
    cur = v; if (map) { map.remove(); map = null; }
    var cu = []; venues.forEach(function (x) { if (cu.indexOf(x.cuisine) < 0) cu.push(x.cuisine); });
    root.innerHTML = '<div class="box"><button class="btn sec" id="back" style="margin:0 0 8px">← Torna alla lista</button>' +
      '<label>Nome del locale</label><input type="text" id="f_name" value="' + esc(v.name) + '">' +
      '<label>Indirizzo (via, numero, città)</label><input type="text" id="f_addr" value="' + esc(v.address) + '">' +
      '<button class="btn sec" id="find" type="button">Trova sulla mappa</button><div id="msg" class="msg"></div>' +
      '<div id="amap"></div><p class="msg">Se lo spillo è sbagliato, <b>trascinalo</b> (o tocca la mappa) sul punto esatto.</p>' +
      '<div class="row"><div><label>Città</label><input type="text" id="f_city" value="' + esc(v.city) + '"></div><div><label>Paese</label><input type="text" id="f_country" value="' + esc(v.country) + '"></div></div>' +
      '<div class="row"><div><label>Tipo di cucina</label><input type="text" id="f_cuisine" list="cl" value="' + esc(v.cuisine) + '"><datalist id="cl">' + cu.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
      '<div><label>Voto (1-10)</label><input type="number" id="f_rating" min="1" max="10" value="' + v.rating + '"></div></div>' +
      '<div class="row"><div><label>Totale speso (€)</label><input type="number" id="f_price" min="0" value="' + v.price + '"></div><div><label>Quante persone</label><input type="number" id="f_people" min="1" value="' + (v.people || 1) + '"></div></div>' +
      '<label>Recensione completa</label><textarea id="f_text">' + esc(v.text) + '</textarea>' +
      '<label>Foto (la prima è la copertina)</label><input type="file" id="f_files" accept="image/*" multiple><div class="thumbs" id="th"></div>' +
      '<button class="btn" id="save">Salva</button> ' + (v.created_at ? '<button class="btn del" id="del">Elimina locale</button>' : '') + '</div>';
    $('back').onclick = list;
    map = L.map('amap').setView([v.lat, v.lon], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    marker = L.marker([v.lat, v.lon], { draggable: true }).addTo(map);
    marker.on('dragend', function () { var p = marker.getLatLng(); cur.lat = p.lat; cur.lon = p.lng; });
    map.on('click', function (e) { marker.setLatLng(e.latlng); cur.lat = e.latlng.lat; cur.lon = e.latlng.lng; });
    setTimeout(function () { map.invalidateSize(); }, 200);
    $('find').onclick = find; $('save').onclick = save; if ($('del')) $('del').onclick = del;
    $('f_files').onchange = upload; thumbs();
  }
  function find() {
    var q = $('f_addr').value.trim(); if (!q) return; say('Cerco…', true);
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.length) { say('Indirizzo non trovato: prova senza il numero civico, poi sposta lo spillo.'); return; }
      var a = r[0]; cur.lat = +a.lat; cur.lon = +a.lon; marker.setLatLng([cur.lat, cur.lon]); map.setView([cur.lat, cur.lon], 17);
      var ad = a.address || {}; var c = ad.city || ad.town || ad.village || ad.municipality; if (c) $('f_city').value = c; if (ad.country) $('f_country').value = ad.country;
      say('Trovato: ' + a.display_name.slice(0, 80) + '. Controlla lo spillo.', true);
    }).catch(function () { say('Errore di rete.'); });
  }
  function thumbs() {
    $('th').innerHTML = cur.photos.map(function (p, i) { return '<div class="th"><img src="' + esc(imgUrl(p)) + '" alt=""><div><button data-m="' + i + '" title="Metti in copertina">★</button><button data-d="' + i + '" title="Togli">✕</button></div></div>'; }).join('');
    Array.prototype.forEach.call($('th').querySelectorAll('button'), function (b) {
      b.onclick = function () {
        if (b.hasAttribute('data-m')) { var i = +b.getAttribute('data-m'); cur.photos.unshift(cur.photos.splice(i, 1)[0]); } else { cur.photos.splice(+b.getAttribute('data-d'), 1); }
        thumbs();
      };
    });
  }
  function resize(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () { var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(function (b) { URL.revokeObjectURL(u); b ? res(b) : rej(); }, 'image/jpeg', 0.85); };
      img.onerror = rej; img.src = u;
    });
  }
  async function upload() {
    var fs = Array.prototype.slice.call($('f_files').files); if (!fs.length) return;
    if (!cur.id) cur.id = slug($('f_name').value || 'locale');
    for (var i = 0; i < fs.length; i++) {
      say('Carico foto ' + (i + 1) + ' di ' + fs.length + '…', true);
      try {
        var b = await resize(fs[i]); var path = cur.id + '/' + Date.now() + '-' + i + '.jpg';
        var r = await sb.storage.from('photos').upload(path, b, { contentType: 'image/jpeg' });
        if (r.error) throw r.error;
        cur.photos.push(sb.storage.from('photos').getPublicUrl(path).data.publicUrl);
      } catch (e) { say('Errore sulla foto ' + (i + 1) + ': ' + (e.message || 'riprova')); return; }
    }
    $('f_files').value = ''; thumbs(); say('Foto caricate. Ricordati di premere Salva.', true);
  }
  function save() {
    var v = cur; v.name = $('f_name').value.trim(); v.address = $('f_addr').value.trim(); v.city = $('f_city').value.trim(); v.country = $('f_country').value.trim() || 'Italia';
    v.cuisine = $('f_cuisine').value.trim(); v.rating = +$('f_rating').value; v.price = +$('f_price').value; v.people = Math.max(1, +$('f_people').value || 1); v.text = $('f_text').value.trim();
    if (!v.name || !v.address || !v.cuisine || !v.city) { say('Compila nome, indirizzo, città e cucina.'); return; }
    if (v.rating < 1 || v.rating > 10) { say('Il voto va da 1 a 10.'); return; }
    if (!v.photos.length) { say('Aggiungi almeno una foto.'); return; }
    if (!v.id) v.id = slug(v.name);
    var row = { id: v.id, name: v.name, city: v.city, country: v.country, cuisine: v.cuisine, address: v.address, rating: v.rating, price: v.price, people: v.people, lat: v.lat, lon: v.lon, photos: v.photos, text: v.text, approx: false };
    say('Salvo…', true);
    sb.from('venues').upsert(row).then(function (r) { if (r.error) say('Errore: ' + r.error.message); else { say('Salvato!', true); setTimeout(list, 700); } });
  }
  function del() {
    if (!confirm('Eliminare "' + cur.name + '" per sempre?')) return;
    sb.from('venues').delete().eq('id', cur.id).then(function (r) { if (r.error) say(r.error.message); else list(); });
  }
  sb.auth.getSession().then(function (r) { if (r.data.session) list(); else login(); });
})();
