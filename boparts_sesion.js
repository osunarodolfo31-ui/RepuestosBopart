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
                            body:JSON.stringify({tipo:'login', usuario:usuario, pin:clave})})
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

/* ===================== ACTUALIZACION (2026-09-22) — identico en todas las pantallas =====================
   El telefono guarda la pantalla vieja y la sigue mostrando aunque ya haya una nueva en GitHub.
   Hasta hoy eso se arreglaba borrando la cache a mano. Ahora cada pantalla sabe con que build salio,
   version.json dice cual es la buena, y si no coinciden aparece una barra con un boton que borra la
   cache y recarga. Nadie tiene que saber que es "borrar cache".
   Ademas, todo enlace entre pantallas lleva ?v=BUILD: moverse por el menu ya no trae copias viejas. */
var BUILD = '2026-09-23.1';
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
