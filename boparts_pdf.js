/* =============================================================================
   boparts_pdf.js — DOCUMENTOS EN PDF COMPARTIDOS (v1.0, 2026-11-02)
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


// NOTA DE ENTREGA (reimpresion). d = respuesta de action=documento. Misma presentacion que la de Ventas.
function pdfNota(d, opts) {
  opts = opts || {};
  var E = BOPARTS_EMPRESA;
  function fmtB(n) { return 'Bs ' + Math.round(Number(n) || 0).toLocaleString('es-VE'); }
  function fmtU(n) { return '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }
  return new Promise(function(resolve, reject) {
    try {
      var JS = window.jspdf && window.jspdf.jsPDF;
      if (!JS) throw new Error('Libreria PDF no cargo (sin internet?)');
      var num = 'NE-' + ('000' + d.nota).slice(-4);
      var doc = new JS({unit:'mm', format:'a4'});
      var W = 210, M = 14, y = 12;
      var amarillo = [245,168,0], negro = [17,17,17], gris = [120,120,120];
      var p = String(d.fecha || '').split('-'), fecha = p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d.fecha;

      doc.setFillColor(negro[0],negro[1],negro[2]); doc.roundedRect(M, y, W - 2*M, 30, 2, 2, 'F');
      var tx = M + 6;
      if (opts.logo) { try { doc.addImage(opts.logo, 'PNG', M + 4, y + 4, 22, 22); tx = M + 30; } catch (e) {} }
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(E.nombre, tx, y + 10);
      doc.setTextColor(amarillo[0],amarillo[1],amarillo[2]); doc.setFontSize(9); doc.text(E.rif, tx, y + 15);
      doc.setTextColor(200,200,200); doc.setFont('helvetica','normal'); doc.setFontSize(7);
      doc.text(E.dir, tx, y + 20); doc.text(E.contacto, tx, y + 24);
      doc.setFillColor(amarillo[0],amarillo[1],amarillo[2]); doc.roundedRect(W - M - 52, y + 6, 46, 18, 2, 2, 'F');
      doc.setTextColor(negro[0],negro[1],negro[2]); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text('NOTA DE ENTREGA', W - M - 29, y + 13, {align:'center'});
      doc.setFontSize(11); doc.text('N ' + num, W - M - 29, y + 20, {align:'center'});
      y += 33;

      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(gris[0],gris[1],gris[2]);
      doc.text('FECHA', M, y); doc.text('CONDICION', M + 45, y); doc.text('VENDEDOR', M + 95, y);
      doc.setFont('helvetica','bold'); doc.setTextColor(negro[0],negro[1],negro[2]); doc.setFontSize(9);
      doc.text(fecha + (d.hora ? '  ' + d.hora : ''), M, y + 5); doc.text(d.credito ? 'CREDITO' : 'CONTADO', M + 45, y + 5);
      doc.text(String(d.vendedor || '').slice(0, 30), M + 95, y + 5);
      y += 9; doc.setDrawColor(230,230,230); doc.line(M, y, W - M, y); y += 4;

      var c = d.cliente || {};
      doc.setFillColor(amarillo[0],amarillo[1],amarillo[2]); doc.rect(M, y, W - 2*M, 6, 'F');
      doc.setFontSize(8); doc.setTextColor(negro[0],negro[1],negro[2]); doc.text('INFORMACION DEL CLIENTE', M + 3, y + 4.2);
      y += 6;
      doc.setFillColor(249,249,249); doc.rect(M, y, W - 2*M, 18, 'F');
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(gris[0],gris[1],gris[2]);
      doc.text('NOMBRE / RAZON SOCIAL', M + 3, y + 4);
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(negro[0],negro[1],negro[2]);
      doc.text(String(c.nombre || '').toUpperCase().slice(0, 60), M + 3, y + 9);
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(gris[0],gris[1],gris[2]);
      doc.text(('RIF: ' + (c.rif || '-') + (c.tel ? '   TEL: ' + c.tel : '') + (c.dir ? '   DIR: ' + c.dir : '')).slice(0, 120), M + 3, y + 14);
      y += 22;

      var body = [], totalBs = 0, totalUsd = 0;
      (d.lineas || []).forEach(function(l) {
        var subUsd = l.precio * l.cantidad;
        var subBs = l.subBs || Math.round(subUsd * (l.tasa || 0));
        totalBs += subBs; totalUsd += subUsd;
        var puBs = l.cantidad ? subBs / l.cantidad : 0;
        body.push([l.producto, String(l.cantidad), fmtB(puBs), fmtB(subBs)]);
      });
      if (d.totalBS && Math.abs(d.totalBS - totalBs) > 1) totalBs = d.totalBS;     // descuento a nivel de venta
      if (d.totalUSD) totalUsd = d.totalUSD;
      doc.autoTable({
        startY:y, margin:{left:M, right:M},
        head:[['DESCRIPCION','CANT.','PRECIO Bs','TOTAL Bs']], body:body,
        styles:{fontSize:8, cellPadding:2, textColor:[17,17,17]},
        headStyles:{fillColor:negro, textColor:[255,255,255], fontStyle:'bold'},
        alternateRowStyles:{fillColor:[246,246,246]},
        columnStyles:{1:{halign:'center', cellWidth:16}, 2:{cellWidth:32, halign:'right'}, 3:{cellWidth:34, halign:'right', fontStyle:'bold'}}
      });
      y = doc.lastAutoTable.finalY + 5;
      doc.setFillColor(amarillo[0],amarillo[1],amarillo[2]); doc.roundedRect(W - M - 62, y, 62, 16, 1.5, 1.5, 'F');
      doc.setTextColor(negro[0],negro[1],negro[2]); doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.text('TOTAL', W - M - 58, y + 5);
      doc.setFontSize(14); doc.text(fmtB(totalBs), W - M - 4, y + 11, {align:'right'});
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.text('Ref. ' + fmtU(totalUsd), W - M - 58, y + 13);
      y += 22;
      if ((d.pagos || []).length) {
        doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text('FORMA DE PAGO', M, y); y += 4.5;
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(gris[0],gris[1],gris[2]);
        d.pagos.forEach(function(pg) {
          if (!pg.monto) return;
          doc.text('- ' + pg.metodo + (pg.banco ? ' ' + pg.banco : '') + ': ' + (pg.moneda === 'USD' || /credito/i.test(pg.metodo) ? fmtU(pg.monto) : fmtB(pg.monto)), M + 2, y); y += 4;
        });
      }
      y += 8; doc.setDrawColor(150,150,150); doc.setLineDashPattern([1,1], 0);
      doc.line(M, y, M + 75, y); doc.line(W - M - 75, y, W - M, y); doc.setLineDashPattern([], 0);
      doc.setFontSize(7); doc.setTextColor(gris[0],gris[1],gris[2]);
      doc.text('Firma y sello del receptor', M, y + 4); doc.text('Firma del representante BOSC SUPPLY', W - M, y + 4, {align:'right'});

      var fy = 285;
      doc.setFillColor(negro[0],negro[1],negro[2]); doc.rect(M, fy - 6, W - 2*M, 8, 'F');
      doc.setTextColor(200,200,200); doc.setFontSize(7); doc.text(E.nombre + ' | ' + E.rif + ' | ' + E.tienda, W/2, fy - 1, {align:'center'});
      doc.setTextColor(150,150,150); doc.setFontSize(6.5);
      doc.text('Este documento no tiene valor fiscal. Solo sirve como comprobante de entrega.' + (opts.reimpresion ? '  REIMPRESION.' : ''), W/2, fy + 6, {align:'center'});
      var nombre = num + '_' + String(c.nombre || 'cliente').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) + '.pdf';
      resolve({blob:doc.output('blob'), nombre:nombre, num:num, totalBs:totalBs, totalUsd:totalUsd});
    } catch (e) { reject(e); }
  });
}
