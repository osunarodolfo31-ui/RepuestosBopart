/* =============================================================================
   boparts_pdf.js — DOCUMENTOS EN PDF COMPARTIDOS (v1.2, 2026-11-04: solo tasa BCV; la de trabajo nunca se imprime)
   v1.1 (2026-11-02): nota de entrega y cotizacion profesionales
   =============================================================================
   Una sola copia de los datos del emisor y de los dibujos de la factura digital y de la nota de entrega.
   Lo usan boparts_ventas.html (al vender) y boparts_documentos.html (al reimprimir), asi la reimpresion sale
   identica. Necesita jsPDF y jspdf-autotable cargados antes.
   ============================================================================= */
var BOPARTS_EMPRESA = {
  nombre:'BOSC SUPPLY, C.A.', rif:'RIF: J-50828177-2',
  dir:'Av. Florencio Jimenez, Km 7, Local B-1, Sector La Capilla, Barquisimeto, Lara, ZP 3001',   // RIF actualizado 13/10/2026
  contacto:'0424-5575850 | boscsupply@gmail.com',
  tienda:'Repuesto BoParts · 0412-3185778 / 0414-9536708'
};

// Logo para los PDF: se carga una vez y se entrega como dataURL (cb recibe '' si no se pudo).
function cargarLogoPDF(cb) {
  try {
    var img = new Image();
    img.onload = function() {
      try { var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            c.getContext('2d').drawImage(img, 0, 0); cb(c.toDataURL('image/png')); } catch (e) { cb(''); }
    };
    img.onerror = function() { cb(''); };
    img.src = 'icon-192.png';
  } catch (e) { cb(''); }
}

// Montos de factura: 2 decimales, formato venezolano (BS 16.487,80)
function fBs(n) { return 'BS ' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fNum(n, d) { return (Number(n) || 0).toLocaleString('es-VE', {minimumFractionDigits:d, maximumFractionDigits:d}); }

function pdfFactura(f, opts) {
  opts = opts || {};
  return new Promise(function(resolve, reject) {
    try {
      var JS = window.jspdf && window.jspdf.jsPDF;
      if (!JS) throw new Error('Libreria PDF no cargo (sin internet?)');
      var doc = new JS({unit:'mm', format:'a4'});
      var W = 210, M = 12, y = 12;
      var negro = [17,17,17], gris = [110,110,110], linea = [215,215,215];
      var E = f.emisor || {}, R = f.receptor || {}, T = f.totales || {};
      var prueba = f.modo === 'PRUEBA';
      if (opts.reimpresion) f = JSON.parse(JSON.stringify(f));

      // Marca de agua (va primero: queda debajo de todo)
      if (prueba) {
        doc.setTextColor(238,238,238); doc.setFont('helvetica','bold'); doc.setFontSize(38);
        doc.text('DOCUMENTO DE PRUEBA', W / 2, 150, {align:'center', angle:30});
        doc.setFontSize(26); doc.text('SIN VALOR FISCAL', W / 2 + 8, 168, {align:'center', angle:30});
      }

      // ---- Emisor (izquierda) ----
      var tx = M, rxAncho = 0;
      if (opts.logo) { try { doc.addImage(opts.logo, 'PNG', M, y, 20, 20); tx = M + 24; } catch (e) {} }
      doc.setTextColor(negro[0],negro[1],negro[2]); doc.setFont('helvetica','bold'); doc.setFontSize(12);
      doc.text(E.razonSocial || '', tx, y + 4);
      doc.setFontSize(9); doc.text(E.rif || '', tx, y + 9);
      rxAncho = (W - M - 66) - tx - 3;                   // el bloque del emisor no invade el del documento
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(gris[0],gris[1],gris[2]);
      var dom = doc.splitTextToSize('Domicilio fiscal: ' + (E.domicilioFiscal || '') + (E.zonaPostal ? ' ZONA POSTAL ' + E.zonaPostal : ''), rxAncho);
      doc.text(dom, tx, y + 13);
      var yy = y + 13 + dom.length * 3;
      if (E.actividadEconomica) { doc.text('Actividad economica: ' + E.actividadEconomica, tx, yy); yy += 3; }
      doc.text('Telefono: ' + (E.telefono || '') + (E.correo ? ' / Correo: ' + E.correo : ''), tx, yy); yy += 3;
      if (E.sucursal) { doc.text('Sucursal: ' + E.sucursal, tx, yy); yy += 3; }

      // ---- Documento (derecha) ----
      var rx = W - M - 62;
      doc.setTextColor(negro[0],negro[1],negro[2]); doc.setFont('helvetica','bold'); doc.setFontSize(15);
      doc.text('FACTURA', W - M, y + 5, {align:'right'});
      var datos = [['Serie / N°:', (f.serie ? f.serie + ' ' : '') + f.numero], ['Fecha emision:', f.fechaEmision], ['Hora emision:', f.horaEmision],
                   ['N° de control:', f.control || ''], ['Fecha asignacion:', f.fechaAsignacion || (prueba ? 'pendiente' : '')],
                   ['Hora asignacion:', f.horaAsignacion || (prueba ? 'pendiente' : '')], ['Condicion:', f.condicion]];
      doc.setFontSize(7.5); var ry = y + 11;
      datos.forEach(function(d) {
        doc.setFont('helvetica','normal'); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(d[0], rx, ry);
        doc.setFont('helvetica','bold'); doc.setTextColor(negro[0],negro[1],negro[2]);
        var lns = doc.splitTextToSize(String(d[1] || ''), 38);
        doc.text(lns, W - M, ry, {align:'right'});
        ry += 3.8 * lns.length;
      });
      y = Math.max(yy, ry) + 3;
      doc.setDrawColor(linea[0],linea[1],linea[2]); doc.line(M, y, W - M, y); y += 4;

      // ---- Cliente ----
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(negro[0],negro[1],negro[2]);
      doc.text('INFORMACION DEL CLIENTE', M, y); y += 4.5;
      function par(lbl, val, x, yv, ancho) {
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(lbl, x, yv);
        doc.setFont('helvetica','bold'); doc.setTextColor(negro[0],negro[1],negro[2]);
        var t = doc.splitTextToSize(String(val || '-'), ancho); doc.text(t, x + 37, yv); return t.length;
      }
      par('CEDULA / RIF:', R.rif, M, y, 60); par('TELEFONO:', R.telefono, M + 100, y, 56); y += 4;
      par('NOMBRE / RAZON SOCIAL:', R.razonSocial, M, y, 140); y += 4;
      var lnD = par('DIRECCION FISCAL:', R.domicilioFiscal, M, y, 140); y += 4 * Math.max(1, lnD);
      par('CORREO:', R.correo, M, y, 140); y += 5;

      // ---- Renglones ----
      var body = (f.items || []).map(function(it) {
        return [it.codigo || '', it.descripcion || '', fNum(it.cantidad, 2), fBs(it.precioUnitBs), it.impuesto || 'G',
                fNum(it.alicuota, 2) + '%', fBs(it.descuentoBs), fBs(it.montoBs)];
      });
      doc.autoTable({
        startY:y, margin:{left:M, right:M},
        head:[['CODIGO','DESCRIPCION','CANTIDAD','PREC. UNIT.','IMPTO.','ALICUOTA','DESCTO.','MONTO']], body:body,
        styles:{fontSize:7, cellPadding:1.6, textColor:[17,17,17], lineColor:linea, lineWidth:0.1},
        headStyles:{fillColor:[235,235,235], textColor:[17,17,17], fontStyle:'bold'},
        columnStyles:{0:{cellWidth:20}, 2:{halign:'right', cellWidth:16}, 3:{halign:'right', cellWidth:24}, 4:{halign:'center', cellWidth:12},
                      5:{halign:'right', cellWidth:16}, 6:{halign:'right', cellWidth:18}, 7:{halign:'right', cellWidth:26, fontStyle:'bold'}}
      });
      y = doc.lastAutoTable.finalY + 6;

      // ---- Pagos (izquierda) y totales (derecha) ----
      var yIni = y;
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(negro[0],negro[1],negro[2]);
      doc.text('METODO DE PAGO', M, y); y += 4.5;
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
      (f.pagos || []).forEach(function(p) {
        doc.text(doc.splitTextToSize(p.forma, 56)[0], M, y);
        doc.text(p.moneda === 'USD' ? 'USD ' + fNum(p.monto, 2) : fNum(p.monto, 2), M + 85, y, {align:'right'}); y += 4;
      });
      var CA = opts.cashea;
      if (CA && CA.financiado > 0) {
        y += 1; doc.setFont('helvetica','bold'); doc.text('Desglose Cashea', M, y); y += 4; doc.setFont('helvetica','normal');
        doc.text('Inicial en tienda: USD ' + fNum(CA.inicial, 2) + ' · Financiado por Cashea: USD ' + fNum(CA.financiado, 2), M, y); y += 4;
      }
      var yPagos = y;
      y = yIni; var lx = W - M - 82;
      function tot(lbl, val, fuerte) {
        doc.setFont('helvetica', fuerte ? 'bold' : 'normal'); doc.setFontSize(fuerte ? 9 : 7.5); doc.setTextColor(negro[0],negro[1],negro[2]);
        doc.text(lbl, lx, y); doc.text(val, W - M, y, {align:'right'}); y += fuerte ? 5.5 : 4.2;
      }
      tot('DESCUENTO', fBs(T.descuentoBs));
      tot('EXENTO', fBs(T.exentoBs));
      tot('BASE IMPONIBLE (G)', fBs(T.baseImponibleBs));
      tot('SUBTOTAL', fBs(T.subtotalBs));
      tot('IVA ' + fNum(T.alicuota, 2) + '% SOBRE ' + fBs(T.baseImponibleBs), fBs(T.ivaBs));
      doc.setDrawColor(linea[0],linea[1],linea[2]); doc.line(lx, y - 2.5, W - M, y - 2.5); y += 0.5;
      tot('TOTAL FACTURA', fBs(T.totalBs), true);
      if (T.igtfAplica) {
        tot('IGTF 3,00% SOBRE ' + fBs(T.igtfBaseBs), fBs(T.igtfBs));
        tot('TOTAL FACTURA + IGTF', fBs(T.totalConIgtfBs), true);
      }
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(gris[0],gris[1],gris[2]);
      doc.text('Equivalente: USD ' + fNum(T.totalUSD, 2) + ' (base USD ' + fNum(T.baseUSD, 2) + ' + IVA USD ' + fNum(T.ivaUSD, 2) + ')', W - M, y, {align:'right'}); y += 3.5;
      doc.text('Tipo de cambio BCV: Bs ' + fNum(f.tasaBCV, 4) + ' por USD', W - M, y, {align:'right'}); y += 3.5;
      y = Math.max(y, yPagos) + 4;

      // ---- Leyendas ----
      doc.setFontSize(6.8); doc.setTextColor(gris[0],gris[1],gris[2]); doc.setFont('helvetica','normal');
      (f.leyendas || []).forEach(function(l) { var t = doc.splitTextToSize(l, W - 2 * M); doc.text(t, M, y); y += t.length * 3 + 1; });

      // ---- Pie: imprenta digital ----
      var I = f.imprenta || {}, fy = 284;
      doc.setDrawColor(linea[0],linea[1],linea[2]); doc.line(M, fy - 10, W - M, fy - 10);
      doc.setFontSize(6.8); doc.setTextColor(gris[0],gris[1],gris[2]);
      doc.text('DOCUMENTO CONFORME A LA PROVIDENCIA ADMINISTRATIVA SNAT/2026/00093', W / 2, fy - 6, {align:'center'});
      doc.text(I.razonSocial ? ('Imprenta digital: ' + I.razonSocial + ' ' + (I.rif || '') + (I.providencia ? ' · Autorizada mediante ' + I.providencia : ''))
                             : 'Imprenta digital autorizada: PENDIENTE DE CONTRATAR. Sin numero de control asignado.', W / 2, fy - 2.5, {align:'center'});
      if (E.nombreComercial) doc.text(E.nombreComercial + (f.venta && f.venta.notaNum ? ' · Nota de entrega N ' + f.venta.notaNum : ''), W / 2, fy + 1, {align:'center'});

      var nombreArchivo = String(f.numero).replace(/[^A-Za-z0-9-]/g, '') + '_' + String(R.razonSocial || 'cliente').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) + '.pdf';
      resolve({blob:doc.output('blob'), nombre:nombreArchivo, num:f.numero, control:f.control, totalBs:T.totalBs, totalUsd:T.totalUSD});
    } catch (e) { reject(e); }
  });
}


// ============================================================================================
// NOTA DE ENTREGA y COTIZACION (v1.1) — un solo modelo para vender, cotizar y reimprimir.
// d = {tipo:'nota'|'cot', nota, fecha:'yyyy-mm-dd', hora, vendedor, credito, creditoUSD, cliente:{nombre,rif,tel,dir},
//      lineas:[{codigo, producto, cantidad, precio(USD), tasa, subBs}], totalUSD, totalBS, tasa, pagos:[...],
//      moneda:'BS'|'USD' (solo cotizacion), tasaBCV (la que se imprime; la tasa de trabajo NO se imprime nunca)}
// opts = {logo, reimpresion}
// ============================================================================================
function pdfDocumento(d, opts) {
  opts = opts || {};
  var E = BOPARTS_EMPRESA;
  var esCot = d.tipo === 'cot';
  var enUSD = esCot && d.moneda === 'USD';
  function fB(n) { return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function fU(n) { return '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }
  return new Promise(function(resolve, reject) {
    try {
      var JS = window.jspdf && window.jspdf.jsPDF;
      if (!JS) throw new Error('Libreria PDF no cargo (sin internet?)');
      var doc = new JS({unit:'mm', format:'a4'});
      var W = 210, H = 297, M = 14, y = 14;
      var negro = [24,24,24], gris = [105,105,105], claro = [244,244,244], linea = [220,220,220], acento = [245,168,0];
      var num = (esCot ? 'COT-' : 'NE-') + ('000' + d.nota).slice(-4);
      var p = String(d.fecha || '').split('-'), fecha = p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : (d.fecha || '');
      var c = d.cliente || {};

      // ---------- Encabezado: emisor ----------
      var tx = M;
      if (opts.logo) { try { doc.addImage(opts.logo, 'PNG', M, y - 2, 24, 24); tx = M + 28; } catch (e) {} }
      doc.setTextColor(negro[0],negro[1],negro[2]); doc.setFont('helvetica','bold'); doc.setFontSize(13);
      doc.text(E.nombre, tx, y + 3);
      doc.setFontSize(8.5); doc.text(E.rif, tx, y + 8);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(gris[0],gris[1],gris[2]);
      var dir = doc.splitTextToSize(E.dir, (W - M - 68) - tx); doc.text(dir, tx, y + 12.5);
      doc.text(E.contacto, tx, y + 12.5 + dir.length * 3.2);

      // ---------- Encabezado: documento ----------
      var bx = W - M - 66, bw = 66;
      doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(negro[0],negro[1],negro[2]);
      doc.text(esCot ? 'COTIZACION' : 'NOTA DE ENTREGA', W - M, y + 3, {align:'right'});
      doc.setFontSize(11); doc.setTextColor(acento[0] - 40, acento[1] - 50, 0);
      doc.text('N° ' + num, W - M, y + 9, {align:'right'});
      if (opts.reimpresion) {
        doc.setFontSize(6.5); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text('REIMPRESION', W - M, y + 12.5, {align:'right'});
      }
      var meta = [['Fecha', fecha + (d.hora ? '  ' + d.hora : '')], ['Vendedor', d.vendedor || '-']];
      if (esCot) meta.push(['Validez', '24 horas'], ['Moneda', enUSD ? 'Dolares (USD)' : 'Bolivares (Bs)']);
      else meta.push(['Condicion', d.credito ? 'CREDITO' : 'CONTADO']);
      var my = y + 16;
      meta.forEach(function(m) {
        doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(m[0], bx, my);
        doc.setFont('helvetica','bold'); doc.setTextColor(negro[0],negro[1],negro[2]); doc.text(String(m[1]).slice(0, 34), W - M, my, {align:'right'});
        my += 3.8;
      });
      y = Math.max(y + 16 + dir.length * 3.2, my) + 2;
      doc.setFillColor(acento[0],acento[1],acento[2]); doc.rect(M, y, W - 2 * M, 1.1, 'F');
      y += 5;

      // ---------- Cliente y operacion ----------
      var colW = (W - 2 * M - 6) / 2;
      function caja(x, titulo, filas) {
        doc.setFillColor(claro[0],claro[1],claro[2]); doc.roundedRect(x, y, colW, 25, 1.5, 1.5, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(negro[0],negro[1],negro[2]); doc.text(titulo, x + 3, y + 4.5);
        var yy = y + 9.5;
        filas.forEach(function(f) {
          doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(f[0], x + 3, yy);
          doc.setFont('helvetica', f[2] ? 'bold' : 'normal'); doc.setFontSize(f[2] ? 8.5 : 7.5); doc.setTextColor(negro[0],negro[1],negro[2]);
          doc.text(doc.splitTextToSize(String(f[1] || '-'), colW - 30)[0], x + 26, yy);
          yy += 4;
        });
      }
      caja(M, 'CLIENTE', [['Nombre', String(c.nombre || '').toUpperCase(), true], ['C.I. / RIF', c.rif], ['Telefono', c.tel], ['Direccion', c.dir]]);
      // v1.2 — La tasa de TRABAJO es interna: fija los bolivares y NUNCA se imprime. Lo que ve el cliente es la tasa
      // oficial BCV y la referencia en dolares a esa tasa (Bs / BCV).
      var tasa = Number(d.tasa) || 0;            // trabajo: solo para pasar USD de lista a Bs
      var bcv = Number(d.tasaBCV) || 0;          // publica
      function refU(bs) { return bcv ? fU(bs / bcv) : '-'; }
      var info = enUSD
        ? [['Moneda', 'Dolares (USD)'], ['Validez', '24 horas o hasta agotar existencia']]
        : [['Tasa BCV', bcv ? 'Bs ' + fB(bcv) + ' por USD' : 'no registrada'], ['Moneda', 'Bolivares (ref. USD a tasa BCV)'],
           esCot ? ['Validez', '24 horas o hasta agotar existencia'] : ['Condicion', d.credito ? 'Credito' : 'Contado']];
      caja(M + colW + 6, 'OPERACION', info);
      y += 30;

      // ---------- Renglones ----------
      var totalBs = 0, totalUsd = 0, unidades = 0;
      var body = (d.lineas || []).map(function(l, i) {
        var subUsd = (Number(l.precio) || 0) * (Number(l.cantidad) || 0);
        var t = Number(l.tasa) || tasa;
        var subBs = Number(l.subBs) || Math.round(subUsd * t * 100) / 100;
        totalBs += subBs; totalUsd += subUsd; unidades += Number(l.cantidad) || 0;
        var puBs = l.cantidad ? subBs / l.cantidad : 0;
        return enUSD
          ? [String(i + 1), l.codigo || '', l.producto, String(l.cantidad), fU(l.precio), fU(subUsd)]
          : [String(i + 1), l.codigo || '', l.producto, String(l.cantidad), fB(puBs), fB(subBs), refU(subBs)];
      });
      if (!esCot && d.totalBS && Math.abs(d.totalBS - totalBs) > 1) totalBs = d.totalBS;
      if (!esCot && d.totalUSD) totalUsd = d.totalUSD;
      var head = enUSD ? [['#', 'CODIGO', 'DESCRIPCION', 'CANT.', 'P. UNIT. $', 'TOTAL $']]
                       : [['#', 'CODIGO', 'DESCRIPCION', 'CANT.', 'P. UNIT. Bs', 'TOTAL Bs', 'REF. $ BCV']];
      var cs = enUSD ? {0:{cellWidth:8, halign:'center'}, 1:{cellWidth:27}, 3:{cellWidth:14, halign:'center'}, 4:{cellWidth:24, halign:'right'}, 5:{cellWidth:26, halign:'right', fontStyle:'bold'}}
                     : {0:{cellWidth:8, halign:'center'}, 1:{cellWidth:27}, 3:{cellWidth:13, halign:'center'}, 4:{cellWidth:24, halign:'right'}, 5:{cellWidth:26, halign:'right', fontStyle:'bold'}, 6:{cellWidth:18, halign:'right', textColor:[105,105,105]}};
      var paginas = 0;
      doc.autoTable({
        startY:y, margin:{left:M, right:M, bottom:22}, head:head, body:body,
        styles:{fontSize:7.6, cellPadding:{top:1.8, bottom:1.8, left:1.6, right:1.6}, textColor:negro, lineColor:linea, lineWidth:0.1},
        headStyles:{fillColor:negro, textColor:[255,255,255], fontStyle:'bold', fontSize:7.2},
        alternateRowStyles:{fillColor:[250,250,250]}, columnStyles:cs,
        didDrawPage:function() { paginas++; }
      });
      y = doc.lastAutoTable.finalY + 5;
      if (y > H - 95) { doc.addPage(); y = 20; }

      // ---------- Pagos (izq) y totales (der) ----------
      var yIni = y;
      if (!esCot) {
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(negro[0],negro[1],negro[2]); doc.text('FORMA DE PAGO', M, y); y += 4.5;
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
        var hay = false;
        (d.pagos || []).forEach(function(pg) {
          if (!pg.monto) return; hay = true;
          // v1.2 — todo en bolivares: lo cobrado en divisas (o a credito) se expresa en Bs al precio de la venta.
          var usdish = pg.moneda === 'USD' || /credito/i.test(pg.metodo);
          var pgBs = usdish ? Math.round(pg.monto * tasa * 100) / 100 : Number(pg.monto) || 0;
          doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(String(pg.label || (pg.metodo + (pg.banco ? ' ' + pg.banco : ''))).slice(0, 40), M, y);
          doc.setTextColor(negro[0],negro[1],negro[2]); doc.text('Bs ' + fB(pgBs), M + 82, y, {align:'right'});
          y += 4;
        });
        if (!hay) { doc.setTextColor(gris[0],gris[1],gris[2]); doc.text('-', M, y); y += 4; }
        if (d.credito && d.creditoUSD) {
          doc.setFont('helvetica','bold'); doc.setTextColor(negro[0],negro[1],negro[2]);
          var crBs = Math.round(d.creditoUSD * tasa * 100) / 100;
          doc.text('Saldo a credito: Bs ' + fB(crBs) + (bcv ? '  (ref. ' + refU(crBs) + ')' : ''), M, y + 1); y += 5;
        }
      }
      var yPag = y; y = yIni;
      var tx0 = W - M - 76;
      function fila(lbl, val) {
        doc.setFont('helvetica','normal'); doc.setFontSize(7.8); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(lbl, tx0, y);
        doc.setTextColor(negro[0],negro[1],negro[2]); doc.text(val, W - M, y, {align:'right'}); y += 4.6;
      }
      fila('Renglones / unidades', (d.lineas || []).length + ' / ' + unidades);
      fila('Subtotal', enUSD ? fU(totalUsd) : 'Bs ' + fB(totalBs));
      y += 1;
      doc.setFillColor(negro[0],negro[1],negro[2]); doc.roundedRect(tx0 - 3, y - 4, 76 + 3, 11, 1.5, 1.5, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(255,255,255); doc.text('TOTAL', tx0, y + 2.8);
      doc.setFontSize(13); doc.setTextColor(acento[0],acento[1],acento[2]);
      doc.text(enUSD ? fU(totalUsd) : 'Bs ' + fB(totalBs), W - M - 2, y + 3.2, {align:'right'});
      y += 11;
      if (!enUSD) { doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(gris[0],gris[1],gris[2]);
        doc.text(bcv ? 'Equivalente: ' + refU(totalBs) + '  ·  tasa BCV Bs ' + fB(bcv) : 'Sin tasa BCV registrada para esta fecha', W - M, y, {align:'right'}); y += 4; }
      y = Math.max(y, yPag) + 6;

      // ---------- Condiciones ----------
      var cond = esCot
        ? ['Precios sujetos a cambio sin previo aviso. Cotizacion valida por 24 horas o hasta agotar existencia.',
           'Esta cotizacion no constituye compromiso de venta ni reserva de mercancia.']
        : ['Revise su mercancia al recibirla: una vez firmada esta nota se entiende recibida conforme.',
           'Cambios y devoluciones dentro de los 5 dias siguientes, presentando esta nota y el producto sin uso y en su empaque original.',
           'Montos en bolivares. La referencia en dolares se calcula a la tasa oficial del BCV del dia de la venta y es informativa.'];
      doc.setDrawColor(linea[0],linea[1],linea[2]); doc.setFillColor(252,252,252);
      var lns = [];
      cond.forEach(function(t) { lns = lns.concat(doc.splitTextToSize('• ' + t, W - 2 * M - 6)); });
      var hC = 6 + lns.length * 3.3;
      doc.roundedRect(M, y, W - 2 * M, hC, 1.2, 1.2, 'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(7.2); doc.setTextColor(negro[0],negro[1],negro[2]); doc.text('CONDICIONES', M + 3, y + 4);
      doc.setFont('helvetica','normal'); doc.setFontSize(6.9); doc.setTextColor(gris[0],gris[1],gris[2]); doc.text(lns, M + 3, y + 8);
      y += hC + 10;

      // ---------- Firmas (solo nota) ----------
      if (!esCot) {
        if (y > H - 45) { doc.addPage(); y = 30; }
        var fw = 78;
        doc.setDrawColor(150,150,150);
        doc.line(M, y + 10, M + fw, y + 10); doc.line(W - M - fw, y + 10, W - M, y + 10);
        doc.setFont('helvetica','bold'); doc.setFontSize(7.2); doc.setTextColor(negro[0],negro[1],negro[2]);
        doc.text('ENTREGADO POR', M, y + 14); doc.text('RECIBIDO CONFORME', W - M - fw, y + 14);
        doc.setFont('helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(gris[0],gris[1],gris[2]);
        doc.text((d.vendedor || '') + ' · ' + E.nombre, M, y + 18);
        doc.text('Nombre:                              C.I.:                     Fecha:', W - M - fw, y + 18);
      }

      // ---------- Pie en todas las paginas ----------
      var total = doc.internal.getNumberOfPages();
      for (var pg = 1; pg <= total; pg++) {
        doc.setPage(pg);
        doc.setDrawColor(linea[0],linea[1],linea[2]); doc.line(M, H - 16, W - M, H - 16);
        doc.setFont('helvetica','normal'); doc.setFontSize(6.6); doc.setTextColor(gris[0],gris[1],gris[2]);
        doc.text(esCot ? 'Documento informativo. No constituye factura ni compromiso de venta.'
                       : 'Documento sin valor fiscal. Comprobante de entrega de mercancia.', M, H - 12);
        doc.text(E.tienda, M, H - 8.5);
        doc.text(num + '  ·  Pagina ' + pg + ' de ' + total, W - M, H - 12, {align:'right'});
      }

      var nombre = num + '_' + String(c.nombre || 'cliente').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) + '.pdf';
      resolve({blob:doc.output('blob'), nombre:nombre, num:num, totalBs:Math.round(totalBs), totalUsd:totalUsd,
               refBcv:bcv ? Math.round(totalBs / bcv * 100) / 100 : 0, moneda:enUSD ? 'USD' : 'BS'});
    } catch (e) { reject(e); }
  });
}
// Reimpresion desde Documentos (action=documento)
function pdfNota(d, opts) {
  var x = {};
  for (var k in d) x[k] = d[k];
  x.tipo = 'nota';
  if (!x.tasa) { var l0 = (d.lineas || [])[0]; x.tasa = l0 && l0.tasa ? l0.tasa : (d.totalUSD ? d.totalBS / d.totalUSD : 0); }
  return pdfDocumento(x, opts);
}
