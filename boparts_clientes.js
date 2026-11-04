/* =============================================================================
   boparts_clientes.js — DATOS DEL CLIENTE COMPARTIDOS (v1.0, 2026-11-04)
   =============================================================================
   Una sola copia de:
   - la lista de estados de Venezuela con sus ciudades principales,
   - la region predeterminada (Lara / Barquisimeto, se cambia en Gerencia y vive en CONFIG B16/B17),
   - la validacion de cedula/RIF (formato y digito verificador del SENIAT),
   - el formulario de direccion por partes y como se arma la direccion completa.
   La usan boparts_ventas.html y boparts_gerencia.html. El servidor arma la direccion con la MISMA regla
   (componerDireccion_ en Code.gs): si se cambia aqui, se cambia alla.
   ============================================================================= */
var ESTADOS_VE = {
  'Amazonas':         ['Puerto Ayacucho'],
  'Anzoategui':       ['Barcelona', 'Puerto La Cruz', 'Lecheria', 'El Tigre', 'Anaco', 'Guanta', 'Cantaura'],
  'Apure':            ['San Fernando de Apure', 'Guasdualito', 'Achaguas'],
  'Aragua':           ['Maracay', 'Turmero', 'La Victoria', 'Cagua', 'Villa de Cura', 'Palo Negro', 'El Limon'],
  'Barinas':          ['Barinas', 'Socopo', 'Santa Barbara de Barinas', 'Barinitas'],
  'Bolivar':          ['Ciudad Bolivar', 'Puerto Ordaz', 'San Felix', 'Upata', 'Caicara del Orinoco'],
  'Carabobo':         ['Valencia', 'Puerto Cabello', 'Guacara', 'Los Guayos', 'San Diego', 'Naguanagua', 'Tocuyito', 'Moron'],
  'Cojedes':          ['San Carlos', 'Tinaquillo'],
  'Delta Amacuro':    ['Tucupita'],
  'Distrito Capital': ['Caracas'],
  'Falcon':           ['Coro', 'Punto Fijo', 'Tucacas', 'Chichiriviche', 'Churuguara'],
  'Guarico':          ['San Juan de los Morros', 'Calabozo', 'Valle de la Pascua', 'Zaraza', 'Altagracia de Orituco'],
  'La Guaira':        ['La Guaira', 'Maiquetia', 'Catia La Mar', 'Macuto'],
  'Lara':             ['Barquisimeto', 'Cabudare', 'Carora', 'El Tocuyo', 'Quibor', 'Duaca', 'Siquisique', 'Sanare', 'Sarare'],
  'Merida':           ['Merida', 'El Vigia', 'Ejido', 'Tovar', 'Mucuchies'],
  'Miranda':          ['Los Teques', 'Guarenas', 'Guatire', 'Petare', 'Charallave', 'Ocumare del Tuy', 'Santa Teresa del Tuy', 'Higuerote', 'Baruta', 'Chacao'],
  'Monagas':          ['Maturin', 'Punta de Mata', 'Caripito', 'Temblador'],
  'Nueva Esparta':    ['La Asuncion', 'Porlamar', 'Pampatar', 'Juan Griego'],
  'Portuguesa':       ['Guanare', 'Acarigua', 'Araure', 'Turen', 'Biscucuy'],
  'Sucre':            ['Cumana', 'Carupano', 'Guiria'],
  'Tachira':          ['San Cristobal', 'Tariba', 'San Antonio del Tachira', 'Rubio', 'La Fria', 'Ureña'],
  'Trujillo':         ['Trujillo', 'Valera', 'Bocono', 'Carvajal'],
  'Yaracuy':          ['San Felipe', 'Yaritagua', 'Chivacoa', 'Nirgua', 'Cocorote'],
  'Zulia':            ['Maracaibo', 'Cabimas', 'Ciudad Ojeda', 'San Francisco', 'Machiques', 'Santa Barbara del Zulia', 'La Concepcion']
};

// ---------- Region predeterminada ----------
var REGION_DEF = {estado:'Lara', ciudad:'Barquisimeto'};
try { var _rg = JSON.parse(localStorage.getItem('boparts_region') || 'null'); if (_rg && _rg.estado) REGION_DEF = _rg; } catch (e) {}
// La pantalla llama esto con la respuesta de action=config (trae estadoDefecto / ciudadDefecto).
function fijarRegionDesdeConfig(d) {
  if (!d || !d.estadoDefecto) return;
  REGION_DEF = {estado:d.estadoDefecto, ciudad:d.ciudadDefecto || ''};
  try { localStorage.setItem('boparts_region', JSON.stringify(REGION_DEF)); } catch (e) {}
}

// ---------- Cedula / RIF ----------
// Tipos: V venezolano, E extranjero, J juridico, G gobierno, P pasaporte, C comuna.
// Digito verificador SENIAT: letra (V1 E2 J3 P4 G5 C3) x4 + 8 digitos x (3,2,7,6,5,4,3,2); 11 - (suma % 11); 10 u 11 -> 0.
// Probado con J-50828177-2 (BOSC) y V-11470283-4.
var RIF_LETRA = {V:1, E:2, J:3, P:4, G:5, C:3};
function digitoRif(letra, ocho) {
  var pesos = [3, 2, 7, 6, 5, 4, 3, 2], s = RIF_LETRA[letra] * 4;
  for (var i = 0; i < 8; i++) s += Number(ocho.charAt(i)) * pesos[i];
  var dv = 11 - (s % 11);
  return dv >= 10 ? 0 : dv;
}
// Devuelve {ok, valor (normalizado), tipo, error}. Vacio = ok (el campo puede no ser obligatorio).
function validarRif(txt) {
  var t = String(txt || '').toUpperCase().replace(/[\s.\-\/]/g, '');
  if (!t) return {ok:true, valor:'', tipo:''};
  var m = /^([VEJGPC])(\d+)$/.exec(t);
  if (!m) return {ok:false, error:'Debe empezar con V, E, J, G, P o C seguido de numeros (ej: V-12345678 o J-12345678-9)'};
  var L = m[1], n = m[2];
  if (/^0+$/.test(n)) return {ok:false, error:'Ese numero es todo ceros'};
  var juridico = L === 'J' || L === 'G' || L === 'C';
  if (L === 'P') return n.length >= 5 ? {ok:true, valor:'P-' + n, tipo:L} : {ok:false, error:'Pasaporte muy corto'};
  if (juridico && n.length !== 9) return {ok:false, error:'Un RIF ' + L + ' lleva 9 digitos: 8 + el verificador (ej: ' + L + '-12345678-9)'};
  if (!juridico && n.length < 6) return {ok:false, error:'Cedula muy corta: revisa los digitos'};
  if (!juridico && n.length <= 8) return {ok:true, valor:L + '-' + n, tipo:L};        // cedula sin verificador
  if (n.length !== 9) return {ok:false, error:'Demasiados digitos'};
  var ocho = n.slice(0, 8), dv = Number(n.charAt(8));
  var esperado = digitoRif(L, ocho);
  if (dv !== esperado) return {ok:false, error:'El digito verificador no cuadra (' + L + '-' + ocho + '-' + dv + '). Copialo del RIF del cliente.'};
  return {ok:true, valor:L + '-' + ocho + '-' + dv, tipo:L};
}

// ---------- Direccion por partes ----------
// d = {estado, ciudad, sector, calle, local, referencia}. La referencia NO va en la direccion fiscal.
function componerDireccion(d) {
  d = d || {};
  var p = [d.calle, d.local, d.sector].map(function(x) { return String(x || '').trim(); }).filter(Boolean);
  if (d.ciudad) p.push(String(d.ciudad).trim());
  if (d.estado) p.push('Estado ' + String(d.estado).trim());
  return p.join(', ');
}
function hayPartes(d) { return !!(d && (d.calle || d.local || d.sector)); }

function _esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
// Dibuja el formulario dentro del contenedor. px = prefijo de ids para poder tener dos en la misma pantalla.
function htmlDireccion(px) {
  var est = Object.keys(ESTADOS_VE).map(function(e) { return '<option>' + e + '</option>'; }).join('');
  return '<div class="row2">' +
      '<div class="field"><label>Estado</label><select id="' + px + 'Est" onchange="cambioEstado(\'' + px + '\')">' + est + '</select></div>' +
      '<div class="field"><label>Ciudad</label><select id="' + px + 'Ciu" onchange="cambioCiudad(\'' + px + '\')"></select>' +
        '<input type="text" id="' + px + 'CiuOtra" placeholder="Escribe la ciudad" style="display:none;margin-top:6px"></div>' +
    '</div>' +
    '<div class="field"><label>Calle / Carrera / Avenida</label><input type="text" id="' + px + 'Calle" placeholder="Ej: Carrera 19 con calle 30"></div>' +
    '<div class="row2">' +
      '<div class="field"><label>Local / Casa / Edificio</label><input type="text" id="' + px + 'Local" placeholder="Ej: Local 5"></div>' +
      '<div class="field"><label>Sector / Urbanizacion</label><input type="text" id="' + px + 'Sector" placeholder="Ej: Centro"></div>' +
    '</div>' +
    '<div class="field"><label>Punto de referencia <span style="font-weight:400;color:var(--ink-muted)">(opcional, no sale en la factura)</span></label>' +
      '<input type="text" id="' + px + 'Ref" placeholder="Ej: frente a la panaderia"></div>' +
    '<div id="' + px + 'Prev" class="cominfo" style="display:none"></div>';
}
function _ciudades(px, estado, ciudad) {
  var lista = (ESTADOS_VE[estado] || []).slice();
  var sel = document.getElementById(px + 'Ciu'), otra = document.getElementById(px + 'CiuOtra');
  var esOtra = ciudad && lista.indexOf(ciudad) < 0;
  sel.innerHTML = lista.map(function(c) { return '<option>' + _esc(c) + '</option>'; }).join('') + '<option value="__otra">Otra...</option>';
  sel.value = esOtra ? '__otra' : (ciudad || lista[0] || '__otra');
  otra.style.display = sel.value === '__otra' ? 'block' : 'none';
  otra.value = esOtra ? ciudad : '';
}
function cambioEstado(px) {
  var e = document.getElementById(px + 'Est').value;
  _ciudades(px, e, e === REGION_DEF.estado ? REGION_DEF.ciudad : '');
  previewDireccion(px);
}
function cambioCiudad(px) {
  var otra = document.getElementById(px + 'CiuOtra');
  otra.style.display = document.getElementById(px + 'Ciu').value === '__otra' ? 'block' : 'none';
  if (otra.style.display === 'block') otra.focus();
  previewDireccion(px);
}
// Monta el formulario en el contenedor y lo llena con el cliente (o con la region predeterminada).
// c puede traer la direccion vieja en una sola linea (c.dir): se muestra como aviso para pasarla a las partes.
function montarDireccion(px, contenedor, c) {
  var el = typeof contenedor === 'string' ? document.getElementById(contenedor) : contenedor;
  el.innerHTML = htmlDireccion(px);
  llenarDireccion(px, c);
  ['Calle', 'Local', 'Sector', 'CiuOtra'].forEach(function(k) {
    document.getElementById(px + k).addEventListener('input', function() { previewDireccion(px); });
  });
}
function llenarDireccion(px, c) {
  c = c || {};
  var estado = c.estado && ESTADOS_VE[c.estado] ? c.estado : (c.estado ? '' : REGION_DEF.estado);
  var est = document.getElementById(px + 'Est');
  if (c.estado && !ESTADOS_VE[c.estado]) { est.insertAdjacentHTML('beforeend', '<option>' + _esc(c.estado) + '</option>'); estado = c.estado; }
  est.value = estado || REGION_DEF.estado;
  _ciudades(px, est.value, c.ciudad || (est.value === REGION_DEF.estado ? REGION_DEF.ciudad : ''));
  document.getElementById(px + 'Calle').value = c.calle || '';
  document.getElementById(px + 'Local').value = c.local || '';
  document.getElementById(px + 'Sector').value = c.sector || '';
  document.getElementById(px + 'Ref').value = c.referencia || '';
  var pv = document.getElementById(px + 'Prev');
  if (!hayPartes(c) && c.dir) { pv.style.display = 'block'; pv.innerHTML = 'Direccion guardada antes: <b>' + _esc(c.dir) + '</b>. Pasala a los campos de arriba.'; pv.dataset.vieja = '1'; }
  else previewDireccion(px);
}
function leerDireccion(px) {
  var ciu = document.getElementById(px + 'Ciu').value;
  if (ciu === '__otra') ciu = document.getElementById(px + 'CiuOtra').value.trim();
  var d = {estado:document.getElementById(px + 'Est').value, ciudad:ciu,
           calle:document.getElementById(px + 'Calle').value.trim(), local:document.getElementById(px + 'Local').value.trim(),
           sector:document.getElementById(px + 'Sector').value.trim(), referencia:document.getElementById(px + 'Ref').value.trim()};
  d.dir = hayPartes(d) ? componerDireccion(d) : '';
  return d;
}
function previewDireccion(px) {
  var pv = document.getElementById(px + 'Prev'); if (!pv) return;
  var d = leerDireccion(px);
  if (!hayPartes(d)) { if (!pv.dataset.vieja) pv.style.display = 'none'; return; }
  pv.dataset.vieja = ''; pv.style.display = 'block';
  pv.innerHTML = 'Asi sale en la nota y la factura: <b>' + _esc(d.dir) + '</b>';
}
// Valida un input de RIF en vivo: lo normaliza al salir del campo y marca el error.
function amarrarRif(id) {
  var el = document.getElementById(id); if (!el || el._rif) return; el._rif = true;
  el.addEventListener('blur', function() {
    var r = validarRif(el.value);
    el.style.borderColor = r.ok ? '' : 'var(--red)';
    if (r.ok && r.valor) el.value = r.valor;
  });
}
