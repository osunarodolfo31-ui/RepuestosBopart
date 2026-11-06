/* =============================================================================
   boparts_sesion.js — SESION, LOGIN Y AVISO DE VERSION, UNA SOLA VEZ PARA LAS 12 PANTALLAS
   =============================================================================
   Hasta hoy este mismo codigo estaba copiado, byte a byte, dentro de los 12 HTML. Cualquier
   correccion habia que hacerla doce veces y bastaba olvidar una para que esa pantalla se
   comportara distinto: asi nacio el leerJSON duplicado que dejo a Compras sin lista de productos.

   Como se usa: se carga ANTES del <script> propio de cada pantalla y con ?v= para que no quede
   una copia vieja en cache junto a un HTML nuevo:

       <script src="boparts_sesion.js?v=2026-09-22.2"></script>

   Inyecta su propio CSS y su propio cuadro de login: el HTML de la pantalla ya no los lleva.
   Necesita que la pantalla defina despues SCRIPT_URL_SESION (se lee al usarla, no al cargar).
   ============================================================================= */

/* ----- CSS del login ----- */
(function() {
  var st = document.createElement('style');
  st.textContent = '/* ===== LOGIN (bloque D) — identico en todas las pantallas ===== */\n  .login{display:none;position:fixed;inset:0;background:var(--bg);z-index:900;align-items:center;justify-content:center;padding:24px}\n  .login.open{display:flex}\n  .logincard{width:100%;max-width:340px;text-align:center}\n  .loginlogo{font-size:24px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px}\n  .loginlogo span{color:var(--brand)}\n  .loginsub{font-size:13px;color:var(--ink-muted);margin-bottom:26px}\n  .login .lgf{text-align:left;margin-bottom:14px}\n  .login label{display:block;font-size:11px;color:var(--ink-soft);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}\n  .login select,.login input{width:100%;padding:13px;border-radius:var(--radius-sm);border:1.5px solid var(--border);\n    background:var(--card);color:var(--ink);font-size:16px;font-family:inherit;box-sizing:border-box}\n  .login input{letter-spacing:6px;text-align:center}\n  .login select:focus,.login input:focus{outline:none;border-color:var(--brand)}\n  .lgbtn{width:100%;padding:14px;border:none;border-radius:var(--radius-sm);background:var(--brand);color:#111;\n    font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:6px}\n  .lgbtn:disabled{opacity:0.5}\n  .lgerr{min-height:18px;font-size:13px;color:#FF6B6B;margin-top:12px}\n  .lgquien{font-size:11px;color:var(--ink-muted);margin-top:22px}\n  .lgquien b{color:var(--ink-soft);font-weight:600}';
  document.head.appendChild(st);
})();

/* ----- Cuadro de login ----- */
(function() {
  if (document.getElementById('loginBox')) return;   // por si una pantalla todavia lo trae
  var d = document.createElement('div');
  d.innerHTML = '<div class="login" id="loginBox">\n  <div class="logincard">\n    <div class="loginlogo">Repuesto <span>BoParts</span></div>\n    <div class="loginsub">Entra con tu PIN para continuar</div>\n    <div class="lgf"><label>Quien eres</label><select id="lgUser"></select></div>\n    <div class="lgf"><label>Tu PIN</label><input type="password" id="lgPin" inputmode="numeric" autocomplete="off" placeholder="····"></div>\n    <button class="lgbtn" id="lgBtn" onclick="hacerLogin()">Entrar</button>\n    <div class="lgerr" id="lgErr"></div>\n  </div>\n</div>';
  document.body.appendChild(d.firstElementChild);
})();

/* ===================== SESION (bloque D) — identico en todas las pantallas =====================
   Mientras CONFIG!B15 sea NO, nada de esto se activa y la pantalla funciona como siempre.       */
var SES_KEY = 'boparts_sesion';
function sesionActual() {
  try {
    var s = JSON.parse(localStorage.getItem(SES_KEY) || 'null');
    if (s && s.token && s.vence > Date.now()) return s;
  } catch (e) {}
  return null;
}
function guardarSesion(s) { try { localStorage.setItem(SES_KEY, JSON.stringify(s)); } catch (e) {} }
function olvidarSesion()  { try { localStorage.removeItem(SES_KEY); } catch (e) {} }
function miToken()  { var s = sesionActual(); return s ? s.token  : ''; }
function miNombre() { var s = sesionActual(); return s ? s.nombre : ''; }
function soySocio() { var s = sesionActual(); return !!s && s.rol === 'SOCIO'; }

// Agrega el token a una URL del script. Sin sesion la deja igual: con el login apagado el script no lo pide.
function conToken(url) {
  var t = miToken();
  if (!t) return url;
  return url + (url.indexOf('?') < 0 ? '?' : '&') + 'token=' + encodeURIComponent(t);
}

// Lee la respuesta del script. Si la sesion vencio, manda al login en vez de mostrar un error tecnico.
function leerJSON(r) {
  return r.text().then(function(t) {
    var d;
    try { d = JSON.parse(t); }
    catch (e) {
      var limpio = String(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      throw new Error('El script no devolvio datos' + (limpio ? ': ' + limpio : '') +
                      '. Revisa que Apps Script este desplegado como Nueva version.');
    }
    if (d && d.sesion)  { olvidarSesion(); mostrarLogin(); throw new Error('SESION'); }
    if (d && d.permiso) { throw new Error(d.error || 'Eso es solo para los socios.'); }
    return d;
  });
}


/* Con sesion activa, los desplegables de "quien hace esto" se fijan en quien entro y se bloquean.
   Regla: solo se toca un desplegable que YA ofrece ese nombre. Asi el de "Autoriza" de devoluciones,
   que solo lista a los socios, no se fuerza con un vendedor que no puede autorizar. */
function fijarPersonaDeSesion() {
  var nom = miNombre();
  if (!nom) return;
  var sels = document.getElementsByTagName('select');
  for (var i = 0; i < sels.length; i++) {
    var sel = sels[i];
    if (sel.disabled) continue;
    for (var j = 0; j < sel.options.length; j++) {
      if (String(sel.options[j].text).trim() !== nom) continue;
      sel.value = sel.options[j].value || sel.options[j].text;
      sel.disabled = true;
      sel.style.opacity = '0.75';
      sel.title = 'Registrado a nombre de quien inicio sesion';
      break;
    }
  }
}

function mostrarLogin() {
  var box = document.getElementById('loginBox');
  if (!box) return;
  box.classList.add('open');
  var sel = document.getElementById('lgUser');
  if (sel && !sel.options.length) {
    sel.innerHTML = '<option value="">Cargando...</option>';
    fetch(SCRIPT_URL_SESION + '?action=quienes&t=' + Date.now())
      .then(leerJSON)
      .then(function(d) {
        var us = (d && d.usuarios) || [];
        sel.innerHTML = us.length
          ? us.map(function(u) { return '<option>' + u.nombre.replace(/[<>&]/g, '') + '</option>'; }).join('')
          : '<option value="">No hay usuarios configurados</option>';
        var ult = '';
        try { ult = localStorage.getItem('boparts_ultimo_usuario') || ''; } catch (e) {}
        if (ult) sel.value = ult;
        var pin = document.getElementById('lgPin'); if (pin) pin.focus();
      })
      .catch(function() {
        // Antes esto era un callejon sin salida: decia "Sin conexion" y ahi se quedaba.
        window.__reintentosQuienes = (window.__reintentosQuienes || 0) + 1;
        if (window.__reintentosQuienes <= 3) {
          sel.innerHTML = '<option value="">Sin conexion — reintentando (' + window.__reintentosQuienes + '/3)...</option>';
          setTimeout(function() { sel.innerHTML = ''; mostrarLogin(); }, 2500);
        } else {
          sel.innerHTML = '<option value="">Sin conexion con el script — toca aqui para reintentar</option>';
          sel.onclick = function() { window.__reintentosQuienes = 0; sel.onclick = null; sel.innerHTML = ''; mostrarLogin(); };
        }
      });
  }
}

function hacerLogin() {
  var sel = document.getElementById('lgUser'), pin = document.getElementById('lgPin');
  var btn = document.getElementById('lgBtn'), err = document.getElementById('lgErr');
  var usuario = sel ? sel.value : '', clave = pin ? pin.value.trim() : '';
  err.textContent = '';
  if (!usuario) { err.textContent = 'Elige quien eres'; return; }
  if (!clave)   { err.textContent = 'Escribe tu PIN'; pin.focus(); return; }
  btn.disabled = true; btn.textContent = 'Entrando...';
  fetch(SCRIPT_URL_SESION, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
                            body:JSON.stringify({tipo:'login', usuario:usuario, pin:clave,
                                                 // v27: cada dispositivo tiene su propia sesion; esto solo
                                                 // sirve para reconocerla en la hoja SESIONES
                                                 dispositivo:String(navigator.userAgent || '').slice(0, 120)})})
    .then(function(r) { return r.text(); })
    .then(function(t) {
      var d; try { d = JSON.parse(t); } catch (e) { throw new Error('El script no respondio bien'); }
      if (!d.ok) throw new Error(d.error || 'No se pudo entrar');
      guardarSesion({token:d.token, nombre:d.nombre, rol:d.rol, vence:Date.now() + 11.5 * 3600 * 1000});
      try { localStorage.setItem('boparts_ultimo_usuario', d.nombre); } catch (e) {}
      pin.value = '';
      document.getElementById('loginBox').classList.remove('open');
      btn.disabled = false; btn.textContent = 'Entrar';
      if (typeof alEntrar === 'function') alEntrar();
      try { montarMenu(); } catch (eM) {}
      fijarPersonaDeSesion();
      setTimeout(fijarPersonaDeSesion, 800);   // por si la pantalla dibuja sus desplegables despues
    })
    .catch(function(e) {
      btn.disabled = false; btn.textContent = 'Entrar';
      err.textContent = e.message || 'No se pudo entrar';
      pin.value = ''; pin.focus();
    });
}

// Al abrir la pantalla: si el login esta activo y no hay sesion valida, se pide antes de cargar nada.
// Si esta apagado, no se pide nada y todo sigue como hasta hoy.
function revisarSesion(alTener) {
  if (sesionActual()) {
    alTener();
    fijarPersonaDeSesion();
    setTimeout(fijarPersonaDeSesion, 800);
    return;
  }
  fetch(SCRIPT_URL_SESION + '?action=quienes&t=' + Date.now())
    .then(function(r) { return r.text(); })
    .then(function(t) {
      var d = {}; try { d = JSON.parse(t); } catch (e) {}
      if (d && d.authActiva) mostrarLogin();
      else alTener();
    })
    .catch(function() { alTener(); });   // sin respuesta, no se deja a nadie fuera de la tienda
}

/* El token se agrega en un solo lugar: se envuelve fetch y se le pone a TODA llamada al script,
   sea GET o POST. Asi no hay forma de olvidarlo en una pantalla con veinte llamadas.
   Solo toca las URL del script: Cloudinary y los CSV que queden pasan intactos. */
(function() {
  if (window.__tokenEnFetch) return;
  window.__tokenEnFetch = true;
  var original = window.fetch.bind(window);
  window.fetch = function(u, o) {
    try {
      // SCRIPT_URL_SESION se lee AQUI, no al instalar: cuando este modulo corre todavia no esta asignada.
      if (typeof u === 'string' && u.indexOf(SCRIPT_URL_SESION) === 0) {
        var t = miToken();
        if (t) {
          if (o && o.body && String(o.method || '').toUpperCase() === 'POST') {
            var b = JSON.parse(o.body);
            if (b && typeof b === 'object' && b.token === undefined) {
              b.token = t;
              var o2 = {}; for (var k in o) o2[k] = o[k];
              o2.body = JSON.stringify(b); o = o2;
            }
          } else if (u.indexOf('token=') < 0) {
            u += (u.indexOf('?') < 0 ? '?' : '&') + 'token=' + encodeURIComponent(t);
          }
        }
      }
    } catch (e) {}
    return original(u, o);
  };
})();

/* v27 — URL DE FOTO SEGURA (auditoria #8). Una URL guardada en la hoja se pegaba tal cual dentro de
   src="...": con una comilla adentro podia salirse del atributo y meter codigo en la pantalla. Esta
   funcion deja pasar solo https sin comillas, espacios ni signos < > ` y devuelve '' con cualquier otra
   cosa. Las previsualizaciones locales (blob: y data:image) tambien pasan: nacen en el telefono. */
function urlSegura(u) {
  var t = String(u == null ? '' : u).trim();
  if (/^https:\/\/[^\s"'<>`]+$/.test(t)) return t;
  if (/^blob:https:\/\/[^\s"'<>`]+$/.test(t)) return t;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(t)) return t;
  return '';
}
// Escapa texto para meterlo en HTML, incluidas las comillas (sirve tambien dentro de atributos).
function escAtributo(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* v27.3 — PAGINAS Y CATEGORIAS para listas largas (Inventario, Fotos).
   Antes se mostraban los primeros 60-80 y el resto solo se encontraba con el buscador: con 852 productos
   no habia forma de recorrer la lista. paginar() corta la lista; htmlPaginas() dibuja Anterior/Siguiente;
   htmlCategorias() arma el filtro con cuantos productos hay en cada categoria. */
var POR_PAGINA = 40;
(function() {
  var st = document.createElement('style');
  st.textContent = '.pager{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 4px}' +
    '.pager button{flex:0 0 auto;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--card);' +
    'color:var(--ink);font-weight:700;font-size:13px;font-family:inherit;cursor:pointer}' +
    '.pager button:disabled{opacity:.35;cursor:default}.pager span{font-size:12px;color:var(--ink-muted);text-align:center}' +
    '.catsel{width:100%;padding:11px;border-radius:10px;border:1.5px solid var(--border);background:var(--card);color:var(--ink);' +
    'font-size:14px;font-family:inherit;margin:8px 0}';
  document.head.appendChild(st);
})();
function paginar(lista, pagina) {
  var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  var p = Math.min(Math.max(1, pagina || 1), paginas);
  var desde = (p - 1) * POR_PAGINA;
  return {items:lista.slice(desde, desde + POR_PAGINA), pagina:p, paginas:paginas,
          desde:lista.length ? desde + 1 : 0, hasta:Math.min(desde + POR_PAGINA, lista.length), total:lista.length};
}
// fn = nombre de la funcion global que recibe el numero de pagina
function htmlPaginas(pg, fn) {
  if (pg.paginas <= 1) return '';
  return '<div class="pager"><button ' + (pg.pagina <= 1 ? 'disabled ' : '') + 'onclick="' + fn + '(' + (pg.pagina - 1) + ')">&#8249; Anterior</button>' +
    '<span>' + pg.desde + '-' + pg.hasta + ' de ' + pg.total + '<br>pagina ' + pg.pagina + ' de ' + pg.paginas + '</span>' +
    '<button ' + (pg.pagina >= pg.paginas ? 'disabled ' : '') + 'onclick="' + fn + '(' + (pg.pagina + 1) + ')">Siguiente &#8250;</button></div>';
}
// lista = productos ya filtrados por pestana y buscador; fn = funcion global que recibe la categoria elegida
function htmlCategorias(lista, actual, fn) {
  var c = {};
  lista.forEach(function(p) { var k = String(p.categoria || '').trim() || 'SIN CATEGORIA'; c[k] = (c[k] || 0) + 1; });
  var ks = Object.keys(c).sort();
  var esc = function(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  return '<select class="catsel" onchange="' + fn + '(this.value)"><option value="">Todas las categorias (' + lista.length + ')</option>' +
    ks.map(function(k) { return '<option value="' + esc(k) + '"' + (k === actual ? ' selected' : '') + '>' + esc(k) + ' (' + c[k] + ')</option>'; }).join('') +
    (actual && !c[actual] ? '<option value="' + esc(actual) + '" selected>' + esc(actual) + ' (0)</option>' : '') + '</select>';
}
function enCategoria(p, cat) { return !cat || (String(p.categoria || '').trim() || 'SIN CATEGORIA') === cat; }

/* ===================== v28 — CANALES: metodos por cuenta, la moneda la pone la cuenta =====================
   cargarCanales('entra'|'sale', fn): pide al script los metodos habilitados en ese sentido (hoja CANALES) y
   se los entrega a fn. Si el script no responde, no se llama a fn: la pantalla sigue con lo que tenia.
   amarrarMoneda(idMetodo, idMoneda, fnLista): al elegir un metodo, la moneda queda fija en la de su cuenta y
   no se puede cambiar. Asi no vuelve a entrar un Pago Movil en dolares ni un efectivo en dolares como Bs. */
function cargarCanales(sentido, alLlegar) {
  fetch(SCRIPT_URL_SESION + '?action=metodos&sentido=' + encodeURIComponent(sentido || 'entra') + '&t=' + Date.now())
    .then(leerJSON)
    .then(function(d) { if (d && d.ok && d.metodos && d.metodos.length && typeof alLlegar === 'function') alLlegar(d.metodos, d); })
    .catch(function() {});
}
function opcionesDeMetodos(lista, conCredito) {
  var h = '<option value="">Seleccionar...</option>';
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].credito && !conCredito) continue;
    h += '<option value="' + i + '">' + String(lista[i].label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</option>';
  }
  return h;
}
function amarrarMoneda(idMetodo, idMoneda, fnLista) {
  var sm = document.getElementById(idMetodo), sn = document.getElementById(idMoneda);
  if (!sm || !sn) return;
  function aplicar() {
    var i = parseInt(sm.value), lista = fnLista() || [], m = isNaN(i) ? null : lista[i];
    if (m && (m.moneda === 'USD' || m.moneda === 'BS')) {
      if (sn.value !== m.moneda) { sn.value = m.moneda; if (typeof sn.onchange === 'function') sn.onchange(); }
      sn.disabled = true; sn.style.opacity = '0.75'; sn.title = 'La moneda la define la cuenta';
    } else {
      sn.disabled = false; sn.style.opacity = ''; sn.title = '';
    }
  }
  if (!sm.__amarrado) { sm.addEventListener('change', aplicar); sm.__amarrado = true; }
  aplicar();
}

/* ===================== v28.4 — MENU AGRUPADO, UNO SOLO PARA LAS 13 PANTALLAS =====================
   Antes cada pantalla traia su propio menu de 13 tarjetas: no cabia en el telefono y lo primero que se
   perdia era lo mas usado (Lista de precios y Registrar venta, arriba, fuera de la pantalla).
   Ahora: tres accesos fijos arriba (Precios, Venta, Mi dia) y el resto en grupos que se abren con un toque.
   El grupo de la pantalla actual viene abierto. Lo que es solo de socios no se le muestra a un vendedor
   (el servidor igual se lo niega). Para mover un modulo de grupo, se cambia SOLO este arreglo. */
var MENU_FIJO = [
  {href:'index.html',              icono:'📋', nombre:'Lista de precios'},
  {href:'boparts_ventas.html',     icono:'💰', nombre:'Registrar venta'},
  {href:'boparts_tareas.html',     icono:'✅', nombre:'Mi día'}
];
var MENU_GRUPOS = [
  {id:'clientes', icono:'🧾', nombre:'Clientes', desc:'Documentos, cobros, apartados, devoluciones', items:[
    {href:'boparts_documentos.html',   icono:'🔎', nombre:'Documentos',   desc:'Buscar y reimprimir notas'},
    {href:'boparts_cobros.html',       icono:'🧾', nombre:'Cobros',       desc:'Cuentas por cobrar'},
    {href:'boparts_apartados.html',    icono:'🔖', nombre:'Apartados',    desc:'Y contra pedido'},
    {href:'boparts_devoluciones.html', icono:'↩️', nombre:'Devoluciones', desc:'Y cambios', socio:true}
  ]},
  {id:'mercancia', icono:'📦', nombre:'Mercancía', desc:'Compras, inventario, fotos, demanda', items:[
    {href:'boparts_compras.html',    icono:'📦', nombre:'Compras',      desc:'Recibir mercancía'},
    {href:'boparts_inventario.html', icono:'🧮', nombre:'Inventario',   desc:'Conteo de stock'},
    {href:'boparts_fotos.html',      icono:'📷', nombre:'Cargar fotos', desc:'Catálogo de imágenes'},
    {href:'boparts_demanda.html',    icono:'📝', nombre:'Demanda',      desc:'No atendida'}
  ]},
  {id:'dinero', icono:'🏦', nombre:'Dinero y gerencia', desc:'Gastos, bancos, resultados', items:[
    {href:'boparts_gastos.html',   icono:'💸', nombre:'Gastos',   desc:'Registrar gasto'},
    {href:'boparts_dinero.html',   icono:'🏦', nombre:'Dinero',   desc:'Bancos y flujo de caja', socio:true},
    {href:'boparts_gerencia.html', icono:'📊', nombre:'Gerencia', desc:'Resultados', socio:true}
  ]}
];
(function() {
  var st = document.createElement('style');
  st.textContent =
    '#navPan,#navPanel{max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
    '.bm-fijo{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}' +
    '.bm-fijo a{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 6px;border-radius:14px;text-decoration:none;' +
      'background:var(--brand,#F5A800);color:#111;font-weight:700;font-size:12px;text-align:center;-webkit-tap-highlight-color:transparent}' +
    '.bm-fijo a.cur{outline:2px solid #fff;outline-offset:-2px}' +
    '.bm-fijo .ic{font-size:26px;line-height:1}' +
    '.bm-g{background:var(--card,#1E1E1E);border:1px solid var(--border,#2E2E2E);border-radius:14px;margin-bottom:8px;overflow:hidden}' +
    '.bm-gh{display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.bm-gh .ic{font-size:24px;line-height:1}' +
    '.bm-gh .tx{flex:1;min-width:0}.bm-gh .nm{font-size:14px;font-weight:700;color:var(--ink,#F0F0F0)}' +
    '.bm-gh .ds{font-size:11px;color:var(--ink-muted,#888);margin-top:2px}' +
    '.bm-gh .fl{color:var(--ink-muted,#888);font-size:14px;transition:transform .2s}' +
    '.bm-g.open .bm-gh .fl{transform:rotate(90deg)}' +
    '.bm-items{display:none;grid-template-columns:1fr 1fr;gap:8px;padding:0 10px 10px}' +
    '.bm-g.open .bm-items{display:grid}' +
    '.bm-items a{display:flex;align-items:center;gap:10px;padding:11px 10px;border-radius:10px;text-decoration:none;' +
      'background:var(--card2,#252525);border:1px solid var(--border,#2E2E2E);-webkit-tap-highlight-color:transparent}' +
    '.bm-items a.cur{border-color:var(--brand,#F5A800);background:rgba(245,168,0,.15)}' +
    '.bm-items .ic{font-size:22px;line-height:1}.bm-items .nm{font-size:13px;font-weight:700;color:var(--ink,#F0F0F0)}' +
    '.bm-items .ds{font-size:10px;color:var(--ink-muted,#888);margin-top:1px}';
  document.head.appendChild(st);
})();
function montarMenu() {
  var panel = document.getElementById('navPan') || document.getElementById('navPanel');
  if (!panel) return;
  var viejo = panel.querySelector('.nav-g, .nav-grid, .bmenu');
  if (!viejo) return;
  var aqui = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var s = sesionActual(), vendedor = !!(s && s.rol !== 'SOCIO');
  var v = (typeof BUILD !== 'undefined') ? 'v=' + BUILD : '';
  function url(h) { return h + (v ? '?' + v : ''); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var h = '<div class="bm-fijo">' + MENU_FIJO.map(function(m) {
    return '<a href="' + url(m.href) + '"' + (m.href === aqui ? ' class="cur"' : '') + '><span class="ic">' + m.icono + '</span>' + esc(m.nombre) + '</a>';
  }).join('') + '</div>';
  MENU_GRUPOS.forEach(function(g) {
    var items = g.items.filter(function(it) { return !(it.socio && vendedor); });
    if (!items.length) return;
    var abierto = items.some(function(it) { return it.href === aqui; });
    h += '<div class="bm-g' + (abierto ? ' open' : '') + '" id="bmg-' + g.id + '">' +
      '<div class="bm-gh" onclick="abrirGrupoMenu(\'' + g.id + '\')"><span class="ic">' + g.icono + '</span>' +
      '<div class="tx"><div class="nm">' + esc(g.nombre) + '</div><div class="ds">' + esc(g.desc) + '</div></div><span class="fl">&#9654;</span></div>' +
      '<div class="bm-items">' + items.map(function(it) {
        return '<a href="' + url(it.href) + '"' + (it.href === aqui ? ' class="cur"' : '') + '><span class="ic">' + it.icono + '</span>' +
               '<div><div class="nm">' + esc(it.nombre) + '</div><div class="ds">' + esc(it.desc) + '</div></div></a>';
      }).join('') + '</div></div>';
  });
  var nuevo = document.createElement('div');
  nuevo.className = 'bmenu';
  nuevo.innerHTML = h;
  viejo.parentNode.replaceChild(nuevo, viejo);
}
function abrirGrupoMenu(id) {
  var el = document.getElementById('bmg-' + id);
  if (el) el.classList.toggle('open');
}
// Se arma despues de cargar todo: asi BUILD ya existe y el menu viejo de la pantalla ya esta en el DOM.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarMenu); else setTimeout(montarMenu, 0);

/* ===================== ACTUALIZACION (2026-09-22) — identico en todas las pantallas =====================
   El telefono guarda la pantalla vieja y la sigue mostrando aunque ya haya una nueva en GitHub.
   Hasta hoy eso se arreglaba borrando la cache a mano. Ahora cada pantalla sabe con que build salio,
   version.json dice cual es la buena, y si no coinciden aparece una barra con un boton que borra la
   cache y recarga. Nadie tiene que saber que es "borrar cache".
   Ademas, todo enlace entre pantallas lleva ?v=BUILD: moverse por el menu ya no trae copias viejas. */
var BUILD = '2026-11-06.2';
(function() {
  var intentos = 0;
  function sellarEnlaces() {
    var as = document.getElementsByTagName('a');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href') || '';
      if ((h.indexOf('boparts_') === 0 || h === 'index.html') && h.indexOf('v=') < 0) {
        as[i].setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'v=' + BUILD);
      }
    }
  }
  function barra(nuevo) {
    if (document.getElementById('updBar')) return;
    var d = document.createElement('div');
    d.id = 'updBar';
    d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#F5A800;color:#111;' +
      'font-family:inherit;font-size:13px;font-weight:700;padding:12px 14px;display:flex;align-items:center;' +
      'gap:10px;box-shadow:0 -6px 20px rgba(0,0,0,.45)';
    d.innerHTML = '<span style="flex:1;line-height:1.35">Version nueva disponible (' + nuevo +
      '). Esta pantalla corre ' + BUILD + '.</span>' +
      '<button id="updBtn" style="background:#111;color:#F5A800;border:none;border-radius:8px;padding:9px 15px;' +
      'font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;flex-shrink:0">Actualizar</button>';
    document.body.appendChild(d);
    document.getElementById('updBtn').onclick = actualizarApp;
  }
  function actualizarApp() {
    var recargar = function() { location.replace(location.pathname + '?v=' + Date.now()); };
    try {
      if (window.caches && caches.keys) {
        caches.keys()
          .then(function(ks) { return Promise.all(ks.map(function(k) { return caches.delete(k); })); })
          .then(recargar, recargar);
        return;
      }
    } catch (e) {}
    recargar();
  }
  function revisar() {
    if (intentos > 40) return;
    intentos++;
    fetch('version.json?t=' + Date.now(), {cache:'no-store'})
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d && d.build && d.build !== BUILD) barra(d.build); })
      .catch(function() {});
  }
  window.actualizarApp = actualizarApp;
  sellarEnlaces();
  revisar();
  document.addEventListener('visibilitychange', function() { if (!document.hidden) revisar(); });
})();
