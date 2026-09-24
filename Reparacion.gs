/**
 * Reparacion.gs — arreglo ÚNICO de los hallazgos de la conciliación del 23/09/2026.
 *
 * Qué hace (busca por ID, NO por número de fila, así que no importa si las filas se movieron):
 *   1. Reenlaza 3 ventas partidas en VENTAS_DETALLE:
 *        V20260916-113218-AHR3  ->  V20260916-083002-W1ZH  nota 83  (aceite 20W50)
 *        V20260916-123709-2AXP  ->  V20260916-125630-YF67  nota 84  (casco Romo)
 *        V20260916-124033-CUYJ  ->  V20260916-125703-DTT3  nota 85  (cremallera Bera)
 *   2. Borra la fila de prueba de la caja de velocidad (V20260910-152440-CQUF).
 *   3. Pone FACTURA_NUM y CONTROL_NUM en 0 (las 2 facturas fueron de prueba).
 *   4. Vuelve a correr conciliar() para que veas el resultado.
 *
 * Qué NO toca: la bujía D8TC (V20260910-143722-PBZN) ni la nota 88. Eso espera tu respuesta.
 * La nota 81 no se toca: la diferencia de $1 es el cambio del 19/09 que no se cobró.
 *
 * Seguridad: antes de cambiar algo verifica que cada fila sea exactamente la esperada
 * (producto, monto, que la venta resumen exista con esa nota y que no tenga ya renglones).
 * Si algo no cuadra, NO cambia nada de ese punto y te dice por qué.
 * Si lo corres dos veces, la segunda vez no hace nada (ya está arreglado).
 *
 * Cuando termine y veas el resultado, puedes borrar este archivo del proyecto.
 */
function repararConciliacion24sep() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hv = ss.getSheetByName('VENTAS');
  var hd = ss.getSheetByName('VENTAS_DETALLE');
  if (!hv || !hd) throw new Error('No encuentro VENTAS o VENTAS_DETALLE');

  var RELINKS = [
    { viejo: 'V20260916-113218-AHR3', nuevo: 'V20260916-083002-W1ZH', nota: 83, prod: 'ACEITE 20W50', monto: 6 },
    { viejo: 'V20260916-123709-2AXP', nuevo: 'V20260916-125630-YF67', nota: 84, prod: 'CASCO ROMO', monto: 20 },
    { viejo: 'V20260916-124033-CUYJ', nuevo: 'V20260916-125703-DTT3', nota: 85, prod: 'CREMALLERA BERA', monto: 12 }
  ];
  var BORRAR = { id: 'V20260910-152440-CQUF', prod: 'CAJA COMPLETA DE VELOCIDAD', monto: 10 };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var log = [];
  try {
    // --- columnas por encabezado
    var dv = hv.getDataRange().getValues();
    var cV = col_(dv[0], ['ID_VENTA', 'NOTA_NUM', 'TOTAL_USD']);
    var dd = hd.getDataRange().getValues();
    var cD = col_(dd[0], ['ID_VENTA', 'PRODUCTO', 'SUBTOTAL_USD', 'NOTA_NUM']);

    function filasDetalle(id) {
      var r = [];
      for (var i = 1; i < dd.length; i++) if (String(dd[i][cD.ID_VENTA]).trim() === id) r.push(i + 1);
      return r;
    }
    function ventaResumen(id) {
      for (var i = 1; i < dv.length; i++) if (String(dv[i][cV.ID_VENTA]).trim() === id) return dv[i];
      return null;
    }

    // --- 1. reenlaces
    RELINKS.forEach(function (x) {
      var filas = filasDetalle(x.viejo);
      var yaTiene = filasDetalle(x.nuevo);
      if (filas.length === 0 && yaTiene.length > 0) { log.push('✔ Nota ' + x.nota + ': ya estaba enlazada. Nada que hacer.'); return; }
      if (filas.length !== 1) { log.push('✖ Nota ' + x.nota + ': esperaba 1 renglón con ' + x.viejo + ' y hay ' + filas.length + '. NO toqué nada.'); return; }
      if (yaTiene.length > 0) { log.push('✖ Nota ' + x.nota + ': ' + x.nuevo + ' ya tiene renglones propios. NO toqué nada (sería duplicar).'); return; }
      var v = ventaResumen(x.nuevo);
      if (!v) { log.push('✖ Nota ' + x.nota + ': no existe la venta ' + x.nuevo + ' en VENTAS. NO toqué nada.'); return; }
      if (Number(v[cV.NOTA_NUM]) !== x.nota) { log.push('✖ Nota ' + x.nota + ': en VENTAS esa venta tiene nota ' + v[cV.NOTA_NUM] + '. NO toqué nada.'); return; }
      var fila = dd[filas[0] - 1];
      var prodOk = String(fila[cD.PRODUCTO]).toUpperCase().indexOf(x.prod) >= 0;
      var montoOk = Math.abs(Number(fila[cD.SUBTOTAL_USD]) - x.monto) < 0.01;
      if (!prodOk || !montoOk) { log.push('✖ Nota ' + x.nota + ': el renglón no es el esperado (' + fila[cD.PRODUCTO] + ' $' + fila[cD.SUBTOTAL_USD] + '). NO toqué nada.'); return; }
      hd.getRange(filas[0], cD.ID_VENTA + 1).setValue(x.nuevo);
      hd.getRange(filas[0], cD.NOTA_NUM + 1).setValue(x.nota);
      log.push('✔ Nota ' + x.nota + ': fila ' + filas[0] + ' reenlazada a ' + x.nuevo + '.');
    });

    // --- 2. borrar la caja de prueba (al final, porque borrar mueve las filas de abajo)
    var fb = filasDetalle(BORRAR.id);
    if (fb.length === 0) {
      log.push('✔ Caja de velocidad de prueba: ya no está. Nada que hacer.');
    } else if (fb.length !== 1) {
      log.push('✖ Caja de prueba: hay ' + fb.length + ' renglones con ' + BORRAR.id + '. NO borré nada.');
    } else if (ventaResumen(BORRAR.id)) {
      log.push('✖ Caja de prueba: SÍ existe la venta en VENTAS, entonces no es huérfana. NO borré nada.');
    } else {
      var f = dd[fb[0] - 1];
      var ok = String(f[cD.PRODUCTO]).toUpperCase().indexOf(BORRAR.prod) >= 0 && Math.abs(Number(f[cD.SUBTOTAL_USD]) - BORRAR.monto) < 0.01;
      if (!ok) {
        log.push('✖ Caja de prueba: el renglón no es el esperado (' + f[cD.PRODUCTO] + '). NO borré nada.');
      } else {
        hd.deleteRow(fb[0]);
        log.push('✔ Caja de velocidad de prueba: fila ' + fb[0] + ' borrada (el stock de esa caja sube 1).');
      }
    }
    // --- 3. facturas de prueba: contadores a 0 (la próxima real será la 1)
    var hc = ss.getSheetByName('CONFIG');
    if (!hc) {
      log.push('✖ Facturas: no encuentro CONFIG. NO toqué nada.');
    } else if (ss.getSheetByName('FACTURAS')) {
      log.push('✖ Facturas: ya existe la hoja FACTURAS, entonces hay facturas registradas. NO reinicié los contadores.');
    } else {
      var dc = hc.getDataRange().getValues();
      ['FACTURA_NUM', 'CONTROL_NUM'].forEach(function (clave) {
        for (var i = 0; i < dc.length; i++) {
          if (String(dc[i][0]).trim() !== clave) continue;
          var n = Number(dc[i][1]);
          if (n === 0) { log.push('✔ ' + clave + ': ya estaba en 0.'); return; }
          if (n !== 2) { log.push('✖ ' + clave + ': esperaba 2 y está en ' + dc[i][1] + ' (¿se emitió otra?). NO lo toqué.'); return; }
          hc.getRange(i + 1, 2).setValue(0);
          log.push('✔ ' + clave + ': de 2 a 0. La próxima factura real será la 1.');
          return;
        }
        log.push('✖ ' + clave + ': no está en CONFIG. Nada que hacer.');
      });
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // --- 3. conciliar de nuevo (fuera del lock)
  var res = '';
  try { res = String(conciliar() || 'Conciliación actualizada: revisa la hoja CONCILIACION.'); }
  catch (e) { res = 'No pude correr conciliar(): ' + e.message; }

  var msg = log.join('\n') + '\n\n' + res;
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Reparación 24/09', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

function col_(enc, nombres) {
  var o = {};
  nombres.forEach(function (n) {
    var i = enc.map(function (h) { return String(h).trim().toUpperCase(); }).indexOf(n);
    if (i < 0) throw new Error('Falta la columna ' + n);
    o[n] = i;
  });
  return o;
}
