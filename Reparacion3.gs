/**
 * Reparacion3.gs — arreglo UNICO de productos (31/10/2026). Va con Code.gs v27.3 (usa sus funciones).
 *
 * Que hace, en este orden, y deja cada cambio en la hoja REPARACION_PRODUCTOS:
 *   1. CONTEOS QUE PERDIERON LA FECHA. Donde el conteo (columna O) esta pero la FECHA_CONTEO (P) se borro,
 *      la fecha vuelve desde la hoja CONTEOS (el ultimo conteo de ese codigo). Ademas, las celdas del conteo que
 *      quedaron con formato de fecha o de bolivares ("1-ene.", "Bs.S -") vuelven a formato de numero.
 *   2. PRODUCTOS SIN CODIGO O CON "-". Cada uno recibe un codigo propio (N-261031-01, -02...). El mismo codigo
 *      nuevo se pone en sus lineas de COMPRAS_DETALLE, VENTAS_DETALLE y CONTEOS, buscandolas por el nombre.
 *      Las lineas de la compra de BENF que quedaron "PENDIENTE COSTO" toman el costo que ya tiene el producto.
 *   3. CODIGO REPETIDO.
 *      - Mismo producto en dos filas (mismo nombre, o el mismo con "1X100"/"1X500" de mas): se queda la fila
 *        que tiene conteo (o la primera) y se BORRA la otra. Si la que se borra tenia fotos que la otra no
 *        tiene, las fotos pasan primero a la que queda. Nunca se borra una fila con conteo.
 *      - Dos productos DISTINTOS con el mismo codigo (ej. 339): el segundo recibe un codigo nuevo.
 *   4. Corre conciliar().
 *
 * Correrlo dos veces no hace nada la segunda vez. Despues se puede borrar este archivo.
 */
function repararProductos31oct() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lp = ss.getSheetByName('LISTA DE PRODUCTOS');
  if (!lp) throw new Error('No encuentro LISTA DE PRODUCTOS');
  var log = [], reg = [];
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var n = lp.getLastRow() - 2;
    var vals = lp.getRange(3, 1, n, 16).getValues();
    var ahora = new Date();
    function nom(t) { return String(t || '').trim().toUpperCase().replace(/\s+/g, ' '); }
    function base(t) { return nom(t).replace(/\b1\s*[X\*]\s*\d+\b/g, '').replace(/\s+/g, ' ').trim(); }
    function invalido(c) { var k = String(c || '').trim(); return !k || k.length < 2 || /^[\s\-_.\/]*$/.test(k); }
    function apunta(paso, fila, que, antes, despues) { reg.push([ahora, paso, fila, que, String(antes), String(despues)]); }

    // ---------- 1. fechas de conteo perdidas
    var fc = fechasDeConteos_(ss), recup = 0;
    vals.forEach(function(r, i) {
      var k = String(r[0] || '').trim().toUpperCase();
      var tieneConteo = r[COL_STK - 1] !== '' && r[COL_STK - 1] !== null;
      if (!k || !tieneConteo || r[COL_STK_FECHA - 1] || !fc[k]) return;
      lp.getRange(i + 3, COL_STK_FECHA).setValue(fc[k]).setNumberFormat('dd/MM/yyyy HH:mm');
      r[COL_STK_FECHA - 1] = fc[k];
      apunta('fecha de conteo', i + 3, r[2], '(vacia)', Utilities.formatDate(fc[k], TZ_VE, 'dd/MM/yyyy HH:mm'));
      recup++;
    });
    var fmts = lp.getRange(3, COL_STK, n, 1).getNumberFormats(), formatos = 0;
    fmts.forEach(function(f, i) {
      var t = String(f[0] || '');
      if (vals[i][COL_STK - 1] === '' || !/[dmy]|Bs|\$|"/i.test(t)) return;
      lp.getRange(i + 3, COL_STK).setNumberFormat('0'); formatos++;
    });
    log.push('1. ' + recup + ' conteo(s) recuperaron su fecha; ' + formatos + ' celda(s) de conteo vuelven a formato de numero.');

    // ---------- 2 y 3 (recodificar). Primero se decide todo, despues se escribe.
    var usados = {};
    vals.forEach(function(r) { var k = String(r[0] || '').trim().toUpperCase(); if (k) usados[k] = true; });
    var hoy = Utilities.formatDate(ahora, TZ_VE, 'yyMMdd'), seq = 0;
    function codigoNuevo() { var c; do { seq++; c = 'N-' + hoy + '-' + ('0' + seq).slice(-2); } while (usados[c]); usados[c] = true; return c; }

    var recodificar = [];   // {fila, nombre, viejo, nuevo}
    var borrar = [];        // {fila, nombre, codigo, guardar}
    vals.forEach(function(r, i) {
      if (nom(r[2]) && invalido(r[0])) recodificar.push({fila:i + 3, nombre:nom(r[2]), viejo:String(r[0] || '').trim(), nuevo:codigoNuevo()});
    });
    var porCod = {};
    vals.forEach(function(r, i) {
      var k = String(r[0] || '').trim().toUpperCase();
      if (!k || invalido(k) || !nom(r[2])) return;
      (porCod[k] = porCod[k] || []).push(i);
    });
    Object.keys(porCod).forEach(function(k) {
      var idx = porCod[k]; if (idx.length < 2) return;
      var conConteo = idx.filter(function(i) { return vals[i][COL_STK - 1] !== '' && vals[i][COL_STK - 1] !== null; });
      var queda = conConteo.length ? conConteo[0] : idx[0];
      idx.forEach(function(i) {
        if (i === queda) return;
        var mismo = base(vals[i][2]) === base(vals[queda][2]);
        var contado = vals[i][COL_STK - 1] !== '' && vals[i][COL_STK - 1] !== null;
        if (mismo && !contado) borrar.push({fila:i + 3, nombre:nom(vals[i][2]), codigo:k, guardar:queda + 3});
        else recodificar.push({fila:i + 3, nombre:nom(vals[i][2]), viejo:k, nuevo:codigoNuevo()});
      });
    });

    // escribir los codigos nuevos en LISTA y en las lineas que los usan (por nombre)
    recodificar.forEach(function(x) {
      lp.getRange(x.fila, 1).setValue(x.nuevo);
      apunta('codigo nuevo', x.fila, x.nombre, x.viejo || '(vacio)', x.nuevo);
    });
    // si dos productos recodificados tienen el mismo nombre, no se puede saber a cual va cada linea: no se tocan
    var totalRec = recodificar.length, cuenta = {};
    recodificar.forEach(function(x) { cuenta[x.nombre] = (cuenta[x.nombre] || 0) + 1; });
    recodificar = recodificar.filter(function(x) {
      if (cuenta[x.nombre] < 2) return true;
      log.push('   ✖ "' + x.nombre + '" (fila ' + x.fila + ') tiene nombre repetido: le puse codigo ' + x.nuevo + ' pero sus lineas de compras/ventas quedan igual.');
      return false;
    });
    function cambiarEn(hojaNom, colCod, colNom, colEstado) {
      var h = ss.getSheetByName(hojaNom); if (!h || h.getLastRow() < 2) return 0;
      var d = h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).getValues(), c = 0;
      d.forEach(function(r, i) {
        var cod = String(r[colCod] || '').trim().toUpperCase(), nm = nom(r[colNom]);
        recodificar.forEach(function(x) {
          if (nm !== x.nombre) return;
          if (!(invalido(cod) && invalido(x.viejo)) && cod !== String(x.viejo).toUpperCase()) return;
          h.getRange(i + 2, colCod + 1).setValue(x.nuevo); c++;
          // la linea de compra que quedo sin costear toma el costo que ya tiene el producto en LISTA
          if (colEstado !== undefined && String(r[colEstado] || '').toUpperCase() === 'PENDIENTE COSTO') {
            var cost = Number(vals[x.fila - 3][5]) || 0, cant = Number(r[5]) || 0;
            if (cost > 0) {
              h.getRange(i + 2, 7, 1, 2).setValues([[cost, round2_(cost * cant)]]);
              h.getRange(i + 2, colEstado + 1).setValue('COSTEADA');
            }
          }
        });
      });
      return c;
    }
    var cCompras = cambiarEn('COMPRAS_DETALLE', 3, 4, 9);
    var cVentas = cambiarEn('VENTAS_DETALLE', 5, 6);
    var cConteos = cambiarEn('CONTEOS', 2, 3);
    log.push('2. ' + totalRec + ' producto(s) con codigo nuevo. Lineas actualizadas: ' + cCompras + ' de compras, ' +
             cVentas + ' de ventas, ' + cConteos + ' de conteos.');

    // borrar duplicados, de abajo hacia arriba; antes, pasar fotos si hace falta
    borrar.sort(function(a, b) { return b.fila - a.fila; });
    var borradas = 0;
    borrar.forEach(function(x) {
      var fila = lp.getRange(x.fila, 1, 1, 16).getValues()[0];
      if (String(fila[0]).trim().toUpperCase() !== x.codigo || nom(fila[2]) !== x.nombre ||
          (fila[COL_STK - 1] !== '' && fila[COL_STK - 1] !== null)) {
        log.push('   ✖ fila ' + x.fila + ' (' + x.nombre + ') no es la esperada: NO la borre.'); return;
      }
      var g = lp.getRange(x.guardar, 12, 1, 3).getValues()[0];
      for (var j = 0; j < 3; j++) {
        if (String(fila[11 + j] || '').trim() && !String(g[j] || '').trim()) lp.getRange(x.guardar, 12 + j).setValue(fila[11 + j]);
      }
      apunta('fila repetida borrada', x.fila, x.nombre, x.codigo, 'queda la fila ' + x.guardar);
      lp.deleteRow(x.fila); borradas++;
    });
    log.push('3. ' + borradas + ' fila(s) repetida(s) borrada(s).');

    if (reg.length) {
      var hr = hojaAp_(ss, 'REPARACION_PRODUCTOS', ['FECHA','PASO','FILA','PRODUCTO','ANTES','DESPUES']);
      hr.getRange(hr.getLastRow() + 1, 1, reg.length, 6).setValues(reg);
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }

  var res = '';
  try { res = String(conciliar() || ''); } catch (e) { res = 'No pude correr conciliar(): ' + e.message; }
  var msg = log.join('\n') + '\n\nEl detalle de cada cambio esta en la hoja REPARACION_PRODUCTOS.\n' + res;
  Logger.log(msg);
  return msg;
}
