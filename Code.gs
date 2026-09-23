/**
 * Repuesto BoParts — Code.gs
 * VERSION: v26.1 (2026-09-23) | una venta repetida ya no se escribe dos veces
 *
 * v26.1 — El 23/09 se duplico otra venta (unos aceites Xpeso): salio un error y Reinaldo registro
 *   otra vez. Dos causas, las dos corregidas:
 *   1. EL CANDADO NO VACIABA LA HOJA. Ninguna funcion llamaba SpreadsheetApp.flush() antes de soltar
 *      el candado. Apps Script acumula las escrituras y las manda al final; si el candado se suelta
 *      antes, el siguiente intento puede buscar el ID de la venta, no encontrarlo todavia, y escribirla
 *      otra vez. Google lo pide explicitamente para LockService. Se agrego en los 18 puntos donde se
 *      suelta un candado: ventas, abonos, apartados, costeo, notas, facturas, todo lo que toca dinero.
 *   2. LA VENTA NO DECIA QUE YA ESTABA. guardarVenta_ reconocia la repetida y no la duplicaba, pero
 *      devolvia el mismo numero de nota que una nueva. Ahora la respuesta trae 'repetida', y la
 *      pantalla dice "Esta venta YA estaba registrada como nota X. NO se duplico."
 *
 * VERSION anterior: v26 (2026-09-22) | integridad: abono, apartado y comision del aliado
 *
 * v26 — tres fallos que mueven dinero, los tres confirmados en produccion el 22/09:
 *   1. ABONO IDEMPOTENTE. guardarAbono_ escribia el idAbono en la hoja y NUNCA lo buscaba. Con mala
 *      senal la pantalla dice "reintenta", el telefono reenvia, y quedaban dos abonos por el mismo
 *      pago: el saldo del cliente bajaba el doble. Ahora se busca antes de escribir, dentro del lock
 *      que ya tenia doPost, y la respuesta trae 'repetido' para que la app lo diga.
 *   2. ENTREGA DE APARTADO SIN DUPLICAR. El idVenta llevaba un timestamp: si el script se caia entre
 *      crear la venta y marcar ENTREGADO, el reintento generaba una SEGUNDA venta con otro ID, con
 *      su nota y su descuento de inventario. Ahora el ID sale del numero de apartado, que es unico.
 *   3. COMISION DEL ALIADO QUE SE DESCONGELA. Una venta a credito con aliado nacia con la comision en
 *      'PENDIENTE COBRO' y NINGUNA linea de codigo la sacaba de ahi cuando el cliente pagaba: el
 *      negocio quedaba debiendo comisiones que el sistema jamas mostraba como pagaderas. Ahora, al
 *      quedar la nota PAGADA COMPLETA, pasa a 'PENDIENTE' y entra a la liquidacion.
 *      Para lo ya registrado: ejecutar UNA VEZ repararComisionesCobradas() desde el editor.
 *
 * VERSION anterior: v25.1 (2026-09-21) | dos correcciones urgentes
 *
 * v25.1:
 *   - LA VENTA ESTABA BLOQUEADA PARA LOS VENDEDORES. El permiso se calculaba desde data.tipo, pero la
 *     venta no manda 'tipo' (se despacha por data.vendedor). Caia en '' y deny-by-default la trataba
 *     como accion de socios. Desde que se encendio el login, Reinaldo no podia registrar una venta;
 *     no se noto porque un socio pasa igual. Ahora claveDePost_() reconoce lo mismo que el despacho.
 *     Efecto secundario: recien ahora se aplica de verdad "el vendedor es quien inicio sesion".
 *   - LA HORA SALIA COMO "Sat Dec 30 1899". La hoja convertia el texto "08:05" en valor de hora, que
 *     por dentro es una fecha de 1899. Se arregla al escribir (celda en texto) y al leer (horaTexto_),
 *     asi que las filas que ya quedaron mal tambien se ven bien.
 *
 * v25 — TAREAS. Dos hojas nuevas, TAREAS (que hay que hacer) y TAREAS_DIA (que se hizo).
 *   - Tres tipos de tarea. AUTO se cuenta sola con lo que la persona ya registro en el sistema
 *     (fotos nuevas, conteos, demanda, ventas): nadie la marca, asi que nadie la puede inflar.
 *     ENLACE exige el link de la publicacion como prueba. CHECK se marca a mano y por eso es la
 *     mas debil: se usa solo donde no queda rastro, como abrir la tienda.
 *   - TAREAS_DIA guarda UNA fila por tarea-persona-dia. Volver a marcar reescribe la fila, no apila.
 *   - Tareas propias: lo que la persona hizo sin que nadie se lo mandara. Se guarda aparte.
 *   - action=rendimiento devuelve TRES marcadores separados — cumplimiento, volumen, iniciativa —
 *     y ninguno se promedia con otro. Un numero unico esconde justo lo que hay que ver.
 *   - CORRECCION: VERSION_SCRIPT seguia en v21.4 mientras el encabezado decia v24. El sello que
 *     sirve para saber que hay desplegado estaba mintiendo. Ahora se cambia junto con el encabezado.
 *   - Correr prepararTareas() una vez desde el editor para crear las hojas.
 *
 * v24:
 *   - Hoja FOTOS_LOG: cada carga de fotos deja quien, cuando, que producto, cuantas fotos NUEVAS y cuantas
 *     reemplazo. Hasta ahora una foto se escribia en la fila del producto y no quedaba rastro de nada: no
 *     habia forma de saber quien trabajo el catalogo ni cuanto.
 *   - action=ventas devuelve tambien conteos y demanda del periodo, para poder medir por persona sin pedir
 *     otra vez lo mismo.
 *
 * v23 (2026-09-19): ficha del producto y cambio de precio con registro.
 *
 * v23 — INVENTARIO PARTIDO EN DOS, como compras:
 *   - action=producto&codigo=X: la ficha completa de un producto. Stock, costo, precio, margen y el
 *     historial de todo lo que le paso: ventas, devoluciones, compras y conteos, en una sola linea de tiempo.
 *     Solo socios: lleva el costo.
 *   - tipo=precio: cambia el precio de venta de un producto. Es la primera vez que se puede hacer sin abrir
 *     la hoja a mano. Cada cambio queda en PRECIOS_LOG con quien, cuando, de cuanto a cuanto y por que.
 *     Hasta ahora un precio cambiaba sin dejar rastro: cuando el margen de un producto se movia, no habia
 *     forma de saber si fue el costo o alguien que toco el precio.
 *
 * v22.1 (2026-09-19): las notas de METODOS_PAGO salian como metodos de pago.
 *
 * v22.1: las filas de notas de METODOS_PAGO aparecian como metodos de pago en la pantalla de venta. Un
 *        metodo real tiene METODO y MONEDA; una nota solo tiene texto en la primera columna. Ahora se
 *        exige lo primero, asi que cualquier fila suelta en esa hoja se ignora en vez de ensuciar la venta.
 *
 * v22 — LIQUIDACION DE ALIADOS. El aliado deja de ser una lista aparte y pasa a ser una fila de CLIENTES:
 *   CLIENTES gana tres columnas: J ALIADO (SI/NO), K COMISION_PCT, L NEGOCIO.
 *
 *   Por que importa: cuando un aliado se lleva mercancia a credito, esa deuda vive en CXC_MOV a nombre del
 *   cliente, y su comision vive en COMISIONES a nombre del aliado. Siendo dos registros distintos, se le
 *   podia pagar la comision completa a alguien que debia mercancia y nada avisaba. Ahora es la misma persona,
 *   con la misma cedula, y la liquidacion resta.
 *
 *   - El PORCENTAJE lo pone el servidor, no el telefono: se lee de CLIENTES al guardar la venta. Asi no se
 *     puede alterar desde el navegador y no hace falta mandarselo al telefono de un vendedor.
 *   - SIN AUTOCOMISION: si el aliado de la venta es el mismo cliente que compra, no se genera comision.
 *   - COMISIONES gana COMISION_USD (columna N): la comision se guardaba solo en Bs y la deuda esta en USD.
 *     Sin eso, restar una de otra dependia de la tasa del dia en que se liquida, no la de la venta.
 *   - action=liquidacion: por aliado, comisiones cobrables + deuda + neto a pagar.
 *   - tipo=liquidar_aliado: marca las comisiones PAGADA, abona la deuda con metodo COMPENSACION (no es
 *     dinero que entro: si entrara como cobro normal, la caja cuadraria de mas) y deja el neto pagado.
 *
 * v21.6 (2026-09-19): una recepcion reenviada ya no se duplica.
 *
 * v21.6: una recepcion reenviada ya no se duplica. Era el mismo fallo que se corrigio en ventas con v20, que
 *        quedo fuera en compras. Ahora se identifica por ID_COMPRA y, si ya existe, no se escribe nada y se
 *        devuelve lo de la primera vez. Importa mas de lo que parece: al duplicarse no solo entraba la
 *        recepcion dos veces (y el stock con ella), sino que los productos marcados como NUEVOS se creaban
 *        otra vez en LISTA DE PRODUCTOS, ensuciando el catalogo con codigos repetidos.
 *
 * v21.5: cada fila de action=productos lleva al final su NUMERO DE FILA real en la hoja. boparts_fotos.html
 *        la calculaba contando filas del CSV; como esta respuesta omite las filas sin producto, esa cuenta
 *        se habria corrido y una foto podia caer en otro producto.
 *
 * v21.4: cada respuesta del script incluye su version (campo "v"). Asi, cuando una pantalla falla, se sabe en
 *        un vistazo si el script desplegado es el que corresponde o quedo uno viejo. Es el error mas comun al
 *        instalar: guardar con Ctrl+S no despliega; hay que hacer Implementar > Nueva version.
 *
 * v21.3: CORRIGE index v10. El CSV publicado entregaba TODAS las celdas como texto; la hoja las entrega con
 *        su tipo real (numero, fecha). Un codigo numerico llegaba como numero y la pantalla reventaba con
 *        "(q[0] || '').trim is not a function". Ahora action=productos y action=catalogo devuelven cada celda
 *        ya convertida a texto, igual que hacia el CSV. Las fechas salen como dd/MM/yyyy.
 *
 * v21.2: action=quienes devuelve los nombres activos para llenar el desplegable del login. Es la UNICA
 *        accion que no exige sesion, porque hace falta antes de tener una. No entrega PIN, ni hash, ni token.
 *
 * v21.1: action=metodos devuelve los metodos de pago y los aliados desde las hojas METODOS_PAGO y ALIADOS,
 *        para que agregar un banco o cambiar una comision se haga en la hoja y no en el codigo. La primera
 *        vez, si la hoja esta vacia, se llena con exactamente los valores que hoy estan escritos dentro de
 *        boparts_ventas.html: el dia que se instala, nada cambia.
 *
 * v21 — BLOQUE D, parte 1: identidad en el servidor. NO cambia nada en la operacion hasta que se active.
 *
 *   INTERRUPTOR: CONFIG!B15. Escribe "SI" para exigir sesion, "NO" (o vacio) para trabajar como hasta hoy.
 *   Es una celda, no codigo: si algo sale mal en plena venta, escribes NO y en segundos todo vuelve a funcionar
 *   sin redesplegar nada.
 *
 *   Lo que agrega:
 *     - Hoja USUARIOS: quien puede entrar, con que PIN y con que rol (SOCIO o VENDEDOR).
 *       Los PIN se ponen desde la hoja, en la columna PIN_NUEVO; el script los convierte a hash y borra el
 *       texto en claro. El PIN nunca queda escrito en ningun lado.
 *     - tipo 'login': valida usuario + PIN y devuelve un token que vale 12 horas.
 *     - Cada accion exige un rol minimo, verificado AQUI, no en el telefono.
 *     - action=productos y action=catalogo: sirven LISTA DE PRODUCTOS y CATALOGO PROVEEDORES por el script,
 *       para poder despublicar esos CSV. A un VENDEDOR se le entrega la lista SIN las columnas de costo.
 *     - La venta rellena el costo de cada linea desde la hoja si el telefono no lo manda, para que el costo
 *       deje de viajar por internet y no se pueda alterar desde el navegador.
 *
 *   Revocar a alguien: borra su TOKEN en USUARIOS o pon NO en ACTIVO. Surte efecto en la siguiente llamada.
 *
 * v20 (2026-09-17) | va con ventas v13.3, compras v2.3, inventario v1.3, devoluciones v1.3, gerencia v2.3
 *
 * v20 — integridad. Corrige tres fallos que podian ensuciar los datos:
 *   1. El conteo de inventario contaba los movimientos del MISMO dia anteriores al conteo. Ahora el corte es por
 *      fecha y hora: solo cuentan las ventas y compras posteriores al instante del conteo.
 *   2. Una venta reenviada se guardaba dos veces. Ahora cada venta se identifica por ID_VENTA y, si ya existe,
 *      el script devuelve el resultado anterior en vez de duplicarla. Igual para costeos y devoluciones.
 *   3. La venta escribia cabecera y consumia numero de nota antes de validar. Ahora valida todo primero.
 *
 * v19.2: si algo falla dentro de un doGet, se devolvia la pagina de error de Google (HTML) y las apps mostraban
 *        "Unexpected token '<'". Ahora doGet responde siempre JSON con el motivo. buscarNota_ tolera hojas con
 *        menos columnas de las esperadas.
 *
 * v19.1: el costeo tambien fija el PRECIO de venta de cada producto (columna I de LISTA DE PRODUCTOS) y limpia la
 *        marca "NUEVO - SIN PRECIO" de la columna REF. Asi el producto sale del costeo listo para vender.
 *
 * v19: IVA, tasa BCV y factura fiscal. CONFIG guarda la tasa BCV (B10, con su fecha en B11) ademas de la tasa de
 *      trabajo, y la numeracion de factura (B12) y de control (B13, hasta B14, del rango de la imprenta).
 *      doGet action=nextFactura entrega el siguiente par numero/control. La venta guarda base, IVA, total,
 *      tasa BCV y, si se pago con Cashea, inicial, financiado, comision (4% del total + 4% del financiado) y neto.
 *      Hoja FACTURAS con el correlativo fiscal.
 *
 * v18: costeo de compras y cuentas por pagar. Al costear una recepcion se ponen los costos de cada linea, se define
 *      si fue de contado o a credito (con sus dias), se actualiza el costo del producto por PROMEDIO PONDERADO y,
 *      si quedo a credito, nace el compromiso de pago en CXP_MOV (con abonos parciales).
 *
 * v17.1: el bloque de FOTOS se activaba con cualquier mensaje que trajera 'codigo', y se tragaba los conteos de
 *        inventario (respondia ok sin guardar nada). Ahora solo atiende mensajes sin 'tipo' y con imagenes.
 *
 * v17: inventario por conteo. Cada producto arranca cuando se cuenta por primera vez: LISTA DE PRODUCTOS guarda
 *      STOCK_CONTEO (O) y FECHA_CONTEO (P), y desde esa fecha se suman las compras y se restan las ventas,
 *      devoluciones y cambios. Cada recuento queda en la hoja CONTEOS; si hay diferencia, se marca para revision.
 *
 * v16: ficha de cliente. CLIENTES suma LIMITE_USD (H) y DIAS_PLAZO (I). Guardar un cliente ya no duplica: busca
 *      por cedula o telefono (que son unicos) y actualiza. doGet action=clientes devuelve tambien esos campos y
 *      action=cliente_stats las metricas de un cliente (compras, frecuencia, margen, pago, productos).
 *
 * v15: devoluciones y cambios. doGet action=nota devuelve las lineas de una nota de entrega; doPost tipo='devolucion'
 *      registra la devolucion o el cambio: escribe lineas negativas en VENTAS_DETALLE (con su costo original) y las
 *      del producto nuevo si es cambio, de modo que margen y stock queden correctos. Hoja DEVOLUCIONES.
 *
 * v14: apartados y contra pedido. Hojas APARTADOS (cabecera), APARTADOS_DET (productos con precio y costo
 *      congelados) y APARTADOS_MOV (abonos, devoluciones, credito a favor). El abono NO es venta: la venta se
 *      registra al entregar, usando los anticipos como forma de pago.
 *
 * v13: tasa BCV centralizada en CONFIG!B4 (fecha y quien la fijo en B5/B6). doGet action=config la entrega a todas
 *      las apps; doPost tipo='tasa' la cambia (solo desde Gerencia). Historial en la hoja TASAS.
 *      Ventas a socio: llegan con canal 'SOCIO' y precio de costo; no son ventas normales para el reporte.
 *
 * v12.2: las fechas reales de la hoja no pasaban la prueba `instanceof Date` (llegan de otro contexto) y quedaban
 *        sin interpretar: ningun periodo sumaba. Ahora se reconocen por su comportamiento y se convierten con la
 *        zona horaria de Venezuela, no la del proyecto (que estaba en Los Angeles y corria las fechas un dia).
 *
 * v12.1: las fechas guardadas como texto ISO ('2026-06-29') no se reconocian y esas filas quedaban fuera de todos
 *        los periodos. iso_() ahora acepta ISO, d/m/aaaa y Date. Nuevo doGet action=diag para ver como esta
 *        guardada la fecha en cada hoja.
 *
 * v12: doGet action=ventas&desde=&hasta= devuelve VENTAS_DETALLE, VENTAS y GASTOS del periodo (app de gerencia).
 *      Solo lectura; no publica ninguna hoja nueva como CSV.
 *
 * v11.5: fotos se guardan buscando el producto por CODIGO (col A); la fila solo se usa como respaldo.
 *        Asi no se escriben fotos en el producto equivocado si alguien ordena o inserta filas.
 *
 * v11.4: si un cargo de CXC_MOV no tiene productos (cargos anteriores a v11.3), se buscan en VENTAS por ID_VENTA
 *        y se escriben en la columna Q, una sola vez. Tambien se completa el encabezado PRODUCTOS si falta.
 *
 * v11.3: CXC_MOV guarda los productos del cargo (col Q) y las fechas se devuelven ya formateadas dd/mm/aaaa.
 *
 * v11.2: cuenta corriente de socios. Hoja SOCIOS_MOV: un gasto pagado por RODOLFO o JAVIER genera un PRESTAMO
 *        (la tienda le debe al socio). REEMBOLSO, APORTE_CAPITAL y RETIRO se registran desde gerencia (doPost tipo='socio').
 *        doGet action=socios → saldo por socio.
 *
 * v11.1: doPost tipo='gasto' → hoja GASTOS (se crea sola). Compras de inventario NO van aqui: entran por COMPRAS.
 *
 * v11: Compras (recepcion sin costo): doGet action=proveedores; doPost tipo='proveedor' y tipo='compra'.
 *      Hojas COMPRAS, COMPRAS_DETALLE y PROVEEDORES se crean solas. Productos nuevos se agregan a LISTA DE PRODUCTOS
 *      sin costo ni precio (REF = 'NUEVO - SIN PRECIO') para que los socios los completen.
 *
 * v10.5: doGet action=clientes devuelve la hoja CLIENTES (respaldo cuando el CSV publicado no responde).
 *
 * v10.2: cada venta recibe su numero de nota (CONFIG!B2) al registrarse y lo devuelve en la respuesta;
 *        VENTAS col Y, VENTAS_DETALLE col P y CXC_MOV col G se escriben de una vez. nextNota queda solo por compatibilidad.
 *
 * v10: doGet action=nextCot (contador en CONFIG!B3) y doPost tipo='cotizacion' → hoja COTIZACIONES (se crea sola).
 *
 * v9.1: las fechas que llegan como texto 'd/m/aaaa' se convierten a fecha real antes de guardar y se formatean
 *       dd/MM/yyyy, para que no dependan de la configuracion regional de la hoja (10/9 se leia como 9 de octubre).
 *
 * Cambios v9:
 *   - VENTAS: columnas Z=CLIENTE, AA=CLIENTE_RIF, AB..AD=MONEDA_1..3, AE=CREDITO_USD.
 *   - Nueva hoja CXC_MOV (cuentas por cobrar): CARGO automatico al vender a credito, ABONO desde Cobros.
 *   - COMISIONES: venta a credito entra como 'PENDIENTE COBRO'.
 *   - doGet action=cxc → saldos por cliente y notas pendientes (deuda en USD, abonos a las notas mas viejas primero).
 *   - doPost tipo='abono' → registra abono y devuelve el saldo nuevo.
 *   - Manual, una vez: en VENTAS escribir en Z1..AE1: CLIENTE, CLIENTE_RIF, MONEDA_1, MONEDA_2, MONEDA_3, CREDITO_USD.
 *     En CLIENTES escribir CREDITO en G1 y poner SI en los clientes autorizados.
 *
 * Cambios v8:
 *
 * Cambios v8 (todo lo demás es idéntico a v7):
 *   - VENTAS: guarda ID_VENTA en columna X (24) y NOTA_NUM en columna Y (25).
 *   - Nueva hoja VENTAS_DETALLE: una fila por producto vendido, con costo congelado.
 *   - COMISIONES: agrega ID_VENTA en columna L (12) para poder cruzar.
 *   - nextNota acepta &idVenta=... y escribe el número en VENTAS y VENTAS_DETALLE.
 *   - Lock en la venta para que dos vendedores no escriban a la vez.
 *
 * Instalar: pegar completo sobre el Code.gs actual > Guardar >
 * Implementar > Administrar implementaciones > lápiz > Versión: Nueva versión > Implementar.
 * (La URL /exec no cambia.) Para volver a v7: mismo menú, elegir la versión anterior.
 *
 * Una sola vez, a mano: en VENTAS escribir "ID_VENTA" en X1 y "NOTA_NUM" en Y1.
 */

var SH_VENTAS   = 'VENTAS';
var SH_DETALLE  = 'VENTAS_DETALLE';
var SH_CXC      = 'CXC_MOV';
var COL_ID      = 24;   // X
var COL_NOTA    = 25;   // Y

// ============================================================
// BLOQUE D — IDENTIDAD Y ROLES (v21)
// ============================================================
var SH_USUARIOS = 'USUARIOS';
var SAL_PIN     = 'BoParts.2026.';        // sal del hash: cambiarla invalida todos los PIN a la vez
var HORAS_SESION = 12;

// USUARIOS: A NOMBRE, B ROL, C ACTIVO, D PIN_NUEVO, E PIN_HASH, F TOKEN, G TOKEN_VENCE, H ULTIMO_ACCESO
var U_NOMBRE = 1, U_ROL = 2, U_ACTIVO = 3, U_PIN_NUEVO = 4, U_HASH = 5, U_TOKEN = 6, U_VENCE = 7, U_ULT = 8;

// CLIENTES: A NOMBRE, B RIF, C TEL, D DIR, E NOTA, F CREADO, G CREDITO, H LIMITE, I DIAS,
//           J ALIADO (SI/NO), K COMISION_PCT, L NEGOCIO     <- las tres ultimas, v22
var CLI_COLS = 12, CLI_ALIADO = 10, CLI_PCT = 11, CLI_NEGOCIO = 12;

// Se asegura de que CLIENTES tenga las tres columnas nuevas, con su encabezado.
function prepararClientes_(ss) {
  var sh = ss.getSheetByName('CLIENTES');
  if (!sh) return null;
  var cab = ['ALIADO', 'COMISION_PCT', 'NEGOCIO'];
  for (var i = 0; i < cab.length; i++) {
    var col = CLI_ALIADO + i;
    if (!String(sh.getRange(1, col).getValue() || '').trim()) sh.getRange(1, col).setValue(cab[i]);
  }
  return sh;
}

// Un cliente marcado como aliado. Devuelve null si no lo es.
function aliadoPorClave_(ss, nombre, cedula) {
  var sh = prepararClientes_(ss);
  if (!sh || sh.getLastRow() < 2) return null;
  var ced = soloDigitos_(cedula), nom = String(nombre || '').trim().toUpperCase();
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, CLI_COLS).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][CLI_ALIADO - 1] || '').trim().toUpperCase() !== 'SI') continue;
    var c2 = soloDigitos_(vals[i][1]);
    var coincide = (ced && c2 && c2 === ced) || (!ced && nom && String(vals[i][0] || '').trim().toUpperCase() === nom);
    if (coincide) {
      return {fila:i + 2, nombre:String(vals[i][0] || ''), cedula:String(vals[i][1] || ''),
              pct:Number(vals[i][CLI_PCT - 1]) || 0, negocio:String(vals[i][CLI_NEGOCIO - 1] || '')};
    }
  }
  return null;
}

// Todos los aliados activos, para el desplegable de la venta.
function listaAliados_(ss) {
  var sh = prepararClientes_(ss);
  var out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, CLI_COLS).getValues().forEach(function(r) {
    if (String(r[CLI_ALIADO - 1] || '').trim().toUpperCase() !== 'SI') return;
    var nom = String(r[0] || '').trim();
    if (!nom) return;
    out.push({id:String(r[1] || '').trim() || nom.toUpperCase(), nombre:nom,
              negocio:String(r[CLI_NEGOCIO - 1] || '').trim(), pct:Number(r[CLI_PCT - 1]) || 0,
              cedula:String(r[1] || '').trim()});
  });
  return out;
}

// Rol minimo de cada accion. Lo que no este aqui exige SOCIO: se niega por defecto, no se permite por defecto.
var PERMISOS_GET = {
  config:'VENDEDOR', nextNota:'VENDEDOR', nextCot:'VENDEDOR', nextFactura:'VENDEDOR', nota:'VENDEDOR',
  apartados:'VENDEDOR', proveedores:'VENDEDOR', stock:'VENDEDOR', conteos:'VENDEDOR', clientes:'VENDEDOR',
  cxc:'VENDEDOR', productos:'VENDEDOR', catalogo:'VENDEDOR', metodos:'VENDEDOR',
  tareas:'VENDEDOR',
  producto:'SOCIO',
  ventas:'SOCIO', socios:'SOCIO', cxp:'SOCIO', cliente_stats:'SOCIO', compras:'SOCIO', diag:'SOCIO',
  liquidacion:'SOCIO', rendimiento:'SOCIO'
};
var PERMISOS_POST = {
  fotos:'VENDEDOR', cliente:'VENDEDOR', demanda:'VENDEDOR', conteo:'VENDEDOR', gasto:'VENDEDOR',
  proveedor:'VENDEDOR', compra:'VENDEDOR', cotizacion:'VENDEDOR', abono:'VENDEDOR', venta:'VENDEDOR',
  factura_venta:'VENDEDOR', apartado:'VENDEDOR', apartado_abono:'VENDEDOR', apartado_entregar:'VENDEDOR',
  tarea_marcar:'VENDEDOR', tarea_propia:'VENDEDOR',
  costeo:'SOCIO', cxp_abono:'SOCIO', conteo_revision:'SOCIO', devolucion:'SOCIO', apartado_cerrar:'SOCIO',
  tasa:'SOCIO', socio:'SOCIO', liquidar_aliado:'SOCIO', precio:'SOCIO', tarea_def:'SOCIO'
};

function authActiva_(ss) {
  try {
    var v = String(ss.getSheetByName('CONFIG').getRange('B15').getValue() || '').trim().toUpperCase();
    return v === 'SI' || v === 'SÍ' || v === 'TRUE' || v === '1';
  } catch (err) { return false; }
}

function hojaUsuarios_(ss) {
  var sh = ss.getSheetByName(SH_USUARIOS);
  if (!sh) {
    sh = ss.insertSheet(SH_USUARIOS);
    sh.appendRow(['NOMBRE','ROL','ACTIVO','PIN_NUEVO','PIN_HASH','TOKEN','TOKEN_VENCE','ULTIMO_ACCESO']);
    sh.appendRow(['Rodolfo Osuna','SOCIO','SI','','','','','']);
    sh.appendRow(['Javier Boves','SOCIO','SI','','','','','']);
    sh.appendRow(['Reinaldo Cuicas','VENDEDOR','SI','','','','','']);
    sh.setFrozenRows(1);
    sh.getRange('D:E').setNumberFormat('@');
  }
  return sh;
}

function hashPin_(pin) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SAL_PIN + String(pin));
  return bytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

// Los PIN se escriben en claro en la columna PIN_NUEVO de la hoja. Aqui se convierten a hash y se borra el texto.
function sincronizarPines_(ss) {
  var sh = hojaUsuarios_(ss);
  if (sh.getLastRow() < 2) return sh;
  var n = sh.getLastRow() - 1;
  var vals = sh.getRange(2, 1, n, 8).getValues();
  for (var i = 0; i < n; i++) {
    var nuevo = String(vals[i][U_PIN_NUEVO - 1] || '').trim();
    if (!nuevo) continue;
    sh.getRange(i + 2, U_HASH).setValue(hashPin_(nuevo));
    sh.getRange(i + 2, U_PIN_NUEVO).setValue('');
    sh.getRange(i + 2, U_TOKEN).setValue('');       // cambiar el PIN cierra las sesiones abiertas
    sh.getRange(i + 2, U_VENCE).setValue('');
  }
  return sh;
}

function login_(ss, d) {
  var sh = sincronizarPines_(ss);
  var usuario = String(d.usuario || '').trim().toUpperCase();
  var pin = String(d.pin || '').trim();
  if (!usuario || !pin) throw new Error('Falta usuario o PIN');
  if (sh.getLastRow() < 2) throw new Error('No hay usuarios configurados');
  var n = sh.getLastRow() - 1;
  var vals = sh.getRange(2, 1, n, 8).getValues();
  for (var i = 0; i < n; i++) {
    if (String(vals[i][U_NOMBRE - 1] || '').trim().toUpperCase() !== usuario) continue;
    if (String(vals[i][U_ACTIVO - 1] || '').trim().toUpperCase() === 'NO') throw new Error('Usuario desactivado');
    var hash = String(vals[i][U_HASH - 1] || '').trim();
    if (!hash) throw new Error('Ese usuario todavia no tiene PIN. Escribelo en la columna PIN_NUEVO de la hoja USUARIOS.');
    if (hash !== hashPin_(pin)) throw new Error('PIN incorrecto');
    var token = Utilities.getUuid().replace(/-/g, '');
    var vence = new Date(Date.now() + HORAS_SESION * 3600 * 1000);
    sh.getRange(i + 2, U_TOKEN).setValue(token);
    sh.getRange(i + 2, U_VENCE).setValue(vence);
    sh.getRange(i + 2, U_ULT).setValue(new Date());
    return {ok:true, tipo:'login', token:token, nombre:String(vals[i][U_NOMBRE - 1]),
            rol:String(vals[i][U_ROL - 1] || 'VENDEDOR').toUpperCase(),
            vence:Utilities.formatDate(vence, TZ_VE, 'yyyy-MM-dd HH:mm')};
  }
  throw new Error('Usuario no encontrado');
}

// Devuelve {nombre, rol} o lanza SESION (token invalido/vencido) o PERMISO (rol insuficiente).
// Con el interruptor en NO devuelve un usuario generico y nunca bloquea: la operacion sigue igual que en v20.
function auth_(ss, token, rolMin) {
  if (!authActiva_(ss)) return {nombre:'', rol:'SOCIO', libre:true};
  token = String(token || '').trim();
  if (!token) throw new Error('SESION');
  var sh = hojaUsuarios_(ss);
  if (sh.getLastRow() < 2) throw new Error('SESION');
  var n = sh.getLastRow() - 1;
  var vals = sh.getRange(2, 1, n, 8).getValues();
  for (var i = 0; i < n; i++) {
    if (String(vals[i][U_TOKEN - 1] || '').trim() !== token) continue;
    if (String(vals[i][U_ACTIVO - 1] || '').trim().toUpperCase() === 'NO') throw new Error('SESION');
    var v = vals[i][U_VENCE - 1];
    if (!esFecha_(v) || v.getTime() < Date.now()) throw new Error('SESION');
    var rol = String(vals[i][U_ROL - 1] || 'VENDEDOR').toUpperCase();
    if (rolMin === 'SOCIO' && rol !== 'SOCIO') throw new Error('PERMISO');
    return {nombre:String(vals[i][U_NOMBRE - 1]), rol:rol, libre:false};
  }
  throw new Error('SESION');
}

function rolDe_(tabla, clave) {
  var r = tabla[clave];
  return r ? r : 'SOCIO';   // lo desconocido se trata como reservado a socios
}

/* v25.1 — QUE OPERACION ES ESTE POST.
   Aqui estuvo el error mas caro del Bloque D. No todo POST manda 'tipo': la venta se despacha por
   `data.vendedor !== undefined` y las fotos por los campos de imagen. Como esta clave se calculaba
   con una regla y el despacho con otra, la venta caia en '' -> y '' no esta en la tabla, asi que
   deny-by-default la mandaba a SOCIO. Resultado: desde que se encendio el login, NINGUN vendedor
   podia registrar una venta. No se vio antes porque los socios pasan igual.
   Regla desde ahora: esta funcion y el despacho de doPost reconocen lo mismo. Si se agrega una
   operacion que no manda 'tipo', se agrega aqui en la misma linea en que se agrega alla. */
function claveDePost_(data) {
  if (data.tipo) return String(data.tipo);
  if (data.row !== undefined || data.imagen !== undefined ||
      data.imagen2 !== undefined || data.imagen3 !== undefined) return 'fotos';
  if (data.vendedor !== undefined) return 'venta';
  return '';
}

// OJO: esta constante es lo que ven las apps en el menu. Se habia quedado en v21.4 mientras el
// encabezado ya decia v24, asi que el sello de version — que existe justamente para saber si lo
// desplegado es lo que crees — estaba mintiendo. Cada version nueva se cambia AQUI tambien.
var VERSION_SCRIPT = 'v26.1';

function json_(obj) {
  // La version viaja en cada respuesta: es la forma rapida de saber si lo desplegado es lo que crees
  if (obj && typeof obj === 'object' && obj.v === undefined) obj.v = VERSION_SCRIPT;
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// GET
// ============================================================
function doGet(e) {
  try {
    return rutearGet_(e);
  } catch (err) {
    var m = String(err && err.message ? err.message : err);
    // La app distingue estos dos para mandar al login en vez de mostrar un error tecnico
    if (m === 'SESION')  return json_({ok:false, sesion:true,  error:'Tu sesion vencio. Vuelve a entrar.'});
    if (m === 'PERMISO') return json_({ok:false, permiso:true, error:'Esa pantalla es solo para los socios.'});
    // Sin esto, cualquier error devuelve la pagina HTML de Google y las apps no pueden leerla
    return json_({ok:false, error:m});
  }
}

function rutearGet_(e) {
  var ssA = SpreadsheetApp.getActiveSpreadsheet();
  var accion = String(e.parameter.action || '');

  // Unica accion sin sesion: la pantalla de login necesita saber a quien ofrecer ANTES de tener token.
  // Devuelve solo nombre y rol. Nunca PIN, hash ni token.
  if (accion === 'quienes') {
    var shQ = hojaUsuarios_(ssA);
    var lista = [];
    if (shQ.getLastRow() >= 2) {
      shQ.getRange(2, 1, shQ.getLastRow() - 1, 3).getValues().forEach(function(r) {
        var nom = String(r[0] || '').trim();
        if (nom && String(r[2] || '').trim().toUpperCase() !== 'NO') {
          lista.push({nombre:nom, rol:String(r[1] || 'VENDEDOR').toUpperCase()});
        }
      });
    }
    return json_({ok:true, usuarios:lista, authActiva:authActiva_(ssA)});
  }

  // ---- BLOQUE D (v21): identidad antes que nada ----
  var usr = auth_(ssA, e.parameter.token, rolDe_(PERMISOS_GET, accion));

  // Lista de productos por el script, para poder despublicar el CSV.
  // A un vendedor se le entrega sin las columnas de costo: no viajan a su telefono.
  if (accion === 'productos') {
    return json_(listaProductos_(ssA, usr.rol === 'SOCIO'));
  }
  if (accion === 'catalogo') {
    return json_(catalogoProveedores_(ssA));
  }
  if (accion === 'metodos') {
    return json_(metodosYAliados_(ssA));
  }
  if (accion === 'liquidacion') {
    return json_(estadoLiquidacion_(ssA));
  }
  if (accion === 'producto') {
    return json_(fichaProducto_(ssA, e.parameter.codigo));
  }
  // v25 — tareas. Con sesion activa, la persona la pone el servidor: nadie consulta el dia de otro.
  if (accion === 'tareas') {
    var qn = (!usr.libre && usr.nombre) ? usr.nombre : String(e.parameter.quien || '');
    return json_(miDia_(ssA, qn, e.parameter.fecha));
  }
  if (accion === 'rendimiento') {
    return json_(rendimientoTareas_(ssA, e.parameter.desde, e.parameter.hasta));
  }

  if (e.parameter.action === 'nextNota') {
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var cfg = ss.getSheetByName('CONFIG');
      var current = parseInt(cfg.getRange('B2').getValue()) || 0;
      var next = current + 1;
      cfg.getRange('B2').setValue(next);
      SpreadsheetApp.flush();
      // v8: enlazar el número de nota con la venta
      var idVenta = e.parameter.idVenta || '';
      if (idVenta) marcarNota_(ss, idVenta, next);
      return json_({ok:true, num:next});
    } finally {
      SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
      lock.releaseLock();
    }
  }
  if (e.parameter.action === 'nextCot') {
    var lockC = LockService.getScriptLock();
    lockC.waitLock(5000);
    try {
      var cfgC = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
      var nextC = (parseInt(cfgC.getRange('B3').getValue()) || 0) + 1;
      cfgC.getRange('B3').setValue(nextC);
      SpreadsheetApp.flush();
      return json_({ok:true, num:nextC});
    } finally {
      SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
      lockC.releaseLock();
    }
  }
  // Diagnostico: como esta guardada la fecha en cada hoja (tipo y valor crudo)
  if (e.parameter.action === 'diag') {
    var ssD = SpreadsheetApp.getActiveSpreadsheet();
    var out = {ok:true, zona:ssD.getSpreadsheetTimeZone(), hojas:{}};
    [[SH_VENTAS, 1], [SH_DETALLE, 2], ['GASTOS', 2]].forEach(function(par) {
      var sh = ssD.getSheetByName(par[0]);
      if (!sh || sh.getLastRow() < 2) { out.hojas[par[0]] = 'vacia o no existe'; return; }
      var n = sh.getLastRow() - 1, k = Math.min(n, 3);
      var arriba = sh.getRange(2, par[1], k, 1).getValues();
      var abajo = sh.getRange(sh.getLastRow() - k + 1, par[1], k, 1).getValues();
      function ver(a) { return a.map(function(r) { return {tipo:(esFecha_(r[0]) ? 'fecha' : typeof r[0]), crudo:String(r[0]), iso:iso_(r[0])}; }); }
      out.hojas[par[0]] = {filas:n, columnaFecha:par[1], primeras:ver(arriba), ultimas:ver(abajo)};
    });
    return json_(out);
  }
  if (e.parameter.action === 'nota') {
    return json_(buscarNota_(SpreadsheetApp.getActiveSpreadsheet(), e.parameter.num));
  }
  if (e.parameter.action === 'apartados') {
    return json_({ok:true, apartados:listaApartados_(SpreadsheetApp.getActiveSpreadsheet(), e.parameter.estado || '')});
  }
  if (e.parameter.action === 'nextFactura') {
    var lockF = LockService.getScriptLock();
    lockF.waitLock(5000);
    try {
      var ssF = SpreadsheetApp.getActiveSpreadsheet();
      var cfgF = ssF.getSheetByName('CONFIG');
      var nf = (parseInt(cfgF.getRange('B12').getValue()) || 0) + 1;
      var nc = (parseInt(cfgF.getRange('B13').getValue()) || 0) + 1;
      var hasta = parseInt(cfgF.getRange('B14').getValue()) || 0;
      if (hasta && nc > hasta) return json_({ok:false, error:'Se agoto el rango de numeros de control autorizado (hasta ' + hasta + ')'});
      cfgF.getRange('A12').setValue('FACTURA_NUM'); cfgF.getRange('B12').setValue(nf);
      cfgF.getRange('A13').setValue('CONTROL_NUM'); cfgF.getRange('B13').setValue(nc);
      SpreadsheetApp.flush();
      return json_({ok:true, factura:nf, control:nc, restantes:hasta ? hasta - nc : 0});
    } finally {
      SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
      lockF.releaseLock();
    }
  }
  if (e.parameter.action === 'config') {
    return json_(leerConfig_(SpreadsheetApp.getActiveSpreadsheet()));
  }
  if (e.parameter.action === 'ventas') {
    return json_(datosVentas_(SpreadsheetApp.getActiveSpreadsheet(), e.parameter.desde, e.parameter.hasta));
  }
  if (e.parameter.action === 'socios') {
    return json_({ok:true, saldos:saldosSocios_(SpreadsheetApp.getActiveSpreadsheet())});
  }
  if (e.parameter.action === 'proveedores') {
    var shP = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PROVEEDORES');
    var nP = shP ? shP.getLastRow() : 0;
    var valsP = nP >= 2 ? shP.getRange(2, 1, nP - 1, 5).getValues().map(function(r) { return r.map(function(v) { return String(v == null ? '' : v); }); }) : [];
    return json_({ok:true, proveedores:valsP});
  }
  if (e.parameter.action === 'compras') {
    return json_(listaCompras_(SpreadsheetApp.getActiveSpreadsheet(), e.parameter.estado || ''));
  }
  if (e.parameter.action === 'cxp') {
    return json_(estadoCxp_(SpreadsheetApp.getActiveSpreadsheet()));
  }
  if (e.parameter.action === 'stock') {
    return json_(calcularStock_(SpreadsheetApp.getActiveSpreadsheet(), e.parameter.codigo || ''));
  }
  if (e.parameter.action === 'conteos') {
    return json_(conteosPendientes_(SpreadsheetApp.getActiveSpreadsheet()));
  }
  if (e.parameter.action === 'clientes') {
    var shC = prepararClientes_(ssA);
    var n = shC ? shC.getLastRow() : 0;
    var esSocio = (usr.rol === 'SOCIO');
    var vals = n >= 2 ? shC.getRange(2, 1, n - 1, CLI_COLS).getValues().map(function(r) {
      var f = r.map(function(v) { return String(v == null ? '' : v); });
      // El porcentaje de comision es informacion de socios: no viaja al telefono de un vendedor.
      if (!esSocio) f[CLI_PCT - 1] = '';
      return f;
    }) : [];
    return json_({ok:true, clientes:vals});
  }
  if (e.parameter.action === 'cliente_stats') {
    return json_(statsClientes_(SpreadsheetApp.getActiveSpreadsheet()));
  }
  if (e.parameter.action === 'cxc') {
    var ss2 = SpreadsheetApp.getActiveSpreadsheet();
    return json_({ok:true, tasa:leerTasa_(ss2), clientes:estadoCxc_(ss2, e.parameter.cliente || '')});
  }
  return json_({ok:false});
}

function leerTasa_(ss) {
  try { return Number(ss.getSheetByName('LISTA DE PRODUCTOS').getRange('E1').getValue()) || 0; } catch (err) { return 0; }
}

// ============================================================
// POST
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ---- BLOQUE D (v21): iniciar sesion ----
    if (data.tipo === 'login') {
      var lockL = LockService.getScriptLock(); lockL.waitLock(10000);
      try { return json_(login_(ss, data)); }
      finally { SpreadsheetApp.flush(); lockL.releaseLock(); }
    }

    // ---- BLOQUE D (v21): identidad y rol antes de tocar nada ----
    var claveP = claveDePost_(data);
    var quien = auth_(ss, data.token, rolDe_(PERMISOS_POST, claveP));

    // Con sesion activa, el nombre lo pone el servidor: nadie registra a nombre de otro.
    if (!quien.libre && quien.nombre) {
      if (claveP === 'venta' || claveP === 'demanda' || claveP === 'cotizacion') data.vendedor = quien.nombre;
      if (claveP === 'compra')  data.recibidoPor = quien.nombre;
      if (claveP === 'gasto')   data.registradoPor = quien.nombre;
      if (claveP === 'conteo')  data.contadoPor = quien.nombre;
      if (claveP === 'costeo')  data.quien = quien.nombre;
    }

    // ---- FOTOS (v11.5: por codigo, con la fila como respaldo) ----
    if (!data.tipo && (data.row !== undefined || data.imagen !== undefined || data.imagen2 !== undefined || data.imagen3 !== undefined)) {
      const sheet = ss.getSheetByName('LISTA DE PRODUCTOS');
      var fila = 0;
      var cod = String(data.codigo || '').trim().toUpperCase();
      if (cod && sheet.getLastRow() >= 3) {
        var cods = sheet.getRange(3, 1, sheet.getLastRow() - 2, 1).getValues();
        for (var i = 0; i < cods.length; i++) {
          if (String(cods[i][0] || '').trim().toUpperCase() === cod) { fila = i + 3; break; }
        }
      }
      if (!fila) fila = Number(data.row) || 0;
      if (!fila) return json_({ok:false, error:'No se encontro el producto ' + (cod || '(sin codigo)')});
      // Si se ubico por codigo, verificar que la fila corresponde al producto que mando la app
      if (data.producto) {
        var enHoja = String(sheet.getRange(fila, 3).getValue() || '').trim().toUpperCase();
        if (enHoja && enHoja !== String(data.producto).trim().toUpperCase() && !cod) {
          return json_({ok:false, error:'La fila ' + fila + ' es "' + enHoja + '", no coincide. Recarga la lista.'});
        }
      }
      // v24: se mira que habia ANTES para saber cuantas fotos son nuevas de verdad y cuantas reemplazan.
      // Para medir el trabajo sobre el catalogo, lo que cuenta es lo nuevo, no lo que se volvio a subir.
      var antes = sheet.getRange(fila, 12, 1, 3).getValues()[0];
      var nuevas = 0, reemplazadas = 0;
      [data.imagen, data.imagen2, data.imagen3].forEach(function(url, i) {
        if (!url) return;
        if (String(antes[i] || '').trim()) reemplazadas++; else nuevas++;
      });
      if (data.imagen)  sheet.getRange(fila, 12).setValue(data.imagen);
      if (data.imagen2) sheet.getRange(fila, 13).setValue(data.imagen2);
      if (data.imagen3) sheet.getRange(fila, 14).setValue(data.imagen3);

      var ahora = new Date();
      var fl = hojaAp_(ss, 'FOTOS_LOG', ['FECHA','HORA','CODIGO','PRODUCTO','FOTOS_NUEVAS','FOTOS_REEMPLAZADAS',
                                         'TOTAL_DESPUES','QUIEN']);
      var totalDespues = sheet.getRange(fila, 12, 1, 3).getValues()[0]
        .filter(function(u) { return String(u || '').trim(); }).length;
      fl.appendRow([fechaVE_(Utilities.formatDate(ahora, TZ_VE, 'dd/MM/yyyy')),
                    Utilities.formatDate(ahora, TZ_VE, 'HH:mm'),
                    String(sheet.getRange(fila, 1).getValue() || ''),
                    String(sheet.getRange(fila, 3).getValue() || ''),
                    nuevas, reemplazadas, totalDespues,
                    (quien && quien.nombre) ? quien.nombre : (data.quien || '')]);
      formatoFecha_(fl, fl.getLastRow(), 1);

      return json_({ok:true,tipo:'fotos',fila:fila,nuevas:nuevas,reemplazadas:reemplazadas,total:totalDespues});
    }

    // ---- CLIENTE (sin cambios) ----
    if (data.tipo === 'cliente') {
      return json_(guardarCliente_(ss, data));
    }

    // ---- DEMANDA (sin cambios) ----
    if (data.tipo === 'demanda') {
      const sheet = ss.getSheetByName('DEMANDA_NO_ATENDIDA');
      sheet.appendRow([
        data.fecha, data.hora, data.vendedor,
        data.producto, data.categoria, data.cantidad,
        data.cliNombre||'', data.cliTel||'', data.notificar||'NO',
        data.foto1||'', data.foto2||'', data.notas||'',
        data.proveedor1||'', data.precio1||'',
        data.proveedor2||'', data.precio2||'',
        data.estado||'PENDIENTE'
      ]);
      return json_({ok:true,tipo:'demanda'});
    }

    // ---- COSTEO DE COMPRA Y PAGOS A PROVEEDOR (v18) ----
    if (data.tipo === 'costeo') {
      var lockK = LockService.getScriptLock(); lockK.waitLock(20000);
      try { return json_(costearCompra_(ss, data)); }
      finally { SpreadsheetApp.flush(); lockK.releaseLock(); }
    }
    if (data.tipo === 'cxp_abono') {
      movCxp_(ss, data, 'ABONO');
      return json_({ok:true, tipo:'cxp_abono'});
    }

    // ---- TAREAS (v25) ----
    // Con lock: dos marcas seguidas de la misma tarea no pueden crear dos filas del mismo dia.
    if (data.tipo === 'tarea_marcar') {
      var lockT = LockService.getScriptLock(); lockT.waitLock(10000);
      try { return json_(marcarTarea_(ss, data, quien)); }
      finally { SpreadsheetApp.flush(); lockT.releaseLock(); }
    }
    if (data.tipo === 'tarea_propia') {
      var lockT2 = LockService.getScriptLock(); lockT2.waitLock(10000);
      try { return json_(tareaPropia_(ss, data, quien)); }
      finally { SpreadsheetApp.flush(); lockT2.releaseLock(); }
    }
    if (data.tipo === 'tarea_def') {
      var lockT3 = LockService.getScriptLock(); lockT3.waitLock(10000);
      try { return json_(guardarTareaDef_(ss, data, quien)); }
      finally { SpreadsheetApp.flush(); lockT3.releaseLock(); }
    }

    // ---- CAMBIO DE PRECIO (v23) ----
    if (data.tipo === 'precio') {
      var lockP = LockService.getScriptLock(); lockP.waitLock(10000);
      try { return json_(cambiarPrecio_(ss, data, quien)); }
      finally { SpreadsheetApp.flush(); lockP.releaseLock(); }
    }

    // ---- LIQUIDACION DE UN ALIADO (v22) ----
    if (data.tipo === 'liquidar_aliado') {
      var lockA = LockService.getScriptLock(); lockA.waitLock(15000);
      try { return json_(liquidarAliado_(ss, data)); }
      finally { SpreadsheetApp.flush(); lockA.releaseLock(); }
    }

    // ---- FACTURA ASOCIADA A UNA VENTA (v20) ----
    if (data.tipo === 'factura_venta') {
      var lockFv = LockService.getScriptLock(); lockFv.waitLock(10000);
      try { return json_(guardarFacturaVenta_(ss, data)); }
      finally { SpreadsheetApp.flush(); lockFv.releaseLock(); }
    }

    // ---- CONTEO DE INVENTARIO (v17) ----
    if (data.tipo === 'conteo') {
      var lockC2 = LockService.getScriptLock(); lockC2.waitLock(10000);
      try { return json_(guardarConteo_(ss, data)); }
      finally { SpreadsheetApp.flush(); lockC2.releaseLock(); }
    }
    if (data.tipo === 'conteo_revision') {
      resolverConteo_(ss, data);
      return json_({ok:true, tipo:'conteo_revision'});
    }

    // ---- DEVOLUCIONES Y CAMBIOS (v15) ----
    if (data.tipo === 'devolucion') {
      var lockD = LockService.getScriptLock(); lockD.waitLock(10000);
      try { return json_(registrarDevolucion_(ss, data)); }
      finally { SpreadsheetApp.flush(); lockD.releaseLock(); }
    }

    // ---- APARTADOS / CONTRA PEDIDO (v14) ----
    if (data.tipo === 'apartado' || data.tipo === 'apartado_abono' || data.tipo === 'apartado_entregar' || data.tipo === 'apartado_cerrar') {
      var lockAp = LockService.getScriptLock();
      lockAp.waitLock(10000);
      try {
        if (data.tipo === 'apartado')            return json_(crearApartado_(ss, data));
        if (data.tipo === 'apartado_abono')      return json_(abonoApartado_(ss, data));
        if (data.tipo === 'apartado_entregar')   return json_(entregarApartado_(ss, data));
        return json_(cerrarApartado_(ss, data));
      } finally {
        SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
        lockAp.releaseLock();
      }
    }

    // ---- TASA BCV (v13): la fija un socio desde Gerencia y la usan todas las apps ----
    if (data.tipo === 'tasa') {
      var t = Number(data.tasa) || 0;
      if (t < 1) throw new Error('Tasa invalida');
      var cfgT = ss.getSheetByName('CONFIG');
      if (!cfgT) throw new Error('No existe la hoja CONFIG');
      // Tasa BCV: la que se usa para expresar la factura. Es distinta de la tasa de trabajo.
      if (String(data.cual || '').toUpperCase() === 'BCV') {
        cfgT.getRange('A10').setValue('TASA_BCV');
        cfgT.getRange('B10').setValue(t);
        cfgT.getRange('A11').setValue('TASA_BCV_FECHA');
        cfgT.getRange('B11').setValue(new Date());
        cfgT.getRange('B11').setNumberFormat('dd/MM/yyyy');
        var shB = hojaAp_(ss, 'TASAS', ['FECHA','HORA','TASA','FIJADA_POR','NOTAS']);
        shB.appendRow([new Date(), Utilities.formatDate(new Date(), TZ_VE, 'HH:mm'), t, data.quien || '', 'BCV']);
        shB.getRange(shB.getLastRow(), 1).setNumberFormat('dd/MM/yyyy');
        SpreadsheetApp.flush();
        return json_({ok:true, tipo:'tasa', cual:'BCV', tasa:t});
      }
      cfgT.getRange('A4').setValue('TASA_BCV');
      cfgT.getRange('B4').setValue(t);
      cfgT.getRange('A5').setValue('TASA_FECHA');
      cfgT.getRange('B5').setValue(new Date());
      cfgT.getRange('A6').setValue('TASA_POR');
      cfgT.getRange('B6').setValue(data.quien || '');
      var shT = ss.getSheetByName('TASAS');
      if (!shT) { shT = ss.insertSheet('TASAS'); shT.appendRow(['FECHA','HORA','TASA','FIJADA_POR','NOTAS']); shT.setFrozenRows(1); }
      var ahora = new Date();
      shT.appendRow([ahora, Utilities.formatDate(ahora, TZ_VE, 'HH:mm'), t, data.quien || '', data.notas || '']);
      shT.getRange(shT.getLastRow(), 1).setNumberFormat('dd/MM/yyyy');
      SpreadsheetApp.flush();
      return json_({ok:true, tipo:'tasa', tasa:t});
    }

    // ---- MOVIMIENTO DE SOCIO (v11.2): REEMBOLSO, APORTE_CAPITAL, RETIRO, PRESTAMO manual ----
    if (data.tipo === 'socio') {
      var tiposOk = {PRESTAMO:1, REEMBOLSO:1, APORTE_CAPITAL:1, RETIRO:1};
      if (!tiposOk[String(data.movimiento||'').toUpperCase()]) throw new Error('Tipo de movimiento invalido');
      var mUSD = Number(data.montoUSD) || 0; if (mUSD <= 0) throw new Error('Monto invalido');
      movSocio_(ss, {fecha:data.fecha, socio:String(data.socio||'').toUpperCase(), tipo:String(data.movimiento).toUpperCase(), montoUSD:mUSD,
                     moneda:data.moneda||'USD', montoPagado:Number(data.montoPagado)||mUSD, tasa:Number(data.tasa)||0, origen:data.origen||'',
                     descripcion:data.descripcion||'', registradoPor:data.registradoPor||''});
      return json_({ok:true,tipo:'socio',saldos:saldosSocios_(ss)});
    }

    // ---- GASTO (v11.1) ----
    if (data.tipo === 'gasto') {
      var shG = ss.getSheetByName('GASTOS');
      if (!shG) {
        shG = ss.insertSheet('GASTOS');
        shG.appendRow(['ID_GASTO','FECHA','HORA','CATEGORIA','DESCRIPCION','MONTO','MONEDA','TASA','MONTO_USD','MONTO_BS','METODO','BANCO','PAGADO_POR','REGISTRADO_POR','COMPROBANTE','NOTAS']);
        shG.setFrozenRows(1);
      }
      var monto = Number(data.monto) || 0, tasaG = Number(data.tasa) || 0;
      var usd = data.moneda === 'BS' ? (tasaG ? monto / tasaG : 0) : monto;
      var bs  = data.moneda === 'BS' ? monto : monto * tasaG;
      shG.appendRow([data.idGasto||'', fechaVE_(data.fecha), data.hora||'', data.categoria||'', data.descripcion||'',
        monto, data.moneda||'USD', tasaG, Math.round(usd*100)/100, Math.round(bs), data.metodo||'', data.banco||'',
        data.pagadoPor||'', data.registradoPor||'', data.comprobante||'', data.notas||'']);
      formatoFecha_(shG, shG.getLastRow(), 2);
      // Si lo pago un socio de su bolsillo, la tienda se lo debe: PRESTAMO en la cuenta corriente del socio
      var pp = String(data.pagadoPor||'').toUpperCase();
      if (pp === 'RODOLFO' || pp === 'JAVIER') {
        movSocio_(ss, {fecha:data.fecha, socio:pp, tipo:'PRESTAMO', montoUSD:Math.round(usd*100)/100, moneda:data.moneda||'USD',
                       montoPagado:monto, tasa:tasaG, origen:data.idGasto||'', descripcion:(data.categoria||'') + ' - ' + (data.descripcion||''), registradoPor:data.registradoPor||''});
      }
      return json_({ok:true,tipo:'gasto'});
    }

    // ---- PROVEEDOR NUEVO (v11) ----
    if (data.tipo === 'proveedor') {
      hojaProveedores_(ss).appendRow([data.nombre||'', data.rif||'', data.tel||'', data.contacto||'', data.notas||'', fechaVE_(data.fecha||'')]);
      return json_({ok:true,tipo:'proveedor'});
    }

    // ---- COMPRA / RECEPCION (v11): entra al stock, el costo se completa despues ----
    if (data.tipo === 'compra') {
      var lockP = LockService.getScriptLock();
      lockP.waitLock(10000);
      try {
        var resC = guardarCompra_(ss, data);
        return json_({ok:true,tipo:'compra',idCompra:data.idCompra||'',nuevos:resC.nuevos});
      } finally {
        SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
        lockP.releaseLock();
      }
    }

    // ---- COTIZACION (v10): no es venta, solo registro ----
    if (data.tipo === 'cotizacion') {
      var sc2 = ss.getSheetByName('COTIZACIONES');
      if (!sc2) {
        sc2 = ss.insertSheet('COTIZACIONES');
        sc2.appendRow(['NUM','FECHA','HORA','VENDEDOR','CLIENTE','RIF','TEL','PRODUCTOS','TOTAL_USD','TOTAL_BS','TASA','ESTADO','ID_VENTA_ASOCIADA','NOTAS']);
        sc2.setFrozenRows(1);
      }
      sc2.appendRow(['COT-' + ('000' + (data.num||0)).slice(-4), fechaVE_(data.fecha), data.hora||'', data.vendedor||'',
        data.cliente||'', data.rif||'', data.tel||'', data.productos||'', Number(data.totalUSD)||0, Number(data.totalBS)||0,
        Number(data.tasa)||0, 'ENVIADA', '', data.moneda ? 'Emitida en ' + data.moneda : '']);
      formatoFecha_(sc2, sc2.getLastRow(), 2);
      return json_({ok:true,tipo:'cotizacion'});
    }

    // ---- ABONO A CUENTA POR COBRAR (v9) ----
    if (data.tipo === 'abono') {
      var lockA = LockService.getScriptLock();
      lockA.waitLock(10000);
      try {
        var r = guardarAbono_(ss, data);
        // 'repetido' viaja a la app para que pueda decir "ese abono ya estaba" en vez de dejar
        // creer que registro uno nuevo. Las pantallas viejas leen saldoUSD igual y no se rompen.
        return json_({ok:true, tipo:'abono', saldoUSD:r.saldoUSD, repetido:!!r.repetido,
                      comisionesLiberadas:r.comisionesLiberadas || 0});
      } finally {
        SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
        lockA.releaseLock();
      }
    }

    // ---- VENTA (v8) ----
    if (data.vendedor !== undefined) {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      var numNota = 0, repetida = false;
      try {
        // v26.1 — Se mira ANTES si ya existe, para poder DECIRLO. guardarVenta_ igual lo detecta y no
        // duplica, pero devolvia el mismo numero de nota que una venta nueva: la pantalla no podia
        // distinguir "quedo registrada" de "ya estaba", y a Reinaldo le daba lo mismo reintentar.
        var previa = ventaPorId_(ss, data.idVenta);
        if (previa) { numNota = previa.numNota; repetida = true; }
        else numNota = guardarVenta_(ss, data);
      } finally {
        // v26.1 — EL CANDADO NO VACIA LA HOJA. Apps Script acumula las escrituras y las manda al final;
        // si se suelta el candado antes, el siguiente intento puede buscar este ID, no encontrarlo
        // todavia, y escribir la venta otra vez. Google lo pide explicitamente para LockService.
        SpreadsheetApp.flush();
        lock.releaseLock();
      }
      return json_({ok:true, tipo:'venta', idVenta:data.idVenta||'', numNota:numNota, repetida:repetida});
    }

    return json_({ok:false,error:'tipo desconocido'});

  } catch(err) {
    var mp = String(err && err.message ? err.message : err);
    if (mp === 'SESION')  return json_({ok:false, sesion:true,  error:'Tu sesion vencio. Vuelve a entrar.'});
    if (mp === 'PERMISO') return json_({ok:false, permiso:true, error:'Esa accion es solo para los socios.'});
    return json_({ok:false,error:mp});
  }
}

// ============================================================
// VENTA: fila resumen + comisión + detalle por línea
// ============================================================
// Busca una venta ya registrada por su ID. Devuelve {fila, numNota} o null.
function ventaPorId_(ss, idVenta) {
  if (!idVenta) return null;
  var sh = ss.getSheetByName(SH_VENTAS);
  if (!sh || sh.getLastRow() < 2) return null;
  var n = sh.getLastRow() - 1;
  var ids = sh.getRange(2, COL_ID, n, 2).getValues();   // X = ID_VENTA, Y = NOTA_NUM
  for (var i = n - 1; i >= 0; i--) {                    // desde el final: lo recien guardado esta abajo
    if (String(ids[i][0]) === String(idVenta)) return {fila:i + 2, numNota:Number(ids[i][1]) || 0};
  }
  return null;
}

function guardarVenta_(ss, data) {
  const idVenta = data.idVenta || '';

  // Si el telefono reenvia la misma venta (se perdio la respuesta), no se duplica:
  // se devuelve el numero de nota que ya se le habia asignado.
  var yaEsta = ventaPorId_(ss, idVenta);
  if (yaEsta) return yaEsta.numNota;

  // Validaciones ANTES de escribir nada: si algo falla, no queda media venta ni se gasta una nota.
  if (!data.vendedor) throw new Error('Venta sin vendedor');
  if (Number(data.creditoUSD) > 0 && !(data.cliente && data.cliente.nombre)) throw new Error('Venta a credito sin cliente');
  var lineasV = data.lineas || [];
  for (var li = 0; li < lineasV.length; li++) {
    if (!(Number(lineasV[li].cantidad) > 0)) throw new Error('Hay una linea sin cantidad');
  }

  // Numero de nota: toda venta consume uno (sin saltos). Se llama dentro del lock de la venta.
  var cfg = ss.getSheetByName('CONFIG');
  var numNota = (parseInt(cfg.getRange('B2').getValue()) || 0) + 1;
  cfg.getRange('B2').setValue(numNota);

  // Fila resumen: columnas A–W idénticas a v7, + X = ID_VENTA
  const sheet = ss.getSheetByName(SH_VENTAS);
  const fechaV = fechaVE_(data.fecha);
  sheet.appendRow([
    fechaV, data.hora, data.vendedor, data.canal,
    data.productos, data.totalUSD, data.totalBS,
    data.pago1?.metodo||'', data.pago1?.banco||'', data.pago1?.monto||'',
    data.pago2?.metodo||'', data.pago2?.banco||'', data.pago2?.monto||'',
    data.pago3?.metodo||'', data.pago3?.banco||'', data.pago3?.monto||'',
    data.comision, data.neto,
    data.aliado||'', data.aliadoNegocio||'', data.aliadoPct||0, data.aliadoComision||0,
    data.notas,
    idVenta,
    numNota,                                                // Y  NOTA_NUM
    data.cliente ? (data.cliente.nombre||'') : '',           // Z  CLIENTE
    data.cliente ? (data.cliente.rif||'') : '',              // AA CLIENTE_RIF
    data.pago1?.moneda||'', data.pago2?.moneda||'', data.pago3?.moneda||'',   // AB..AD
    Number(data.creditoUSD) || 0,                            // AE CREDITO_USD
    Number(data.baseUSD) || 0,                               // AF BASE_IMPONIBLE_USD
    Number(data.ivaUSD) || 0,                                // AG IVA_USD
    Number(data.totalConIvaUSD) || 0,                        // AH TOTAL_CON_IVA_USD
    Number(data.tasaBCV) || 0,                               // AI TASA_BCV
    data.facturaNum || '',                                   // AJ FACTURA_NUM
    data.controlNum || '',                                   // AK CONTROL_NUM
    Number(data.casheaInicial) || 0,                         // AL CASHEA_INICIAL_USD
    Number(data.casheaFinanciado) || 0,                      // AM CASHEA_FINANCIADO_USD
    Number(data.casheaComision) || 0,                        // AN CASHEA_COMISION_USD
    Number(data.casheaNeto) || 0                             // AO CASHEA_NETO_USD
  ]);
  formatoFecha_(sheet, sheet.getLastRow(), 1);

  const esCredito = Number(data.creditoUSD) > 0;

  // Registro fiscal: correlativo de facturas emitidas
  if (data.facturaNum) {
    var fx = hojaAp_(ss, 'FACTURAS', ['NUM_FACTURA','NUM_CONTROL','FECHA','HORA','CLIENTE','CEDULA_RIF',
      'BASE_USD','IVA_USD','TOTAL_USD','TASA_BCV','TOTAL_BS','FORMA_PAGO','ID_VENTA','VENDEDOR','ANULADA','NOTAS']);
    fx.appendRow([data.facturaNum, data.controlNum || '', fechaV, data.hora || '',
      data.cliente ? data.cliente.nombre : '', data.cliente ? (data.cliente.rif || '') : '',
      Number(data.baseUSD) || 0, Number(data.ivaUSD) || 0, Number(data.totalConIvaUSD) || 0,
      Number(data.tasaBCV) || 0, Number(data.totalBS) || 0, data.formaPago || '', idVenta, data.vendedor || '', '', '']);
    formatoFecha_(fx, fx.getLastRow(), 3);
  }

  // Comision de aliado. v22: el porcentaje y el monto los calcula el SERVIDOR desde CLIENTES.
  // Lo que mande el telefono se ignora: no se puede alterar desde el navegador.
  if (data.aliado) {
    var ali = aliadoPorClave_(ss, data.aliado, data.aliadoCedula);
    var cedCli = data.cliente ? soloDigitos_(data.cliente.rif) : '';
    // Sin autocomision: si el aliado es el mismo que esta comprando, no gana nada por su propia compra.
    var esElMismo = !!(ali && cedCli && soloDigitos_(ali.cedula) === cedCli);
    if (ali && !esElMismo && ali.pct > 0) {
      var totalBs = Number(data.totalBS) || 0;
      var comBs = Math.round(totalBs * ali.pct / 100);
      var tasaV = Number(data.tasa) || 0;
      var comUsd = tasaV ? round2_(comBs / tasaV) : 0;
      const sc = ss.getSheetByName('COMISIONES');
      const ciclo = Math.ceil(new Date().getDate()/15) === 1 ? '1-15' : '16-fin';
      const mes = new Date().toLocaleDateString('es-VE',{month:'long',year:'numeric'});
      // N (14) = COMISION_USD: la deuda esta en USD y la comision se guardaba solo en Bs. Sin este dato,
      // restar una de otra dependia de la tasa del dia en que se liquida, no de la de la venta.
      sc.appendRow([data.fecha,'',ali.nombre,data.fecha,data.productos,totalBs,ali.pct,comBs,
                    ciclo+' '+mes, esCredito ? 'PENDIENTE COBRO' : 'PENDIENTE','',idVenta,
                    soloDigitos_(ali.cedula), comUsd]);
      if (!sc.getRange(1, 13).getValue()) { sc.getRange(1, 13).setValue('CEDULA'); sc.getRange(1, 14).setValue('COMISION_USD'); }
    }
  }

  // Cargo en cuentas por cobrar (v9)
  if (esCredito) {
    var cx = hojaCxc_(ss);
    cx.appendRow([
      fechaV, data.hora, data.cliente.nombre, data.cliente.rif||'', 'CARGO', idVenta, '',
      Number(data.creditoUSD)||0, '', '', Number(data.tasa)||0, 'Credito', '', 0, data.vendedor||'', data.notas||'', data.productos||''
    ]);
    cx.getRange(cx.getLastRow(), 7).setValue(numNota);
    formatoFecha_(cx, cx.getLastRow(), 1);
  }

  // Detalle por línea (v8). Si ventas.html viejo no manda lineas, no pasa nada.
  const lineas = data.lineas || [];
  if (!lineas.length) return numNota;

  var det = ss.getSheetByName(SH_DETALLE);
  if (!det) {
    det = ss.insertSheet(SH_DETALLE);
    det.appendRow(['ID_VENTA','FECHA','HORA','VENDEDOR','CANAL','CODIGO','PRODUCTO',
                   'CANTIDAD','PRECIO_USD','COSTO_USD','SUBTOTAL_USD','COSTO_TOTAL_USD',
                   'UTILIDAD_USD','TASA','SUBTOTAL_BS','NOTA_NUM']);
    det.setFrozenRows(1);
  }
  const tasa = Number(data.tasa) || 0;
  // v21: el costo se toma de la hoja en el momento de la venta. Si el telefono no lo manda (bloque D, donde
  // el costo ya no viaja a un vendedor), se busca aqui. Queda congelado en la linea, igual que antes.
  var costoHoja = costosPorCodigo_(ss, lineas.map(function(l) { return l.codigo; }));
  const rows = lineas.map(function(l) {
    var cant = Number(l.cantidad) || 0, pre = Number(l.precio) || 0;
    var cos = Number(l.costo) || 0;
    if (!cos) cos = costoHoja[String(l.codigo || '').trim().toUpperCase()] || 0;
    var sub = cant * pre, cost = cant * cos;
    return [idVenta, fechaV, data.hora, data.vendedor, data.canal, l.codigo||'', l.producto||'',
            cant, pre, cos, sub, cost, sub - cost, tasa, Math.round(sub * tasa), numNota];
  });
  var r0 = det.getLastRow() + 1;
  det.getRange(r0, 1, rows.length, rows[0].length).setValues(rows);
  det.getRange(r0, 2, rows.length, 1).setNumberFormat('dd/MM/yyyy');
  return numNota;
}

// ============================================================
// NOTA: escribe el número en la venta y en sus líneas
// ============================================================
function marcarNota_(ss, idVenta, num) {
  var sh = ss.getSheetByName(SH_VENTAS);
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, COL_ID, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {          // la venta recién guardada está al final
      if (String(ids[i][0]) === String(idVenta)) { sh.getRange(i + 2, COL_NOTA).setValue(num); break; }
    }
  }
  var cx = ss.getSheetByName(SH_CXC);
  if (cx && cx.getLastRow() >= 2) {
    var cl = cx.getLastRow(), cn = Math.min(cl - 1, 30);
    var cids = cx.getRange(cl - cn + 1, 6, cn, 1).getValues();
    for (var k = 0; k < cids.length; k++) {
      if (String(cids[k][0]) === String(idVenta)) cx.getRange(cl - cn + 1 + k, 7).setValue(num);
    }
  }
  var det = ss.getSheetByName(SH_DETALLE);
  if (!det || det.getLastRow() < 2) return;
  var dl = det.getLastRow();
  var n = Math.min(dl - 1, 60);                            // solo las últimas 60 líneas
  var dids = det.getRange(dl - n + 1, 1, n, 1).getValues();
  for (var j = 0; j < dids.length; j++) {
    if (String(dids[j][0]) === String(idVenta)) det.getRange(dl - n + 1 + j, 16).setValue(num);
  }
}

// ============================================================
// CUENTAS POR COBRAR (v9) — deuda en USD, abonos a las notas mas viejas primero
// ============================================================
// Columnas CXC_MOV: A FECHA, B HORA, C CLIENTE, D RIF, E TIPO (CARGO|ABONO), F ID_VENTA, G NOTA_NUM,
//   H MONTO_USD, I MONEDA_PAGO, J MONTO_PAGADO, K TASA, L METODO, M BANCO, N COMISION_BS, O REGISTRADO_POR, P NOTAS
function hojaCxc_(ss) {
  var sh = ss.getSheetByName(SH_CXC);
  if (!sh) {
    sh = ss.insertSheet(SH_CXC);
    sh.appendRow(['FECHA','HORA','CLIENTE','RIF','TIPO','ID_VENTA','NOTA_NUM','MONTO_USD','MONEDA_PAGO','MONTO_PAGADO',
                  'TASA','METODO','BANCO','COMISION_BS','REGISTRADO_POR','NOTAS','PRODUCTOS']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// v26 — Un abono no se puede cobrar dos veces.
// Antes: el idAbono se ESCRIBIA en la hoja pero nunca se BUSCABA. Con mala senal, la pantalla dice
// "reintenta", el telefono reenvia, y quedaban dos abonos por el mismo pago. El saldo del cliente
// bajaba el doble. Corre dentro del lock que ya tenia doPost, asi que dos telefonos a la vez tampoco
// se cuelan. Un reenvio ya no escribe nada y devuelve el saldo que corresponde.
function abonoYaRegistrado_(cx, idAbono) {
  var id = String(idAbono || '').trim();
  if (!id || cx.getLastRow() < 2) return false;
  var vals = cx.getRange(2, 5, cx.getLastRow() - 1, 2).getValues();   // E TIPO, F ID_VENTA/ID_ABONO
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toUpperCase() === 'ABONO' && String(vals[i][1]).trim() === id) return true;
  }
  return false;
}

function guardarAbono_(ss, d) {
  if (!d.cliente) throw new Error('Abono sin cliente');
  var montoUSD = Number(d.montoUSD) || 0;
  if (montoUSD <= 0) throw new Error('Monto invalido');
  var cx = hojaCxc_(ss);

  if (abonoYaRegistrado_(cx, d.idAbono)) {
    // Ya estaba. No se escribe nada y se devuelve el saldo real, con aviso para que la pantalla
    // pueda decirlo en vez de dejar creer que se registro un segundo abono.
    var estR = estadoCxc_(ss, d.cliente);
    return {saldoUSD:estR.length ? estR[0].saldoUSD : 0, repetido:true};
  }

  cx.appendRow([
    fechaVE_(d.fecha), d.hora, d.cliente, d.rif||'', 'ABONO', d.idAbono||'', '',
    montoUSD, d.moneda||'USD', Number(d.montoPagado)||0, Number(d.tasa)||0,
    d.metodo||'', d.banco||'', Number(d.comision)||0, d.registradoPor||'', d.notas||''
  ]);
  formatoFecha_(cx, cx.getLastRow(), 1);
  var est = estadoCxc_(ss, d.cliente);

  // v26 — al quedar pagada una nota, la comision de su aliado deja de estar congelada.
  var liberadas = liberarComisionesCobradas_(ss, est.length ? est[0].notas : []);

  return {saldoUSD:est.length ? est[0].saldoUSD : 0, repetido:false, comisionesLiberadas:liberadas};
}

// v26 — LA COMISION DEL ALIADO SE DESCONGELA CUANDO EL CLIENTE PAGA
// Una venta a credito con aliado nace con la comision en 'PENDIENTE COBRO', para no pagarle al aliado
// plata que todavia no entro. Correcto. Lo que faltaba: NINGUNA linea de codigo la sacaba de ahi.
// El unico cambio de estado que existia era a 'PAGADA', al liquidarle — un camino al que estas
// comisiones no llegaban nunca. Resultado: comisiones que el negocio debe y el sistema jamas muestra
// como pagaderas. Aqui, cuando la nota queda PAGADA, la comision pasa a 'PENDIENTE' y entra a cobro.
// Recibe las notas ya calculadas: no vuelve a leer CXC_MOV.
function liberarComisionesCobradas_(ss, notas) {
  var pagadas = {};
  (notas || []).forEach(function(n) {
    if (n.estado === 'PAGADA' && n.idVenta) pagadas[String(n.idVenta).trim()] = true;
  });
  if (!Object.keys(pagadas).length) return 0;

  var sc = ss.getSheetByName('COMISIONES');
  if (!sc || sc.getLastRow() < 2) return 0;
  var n = sc.getLastRow() - 1;
  var ancho = Math.max(sc.getLastColumn(), COM_USD);
  var vals = sc.getRange(2, 1, n, ancho).getValues();
  var libres = 0;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][COM_ESTADO - 1] || '').trim().toUpperCase() !== 'PENDIENTE COBRO') continue;
    if (!pagadas[String(vals[i][11] || '').trim()]) continue;        // L = ID_VENTA
    sc.getRange(i + 2, COM_ESTADO).setValue('PENDIENTE');
    libres++;
  }
  return libres;
}

// Devuelve [{cliente, rif, saldoUSD, cargosUSD, abonosUSD, notas:[{idVenta, nota, fecha, montoUSD, abonadoUSD, pendienteUSD, estado}], movs:[...]}]
function estadoCxc_(ss, soloCliente) {
  var sh = ss.getSheetByName(SH_CXC);
  if (!sh || sh.getLastRow() < 2) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 17).getValues();
  completarProductos_(ss, sh, rows);
  var porCliente = {};
  rows.forEach(function(r) {
    var cli = String(r[2]).trim(); if (!cli) return;
    if (soloCliente && cli.toLowerCase() !== String(soloCliente).toLowerCase()) return;
    var c = porCliente[cli] || (porCliente[cli] = {cliente:cli, rif:String(r[3]||''), cargosUSD:0, abonosUSD:0, notas:[], movs:[]});
    var monto = Number(r[7]) || 0;
    var mov = {fecha:fmtFecha_(r[0]), hora:String(r[1]||''), tipo:String(r[4]), idVenta:String(r[5]||''), nota:r[6]||'', montoUSD:monto,
               moneda:String(r[8]||''), montoPagado:Number(r[9])||0, tasa:Number(r[10])||0, metodo:String(r[11]||''), banco:String(r[12]||''),
               productos:String(r[16]||'')};
    c.movs.push(mov);
    if (mov.tipo === 'CARGO') { c.cargosUSD += monto; c.notas.push({idVenta:mov.idVenta, nota:mov.nota, fecha:mov.fecha, montoUSD:monto, abonadoUSD:0, productos:mov.productos}); }
    else if (mov.tipo === 'ABONO') c.abonosUSD += monto;
  });
  var out = [];
  Object.keys(porCliente).forEach(function(k) {
    var c = porCliente[k];
    // Aplicar abonos a las notas mas viejas primero (orden de registro)
    var resto = c.abonosUSD;
    c.notas.forEach(function(n) {
      var ap = Math.min(n.montoUSD, resto); n.abonadoUSD = round2_(ap); resto -= ap;
      n.pendienteUSD = round2_(n.montoUSD - ap);
      n.estado = n.pendienteUSD <= 0.009 ? 'PAGADA' : (ap > 0 ? 'PARCIAL' : 'PENDIENTE');
    });
    c.cargosUSD = round2_(c.cargosUSD); c.abonosUSD = round2_(c.abonosUSD);
    c.saldoUSD = round2_(c.cargosUSD - c.abonosUSD);
    out.push(c);
  });
  out.sort(function(a, b) { return b.saldoUSD - a.saldoUSD; });
  return out;
}

function round2_(n) { return Math.round(n * 100) / 100; }
function fmtFecha_(v) {
  if (esFecha_(v)) { var i = iso_(v).split('-'); return i.length === 3 ? i[2] + '/' + i[1] + '/' + i[0] : ''; }
  var m = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(String(v || ''));
  if (m) { var y = Number(m[3]); if (y < 100) y += 2000; return pad2_(m[1]) + '/' + pad2_(m[2]) + '/' + y; }
  return String(v || '');
}
function pad2_(n) { return (Number(n) < 10 ? '0' : '') + Number(n); }

// ============================================================
// FECHAS (v9.1) — la app manda 'd/m/aaaa' (es-VE). Se convierte a Date para no depender del locale de la hoja.
// ============================================================
function fechaVE_(v) {
  if (esFecha_(v)) return v;
  var m = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*$/.exec(String(v || ''));
  if (!m) return v;                                   // no parece fecha: se guarda tal cual
  var y = Number(m[3]); if (y < 100) y += 2000;
  return new Date(y, Number(m[2]) - 1, Number(m[1]), 12, 0, 0);   // mediodia evita saltos de zona horaria
}
function formatoFecha_(sheet, fila, col) {
  try { sheet.getRange(fila, col).setNumberFormat('dd/MM/yyyy'); } catch (err) {}
}
// v25.1: para la hora. Sin esto, la hoja convierte "08:05" en un valor de hora (fecha de 1899).
function formatoTexto_(sheet, fila, col) {
  try { sheet.getRange(fila, col).setNumberFormat('@'); } catch (err) {}
}

// ============================================================
// COMPRAS (v11) — recepcion de mercancia. El costo lo completan los socios despues (estado PENDIENTE COSTO).
// ============================================================
function hojaProveedores_(ss) {
  var sh = ss.getSheetByName('PROVEEDORES');
  if (!sh) {
    sh = ss.insertSheet('PROVEEDORES');
    sh.appendRow(['NOMBRE','RIF','TELEFONO','CONTACTO','NOTAS','CREADO']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Busca una recepcion ya registrada por su ID. Devuelve la fila o 0.
function compraPorId_(ss, idCompra) {
  if (!idCompra) return 0;
  var sh = ss.getSheetByName('COMPRAS');
  if (!sh || sh.getLastRow() < 2) return 0;
  var n = sh.getLastRow() - 1;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = n - 1; i >= 0; i--) {          // desde el final: lo recien guardado esta abajo
    if (String(ids[i][0]) === String(idCompra)) return i + 2;
  }
  return 0;
}

function guardarCompra_(ss, d) {
  var lineas = d.lineas || [];
  if (!lineas.length) throw new Error('Compra sin lineas');
  if (!d.proveedor) throw new Error('Compra sin proveedor');

  // Si el telefono reenvia la misma recepcion (se perdio la respuesta), no se duplica nada:
  // ni la recepcion, ni sus lineas, ni los productos nuevos en LISTA DE PRODUCTOS.
  var yaEsta = compraPorId_(ss, d.idCompra);
  if (yaEsta) {
    return {nuevos:0, repetida:true, fila:yaEsta,
            unidades:Number(ss.getSheetByName('COMPRAS').getRange(yaEsta, 8).getValue()) || 0};
  }

  var fecha = fechaVE_(d.fecha);

  var shC = ss.getSheetByName('COMPRAS');
  if (!shC) {
    shC = ss.insertSheet('COMPRAS');
    shC.appendRow(['ID_COMPRA','FECHA','HORA','PROVEEDOR','FACTURA','RECIBIDO_POR','LINEAS','UNIDADES','ESTADO','COSTO_TOTAL_USD','FOTO_FACTURA','NOTAS','COSTEADA_POR','FECHA_COSTEO']);
    shC.setFrozenRows(1);
  }
  var shD = ss.getSheetByName('COMPRAS_DETALLE');
  if (!shD) {
    shD = ss.insertSheet('COMPRAS_DETALLE');
    shD.appendRow(['ID_COMPRA','FECHA','PROVEEDOR','CODIGO','PRODUCTO','CANTIDAD','COSTO_UNIT_USD','COSTO_TOTAL_USD','PRODUCTO_NUEVO','ESTADO']);
    shD.setFrozenRows(1);
  }

  // Productos nuevos: se crean en LISTA DE PRODUCTOS sin costo ni precio
  var nuevos = 0;
  var shL = ss.getSheetByName('LISTA DE PRODUCTOS');
  lineas.forEach(function(l) {
    if (!l.nuevo) return;
    var last = shL.getLastRow();
    shL.appendRow([l.codigo||'', l.marca||'', l.producto||'', l.categoria||'', 0, '', '', '', '', '', 'NUEVO - SIN PRECIO', '', '', '']);
    var nr = shL.getLastRow();
    // Copiar las formulas de Costo Final (H) y EN BS (J) de la fila anterior, si son formulas
    try { if (last >= 3) { shL.getRange(last, 8).copyTo(shL.getRange(nr, 8)); shL.getRange(last, 10).copyTo(shL.getRange(nr, 10)); } } catch (err) {}
    nuevos++;
  });

  var unidades = 0;
  var rows = lineas.map(function(l) {
    var cant = Number(l.cantidad) || 0; unidades += cant;
    return [d.idCompra||'', fecha, d.proveedor, l.codigo||'', l.producto||'', cant, '', '', l.nuevo ? 'SI' : '', 'PENDIENTE COSTO'];
  });
  var r0 = shD.getLastRow() + 1;
  shD.getRange(r0, 1, rows.length, rows[0].length).setValues(rows);
  shD.getRange(r0, 2, rows.length, 1).setNumberFormat('dd/MM/yyyy');

  shC.appendRow([d.idCompra||'', fecha, d.hora||'', d.proveedor, d.factura||'', d.recibidoPor||'', lineas.length, unidades,
                 'PENDIENTE COSTO', '', d.fotoUrl||'', d.notas||'', '', '']);
  formatoFecha_(shC, shC.getLastRow(), 2);
  return {nuevos:nuevos};
}

// ============================================================
// CUENTA CORRIENTE DE SOCIOS (v11.2)
// ============================================================
// SOCIOS_MOV: A FECHA, B SOCIO, C TIPO, D MONTO_USD, E MONEDA, F MONTO_PAGADO, G TASA, H ORIGEN (ID_GASTO / ID_COMPRA / manual),
//   I DESCRIPCION, J REGISTRADO_POR
// Signo para la tienda: PRESTAMO y APORTE_CAPITAL entran dinero (la tienda debe / el socio invirtio);
//   REEMBOLSO y RETIRO salen dinero (la tienda paga al socio).
// Saldo "por pagar al socio" = PRESTAMO - REEMBOLSO. Capital aportado = APORTE_CAPITAL - RETIRO (no es deuda).
function movSocio_(ss, m) {
  var sh = ss.getSheetByName('SOCIOS_MOV');
  if (!sh) {
    sh = ss.insertSheet('SOCIOS_MOV');
    sh.appendRow(['FECHA','SOCIO','TIPO','MONTO_USD','MONEDA','MONTO_PAGADO','TASA','ORIGEN','DESCRIPCION','REGISTRADO_POR']);
    sh.setFrozenRows(1);
  }
  sh.appendRow([fechaVE_(m.fecha), m.socio, m.tipo, m.montoUSD, m.moneda, m.montoPagado, m.tasa, m.origen, m.descripcion, m.registradoPor]);
  formatoFecha_(sh, sh.getLastRow(), 1);
}

function saldosSocios_(ss) {
  var sh = ss.getSheetByName('SOCIOS_MOV');
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function(r) {
    var s = String(r[1]).trim(); if (!s) return;
    var o = out[s] || (out[s] = {prestamos:0, reembolsos:0, aportes:0, retiros:0});
    var v = Number(r[3]) || 0, t = String(r[2]);
    if (t === 'PRESTAMO') o.prestamos += v; else if (t === 'REEMBOLSO') o.reembolsos += v;
    else if (t === 'APORTE_CAPITAL') o.aportes += v; else if (t === 'RETIRO') o.retiros += v;
  });
  Object.keys(out).forEach(function(k) {
    var o = out[k];
    o.porPagarUSD = round2_(o.prestamos - o.reembolsos);
    o.capitalUSD = round2_(o.aportes - o.retiros);
  });
  return out;
}

// v11.4 — Rellena PRODUCTOS (col Q) de cargos viejos, buscandolos en VENTAS por ID_VENTA.
function completarProductos_(ss, sh, rows) {
  var faltan = [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][4]) === 'CARGO' && !String(rows[i][16] || '').trim() && String(rows[i][5] || '').trim()) faltan.push(i);
  }
  if (!faltan.length) return;

  // Encabezado, por si la hoja es anterior a v11.3
  if (!String(sh.getRange(1, 17).getValue() || '').trim()) sh.getRange(1, 17).setValue('PRODUCTOS');

  // Mapa ID_VENTA -> PRODUCTOS desde VENTAS (col E productos, col X id)
  var shV = ss.getSheetByName(SH_VENTAS);
  if (!shV || shV.getLastRow() < 2) return;
  var n = shV.getLastRow() - 1;
  var ids = shV.getRange(2, COL_ID, n, 1).getValues();
  var prods = shV.getRange(2, 5, n, 1).getValues();
  var mapa = {};
  for (var k = 0; k < n; k++) {
    var id = String(ids[k][0] || '').trim();
    if (id) mapa[id] = String(prods[k][0] || '');
  }

  for (var j = 0; j < faltan.length; j++) {
    var f = faltan[j];
    var p = mapa[String(rows[f][5]).trim()];
    if (p) {
      sh.getRange(f + 2, 17).setValue(p);
      rows[f][16] = p;                       // para que la respuesta de esta misma llamada ya lo traiga
    }
  }
}

// ============================================================
// DATOS PARA GERENCIA (v12) — solo lectura
// ============================================================
var TZ_VE = 'America/Caracas';
function esFecha_(v) { return v && typeof v === 'object' && typeof v.getTime === 'function' && !isNaN(v.getTime()); }

function iso_(v) {
  // Ojo: las fechas que devuelve la hoja no siempre pasan `instanceof Date`, por eso se detectan asi.
  if (esFecha_(v)) return Utilities.formatDate(v, TZ_VE, 'yyyy-MM-dd');
  var t = String(v == null ? '' : v).trim();
  if (!t) return '';
  // 2026-06-29 (asi quedo el historico importado)
  var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (iso) return iso[1] + '-' + ('0' + Number(iso[2])).slice(-2) + '-' + ('0' + Number(iso[3])).slice(-2);
  // 29/6/2026 o 29-6-2026 (dia/mes/ano, como escribe la app)
  var m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(t);
  if (m) { var y = Number(m[3]); if (y < 100) y += 2000; return y + '-' + ('0' + Number(m[2])).slice(-2) + '-' + ('0' + Number(m[1])).slice(-2); }
  // Ultimo recurso: texto tipo "Sat Sep 12 2026 12:00:00 GMT-0400"
  var d = new Date(t);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, TZ_VE, 'yyyy-MM-dd');
  return '';
}

// Lineas de VENTAS_DETALLE, cabeceras de VENTAS y GASTOS del periodo.
// Formato compacto (arrays) para que el telefono descargue lo menos posible.
function datosVentas_(ss, desde, hasta) {
  var d1 = desde || '0000-00-00', d2 = hasta || '9999-99-99';
  var out = {ok:true, desde:d1, hasta:d2, lineas:[], ventas:[], gastos:[], conteos:[], demanda:[], fotos:[]};

  var det = ss.getSheetByName(SH_DETALLE);
  if (det && det.getLastRow() >= 2) {
    det.getRange(2, 1, det.getLastRow() - 1, 16).getValues().forEach(function(r) {
      var f = iso_(r[1]); if (!f || f < d1 || f > d2) return;
      // 0 idVenta, 1 fecha, 2 vendedor, 3 canal, 4 codigo, 5 producto, 6 cant, 7 precio, 8 costo,
      // 9 subtotal, 10 costoTotal, 11 utilidad, 12 nota
      out.lineas.push([String(r[0]||''), f, String(r[3]||''), String(r[4]||''), String(r[5]||''), String(r[6]||''),
                       Number(r[7])||0, Number(r[8])||0, Number(r[9])||0, Number(r[10])||0, Number(r[11])||0, Number(r[12])||0, r[15]||'']);
    });
  }

  var v = ss.getSheetByName(SH_VENTAS);
  if (v && v.getLastRow() >= 2) {
    var anchoV = Math.max(v.getLastColumn(), 31);
    v.getRange(2, 1, v.getLastRow() - 1, anchoV).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2) return;
      // 0 fecha, 1 vendedor, 2 canal, 3 totalUSD, 4 totalBS, 5 comisionBS, 6 netoBS, 7 aliado, 8 aliadoComisionBS,
      // 9 idVenta, 10 nota, 11 cliente, 12 creditoUSD, 13 metodos [[metodo, banco, monto, moneda] x3]
      out.ventas.push([f, String(r[2]||''), String(r[3]||''), Number(r[5])||0, Number(r[6])||0, Number(r[16])||0, Number(r[17])||0,
                       String(r[18]||''), Number(r[21])||0, String(r[23]||''), r[24]||'', String(r[25]||''), Number(r[30])||0,
                       [[String(r[7]||''), String(r[8]||''), Number(r[9])||0, String(r[27]||'')],
                        [String(r[10]||''), String(r[11]||''), Number(r[12])||0, String(r[28]||'')],
                        [String(r[13]||''), String(r[14]||''), Number(r[15])||0, String(r[29]||'')]]]);
    });
  }

  var gh = ss.getSheetByName('GASTOS');
  if (gh && gh.getLastRow() >= 2) {
    gh.getRange(2, 1, gh.getLastRow() - 1, 16).getValues().forEach(function(r) {
      var f = iso_(r[1]); if (!f || f < d1 || f > d2) return;
      // 0 fecha, 1 categoria, 2 descripcion, 3 montoUSD, 4 montoBS, 5 pagadoPor
      out.gastos.push([f, String(r[3]||''), String(r[4]||''), Number(r[8])||0, Number(r[9])||0, String(r[12]||'')]);
    });
  }

  // v24: lo que hace falta para medir a cada persona, sin pedir otra vez lo mismo.
  var ct = ss.getSheetByName('CONTEOS');
  if (ct && ct.getLastRow() >= 2) {
    ct.getRange(2, 1, ct.getLastRow() - 1, 15).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2) return;
      // 0 fecha, 1 codigo, 2 contadoPor, 3 diferencia, 4 tipo
      out.conteos.push([f, String(r[2]||''), String(r[8]||''),
                        (r[6] === '' || r[6] === null) ? null : Number(r[6]) || 0, String(r[7]||'')]);
    });
  }

  var dm = ss.getSheetByName('DEMANDA_NO_ATENDIDA');
  if (dm && dm.getLastRow() >= 2) {
    dm.getRange(2, 1, dm.getLastRow() - 1, 17).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2) return;
      // 0 fecha, 1 vendedor, 2 producto, 3 cliente
      out.demanda.push([f, String(r[2]||''), String(r[3]||''), String(r[6]||'')]);
    });
  }

  var fl = ss.getSheetByName('FOTOS_LOG');
  if (fl && fl.getLastRow() >= 2) {
    fl.getRange(2, 1, fl.getLastRow() - 1, 8).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2) return;
      // 0 fecha, 1 quien, 2 nuevas, 3 reemplazadas
      out.fotos.push([f, String(r[7]||''), Number(r[4])||0, Number(r[5])||0]);
    });
  }
  return out;
}

// ============================================================
// CONFIGURACION COMPARTIDA (v13) — la tasa vive en un solo lugar
// ============================================================
function leerConfig_(ss) {
  var cfg = ss.getSheetByName('CONFIG');
  var tasa = 0, fecha = '', quien = '', bcv = 0, bcvFecha = '', factura = 0, control = 0, controlHasta = 0;
  if (cfg) {
    tasa = Number(cfg.getRange('B4').getValue()) || 0;
    var f = cfg.getRange('B5').getValue();
    if (esFecha_(f)) fecha = Utilities.formatDate(f, TZ_VE, 'yyyy-MM-dd HH:mm');
    else fecha = String(f || '');
    quien = String(cfg.getRange('B6').getValue() || '');
    bcv = Number(cfg.getRange('B10').getValue()) || 0;
    var fb = cfg.getRange('B11').getValue();
    bcvFecha = esFecha_(fb) ? Utilities.formatDate(fb, TZ_VE, 'yyyy-MM-dd') : String(fb || '');
    factura = Number(cfg.getRange('B12').getValue()) || 0;
    control = Number(cfg.getRange('B13').getValue()) || 0;
    controlHasta = Number(cfg.getRange('B14').getValue()) || 0;
  }
  // Respaldo: la celda E1 de la lista, que se venia usando antes
  if (!tasa) {
    try { tasa = Number(ss.getSheetByName('LISTA DE PRODUCTOS').getRange('E1').getValue()) || 0; } catch (err) {}
  }
  return {ok:true, tasa:tasa, fecha:fecha, quien:quien, bcv:bcv, bcvFecha:bcvFecha,
          factura:factura, control:control, controlHasta:controlHasta,
          controlRestantes:(controlHasta && control) ? (controlHasta - control) : 0};
}

// ============================================================
// APARTADOS Y CONTRA PEDIDO (v14)
// ============================================================
// APARTADOS:     A NUM, B FECHA, C TIPO, D CLIENTE, E RIF, F TEL, G PRODUCTOS, H TOTAL_USD, I ABONADO_USD,
//                J SALDO_USD, K ESTADO, L VENCE, M VENDEDOR, N NOTAS, O ID_VENTA, P FECHA_CIERRE, Q TASA_INICIAL
// APARTADOS_DET: A NUM, B CODIGO, C PRODUCTO, D CANTIDAD, E PRECIO_USD, F COSTO_USD, G SUBTOTAL_USD
// APARTADOS_MOV: A NUM, B FECHA, C HORA, D TIPO, E MONTO_USD, F MONEDA, G MONTO_PAGADO, H TASA, I METODO,
//                J BANCO, K COMISION_BS, L REGISTRADO_POR, M NOTAS
// Estados: ABIERTO -> LISTO (llego la mercancia) -> ENTREGADO | DEVUELTO | CREDITO_A_FAVOR | VENCIDO
function hojaAp_(ss, nombre, encabezados) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.appendRow(encabezados); sh.setFrozenRows(1); }
  return sh;
}
function shApartados_(ss) {
  return hojaAp_(ss, 'APARTADOS', ['NUM','FECHA','TIPO','CLIENTE','RIF','TELEFONO','PRODUCTOS','TOTAL_USD','ABONADO_USD',
    'SALDO_USD','ESTADO','VENCE','VENDEDOR','NOTAS','ID_VENTA','FECHA_CIERRE','TASA_INICIAL']);
}
function shApartadosDet_(ss) {
  return hojaAp_(ss, 'APARTADOS_DET', ['NUM','CODIGO','PRODUCTO','CANTIDAD','PRECIO_USD','COSTO_USD','SUBTOTAL_USD']);
}
function shApartadosMov_(ss) {
  return hojaAp_(ss, 'APARTADOS_MOV', ['NUM','FECHA','HORA','TIPO','MONTO_USD','MONEDA','MONTO_PAGADO','TASA',
    'METODO','BANCO','COMISION_BS','REGISTRADO_POR','NOTAS']);
}

function crearApartado_(ss, d) {
  var lineas = d.lineas || [];
  if (!lineas.length) throw new Error('Apartado sin productos');
  if (!d.cliente) throw new Error('Apartado sin cliente');

  var cfg = ss.getSheetByName('CONFIG');
  var n = (parseInt(cfg.getRange('B7').getValue()) || 0) + 1;
  cfg.getRange('A7').setValue('APARTADO_NUM');
  cfg.getRange('B7').setValue(n);
  var num = 'AP-' + ('000' + n).slice(-4);

  var total = 0, texto = [];
  var filas = lineas.map(function(l) {
    var cant = Number(l.cantidad) || 0, pre = Number(l.precio) || 0, cos = Number(l.costo) || 0;
    total += cant * pre;
    texto.push(l.producto + ' x' + cant);
    return [num, l.codigo || '', l.producto || '', cant, pre, cos, Math.round(cant * pre * 100) / 100];
  });
  var det = shApartadosDet_(ss);
  det.getRange(det.getLastRow() + 1, 1, filas.length, 7).setValues(filas);

  total = Math.round(total * 100) / 100;
  var abonado = Number(d.abonoUSD) || 0;
  var sh = shApartados_(ss);
  sh.appendRow([num, fechaVE_(d.fecha), d.tipo2 || 'APARTADO', d.cliente, d.rif || '', d.tel || '', texto.join(' | '),
                total, 0, total, 'ABIERTO', fechaVE_(d.vence || ''), d.vendedor || '', d.notas || '', '', '', Number(d.tasa) || 0]);
  formatoFecha_(sh, sh.getLastRow(), 2);
  formatoFecha_(sh, sh.getLastRow(), 12);

  if (abonado > 0) {
    abonoApartado_(ss, {num:num, fecha:d.fecha, hora:d.hora, montoUSD:abonado, moneda:d.moneda, montoPagado:d.montoPagado,
                        tasa:d.tasa, metodo:d.metodo, banco:d.banco, comision:d.comision, registradoPor:d.vendedor, notas:'Abono inicial'});
  }
  return {ok:true, tipo:'apartado', num:num, total:total};
}

function abonoApartado_(ss, d) {
  var monto = Number(d.montoUSD) || 0;
  if (monto <= 0) throw new Error('Monto invalido');
  var mov = shApartadosMov_(ss);
  mov.appendRow([d.num, fechaVE_(d.fecha), d.hora || '', d.tipoMov || 'ABONO', monto, d.moneda || 'USD',
                 Number(d.montoPagado) || monto, Number(d.tasa) || 0, d.metodo || '', d.banco || '',
                 Number(d.comision) || 0, d.registradoPor || '', d.notas || '']);
  formatoFecha_(mov, mov.getLastRow(), 2);
  var est = recalcularApartado_(ss, d.num);
  return {ok:true, tipo:'apartado_abono', num:d.num, abonado:est.abonado, saldo:est.saldo};
}

// Recalcula abonado y saldo de un apartado y devuelve su fila
function recalcularApartado_(ss, num) {
  var sh = shApartados_(ss), fila = 0, total = 0;
  var n = sh.getLastRow();
  for (var i = 2; i <= n; i++) {
    if (String(sh.getRange(i, 1).getValue()).trim() === String(num).trim()) { fila = i; total = Number(sh.getRange(i, 8).getValue()) || 0; break; }
  }
  if (!fila) throw new Error('No existe el apartado ' + num);
  var abonado = 0;
  var mov = ss.getSheetByName('APARTADOS_MOV');
  if (mov && mov.getLastRow() >= 2) {
    mov.getRange(2, 1, mov.getLastRow() - 1, 5).getValues().forEach(function(r) {
      if (String(r[0]).trim() !== String(num).trim()) return;
      var t = String(r[3]);
      if (t === 'ABONO') abonado += Number(r[4]) || 0;
      else if (t === 'DEVOLUCION' || t === 'CREDITO_A_FAVOR') abonado -= Number(r[4]) || 0;
    });
  }
  abonado = Math.round(abonado * 100) / 100;
  var saldo = Math.round((total - abonado) * 100) / 100;
  sh.getRange(fila, 9).setValue(abonado);
  sh.getRange(fila, 10).setValue(saldo);
  return {fila:fila, total:total, abonado:abonado, saldo:saldo, estado:String(sh.getRange(fila, 11).getValue())};
}

// Entregar: aqui si nace la venta, con su costo y su margen. Los anticipos entran como forma de pago.
function entregarApartado_(ss, d) {
  var est = recalcularApartado_(ss, d.num);
  var sh = shApartados_(ss), fila = est.fila;
  if (est.estado === 'ENTREGADO') throw new Error('Ese apartado ya fue entregado');
  var pagoFinal = Number(d.pagoFinalUSD) || 0;
  if (est.saldo - pagoFinal > 0.05) throw new Error('Queda saldo pendiente: ' + (est.saldo - pagoFinal).toFixed(2));

  var det = ss.getSheetByName('APARTADOS_DET');
  var lineas = [];
  if (det && det.getLastRow() >= 2) {
    det.getRange(2, 1, det.getLastRow() - 1, 7).getValues().forEach(function(r) {
      if (String(r[0]).trim() !== String(d.num).trim()) return;
      lineas.push({codigo:r[1], producto:r[2], cantidad:Number(r[3]) || 0, precio:Number(r[4]) || 0, costo:Number(r[5]) || 0});
    });
  }
  if (!lineas.length) throw new Error('El apartado no tiene productos');

  var tasa = Number(d.tasa) || 0;
  var venta = {
    // v26 — El ID sale del NUMERO DE APARTADO, no de la hora.
    // Antes llevaba un timestamp: si el script se caia entre crear la venta y marcar el apartado como
    // ENTREGADO, el reintento no encontraba la marca, entraba otra vez y generaba una SEGUNDA venta
    // con otro ID — doble nota y doble descuento de inventario. Un apartado solo se entrega una vez,
    // asi que su numero es el identificador natural: ahora el reintento llega con el mismo ID,
    // guardarVenta_ lo reconoce, devuelve la nota que ya existia y se limita a completar la marca.
    idVenta:'VAP-' + String(d.num || '').trim(),
    fecha:d.fecha, hora:d.hora, vendedor:d.vendedor || String(sh.getRange(fila, 13).getValue()),
    canal:'APARTADO', productos:String(sh.getRange(fila, 7).getValue()),
    totalUSD:est.total, totalBS:Math.round(est.total * tasa), tasa:tasa,
    pago1:{metodo:'Anticipo apartado ' + d.num, banco:'', monto:Math.round(est.abonado * tasa), moneda:'BS'},
    pago2:d.pago2 || {}, pago3:{},
    comision:Number(d.comision) || 0, neto:Math.round(est.total * tasa) - (Number(d.comision) || 0),
    aliado:'', aliadoNegocio:'', aliadoPct:0, aliadoComision:0,
    notas:'Entrega de ' + d.num + (d.notas ? ' · ' + d.notas : ''),
    cliente:{nombre:String(sh.getRange(fila, 4).getValue()), rif:String(sh.getRange(fila, 5).getValue()), tel:String(sh.getRange(fila, 6).getValue())},
    creditoUSD:0, lineas:lineas
  };
  var numNota = guardarVenta_(ss, venta);

  sh.getRange(fila, 11).setValue('ENTREGADO');
  sh.getRange(fila, 15).setValue(venta.idVenta);
  sh.getRange(fila, 16).setValue(fechaVE_(d.fecha));
  formatoFecha_(sh, fila, 16);
  if (pagoFinal > 0) {
    abonoApartado_(ss, {num:d.num, fecha:d.fecha, hora:d.hora, montoUSD:pagoFinal, moneda:d.moneda, montoPagado:d.montoPagado,
                        tasa:tasa, metodo:d.metodo, banco:d.banco, comision:d.comision, registradoPor:d.vendedor, notas:'Pago al retirar'});
    sh.getRange(fila, 11).setValue('ENTREGADO');
  }
  return {ok:true, tipo:'apartado_entregar', num:d.num, idVenta:venta.idVenta, numNota:numNota};
}

// Cerrar sin entrega: devolucion del dinero o credito a favor del cliente
function cerrarApartado_(ss, d) {
  var est = recalcularApartado_(ss, d.num);
  var sh = shApartados_(ss);
  var modo = String(d.modo || 'DEVOLUCION').toUpperCase();   // DEVOLUCION | CREDITO_A_FAVOR | VENCIDO
  if (est.abonado > 0 && (modo === 'DEVOLUCION' || modo === 'CREDITO_A_FAVOR')) {
    var mov = shApartadosMov_(ss);
    mov.appendRow([d.num, fechaVE_(d.fecha), d.hora || '', modo, est.abonado, d.moneda || 'USD', Number(d.montoPagado) || est.abonado,
                   Number(d.tasa) || 0, d.metodo || '', d.banco || '', 0, d.registradoPor || '', d.notas || '']);
    formatoFecha_(mov, mov.getLastRow(), 2);
  }
  sh.getRange(est.fila, 11).setValue(modo);
  sh.getRange(est.fila, 16).setValue(fechaVE_(d.fecha));
  formatoFecha_(sh, est.fila, 16);
  recalcularApartado_(ss, d.num);
  return {ok:true, tipo:'apartado_cerrar', num:d.num, estado:modo};
}

function listaApartados_(ss, estado) {
  var sh = ss.getSheetByName('APARTADOS');
  if (!sh || sh.getLastRow() < 2) return [];
  var hoy = Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd');
  var out = [];
  sh.getRange(2, 1, sh.getLastRow() - 1, 17).getValues().forEach(function(r) {
    var e = String(r[10] || '');
    if (estado && e !== estado) return;
    var vence = iso_(r[11]);
    out.push({num:String(r[0]), fecha:iso_(r[1]), tipo:String(r[2]), cliente:String(r[3]), rif:String(r[4]), tel:String(r[5]),
              productos:String(r[6]), total:Number(r[7]) || 0, abonado:Number(r[8]) || 0, saldo:Number(r[9]) || 0,
              estado:e, vence:vence, vencido:(vence && vence < hoy && (e === 'ABIERTO' || e === 'LISTO')),
              vendedor:String(r[12]), notas:String(r[13])});
  });
  out.sort(function(a, b) { return a.fecha < b.fecha ? 1 : -1; });
  return out;
}

// ============================================================
// DEVOLUCIONES Y CAMBIOS (v15)
// ============================================================
// Busca una nota de entrega y devuelve sus lineas (de VENTAS_DETALLE, que trae costo congelado).
function buscarNota_(ss, num) {
  var n = parseInt(num) || 0;
  if (!n) return {ok:false, error:'Indica el numero de nota'};
  var det = ss.getSheetByName(SH_DETALLE);
  if (!det || det.getLastRow() < 2) return {ok:false, error:'No hay detalle de ventas'};
  var anchoDet = Math.max(det.getLastColumn(), 16);
  var rows = det.getRange(2, 1, det.getLastRow() - 1, anchoDet).getValues();
  var lineas = [], idVenta = '', fecha = '', vendedor = '', porCodigo = {};
  rows.forEach(function(r) {
    if (Number(r[15]) !== n) return;
    var cant = Number(r[7]) || 0;
    // Solo las lineas ORIGINALES de la venta: las negativas son devoluciones y las de cambio
    // se registran aparte, no se pueden volver a devolver desde esta nota.
    if (cant <= 0) return;
    if (String(r[4] || '').toUpperCase() === 'CAMBIO') return;
    if (!idVenta) { idVenta = String(r[0] || ''); fecha = iso_(r[1]); vendedor = String(r[3] || ''); }
    var cod = String(r[5] || '');
    var k = cod.trim().toUpperCase();
    if (porCodigo[k]) { porCodigo[k].cantidad += cant; return; }   // mismo producto repetido en la nota
    var l = {codigo:cod, producto:String(r[6]||''), cantidad:cant, precio:Number(r[8])||0, costo:Number(r[9])||0};
    porCodigo[k] = l; lineas.push(l);
  });
  if (!lineas.length) return {ok:false, error:'No se encontro la nota ' + n + ' (o no tiene lineas con detalle)'};

  // Cliente de la venta, para que la devolucion sepa a quien abonarle un saldo a favor
  var cliente = '', rif = '';
  var shV = ss.getSheetByName(SH_VENTAS);
  if (shV && shV.getLastRow() >= 2 && idVenta) {
    var anchoV2 = Math.max(shV.getLastColumn(), 27);
    var vv = shV.getRange(2, 1, shV.getLastRow() - 1, anchoV2).getValues();
    for (var vi = vv.length - 1; vi >= 0; vi--) {
      if (String(vv[vi][23]) === idVenta) { cliente = String(vv[vi][25] || ''); rif = String(vv[vi][26] || ''); break; }
    }
  }

  // Lo ya devuelto de esa nota, para no devolver dos veces
  var dev = ss.getSheetByName('DEVOLUCIONES_DET');
  var devueltas = {};
  if (dev && dev.getLastRow() >= 2 && dev.getLastColumn() >= 6) {
    dev.getRange(2, 1, dev.getLastRow() - 1, 6).getValues().forEach(function(r) {
      if (Number(r[1]) !== n) return;
      if (String(r[2]).toUpperCase() !== 'DEVUELTO') return;
      var kk = String(r[3]).trim().toUpperCase();
      devueltas[kk] = (devueltas[kk] || 0) + (Number(r[4]) || 0);
    });
  }
  lineas.forEach(function(l) { l.devuelto = devueltas[String(l.codigo).trim().toUpperCase()] || 0; });

  var dias = 0;
  try {
    if (fecha) dias = Math.max(0, Math.floor((new Date(Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd')) - new Date(fecha)) / 86400000));
  } catch (err) { dias = 0; }
  return {ok:true, nota:n, idVenta:idVenta, fecha:fecha, vendedor:vendedor, dias:dias,
          cliente:cliente, rif:rif, lineas:lineas};
}

// DEVOLUCIONES:     A NUM, B FECHA, C HORA, D NOTA, E ID_VENTA, F CLIENTE, G TIPO (DEVOLUCION|CAMBIO),
//                   H VALOR_DEVUELTO_USD, I VALOR_NUEVO_USD, J DIFERENCIA_USD, K RESOLUCION, L METODO, M BANCO,
//                   N AUTORIZADO_POR, O MOTIVO, P ID_VENTA_NUEVA
// DEVOLUCIONES_DET: A NUM_DEV, B NOTA, C MOVIMIENTO (DEVUELTO|ENTREGADO), D CODIGO, E CANTIDAD, F PRECIO_USD
function registrarDevolucion_(ss, d) {
  var devueltas = d.devueltas || [], nuevas = d.nuevas || [];
  if (!devueltas.length) throw new Error('No hay productos devueltos');
  if (!d.autorizadoPor) throw new Error('Falta quien autoriza');

  // El servidor manda: se comprueba contra la nota original cuanto queda por devolver de cada producto.
  var nota = buscarNota_(ss, d.nota);
  if (!nota.ok) throw new Error(nota.error || 'No se encontro la nota');
  var disp = {};
  nota.lineas.forEach(function(l) {
    var k = String(l.codigo).trim().toUpperCase();
    disp[k] = (disp[k] || 0) + (Number(l.cantidad) || 0) - (Number(l.devuelto) || 0);
  });
  devueltas.forEach(function(l) {
    var k = String(l.codigo).trim().toUpperCase();
    var c = Number(l.cantidad) || 0;
    if (!(c > 0)) throw new Error('Cantidad invalida en ' + (l.producto || k));
    if (c > (disp[k] || 0) + 0.001) {
      throw new Error('De ' + (l.producto || k) + ' solo quedan ' + (disp[k] || 0) + ' por devolver de esa nota');
    }
    disp[k] -= c;
  });

  var cfg = ss.getSheetByName('CONFIG');
  var num = (parseInt(cfg.getRange('B8').getValue()) || 0) + 1;
  cfg.getRange('A8').setValue('DEVOLUCION_NUM');
  cfg.getRange('B8').setValue(num);

  var fecha = fechaVE_(d.fecha), tasa = Number(d.tasa) || 0;
  var det = ss.getSheetByName(SH_DETALLE);
  var filasDet = [], valDev = 0, valNue = 0;

  // Lineas negativas: revierten la venta original con su costo congelado
  devueltas.forEach(function(l) {
    var c = Number(l.cantidad) || 0, p = Number(l.precio) || 0, co = Number(l.costo) || 0;
    valDev += c * p;
    filasDet.push([d.idVenta || '', fecha, d.hora || '', d.autorizadoPor, 'DEVOLUCION', l.codigo || '', l.producto || '',
                   -c, p, co, -(c * p), -(c * co), -(c * p - c * co), tasa, -Math.round(c * p * tasa), d.nota || '']);
  });
  // Si es cambio, el producto nuevo entra como venta normal
  nuevas.forEach(function(l) {
    var c = Number(l.cantidad) || 0, p = Number(l.precio) || 0, co = Number(l.costo) || 0;
    valNue += c * p;
    filasDet.push([d.idVenta || '', fecha, d.hora || '', d.autorizadoPor, 'CAMBIO', l.codigo || '', l.producto || '',
                   c, p, co, c * p, c * co, c * p - c * co, tasa, Math.round(c * p * tasa), d.nota || '']);
  });
  if (det && filasDet.length) {
    var r0 = det.getLastRow() + 1;
    det.getRange(r0, 1, filasDet.length, 16).setValues(filasDet);
    det.getRange(r0, 2, filasDet.length, 1).setNumberFormat('dd/MM/yyyy');
  }

  var diferencia = Math.round((valNue - valDev) * 100) / 100;   // >0 el cliente paga, <0 se le devuelve

  var sh = hojaAp_(ss, 'DEVOLUCIONES', ['NUM','FECHA','HORA','NOTA','ID_VENTA','CLIENTE','TIPO','VALOR_DEVUELTO_USD',
    'VALOR_NUEVO_USD','DIFERENCIA_USD','RESOLUCION','METODO','BANCO','AUTORIZADO_POR','MOTIVO','NOTAS']);
  sh.appendRow([num, fecha, d.hora || '', d.nota || '', d.idVenta || '', d.cliente || '',
                nuevas.length ? 'CAMBIO' : 'DEVOLUCION', Math.round(valDev * 100) / 100, Math.round(valNue * 100) / 100,
                diferencia, d.resolucion || '', d.metodo || '', d.banco || '', d.autorizadoPor, d.motivo || '', d.notas || '']);
  formatoFecha_(sh, sh.getLastRow(), 2);

  var dd = hojaAp_(ss, 'DEVOLUCIONES_DET', ['NUM_DEV','NOTA','MOVIMIENTO','CODIGO','CANTIDAD','PRECIO_USD']);
  var fd = devueltas.map(function(l) { return [num, d.nota || '', 'DEVUELTO', l.codigo || '', Number(l.cantidad) || 0, Number(l.precio) || 0]; })
    .concat(nuevas.map(function(l) { return [num, d.nota || '', 'ENTREGADO', l.codigo || '', Number(l.cantidad) || 0, Number(l.precio) || 0]; }));
  dd.getRange(dd.getLastRow() + 1, 1, fd.length, 6).setValues(fd);

  // Saldo a favor del cliente: se anota en CXC_MOV como abono sin cargo (saldo negativo = la tienda le debe)
  if (String(d.resolucion || '').toUpperCase() === 'CREDITO_A_FAVOR' && diferencia < 0 && d.cliente) {
    hojaCxc_(ss).appendRow([fecha, d.hora || '', d.cliente, d.rif || '', 'ABONO', 'DEV-' + num, d.nota || '',
                            Math.abs(diferencia), 'USD', Math.abs(diferencia), tasa, 'Credito a favor', '', 0, d.autorizadoPor, 'Devolucion ' + num]);
  }
  return {ok:true, tipo:'devolucion', num:num, diferencia:diferencia, valorDevuelto:Math.round(valDev * 100) / 100, valorNuevo:Math.round(valNue * 100) / 100};
}

// ============================================================
// CLIENTES (v16)
// ============================================================
// CLIENTES: A NOMBRE, B CEDULA/RIF, C TELEFONO, D DIRECCION, E NOTA, F CREADO, G CREDITO (SI/NO),
//           H LIMITE_USD, I DIAS_PLAZO
function soloDigitos_(v) { return String(v == null ? '' : v).replace(/[^0-9]/g, ''); }

// Cedula y telefono son unicos: si ya existe, se actualiza en vez de crear otro.
function guardarCliente_(ss, d) {
  var sh = prepararClientes_(ss);
  if (!sh) throw new Error('No existe la hoja CLIENTES');
  if (!d.nombre) throw new Error('Falta el nombre');
  var ced = soloDigitos_(d.rif), tel = soloDigitos_(d.tel);
  if (!ced && !tel) throw new Error('Indica cedula o telefono');

  var n = sh.getLastRow() - 1;
  var fila = 0;
  if (n > 0) {
    var vals = sh.getRange(2, 1, n, 3).getValues();
    for (var i = 0; i < vals.length; i++) {
      var c2 = soloDigitos_(vals[i][1]), t2 = soloDigitos_(vals[i][2]);
      if ((ced && c2 && c2 === ced) || (tel && t2 && t2 === tel)) { fila = i + 2; break; }
    }
  }
  var creado = fila ? sh.getRange(fila, 6).getValue() : fechaVE_(d.fecha || '');
  function conserva(campo, col) {   // si el campo no viene en el mensaje, se deja lo que ya habia
    if (campo !== undefined && campo !== null && campo !== '') return campo;
    return fila ? sh.getRange(fila, col).getValue() : '';
  }
  var datos = [d.nombre, conserva(d.rif, 2), conserva(d.tel, 3), conserva(d.dir, 4), conserva(d.nota, 5), creado,
               (d.credito === undefined ? (fila ? String(sh.getRange(fila, 7).getValue() || '') : '') : (d.credito ? 'SI' : 'NO')),
               (d.limite === undefined || d.limite === '') ? (fila ? sh.getRange(fila, 8).getValue() : '') : Number(d.limite) || 0,
               (d.dias === undefined || d.dias === '') ? (fila ? sh.getRange(fila, 9).getValue() : '') : Number(d.dias) || 0,
               // v22: aliado, su porcentaje y el nombre de su negocio
               (d.aliado === undefined ? (fila ? String(sh.getRange(fila, CLI_ALIADO).getValue() || '') : '') : (d.aliado ? 'SI' : 'NO')),
               (d.comisionPct === undefined || d.comisionPct === '') ? (fila ? sh.getRange(fila, CLI_PCT).getValue() : '') : Number(d.comisionPct) || 0,
               conserva(d.negocio, CLI_NEGOCIO)];
  var eraNuevo = !fila;
  if (fila) sh.getRange(fila, 1, 1, CLI_COLS).setValues([datos]);
  else { sh.appendRow(datos); fila = sh.getLastRow(); }
  formatoFecha_(sh, fila, 6);
  var final = sh.getRange(fila, 1, 1, CLI_COLS).getValues()[0];
  return {ok:true, tipo:'cliente', nuevo:eraNuevo, actualizado:!eraNuevo, fila:fila,
          cliente:{nombre:String(final[0]||''), rif:String(final[1]||''), tel:String(final[2]||''),
                   credito:String(final[6]||'').toUpperCase() === 'SI',
                   limite:Number(final[7]) || 0, dias:Number(final[8]) || 0,
                   aliado:String(final[CLI_ALIADO-1]||'').toUpperCase() === 'SI',
                   comisionPct:Number(final[CLI_PCT-1]) || 0, negocio:String(final[CLI_NEGOCIO-1]||'')}};
}

// Metricas por cliente, calculadas de VENTAS (monto y fecha) y VENTAS_DETALLE (margen y productos).
function statsClientes_(ss) {
  var out = {};
  var hoy = new Date(Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd'));

  var v = ss.getSheetByName(SH_VENTAS);
  var notaCliente = {};
  if (v && v.getLastRow() >= 2) {
    var ancho = Math.max(v.getLastColumn(), 31);
    v.getRange(2, 1, v.getLastRow() - 1, ancho).getValues().forEach(function(r) {
      var cli = String(r[25] || '').trim();
      if (!cli) return;
      var f = iso_(r[0]);
      var o = out[cli] || (out[cli] = {cliente:cli, compras:0, totalUSD:0, utilidadUSD:0, primera:'', ultima:'', dias:null, credito:0, productos:{}});
      o.compras++; o.totalUSD += Number(r[5]) || 0; o.credito += Number(r[30]) || 0;
      if (f) {
        if (!o.primera || f < o.primera) o.primera = f;
        if (!o.ultima || f > o.ultima) o.ultima = f;
      }
      if (r[24]) notaCliente[String(r[24])] = cli;
    });
  }

  var det = ss.getSheetByName(SH_DETALLE);
  if (det && det.getLastRow() >= 2) {
    det.getRange(2, 1, det.getLastRow() - 1, 16).getValues().forEach(function(r) {
      var cli = notaCliente[String(r[15] || '')];
      if (!cli || !out[cli]) return;
      out[cli].utilidadUSD += Number(r[12]) || 0;
      var p = String(r[6] || '');
      if (p) out[cli].productos[p] = (out[cli].productos[p] || 0) + (Number(r[7]) || 0);
    });
  }

  var lista = Object.keys(out).map(function(k) {
    var o = out[k];
    o.totalUSD = round2_(o.totalUSD); o.utilidadUSD = round2_(o.utilidadUSD); o.credito = round2_(o.credito);
    o.margen = o.totalUSD ? round2_(o.utilidadUSD / o.totalUSD * 100) : 0;
    o.ticket = o.compras ? round2_(o.totalUSD / o.compras) : 0;
    o.diasSinComprar = o.ultima ? Math.floor((hoy - new Date(o.ultima)) / 86400000) : null;
    o.top = Object.keys(o.productos).sort(function(a, b) { return o.productos[b] - o.productos[a]; }).slice(0, 3)
      .map(function(p) { return {producto:p, unidades:o.productos[p]}; });
    delete o.productos;
    return o;
  });
  lista.sort(function(a, b) { return b.totalUSD - a.totalUSD; });
  return {ok:true, clientes:lista};
}

// ============================================================
// INVENTARIO POR CONTEO (v17)
// ============================================================
// LISTA DE PRODUCTOS: O (15) STOCK_CONTEO, P (16) FECHA_CONTEO
// CONTEOS: A FECHA, B HORA, C CODIGO, D PRODUCTO, E CONTADO, F ESPERADO, G DIFERENCIA, H TIPO (INICIAL|RECUENTO),
//          I CONTADO_POR, J ESTADO, K CAUSA, L PENALIDAD_USD, M REVISADO_POR, N FECHA_REVISION, O NOTAS
var COL_STK = 15, COL_STK_FECHA = 16;

function filaProducto_(sh, codigo) {
  if (sh.getLastRow() < 3) return 0;
  var cods = sh.getRange(3, 1, sh.getLastRow() - 2, 1).getValues();
  var c = String(codigo || '').trim().toUpperCase();
  for (var i = 0; i < cods.length; i++) {
    if (String(cods[i][0] || '').trim().toUpperCase() === c) return i + 3;
  }
  return 0;
}

// Movimientos posteriores a la fecha del conteo: ventas (negativas), devoluciones (ya vienen en negativo) y compras.
// Momento exacto de un movimiento: fecha + hora. Si no hay hora, se asume el final del dia,
// para no volver a restar algo que el conteo de la tarde ya vio en el estante.
function instante_(fecha, hora) {
  var f = iso_(fecha);
  if (!f) return '';
  var h = String(hora || '').trim();
  var m = /^(\d{1,2}):(\d{2})/.exec(h);
  if (m) {
    var hh = Number(m[1]);
    if (/p\.?\s*m/i.test(h) && hh < 12) hh += 12;
    if (/a\.?\s*m/i.test(h) && hh === 12) hh = 0;
    return f + ' ' + ('0' + hh).slice(-2) + ':' + m[2];
  }
  return f + ' 23:59';
}

// Solo cuentan los movimientos POSTERIORES al instante del conteo de cada producto.
function movimientosDesde_(ss, desdePorCodigo) {
  var mov = {};
  var det = ss.getSheetByName(SH_DETALLE);
  if (det && det.getLastRow() >= 2) {
    var anchoD = Math.max(det.getLastColumn(), 16);
    det.getRange(2, 1, det.getLastRow() - 1, anchoD).getValues().forEach(function(r) {
      var cod = String(r[5] || '').trim().toUpperCase();
      if (!cod || !desdePorCodigo[cod]) return;
      var t = instante_(r[1], r[2]);
      if (!t || t <= desdePorCodigo[cod]) return;
      mov[cod] = mov[cod] || {vendido:0, comprado:0};
      mov[cod].vendido += Number(r[7]) || 0;     // las devoluciones ya vienen con cantidad negativa
    });
  }
  var com = ss.getSheetByName('COMPRAS_DETALLE');
  if (com && com.getLastRow() >= 2) {
    com.getRange(2, 1, com.getLastRow() - 1, 10).getValues().forEach(function(r) {
      var cod = String(r[3] || '').trim().toUpperCase();
      if (!cod || !desdePorCodigo[cod]) return;
      var t = instante_(r[1], '');
      if (!t || t <= desdePorCodigo[cod]) return;
      mov[cod] = mov[cod] || {vendido:0, comprado:0};
      mov[cod].comprado += Number(r[5]) || 0;
    });
  }
  return mov;
}

function calcularStock_(ss, codigo) {
  var sh = ss.getSheetByName('LISTA DE PRODUCTOS');
  if (!sh || sh.getLastRow() < 3) return {ok:true, productos:[]};
  var n = sh.getLastRow() - 2;
  var vals = sh.getRange(3, 1, n, 16).getValues();
  var filtro = String(codigo || '').trim().toUpperCase();

  var desde = {};
  vals.forEach(function(r) {
    var cod = String(r[0] || '').trim().toUpperCase();
    var v = r[COL_STK_FECHA - 1];
    if (!cod || !v) return;
    // La celda del conteo guarda fecha y hora: ese es el corte exacto
    desde[cod] = esFecha_(v) ? Utilities.formatDate(v, TZ_VE, 'yyyy-MM-dd HH:mm') : (iso_(v) ? iso_(v) + ' 00:00' : '');
    if (!desde[cod]) delete desde[cod];
  });
  var mov = movimientosDesde_(ss, desde);

  var out = [];
  vals.forEach(function(r) {
    var cod = String(r[0] || '').trim().toUpperCase();
    if (!cod) return;
    if (filtro && cod !== filtro) return;
    var contado = r[COL_STK - 1], fecha = iso_(r[COL_STK_FECHA - 1]);
    var corte = desde[cod] || '';
    var tiene = fecha && contado !== '' && contado !== null;
    var m = mov[cod] || {vendido:0, comprado:0};
    out.push({codigo:String(r[0] || '').trim(), producto:String(r[2] || '').trim(), categoria:String(r[3] || '').trim(),
              costo:Number(r[7]) || 0, precio:Number(r[8]) || 0,
              contado:tiene ? Number(contado) || 0 : null, fechaConteo:tiene ? fecha : '', corteConteo:tiene ? corte : '',
              vendido:m.vendido, comprado:m.comprado,
              stock:tiene ? (Number(contado) || 0) + m.comprado - m.vendido : null});
  });
  return {ok:true, productos:out};
}

function guardarConteo_(ss, d) {
  var sh = ss.getSheetByName('LISTA DE PRODUCTOS');
  var fila = filaProducto_(sh, d.codigo);
  if (!fila) throw new Error('No se encontro el producto ' + d.codigo);

  var est = calcularStock_(ss, d.codigo);
  var p = (est.productos || [])[0] || {};
  var esperado = p.stock;                      // null si nunca se habia contado
  var contado = Number(d.contado);
  if (!(contado >= 0)) throw new Error('Cantidad invalida');
  var primero = esperado === null || esperado === undefined;
  var dif = primero ? 0 : contado - esperado;

  sh.getRange(fila, COL_STK).setValue(contado);
  sh.getRange(fila, COL_STK_FECHA).setValue(new Date());
  sh.getRange(fila, COL_STK_FECHA).setNumberFormat('dd/MM/yyyy HH:mm');

  var ct = hojaAp_(ss, 'CONTEOS', ['FECHA','HORA','CODIGO','PRODUCTO','CONTADO','ESPERADO','DIFERENCIA','TIPO',
    'CONTADO_POR','ESTADO','CAUSA','PENALIDAD_USD','REVISADO_POR','FECHA_REVISION','NOTAS']);
  var estado = primero ? 'INICIAL' : (dif === 0 ? 'OK' : 'PENDIENTE');
  ct.appendRow([fechaVE_(d.fecha), d.hora || '', p.codigo || d.codigo, p.producto || '', contado,
                primero ? '' : esperado, primero ? '' : dif, primero ? 'INICIAL' : 'RECUENTO',
                d.contadoPor || '', estado, '', '', '', '', d.notas || '']);
  formatoFecha_(ct, ct.getLastRow(), 1);

  return {ok:true, tipo:'conteo', codigo:p.codigo || d.codigo, producto:p.producto || '', contado:contado,
          esperado:primero ? null : esperado, diferencia:primero ? null : dif, primero:primero,
          valorDiferencia:primero ? 0 : round2_(dif * (Number(p.costo) || 0))};
}

// Diferencias pendientes de revision, para Gerencia
function conteosPendientes_(ss) {
  var ct = ss.getSheetByName('CONTEOS');
  if (!ct || ct.getLastRow() < 2) return {ok:true, conteos:[]};
  var rows = ct.getRange(2, 1, ct.getLastRow() - 1, 15).getValues();
  var out = [];
  rows.forEach(function(r, i) {
    if (String(r[9]) !== 'PENDIENTE') return;
    out.push({fila:i + 2, fecha:fmtFecha_(r[0]), hora:String(r[1] || ''), codigo:String(r[2] || ''), producto:String(r[3] || ''),
              contado:Number(r[4]) || 0, esperado:Number(r[5]) || 0, diferencia:Number(r[6]) || 0,
              contadoPor:String(r[8] || ''), notas:String(r[14] || '')});
  });
  out.sort(function(a, b) { return Math.abs(b.diferencia) - Math.abs(a.diferencia); });
  return {ok:true, conteos:out};
}

function resolverConteo_(ss, d) {
  var ct = ss.getSheetByName('CONTEOS');
  if (!ct) throw new Error('No hay conteos');
  var fila = Number(d.fila) || 0;
  if (fila < 2) throw new Error('Fila invalida');
  ct.getRange(fila, 10).setValue('REVISADO');
  ct.getRange(fila, 11).setValue(d.causa || '');
  ct.getRange(fila, 12).setValue(Number(d.penalidad) || 0);
  ct.getRange(fila, 13).setValue(d.revisadoPor || '');
  ct.getRange(fila, 14).setValue(new Date());
  formatoFecha_(ct, fila, 14);
  if (d.notas) ct.getRange(fila, 15).setValue(String(ct.getRange(fila, 15).getValue() || '') + ' ' + d.notas);
}

// ============================================================
// COSTEO DE COMPRAS Y CUENTAS POR PAGAR (v18)
// ============================================================
// COMPRAS suma: O CONDICION, P DIAS_CREDITO, Q VENCE, R METODO, S BANCO
// CXP_MOV: A FECHA, B HORA, C PROVEEDOR, D TIPO (CARGO|ABONO), E ID_COMPRA, F FACTURA, G MONTO_USD,
//          H MONEDA, I MONTO_PAGADO, J TASA, K METODO, L BANCO, M REGISTRADO_POR, N NOTAS
function listaCompras_(ss, estado) {
  var sh = ss.getSheetByName('COMPRAS');
  if (!sh || sh.getLastRow() < 2) return {ok:true, compras:[]};
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 19).getValues();

  var det = {};
  var dt = ss.getSheetByName('COMPRAS_DETALLE');
  if (dt && dt.getLastRow() >= 2) {
    dt.getRange(2, 1, dt.getLastRow() - 1, 10).getValues().forEach(function(r) {
      var id = String(r[0] || '');
      (det[id] = det[id] || []).push({codigo:String(r[3] || ''), producto:String(r[4] || ''),
        cantidad:Number(r[5]) || 0, costo:Number(r[6]) || 0, nuevo:String(r[8] || '') === 'SI'});
    });
  }
  var out = [];
  rows.forEach(function(r, i) {
    var est = String(r[8] || '');
    if (estado && est !== estado) return;
    var id = String(r[0] || '');
    out.push({fila:i + 2, id:id, fecha:fmtFecha_(r[1]), proveedor:String(r[3] || ''), factura:String(r[4] || ''),
              recibidoPor:String(r[5] || ''), lineas:Number(r[6]) || 0, unidades:Number(r[7]) || 0, estado:est,
              costoTotal:Number(r[9]) || 0, foto:String(r[10] || ''), notas:String(r[11] || ''),
              condicion:String(r[14] || ''), dias:Number(r[15]) || 0, vence:r[16] ? fmtFecha_(r[16]) : '',
              productos:det[id] || []});
  });
  out.sort(function(a, b) { return b.fila - a.fila; });
  return {ok:true, compras:out};
}

function costearCompra_(ss, d) {
  var lineas = d.lineas || [];
  if (!lineas.length) throw new Error('Costeo sin lineas');
  var sh = ss.getSheetByName('COMPRAS');
  var fila = Number(d.fila) || 0;
  if (!fila || String(sh.getRange(fila, 1).getValue()) !== String(d.id)) {
    var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    fila = 0;
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(d.id)) { fila = i + 2; break; }
  }
  if (!fila) throw new Error('No se encontro la compra ' + d.id);
  var estadoActual = String(sh.getRange(fila, 9).getValue() || '');
  if (estadoActual === 'COSTEADA') {
    // Ya se costeo antes (o se reenvio el mismo mensaje): no se duplica la deuda ni se toca el costo
    return {ok:true, tipo:'costeo', id:d.id, repetida:true, total:Number(sh.getRange(fila, 10).getValue()) || 0,
            condicion:String(sh.getRange(fila, 15).getValue() || ''),
            vence:sh.getRange(fila, 17).getValue() ? iso_(sh.getRange(fila, 17).getValue()) : '', actualizados:[]};
  }

  // Costos en el detalle
  var dt = ss.getSheetByName('COMPRAS_DETALLE');
  var dtRows = dt.getRange(2, 1, dt.getLastRow() - 1, 10).getValues();
  var total = 0;
  lineas.forEach(function(l) {
    var c = Number(l.costo) || 0, cant = Number(l.cantidad) || 0;
    total += c * cant;
    for (var i = 0; i < dtRows.length; i++) {
      if (String(dtRows[i][0]) !== String(d.id)) continue;
      if (String(dtRows[i][3]).trim().toUpperCase() !== String(l.codigo).trim().toUpperCase()) continue;
      dt.getRange(i + 2, 7).setValue(c);
      dt.getRange(i + 2, 8).setValue(c * cant);
      dt.getRange(i + 2, 10).setValue('COSTEADA');
      break;
    }
  });
  total = round2_(total);

  // Costo del producto: promedio ponderado con el stock que habia
  var lp = ss.getSheetByName('LISTA DE PRODUCTOS');
  var est = calcularStock_(ss, '');
  var porCod = {};
  (est.productos || []).forEach(function(p) { porCod[String(p.codigo).trim().toUpperCase()] = p; });
  var actualizados = [];
  lineas.forEach(function(l) {
    var f = filaProducto_(lp, l.codigo);
    if (!f) return;
    var p = porCod[String(l.codigo).trim().toUpperCase()] || {};
    var costoViejo = Number(p.costo) || 0;
    var stockPrevio = (p.stock === null || p.stock === undefined) ? 0 : Math.max(0, Number(p.stock) - (Number(l.cantidad) || 0));
    var cant = Number(l.cantidad) || 0, costoNuevo = Number(l.costo) || 0;
    var prom = (stockPrevio > 0 && costoViejo > 0)
      ? (stockPrevio * costoViejo + cant * costoNuevo) / (stockPrevio + cant)
      : costoNuevo;
    prom = Math.round(prom * 10000) / 10000;
    lp.getRange(f, 6).setValue(prom);   // F: Costo
    lp.getRange(f, 7).setValue('');     // G: descuento, ya viene aplicado en el costo de la factura
    var precio = Number(l.precio) || 0;
    if (precio > 0) {
      lp.getRange(f, 9).setValue(precio);            // I: Precio de venta (sin IVA)
      var ref = String(lp.getRange(f, 11).getValue() || '');
      if (ref.toUpperCase().indexOf('NUEVO') >= 0) lp.getRange(f, 11).setValue('');   // K: quita "NUEVO - SIN PRECIO"
    }
    actualizados.push({codigo:l.codigo, costoAnterior:costoViejo, costoNuevo:prom, precio:precio, stockPrevio:stockPrevio});
  });

  // Cabecera
  var condicion = String(d.condicion || 'CONTADO').toUpperCase();
  var dias = Number(d.dias) || 0;
  var vence = '';
  if (condicion === 'CREDITO' && dias > 0) {
    var base = fechaVE_(d.fecha);
    var vd = esFecha_(base) ? new Date(base.getTime()) : new Date();
    vd.setDate(vd.getDate() + dias);
    vence = vd;
  }
  sh.getRange(fila, 9).setValue('COSTEADA');
  sh.getRange(fila, 10).setValue(total);
  sh.getRange(fila, 13).setValue(d.costeadoPor || '');
  sh.getRange(fila, 14).setValue(new Date());
  formatoFecha_(sh, fila, 14);
  sh.getRange(fila, 15).setValue(condicion);
  sh.getRange(fila, 16).setValue(dias);
  if (vence) { sh.getRange(fila, 17).setValue(vence); formatoFecha_(sh, fila, 17); }
  sh.getRange(fila, 18).setValue(d.metodo || '');
  sh.getRange(fila, 19).setValue(d.banco || '');

  // Dias de credito del proveedor, para proponerlos la proxima vez
  if (dias > 0 && d.proveedor) {
    var pv = hojaProveedores_(ss);
    var pn = pv.getLastRow() - 1;
    if (pn > 0) {
      var nombres = pv.getRange(2, 1, pn, 1).getValues();
      for (var k = 0; k < nombres.length; k++) {
        if (String(nombres[k][0]).trim().toUpperCase() === String(d.proveedor).trim().toUpperCase()) {
          pv.getRange(k + 2, 7).setValue(dias);
          break;
        }
      }
    }
  }

  // A credito: nace el compromiso de pago
  if (condicion === 'CREDITO') {
    movCxp_(ss, {fecha:d.fecha, hora:d.hora, proveedor:d.proveedor, id:d.id, factura:d.factura,
                 montoUSD:total, registradoPor:d.costeadoPor, notas:'Compra a ' + dias + ' dias'}, 'CARGO');
  }
  return {ok:true, tipo:'costeo', id:d.id, total:total, condicion:condicion, vence:vence ? iso_(vence) : '', actualizados:actualizados};
}

function hojaCxp_(ss) {
  return hojaAp_(ss, 'CXP_MOV', ['FECHA','HORA','PROVEEDOR','TIPO','ID_COMPRA','FACTURA','MONTO_USD','MONEDA',
    'MONTO_PAGADO','TASA','METODO','BANCO','REGISTRADO_POR','NOTAS']);
}
function movCxp_(ss, d, tipo) {
  if (!d.proveedor) throw new Error('Falta el proveedor');
  var m = Number(d.montoUSD) || 0;
  if (m <= 0) throw new Error('Monto invalido');
  var sh = hojaCxp_(ss);
  sh.appendRow([fechaVE_(d.fecha), d.hora || '', d.proveedor, tipo, d.id || '', d.factura || '', m,
                d.moneda || 'USD', Number(d.montoPagado) || m, Number(d.tasa) || 0, d.metodo || '', d.banco || '',
                d.registradoPor || '', d.notas || '']);
  formatoFecha_(sh, sh.getLastRow(), 1);
}

// Saldos por proveedor, con las facturas pendientes y su vencimiento
function estadoCxp_(ss) {
  var sh = ss.getSheetByName('CXP_MOV');
  if (!sh || sh.getLastRow() < 2) return {ok:true, proveedores:[]};
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues();

  var vencimientos = {};
  var c = ss.getSheetByName('COMPRAS');
  if (c && c.getLastRow() >= 2) {
    c.getRange(2, 1, c.getLastRow() - 1, 19).getValues().forEach(function(r) {
      if (r[16]) vencimientos[String(r[0])] = iso_(r[16]);
    });
  }
  var hoy = Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd');
  var porProv = {};
  rows.forEach(function(r) {
    var p = String(r[2]).trim(); if (!p) return;
    var o = porProv[p] || (porProv[p] = {proveedor:p, cargos:0, abonos:0, facturas:{}, movs:[]});
    var monto = Number(r[6]) || 0, tipo = String(r[3]).toUpperCase(), id = String(r[4] || '');
    if (tipo === 'CARGO') {
      o.cargos += monto;
      o.facturas[id] = {id:id, factura:String(r[5] || ''), fecha:fmtFecha_(r[0]), montoUSD:monto, abonado:0,
                        vence:vencimientos[id] || '', vencida:false};
    } else if (tipo === 'ABONO') {
      o.abonos += monto;
      if (id && o.facturas[id]) o.facturas[id].abonado += monto;
      else o.pendienteAplicar = (o.pendienteAplicar || 0) + monto;
    }
    o.movs.push({fecha:fmtFecha_(r[0]), tipo:tipo, montoUSD:monto, metodo:String(r[10] || ''), factura:String(r[5] || '')});
  });

  var out = Object.keys(porProv).map(function(k) {
    var o = porProv[k];
    var libre = o.pendienteAplicar || 0;
    o.facturas = Object.keys(o.facturas).map(function(f) { return o.facturas[f]; })
      .sort(function(a, b) { return String(a.vence || '9999').localeCompare(String(b.vence || '9999')); });
    o.facturas.forEach(function(f) {                       // abonos sin factura: a las mas viejas primero
      var falta = f.montoUSD - f.abonado;
      if (libre > 0 && falta > 0) { var ap = Math.min(libre, falta); f.abonado += ap; libre -= ap; }
      f.pendienteUSD = round2_(f.montoUSD - f.abonado);
      f.vencida = f.pendienteUSD > 0.009 && f.vence && f.vence < hoy;
      f.estado = f.pendienteUSD <= 0.009 ? 'PAGADA' : (f.abonado > 0 ? 'PARCIAL' : 'PENDIENTE');
    });
    o.saldoUSD = round2_(o.cargos - o.abonos);
    o.cargos = round2_(o.cargos); o.abonos = round2_(o.abonos);
    o.vencido = round2_(o.facturas.filter(function(f) { return f.vencida; }).reduce(function(a, f) { return a + f.pendienteUSD; }, 0));
    return o;
  }).filter(function(o) { return o.saldoUSD > 0.009 || o.movs.length; });
  out.sort(function(a, b) { return b.saldoUSD - a.saldoUSD; });
  return {ok:true, proveedores:out};
}

// ============================================================
// FACTURA ASOCIADA A UNA VENTA (v20)
// ============================================================
// Escribe el numero de factura y de control en la fila de la venta y deja constancia en FACTURAS.
// Si la venta ya tiene factura, no crea otra: devuelve la que ya tenia.
function guardarFacturaVenta_(ss, d) {
  var sh = ss.getSheetByName(SH_VENTAS);
  var v = ventaPorId_(ss, d.idVenta);
  if (!v) throw new Error('No se encontro la venta ' + (d.idVenta || '(sin id)'));

  var yaF = String(sh.getRange(v.fila, 36).getValue() || '');   // AJ FACTURA_NUM
  if (yaF) return {ok:true, tipo:'factura_venta', repetida:true, facturaNum:yaF,
                   controlNum:String(sh.getRange(v.fila, 37).getValue() || '')};

  sh.getRange(v.fila, 32).setValue(Number(d.baseUSD) || 0);        // AF
  sh.getRange(v.fila, 33).setValue(Number(d.ivaUSD) || 0);         // AG
  sh.getRange(v.fila, 34).setValue(Number(d.totalConIvaUSD) || 0); // AH
  sh.getRange(v.fila, 35).setValue(Number(d.tasaBCV) || 0);        // AI
  sh.getRange(v.fila, 36).setValue(d.facturaNum || '');            // AJ
  sh.getRange(v.fila, 37).setValue(d.controlNum || '');            // AK

  var fx = hojaAp_(ss, 'FACTURAS', ['NUM_FACTURA','NUM_CONTROL','FECHA','HORA','CLIENTE','CEDULA_RIF',
    'BASE_USD','IVA_USD','TOTAL_USD','TASA_BCV','TOTAL_BS','FORMA_PAGO','ID_VENTA','VENDEDOR','ANULADA','NOTAS']);
  fx.appendRow([d.facturaNum || '', d.controlNum || '', fechaVE_(d.fecha), d.hora || '',
    d.cliente ? d.cliente.nombre : '', d.cliente ? (d.cliente.rif || '') : '',
    Number(d.baseUSD) || 0, Number(d.ivaUSD) || 0, Number(d.totalConIvaUSD) || 0,
    Number(d.tasaBCV) || 0, Number(d.totalBS) || 0, d.formaPago || '', d.idVenta || '', d.vendedor || '', '', '']);
  formatoFecha_(fx, fx.getLastRow(), 3);
  return {ok:true, tipo:'factura_venta', facturaNum:d.facturaNum, controlNum:d.controlNum};
}


// ============================================================
// BLOQUE D (v21) — DATOS QUE ANTES SE LEIAN POR CSV PUBLICO
// ============================================================
// LISTA DE PRODUCTOS: A Codigo, B MARCA, C PRODUCTO, D Categoria, E Cant, F Costo, G descuento,
//                     H Costo Final, I Precio, J EN BS, K REF, L IMAGEN, M IMAGEN2, N IMAGEN3
// Los datos empiezan en la fila 3 (la 1 es de titulos/tasa y la 2 los encabezados).
var COL_COSTO = 6, COL_DESC = 7, COL_COSTO_FINAL = 8;

function listaProductos_(ss, conCosto) {
  var sh = ss.getSheetByName('LISTA DE PRODUCTOS');
  if (!sh || sh.getLastRow() < 3) return {ok:true, tasa:leerTasa_(ss), filas:[]};
  var ancho = Math.max(sh.getLastColumn(), 14);
  var vals = sh.getRange(3, 1, sh.getLastRow() - 2, ancho).getValues();
  var filas = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!comoTexto_(r[2]).trim()) continue;                // sin nombre de producto no es una fila real
    var f = [];
    for (var c = 0; c < 14; c++) f.push(comoTexto_(r[c]));
    if (!conCosto) { f[COL_COSTO - 1] = ''; f[COL_DESC - 1] = ''; f[COL_COSTO_FINAL - 1] = ''; }
    f[14] = i + 3;     // fila real en la hoja (los datos empiezan en la 3). La usa boparts_fotos.html.
    filas.push(f);
  }
  return {ok:true, tasa:leerTasa_(ss), conCosto:!!conCosto, filas:filas};
}

// Una celda, como la entregaba el CSV: siempre texto. Sin esto, un codigo o una categoria numerica llega
// como number y cualquier .trim() de las pantallas revienta.
function comoTexto_(v) {
  if (v == null) return '';
  if (esFecha_(v)) return Utilities.formatDate(v, TZ_VE, 'dd/MM/yyyy');
  return String(v);
}

// Costo vigente de una lista de codigos, para congelarlo en la linea de venta.
function costosPorCodigo_(ss, codigos) {
  var out = {};
  var quiero = {};
  (codigos || []).forEach(function(c) { var k = String(c || '').trim().toUpperCase(); if (k) quiero[k] = 1; });
  var sh = ss.getSheetByName('LISTA DE PRODUCTOS');
  if (!sh || sh.getLastRow() < 3) return out;
  var vals = sh.getRange(3, 1, sh.getLastRow() - 2, COL_COSTO_FINAL).getValues();
  for (var i = 0; i < vals.length; i++) {
    var k = String(vals[i][0] || '').trim().toUpperCase();
    if (!k || !quiero[k] || out[k]) continue;
    var cf = Number(vals[i][COL_COSTO_FINAL - 1]) || 0;
    out[k] = cf || Number(vals[i][COL_COSTO - 1]) || 0;    // si no hay Costo Final, sirve el Costo
  }
  return out;
}

// El catalogo de los 8 proveedores, que usa boparts_demanda.html.
function catalogoProveedores_(ss) {
  var nombres = ['CATALOGO PROVEEDORES', 'CATALOGO_PROVEEDORES', 'Catalogo Proveedores', 'CATALOGO'];
  var sh = null;
  for (var i = 0; i < nombres.length && !sh; i++) sh = ss.getSheetByName(nombres[i]);
  if (!sh) {
    // Ultimo recurso: la primera hoja cuyo nombre contenga "catalogo"
    ss.getSheets().forEach(function(s) { if (!sh && /catalogo/i.test(s.getName())) sh = s; });
  }
  if (!sh || sh.getLastRow() < 2) return {ok:false, error:'No se encontro la hoja del catalogo de proveedores'};
  var vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues()
    .map(function(r) { return r.map(comoTexto_); });
  return {ok:true, hoja:sh.getName(), filas:vals};
}

// ============================================================
// v26 — REPARAR LAS COMISIONES QUE QUEDARON CONGELADAS
// ============================================================
// Ejecuta esta funcion UNA VEZ desde el editor de Apps Script (boton Ejecutar).
//
// Desde que existe la liquidacion, toda venta a credito con aliado nacio con su comision en
// 'PENDIENTE COBRO' y NADA la sacaba de ahi cuando el cliente pagaba. Asi que hay comisiones
// ya ganadas, de notas ya cobradas, que el sistema nunca mostro como pagaderas. Desde v26 eso se
// arregla solo al registrar cada abono; esto repara lo que quedo atras.
//
// Va aparte, y a proposito: reparar datos historicos NO debe pasar dentro de una consulta. Si lo
// metieramos en la pantalla de liquidacion, nadie sabria cuando se modifico la hoja ni por que.
// Aqui se ejecuta cuando tu decides, deja el resultado en el registro y se puede correr otra vez
// sin hacer dano: una comision que ya paso a PENDIENTE no se vuelve a tocar.
//
// Solo libera comisiones de notas PAGADAS COMPLETAS. Con un abono parcial la comision sigue
// congelada: si le pagas al aliado y el cliente no termina de pagar, pierdes dos veces.
function repararComisionesCobradas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var todas = [];
    (estadoCxc_(ss, '') || []).forEach(function(c) {
      (c.notas || []).forEach(function(n) { todas.push(n); });
    });
    var pagadas = todas.filter(function(n) { return n.estado === 'PAGADA'; });
    var libres = liberarComisionesCobradas_(ss, todas);
    SpreadsheetApp.flush();
    var msg = 'Notas pagadas encontradas: ' + pagadas.length +
              '\nComisiones liberadas (PENDIENTE COBRO -> PENDIENTE): ' + libres +
              (libres ? '\n\nYa aparecen como cobrables en Gerencia > Liquidacion de aliados.'
                      : '\n\nNo habia ninguna congelada de una nota ya pagada.');
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}   // sin UI (ejecucion directa) no estorba
    return msg;
  } finally {
    SpreadsheetApp.flush();   // v26.1: vaciar ANTES de soltar el candado
    lock.releaseLock();
  }
}

// ============================================================
// BLOQUE D (v21) — AYUDA PARA CONFIGURAR, desde el editor
// ============================================================
// Ejecuta esta funcion UNA VEZ desde el editor de Apps Script (boton Ejecutar).
// Crea la hoja USUARIOS con los tres usuarios y deja CONFIG!B15 en NO.
// Los PIN se ponen despues, a mano, en la columna PIN_NUEVO de la hoja USUARIOS.
function prepararBloqueD() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  hojaUsuarios_(ss);
  var cfg = ss.getSheetByName('CONFIG');
  if (cfg && !String(cfg.getRange('B15').getValue() || '').trim()) {
    cfg.getRange('A15').setValue('AUTH_ACTIVA');
    cfg.getRange('B15').setValue('NO');
  }
  SpreadsheetApp.flush();
  return 'Listo. Escribe los PIN en USUARIOS!D (PIN_NUEVO). CONFIG!B15 = NO (sistema abierto, como hasta hoy).';
}


// ============================================================
// BLOQUE D (v21.1) — METODOS DE PAGO Y ALIADOS, desde la hoja
// ============================================================
// Estaban escritos dentro de boparts_ventas.html. Ahi, agregar un banco o corregir la comision de un punto
// obligaba a editar el archivo y subirlo; y una comision equivocada no da error, solo calcula mal el NETO
// de cada venta sin que nadie lo note. Ahora se administran desde las hojas.
//
// METODOS_PAGO: A LABEL, B METODO, C BANCO, D MONEDA (USD/BS), E FIJO_BS, F PCT, G CREDITO (SI/NO), H ACTIVO (SI/NO)
// ALIADOS:      A ID, B NOMBRE, C NEGOCIO, D PCT, E ACTIVO (SI/NO)
//
// El orden de las filas es el orden en que salen en la pantalla de venta.

var METODOS_DEFECTO = [
  ['Efectivo USD',                  'Efectivo',       '',                            'USD', 0,    0,   'NO', 'SI'],
  ['Efectivo Bs',                   'Efectivo',       '',                            'BS',  0,    0,   'NO', 'SI'],
  ['Pago Movil Banesco',            'Pago Movil',     'Banesco',                     'BS',  0,    0,   'NO', 'SI'],
  ['Pago Movil Bancrecer',          'Pago Movil',     'Bancrecer',                   'BS',  0,    0,   'NO', 'SI'],
  ['Punto Bancamiga',               'Punto de Venta', 'Bancamiga',                   'BS',  1000, 1.5, 'NO', 'SI'],
  ['Punto Bancrecer Emp.',          'Punto de Venta', 'Bancrecer Empresarial',       'BS',  0,    0,   'NO', 'SI'],
  ['Cashea Bancrecer',              'Cashea',         'Bancrecer Empresarial',       'BS',  0,    0,   'NO', 'SI'],
  ['CREDITO (cuenta por cobrar)',   'Credito',        '',                            'USD', 0,    0,   'SI', 'SI']
];
var ALIADOS_DEFECTO = [
  ['AL-001', 'Luis',  'Taller Diesel', 5, 'SI'],
  ['AL-002', 'David', 'Taller Motos',  5, 'SI']
];

function siNo_(v, pordefecto) {
  var s = String(v == null ? '' : v).trim().toUpperCase();
  if (!s) return !!pordefecto;
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1' || s === 'X';
}

// Devuelve la hoja si sus encabezados son los que esperamos. Si esta vacia o no existe, la crea con los
// valores de hoy. Si existe pero con OTRAS columnas (las hojas viejas que ya no lee nadie), NO se interpreta:
// devuelve null y arriba se usan los valores de siempre. Leer columnas equivocadas seria peor que no leer:
// una comision mal leida no da error, solo calcula mal el NETO de cada venta.
function hojaSemilla_(ss, nombre, encabezados, semilla) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() < 1) { sh.appendRow(encabezados); sh.setFrozenRows(1); }
  var cab = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), encabezados.length)).getValues()[0];
  var norm = function(v) { return String(v == null ? '' : v).trim().toUpperCase().replace(/[\s.]+/g, '_'); };
  for (var i = 0; i < encabezados.length; i++) {
    if (norm(cab[i]) !== norm(encabezados[i])) return null;
  }
  if (sh.getLastRow() < 2 && semilla && semilla.length) {
    sh.getRange(2, 1, semilla.length, semilla[0].length).setValues(semilla);
  }
  return sh;
}

function metodosYAliados_(ss) {
  var avisos = [];
  var shM = hojaSemilla_(ss, 'METODOS_PAGO',
    ['LABEL','METODO','BANCO','MONEDA','FIJO_BS','PCT','CREDITO','ACTIVO'], METODOS_DEFECTO);
  if (!shM) avisos.push('La hoja METODOS_PAGO tiene otras columnas; se estan usando los metodos de siempre. ' +
                        'Encabezados que espera la app: LABEL, METODO, BANCO, MONEDA, FIJO_BS, PCT, CREDITO, ACTIVO.');
  var metodos = [];
  if (shM && shM.getLastRow() >= 2) {
    shM.getRange(2, 1, shM.getLastRow() - 1, 8).getValues().forEach(function(r) {
      var label = String(r[0] || '').trim();
      var metodo = String(r[1] || '').trim();
      var moneda = String(r[3] || '').trim().toUpperCase();
      if (!label) return;
      // Un metodo de pago real tiene METODO y MONEDA. Una nota, un titulo o cualquier texto suelto que
      // alguien deje en la hoja tiene solo la primera columna: se ignora en vez de salir en la venta.
      if (!metodo) return;
      if (moneda !== 'USD' && moneda !== 'BS') return;
      if (label.length > 60) return;                        // una etiqueta no es un parrafo
      if (!siNo_(r[7], true)) return;                       // ACTIVO vacio = activo
      metodos.push({label:label, metodo:metodo, banco:String(r[2] || '').trim(), moneda:moneda,
                    fijo:Number(r[4]) || 0, pct:Number(r[5]) || 0, credito:siNo_(r[6], false)});
    });
  }

  // v22: los aliados salen de CLIENTES (columna ALIADO = SI). La hoja ALIADOS solo se usa si todavia
  // no hay ningun cliente marcado, para que nada se rompa el dia que se instala esta version.
  var aliados = listaAliados_(ss);
  var shA = null;
  if (!aliados.length) {
    shA = hojaSemilla_(ss, 'ALIADOS', ['ID','NOMBRE','NEGOCIO','PCT','ACTIVO'], ALIADOS_DEFECTO);
    if (shA && shA.getLastRow() >= 2) {
      shA.getRange(2, 1, shA.getLastRow() - 1, 5).getValues().forEach(function(r) {
        var nom = String(r[1] || '').trim();
        if (!nom || nom.length > 60 || !(Number(r[3]) > 0)) return;   // sin porcentaje no es un aliado
        if (!siNo_(r[4], true)) return;
        aliados.push({id:String(r[0] || '').trim() || nom.toUpperCase(), nombre:nom,
                      negocio:String(r[2] || '').trim(), pct:Number(r[3]) || 0});
      });
    }
    avisos.push('Todavia no hay ningun cliente marcado como aliado; se esta usando la hoja ALIADOS. ' +
                'Marca ALIADO = SI en CLIENTES y pon su porcentaje en COMISION_PCT.');
  }

  // Si alguien deja las hojas sin una sola fila utilizable, se responde con lo de siempre en vez de
  // dejar la pantalla de venta sin metodos de pago.
  var deHoja = metodos.length > 0;
  if (!metodos.length) {
    metodos = METODOS_DEFECTO.map(function(r) {
      return {label:r[0], metodo:r[1], banco:r[2], moneda:r[3], fijo:r[4], pct:r[5], credito:r[6] === 'SI'};
    });
  }
  if (!aliados.length) {
    aliados = ALIADOS_DEFECTO.map(function(r) { return {id:r[0], nombre:r[1], negocio:r[2], pct:r[3]}; });
  }
  return {ok:true, metodos:metodos, aliados:aliados, deHoja:deHoja, avisos:avisos};
}


// ============================================================
// LIQUIDACION DE ALIADOS (v22)
// ============================================================
// COMISIONES: A FECHA, B -, C ALIADO, D FECHA, E PRODUCTOS, F TOTAL_BS, G PCT, H COMISION_BS, I CICLO,
//             J ESTADO, K FECHA_PAGO, L ID_VENTA, M CEDULA, N COMISION_USD
var COM_ALIADO = 3, COM_BS = 8, COM_ESTADO = 10, COM_FPAGO = 11, COM_CEDULA = 13, COM_USD = 14;

// Comisiones de un aliado que TODAVIA no se le han pagado.
// 'PENDIENTE COBRO' no entra: esa venta fue a credito y el cliente aun no paga. Pagar una comision por
// plata que no entro es adelantarle dinero al aliado sin decidirlo.
function comisionesDe_(ss, nombre, cedula, tasaHoy) {
  var sh = ss.getSheetByName('COMISIONES');
  var out = {cobrables:[], porCobrar:0, totalUSD:0, aproximadas:0};
  if (!sh || sh.getLastRow() < 2) return out;
  var ced = soloDigitos_(cedula), nom = String(nombre || '').trim().toUpperCase();
  var ancho = Math.max(sh.getLastColumn(), COM_USD);
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, ancho).getValues();
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    var c2 = soloDigitos_(r[COM_CEDULA - 1]);
    var mismo = (ced && c2 && c2 === ced) || String(r[COM_ALIADO - 1] || '').trim().toUpperCase() === nom;
    if (!mismo) continue;
    var estado = String(r[COM_ESTADO - 1] || '').trim().toUpperCase();
    if (estado.indexOf('PAGADA') === 0 || estado.indexOf('ANULADA') === 0) continue;

    var usd = Number(r[COM_USD - 1]) || 0;
    var aprox = false;
    if (!usd) {                       // comision vieja, guardada solo en Bs: se convierte con la tasa de hoy
      usd = tasaHoy ? round2_((Number(r[COM_BS - 1]) || 0) / tasaHoy) : 0;
      aprox = true;
    }
    if (estado === 'PENDIENTE COBRO') { out.porCobrar += usd; continue; }
    out.cobrables.push({fila:i + 2, fecha:iso_(r[0]), producto:String(r[4] || ''), bs:Number(r[COM_BS - 1]) || 0,
                        usd:usd, aprox:aprox, idVenta:String(r[11] || '')});
    out.totalUSD += usd;
    if (aprox) out.aproximadas++;
  }
  out.totalUSD = round2_(out.totalUSD);
  out.porCobrar = round2_(out.porCobrar);
  return out;
}

// Lo que cada aliado tiene ganado y lo que debe, para la pantalla de liquidacion.
function estadoLiquidacion_(ss) {
  var tasa = leerTasa_(ss);
  var deudas = estadoCxc_(ss, '');
  var porNombre = {};
  (deudas || []).forEach(function(c) { porNombre[String(c.cliente || '').trim().toUpperCase()] = c; });

  var out = [];
  listaAliados_(ss).forEach(function(a) {
    var com = comisionesDe_(ss, a.nombre, a.cedula, tasa);
    var d = porNombre[String(a.nombre).trim().toUpperCase()];
    var deuda = d ? round2_(Number(d.saldoUSD) || 0) : 0;
    out.push({nombre:a.nombre, cedula:a.cedula, negocio:a.negocio, pct:a.pct,
              comisiones:com.totalUSD, ventas:com.cobrables.length, porCobrar:com.porCobrar,
              aproximadas:com.aproximadas, deuda:deuda, neto:round2_(com.totalUSD - deuda)});
  });
  out.sort(function(x, y) { return y.neto - x.neto; });
  return {ok:true, tasa:tasa, aliados:out};
}

// Cierra la cuenta de un aliado: marca sus comisiones como pagadas, abona su deuda con lo ganado y
// deja constancia de lo que salio en efectivo.
function liquidarAliado_(ss, d) {
  var tasa = Number(d.tasa) || leerTasa_(ss);
  var ali = aliadoPorClave_(ss, d.aliado, d.cedula);
  if (!ali) throw new Error('No se encontro el aliado ' + (d.aliado || ''));
  if (!d.quien) throw new Error('Falta quien liquida');

  var com = comisionesDe_(ss, ali.nombre, ali.cedula, tasa);
  if (!com.cobrables.length) throw new Error('Ese aliado no tiene comisiones por pagar');

  var deudas = estadoCxc_(ss, ali.nombre);
  var deuda = 0;
  (deudas || []).forEach(function(c) {
    if (String(c.cliente || '').trim().toUpperCase() === String(ali.nombre).trim().toUpperCase()) deuda = Number(c.saldoUSD) || 0;
  });

  var ganado = com.totalUSD;
  var compensa = round2_(Math.min(ganado, deuda));    // lo que se le descuenta de la deuda
  var neto = round2_(ganado - compensa);              // lo que sale en efectivo o pago movil
  var hoy = new Date();
  var fechaHoy = Utilities.formatDate(hoy, TZ_VE, 'dd/MM/yyyy');
  var idLiq = 'LQ' + Utilities.formatDate(hoy, TZ_VE, 'yyyyMMdd-HHmmss');

  // 1. Las comisiones quedan pagadas, con su fecha y el numero de liquidacion
  var sc = ss.getSheetByName('COMISIONES');
  com.cobrables.forEach(function(c) {
    sc.getRange(c.fila, COM_ESTADO).setValue('PAGADA');
    sc.getRange(c.fila, COM_FPAGO).setValue(fechaHoy);
    sc.getRange(c.fila, 15).setValue(idLiq);          // O = LIQUIDACION
  });
  if (!sc.getRange(1, 15).getValue()) sc.getRange(1, 15).setValue('LIQUIDACION');

  // 2. Si tenia deuda, se abona con lo ganado. Metodo COMPENSACION a proposito: NO es dinero que entro.
  //    Si entrara como un cobro normal, al conciliar la caja sobraria ese monto.
  if (compensa > 0) {
    var cx = hojaCxc_(ss);
    // Mismas columnas que un abono normal: MONTO_USD en la 8. Metodo COMPENSACION y MONTO_PAGADO en 0,
    // porque no entro dinero: si entrara como cobro normal, al conciliar la caja sobraria ese monto.
    cx.appendRow([fechaVE_(fechaHoy), Utilities.formatDate(hoy, TZ_VE, 'HH:mm'), ali.nombre, ali.cedula,
                  'ABONO', idLiq, '', compensa, 'USD', 0, tasa, 'COMPENSACION', '', 0, d.quien,
                  'Comisiones aplicadas a su deuda (liquidacion ' + idLiq + ')', '']);
    formatoFecha_(cx, cx.getLastRow(), 1);
  }

  // 3. Constancia de la liquidacion
  var lq = hojaAp_(ss, 'LIQUIDACIONES', ['ID','FECHA','HORA','ALIADO','CEDULA','COMISIONES_USD','VENTAS',
    'APLICADO_A_DEUDA_USD','PAGADO_USD','METODO','TASA','LIQUIDADO_POR','NOTAS']);
  lq.appendRow([idLiq, fechaVE_(fechaHoy), Utilities.formatDate(hoy, TZ_VE, 'HH:mm'), ali.nombre, ali.cedula,
                ganado, com.cobrables.length, compensa, neto, neto > 0 ? (d.metodo || '') : '', tasa,
                d.quien, d.notas || '']);
  formatoFecha_(lq, lq.getLastRow(), 2);

  return {ok:true, tipo:'liquidar_aliado', id:idLiq, aliado:ali.nombre, comisiones:ganado,
          ventas:com.cobrables.length, aplicado:compensa, pagado:neto,
          deudaAntes:round2_(deuda), deudaDespues:round2_(deuda - compensa)};
}


// ============================================================
// FICHA DEL PRODUCTO (v23)
// ============================================================
// Todo lo que le paso a un producto, en una sola linea de tiempo: de aqui sale la explicacion de por que
// el stock dice lo que dice. Si el numero no cuadra con el estante, el historial muestra donde se rompio.
function fichaProducto_(ss, codigo) {
  var cod = String(codigo || '').trim().toUpperCase();
  if (!cod) throw new Error('Falta el codigo del producto');

  var sh = ss.getSheetByName('LISTA DE PRODUCTOS');
  var fila = filaProducto_(sh, cod);
  if (!fila) throw new Error('No se encontro el producto ' + codigo);
  var r = sh.getRange(fila, 1, 1, 16).getValues()[0];

  var est = calcularStock_(ss, cod);
  var p = (est.productos || [])[0] || {};

  var movs = [];

  // Ventas y devoluciones (las devoluciones vienen con cantidad negativa)
  var det = ss.getSheetByName(SH_DETALLE);
  if (det && det.getLastRow() >= 2) {
    var anchoD = Math.max(det.getLastColumn(), 16);
    det.getRange(2, 1, det.getLastRow() - 1, anchoD).getValues().forEach(function(d) {
      if (String(d[5] || '').trim().toUpperCase() !== cod) return;
      var cant = Number(d[7]) || 0;
      movs.push({fecha:iso_(d[1]), hora:String(d[2] || ''), tipo:cant < 0 ? 'DEVOLUCION' : 'VENTA',
                 cantidad:cant, precio:Number(d[8]) || 0, quien:String(d[3] || ''),
                 ref:d[15] ? ('nota ' + d[15]) : String(d[0] || '')});
    });
  }

  // Compras recibidas
  var com = ss.getSheetByName('COMPRAS_DETALLE');
  if (com && com.getLastRow() >= 2) {
    com.getRange(2, 1, com.getLastRow() - 1, 10).getValues().forEach(function(d) {
      if (String(d[3] || '').trim().toUpperCase() !== cod) return;
      movs.push({fecha:iso_(d[1]), hora:'', tipo:'COMPRA', cantidad:Number(d[5]) || 0,
                 precio:Number(d[6]) || 0, quien:String(d[2] || ''), ref:String(d[0] || '')});
    });
  }

  // Conteos fisicos
  var ct = ss.getSheetByName('CONTEOS');
  if (ct && ct.getLastRow() >= 2) {
    ct.getRange(2, 1, ct.getLastRow() - 1, 15).getValues().forEach(function(d) {
      if (String(d[2] || '').trim().toUpperCase() !== cod) return;
      movs.push({fecha:iso_(d[0]), hora:String(d[1] || ''), tipo:'CONTEO', cantidad:Number(d[4]) || 0,
                 precio:0, quien:String(d[8] || ''),
                 ref:(d[7] === 'INICIAL' ? 'conteo inicial' : 'recuento') +
                     (d[6] !== '' && d[6] !== null ? ' · diferencia ' + d[6] : '')});
    });
  }

  // Cambios de precio
  var pl = ss.getSheetByName('PRECIOS_LOG');
  if (pl && pl.getLastRow() >= 2) {
    pl.getRange(2, 1, pl.getLastRow() - 1, 8).getValues().forEach(function(d) {
      if (String(d[2] || '').trim().toUpperCase() !== cod) return;
      movs.push({fecha:iso_(d[0]), hora:String(d[1] || ''), tipo:'PRECIO', cantidad:0,
                 precio:Number(d[5]) || 0, quien:String(d[6] || ''),
                 ref:'de ' + (Number(d[4]) || 0) + ' a ' + (Number(d[5]) || 0) + (d[7] ? ' · ' + d[7] : '')});
    });
  }

  // Mas reciente primero
  movs.sort(function(a, b) {
    var k = String(b.fecha) + ' ' + String(b.hora), j = String(a.fecha) + ' ' + String(a.hora);
    return k.localeCompare(j);
  });

  var costo = Number(r[7]) || 0, precio = Number(r[8]) || 0;
  return {ok:true, producto:{
    codigo:String(r[0] || ''), marca:String(r[1] || ''), nombre:String(r[2] || ''), categoria:String(r[3] || ''),
    costo:costo, precio:precio, margen:(costo > 0 && precio > 0) ? Math.round((precio / costo - 1) * 100) : null,
    ref:String(r[10] || ''), fila:fila,
    contado:(p.contado === undefined ? null : p.contado), fechaConteo:p.fechaConteo || '',
    vendido:p.vendido || 0, comprado:p.comprado || 0, stock:(p.stock === undefined ? null : p.stock)
  }, movimientos:movs.slice(0, 100), total:movs.length};
}

// ============================================================
// CAMBIO DE PRECIO (v23)
// ============================================================
function cambiarPrecio_(ss, d, quien) {
  var cod = String(d.codigo || '').trim().toUpperCase();
  var nuevo = Number(d.precio);
  if (!cod) throw new Error('Falta el codigo');
  if (!(nuevo > 0)) throw new Error('El precio tiene que ser mayor que cero');

  var sh = ss.getSheetByName('LISTA DE PRODUCTOS');
  var fila = filaProducto_(sh, cod);
  if (!fila) throw new Error('No se encontro el producto ' + d.codigo);

  var anterior = Number(sh.getRange(fila, 9).getValue()) || 0;
  var costo = Number(sh.getRange(fila, 8).getValue()) || 0;
  if (Math.abs(anterior - nuevo) < 0.0001) {
    return {ok:true, tipo:'precio', sinCambio:true, codigo:cod, precio:anterior};
  }
  // Vender por debajo del costo puede ser una decision (liquidar algo parado), pero nunca un descuido:
  // tiene que venir marcado a proposito desde la pantalla.
  if (costo > 0 && nuevo < costo && !d.bajoCostoOk) {
    throw new Error('Ese precio (' + nuevo + ') esta por debajo del costo (' + costo + '). ' +
                    'Si es a proposito, confirmalo en la pantalla.');
  }

  sh.getRange(fila, 9).setValue(nuevo);
  // El producto deja de estar marcado como nuevo sin precio
  var ref = String(sh.getRange(fila, 11).getValue() || '');
  if (/NUEVO\s*-\s*SIN\s*PRECIO/i.test(ref)) sh.getRange(fila, 11).setValue('');

  var hoy = new Date();
  var lg = hojaAp_(ss, 'PRECIOS_LOG', ['FECHA','HORA','CODIGO','PRODUCTO','PRECIO_ANTERIOR','PRECIO_NUEVO',
    'CAMBIADO_POR', 'MOTIVO', 'COSTO_AL_MOMENTO','MARGEN_ANTERIOR_PCT','MARGEN_NUEVO_PCT']);
  var mAnt = (costo > 0 && anterior > 0) ? Math.round((anterior / costo - 1) * 100) : '';
  var mNue = costo > 0 ? Math.round((nuevo / costo - 1) * 100) : '';
  lg.appendRow([fechaVE_(Utilities.formatDate(hoy, TZ_VE, 'dd/MM/yyyy')),
                Utilities.formatDate(hoy, TZ_VE, 'HH:mm'), cod,
                String(sh.getRange(fila, 3).getValue() || ''), anterior, nuevo,
                (quien && quien.nombre) ? quien.nombre : (d.quien || ''), d.motivo || '', costo, mAnt, mNue]);
  formatoFecha_(lg, lg.getLastRow(), 1);

  return {ok:true, tipo:'precio', codigo:cod, anterior:anterior, precio:nuevo, costo:costo,
          margen:costo > 0 ? mNue : null};
}

// ============================================================
// TAREAS Y RENDIMIENTO (v25)
// ============================================================
// Dos hojas y una regla: lo que se puede contar solo, no se marca a mano.
//
// TAREAS      = el catalogo. Que hay que hacer, quien, cada cuanto, cual es la meta.
// TAREAS_DIA  = el cumplimiento. Una fila por tarea-persona-dia. Se reescribe la misma fila, no se apila.
//
// Tres tipos de tarea:
//   AUTO   -> el avance sale de lo que la persona YA registro en el sistema (fotos nuevas, conteos,
//             ventas, demanda). Nadie la marca: se cumple sola. Es la unica que no se puede inflar.
//   ENLACE -> pide una prueba: el link de la publicacion. Sin link no hay cumplimiento.
//   CHECK  -> se marca a mano. Es la mas debil y por eso vale menos: usarla solo donde no hay rastro.
//
// Y una linea aparte para la iniciativa: tareas PROPIAS, las que nadie mando.
// No hay una nota unica. Un solo numero esconde justo lo que hay que ver: alguien puede cumplir
// todas las tareas y no vender nada, o vender mucho y no tocar el catalogo. Van separados a proposito.

var SH_TAREAS     = 'TAREAS';
var SH_TAREAS_DIA = 'TAREAS_DIA';

// TAREAS: A ID, B TITULO, C DETALLE, D TIPO, E MEDIDA, F META, G ASIGNADA_A, H FRECUENCIA,
//         I ACTIVA, J DESDE, K HASTA, L CREADA_POR, M CREADA
function shTareas_(ss) {
  return hojaAp_(ss, SH_TAREAS, ['ID','TITULO','DETALLE','TIPO','MEDIDA','META','ASIGNADA_A','FRECUENCIA',
                                 'ACTIVA','DESDE','HASTA','CREADA_POR','CREADA']);
}
// TAREAS_DIA: A FECHA, B HORA, C ID_TAREA, D TITULO, E QUIEN, F TIPO, G META, H HECHO,
//             I ESTADO, J EVIDENCIA, K NOTA, L ORIGEN
function shTareasDia_(ss) {
  return hojaAp_(ss, SH_TAREAS_DIA, ['FECHA','HORA','ID_TAREA','TITULO','QUIEN','TIPO','META','HECHO',
                                     'ESTADO','EVIDENCIA','NOTA','ORIGEN']);
}

// La primera vez deja el juego basico andando, para no empezar con una hoja en blanco.
function sembrarTareas_(ss) {
  var sh = shTareas_(ss);
  if (sh.getLastRow() >= 2) return sh;
  var hoy = new Date();
  [['T001','Abri la tienda','Marcar al abrir. Queda la hora.','CHECK','',1,'TODOS','DIARIA','SI'],
   ['T002','Cargar 10 fotos de productos','Productos sin foto, desde Cargar Fotos.','AUTO','FOTOS',10,'TODOS','DIARIA','SI'],
   ['T003','Subir 5 publicaciones','Instagram o TikTok. Pegar el link de cada una.','ENLACE','',5,'TODOS','DIARIA','SI'],
   ['T004','Contar 20 productos','Desde Inventario, pestana Contar.','AUTO','CONTEOS',20,'TODOS','L-V','SI'],
   ['T005','Registrar la demanda no atendida','Todo lo que pidieron y no habia.','AUTO','DEMANDA',3,'TODOS','DIARIA','SI']
  ].forEach(function(t) {
    sh.appendRow([t[0],t[1],t[2],t[3],t[4],t[5],t[6],t[7],t[8],
                  fechaVE_(Utilities.formatDate(hoy, TZ_VE, 'dd/MM/yyyy')),'','sistema',
                  fechaVE_(Utilities.formatDate(hoy, TZ_VE, 'dd/MM/yyyy'))]);
  });
  return sh;
}

function tareasActivas_(ss) {
  var sh = sembrarTareas_(ss);
  var out = [];
  if (sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues().forEach(function(r, i) {
    var id = String(r[0] || '').trim();
    if (!id) return;
    out.push({fila:i + 2, id:id, titulo:String(r[1] || ''), detalle:String(r[2] || ''),
              tipo:String(r[3] || 'CHECK').trim().toUpperCase(),
              medida:String(r[4] || '').trim().toUpperCase(), meta:Number(r[5]) || 0,
              para:String(r[6] || 'TODOS').trim(), frecuencia:String(r[7] || 'DIARIA').trim().toUpperCase(),
              activa:String(r[8] || 'SI').trim().toUpperCase() !== 'NO',
              desde:iso_(r[9]), hasta:iso_(r[10])});
  });
  return out;
}

// Una tarea le toca a alguien hoy?
function tocaHoy_(t, quien, fechaIso) {
  if (!t.activa) return false;
  if (t.desde && fechaIso < t.desde) return false;
  if (t.hasta && fechaIso > t.hasta) return false;
  var para = String(t.para || 'TODOS').trim().toUpperCase();
  if (para && para !== 'TODOS' && para !== String(quien || '').trim().toUpperCase()) return false;
  if (t.frecuencia === 'L-V') {
    var p = fechaIso.split('-');
    var dia = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12).getDay();
    if (dia === 0 || dia === 6) return false;
  }
  return true;
}

// Lo que la persona YA hizo hoy, contado del propio sistema. Esto es lo que hace que una tarea AUTO
// no dependa de que alguien diga que la hizo.
function avanceAuto_(ss, medida, quien, fechaIso) {
  var q = String(quien || '').trim().toUpperCase();
  if (!q) return 0;
  var n = 0;
  if (medida === 'FOTOS') {
    var fl = ss.getSheetByName('FOTOS_LOG');
    if (fl && fl.getLastRow() >= 2) {
      fl.getRange(2, 1, fl.getLastRow() - 1, 8).getValues().forEach(function(r) {
        if (iso_(r[0]) !== fechaIso) return;
        if (String(r[7] || '').trim().toUpperCase() !== q) return;
        n += Number(r[4]) || 0;      // solo las fotos NUEVAS; volver a subir la misma no es trabajo nuevo
      });
    }
  } else if (medida === 'CONTEOS') {
    var ct = ss.getSheetByName('CONTEOS');
    if (ct && ct.getLastRow() >= 2) {
      ct.getRange(2, 1, ct.getLastRow() - 1, 15).getValues().forEach(function(r) {
        if (iso_(r[0]) !== fechaIso) return;
        if (String(r[8] || '').trim().toUpperCase() !== q) return;
        n++;
      });
    }
  } else if (medida === 'DEMANDA') {
    var dm = ss.getSheetByName('DEMANDA_NO_ATENDIDA');
    if (dm && dm.getLastRow() >= 2) {
      dm.getRange(2, 1, dm.getLastRow() - 1, 17).getValues().forEach(function(r) {
        if (iso_(r[0]) !== fechaIso) return;
        if (String(r[2] || '').trim().toUpperCase() !== q) return;
        n++;
      });
    }
  } else if (medida === 'VENTAS') {
    var v = ss.getSheetByName(SH_VENTAS);
    if (v && v.getLastRow() >= 2) {
      v.getRange(2, 1, v.getLastRow() - 1, Math.max(v.getLastColumn(), 3)).getValues().forEach(function(r) {
        if (iso_(r[0]) !== fechaIso) return;
        if (String(r[2] || '').trim().toUpperCase() !== q) return;
        n++;
      });
    }
  }
  return n;
}

// Lo ya escrito en TAREAS_DIA para una persona y un dia.
function marcasDelDia_(ss, quien, fechaIso) {
  var sh = shTareasDia_(ss), out = [];
  if (sh.getLastRow() < 2) return out;
  var q = String(quien || '').trim().toUpperCase();
  sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues().forEach(function(r, i) {
    if (iso_(r[0]) !== fechaIso) return;
    if (q && String(r[4] || '').trim().toUpperCase() !== q) return;
    out.push({fila:i + 2, fecha:iso_(r[0]), hora:horaTexto_(r[1]), id:String(r[2] || ''),
              titulo:String(r[3] || ''), quien:String(r[4] || ''), tipo:String(r[5] || ''),
              meta:Number(r[6]) || 0, hecho:Number(r[7]) || 0, estado:String(r[8] || ''),
              evidencia:String(r[9] || ''), nota:String(r[10] || ''),
              origen:String(r[11] || 'ASIGNADA')});
  });
  return out;
}

/* v25.1 — La hora, como texto.
   Se escribe "08:05" y la hoja lo convierte sola en un valor de HORA, que por dentro es una fecha
   del 30/12/1899. Al leerla de vuelta salia "Sat Dec 30 1899 12:03:20 GMT-0427" en la pantalla.
   Se arregla por los dos lados: al escribir se fuerza la celda a texto, y al leer, si vino como
   fecha, se vuelve a HH:mm — asi las filas que ya quedaron mal tambien se ven bien. */
function horaTexto_(v) {
  if (v == null || v === '') return '';
  if (esFecha_(v)) return Utilities.formatDate(v, TZ_VE, 'HH:mm');
  var t = String(v).trim();
  var m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  var d = new Date(t);                                   // "Sat Dec 30 1899 12:03:20 GMT-0427"
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, TZ_VE, 'HH:mm');
  return t;
}

function estadoDe_(hecho, meta) {
  if (!meta) return hecho > 0 ? 'HECHA' : 'PENDIENTE';
  if (hecho >= meta) return 'HECHA';
  return hecho > 0 ? 'PARCIAL' : 'PENDIENTE';
}

// El dia de trabajo de una persona: sus tareas, cuanto lleva de cada una y lo que hizo por su cuenta.
function miDia_(ss, quien, fechaIso) {
  var f = fechaIso || Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd');
  var marcas = marcasDelDia_(ss, quien, f);
  var porId = {};
  marcas.forEach(function(m) { if (m.id) porId[m.id] = m; });

  var lista = [];
  tareasActivas_(ss).forEach(function(t) {
    if (!tocaHoy_(t, quien, f)) return;
    var m = porId[t.id] || null;
    var hecho = (t.tipo === 'AUTO') ? avanceAuto_(ss, t.medida, quien, f) : (m ? m.hecho : 0);
    lista.push({id:t.id, titulo:t.titulo, detalle:t.detalle, tipo:t.tipo, medida:t.medida,
                meta:t.meta, hecho:hecho, estado:estadoDe_(hecho, t.meta),
                evidencia:m ? m.evidencia : '', hora:m ? m.hora : '', nota:m ? m.nota : ''});
  });

  var propias = marcas.filter(function(m) { return String(m.origen).toUpperCase() === 'PROPIA'; })
                      .map(function(m) { return {titulo:m.titulo, hora:m.hora, evidencia:m.evidencia, nota:m.nota}; });

  var exigibles = lista.length;
  var hechas = lista.filter(function(t) { return t.estado === 'HECHA'; }).length;
  return {ok:true, tipo:'tareas', fecha:f, quien:quien || '', tareas:lista, propias:propias,
          hechas:hechas, exigibles:exigibles};
}

// Marca una tarea. Se reescribe la fila del dia si ya existe: una tarea-persona-dia es UNA fila.
// Una tarea AUTO no se puede marcar a mano; ahi esta su valor.
function marcarTarea_(ss, d, quien) {
  var nombre = (quien && quien.nombre) ? quien.nombre : String(d.quien || '').trim();
  if (!nombre) throw new Error('No se sabe quien marca la tarea');
  var id = String(d.idTarea || '').trim();
  if (!id) throw new Error('Falta la tarea');
  var f = String(d.fecha || '').trim() || Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd');
  f = iso_(f) || f;

  var def = null;
  tareasActivas_(ss).forEach(function(t) { if (t.id === id) def = t; });
  if (!def) throw new Error('Esa tarea no existe: ' + id);
  if (def.tipo === 'AUTO') {
    throw new Error('"' + def.titulo + '" se cuenta sola con lo que registres en el sistema. No se marca a mano.');
  }

  var evid = String(d.evidencia || '').trim();
  var hecho;
  if (def.tipo === 'ENLACE') {
    // Sin enlace no hay cumplimiento: es toda la diferencia entre "lo hice" y "aqui esta".
    var links = evid.split(/[\s,;]+/).filter(function(u) { return /^https?:\/\//i.test(u); });
    if (!links.length) throw new Error('"' + def.titulo + '" necesita el enlace de la publicacion.');
    evid = links.join(' ');
    hecho = links.length;
  } else {
    hecho = Number(d.hecho) || 1;
  }

  var sh = shTareasDia_(ss);
  var ahora = new Date();
  var hora = Utilities.formatDate(ahora, TZ_VE, 'HH:mm');
  var yaHay = null;
  marcasDelDia_(ss, nombre, f).forEach(function(m) { if (m.id === id) yaHay = m; });
  var estado = estadoDe_(hecho, def.meta);

  if (yaHay) {
    // Se conserva la hora original: para "Abri la tienda" la primera marca es el dato.
    sh.getRange(yaHay.fila, 7, 1, 5).setValues([[def.meta, hecho, estado, evid, String(d.nota || '')]]);
  } else {
    sh.appendRow([fechaVE_(Utilities.formatDate(ahora, TZ_VE, 'dd/MM/yyyy')), hora, id, def.titulo, nombre,
                  def.tipo, def.meta, hecho, estado, evid, String(d.nota || ''), 'ASIGNADA']);
    formatoFecha_(sh, sh.getLastRow(), 1);
    formatoTexto_(sh, sh.getLastRow(), 2);
  }
  return {ok:true, tipo:'tarea_marcar', id:id, hecho:hecho, estado:estado, hora:yaHay ? yaHay.hora : hora};
}

// Una tarea que nadie mando. Es la unica medida de iniciativa que tenemos, asi que se registra aparte
// y no se mezcla con el cumplimiento: cumplir es hacer lo que se pidio, esto es otra cosa.
function tareaPropia_(ss, d, quien) {
  var nombre = (quien && quien.nombre) ? quien.nombre : String(d.quien || '').trim();
  if (!nombre) throw new Error('No se sabe quien registra la tarea');
  var titulo = String(d.titulo || '').trim();
  if (titulo.length < 4) throw new Error('Describe que hiciste, en pocas palabras.');
  if (titulo.length > 120) titulo = titulo.slice(0, 120);

  var ahora = new Date();
  var f = Utilities.formatDate(ahora, TZ_VE, 'dd/MM/yyyy');
  var sh = shTareasDia_(ss);
  sh.appendRow([fechaVE_(f), Utilities.formatDate(ahora, TZ_VE, 'HH:mm'), '', titulo, nombre,
                'PROPIA', 0, 1, 'HECHA', String(d.evidencia || '').trim(), String(d.nota || '').trim(), 'PROPIA']);
  formatoFecha_(sh, sh.getLastRow(), 1);
  formatoTexto_(sh, sh.getLastRow(), 2);
  return {ok:true, tipo:'tarea_propia', titulo:titulo};
}

// Crear, editar o apagar una tarea del catalogo. Solo socios.
function guardarTareaDef_(ss, d, quien) {
  var sh = sembrarTareas_(ss);
  var titulo = String(d.titulo || '').trim();
  var tipo = String(d.tipoTarea || 'CHECK').trim().toUpperCase();
  if (['AUTO','ENLACE','CHECK'].indexOf(tipo) < 0) throw new Error('Tipo de tarea desconocido: ' + tipo);
  var medida = String(d.medida || '').trim().toUpperCase();
  if (tipo === 'AUTO' && ['FOTOS','CONTEOS','DEMANDA','VENTAS'].indexOf(medida) < 0) {
    throw new Error('Una tarea que se cuenta sola tiene que decir que cuenta: fotos, conteos, demanda o ventas.');
  }
  if (tipo !== 'AUTO') medida = '';

  var id = String(d.idTarea || '').trim();
  var fila = 0;
  tareasActivas_(ss).forEach(function(t) { if (t.id === id) fila = t.fila; });

  // Apagar una tarea no la borra: el historico de TAREAS_DIA tiene que seguir teniendo sentido.
  if (d.apagar && fila) {
    sh.getRange(fila, 9).setValue('NO');
    return {ok:true, tipo:'tarea_def', id:id, activa:false};
  }
  if (!titulo) throw new Error('La tarea necesita un titulo');

  var hoy = new Date();
  var fila13 = [id, titulo, String(d.detalle || '').trim(), tipo, medida, Number(d.meta) || 1,
                String(d.para || 'TODOS').trim() || 'TODOS',
                String(d.frecuencia || 'DIARIA').trim().toUpperCase(),
                'SI',
                d.desde ? fechaVE_(d.desde) : fechaVE_(Utilities.formatDate(hoy, TZ_VE, 'dd/MM/yyyy')),
                d.hasta ? fechaVE_(d.hasta) : '',
                (quien && quien.nombre) ? quien.nombre : '',
                fechaVE_(Utilities.formatDate(hoy, TZ_VE, 'dd/MM/yyyy'))];

  if (fila) {
    // Al editar no se toca quien la creo ni cuando
    sh.getRange(fila, 1, 1, 11).setValues([fila13.slice(0, 11)]);
  } else {
    var n = 0;
    tareasActivas_(ss).forEach(function(t) {
      var m = /^T(\d+)$/.exec(t.id); if (m) n = Math.max(n, Number(m[1]));
    });
    fila13[0] = 'T' + ('00' + (n + 1)).slice(-3);
    sh.appendRow(fila13);
    formatoFecha_(sh, sh.getLastRow(), 10);
    formatoFecha_(sh, sh.getLastRow(), 13);
    id = fila13[0];
  }
  return {ok:true, tipo:'tarea_def', id:id, activa:true};
}

// Los tres marcadores, por persona, en un rango de fechas. Separados a proposito.
//   cumplimiento -> de lo que se le pidio, cuanto hizo. En %.
//   volumen      -> el trabajo crudo, sin convertir a nota: fotos, conteos, ventas, demanda.
//   iniciativa   -> tareas propias, y metas superadas.
//
// Se lee cada hoja UNA vez y se arma un indice por persona+dia. La version obvia — preguntar por cada
// persona y cada dia — releia la hoja entera cientos de veces y el script se caia por tiempo.
function rendimientoTareas_(ss, desde, hasta) {
  var hoyIso = Utilities.formatDate(new Date(), TZ_VE, 'yyyy-MM-dd');
  var d1 = iso_(desde) || hoyIso, d2 = iso_(hasta) || hoyIso;
  if (d2 > hoyIso) d2 = hoyIso;                 // el futuro no se exige: bajaria el % sin razon
  var dias = diasEntre_(d1, d2, 120);
  if (!dias.length) return {ok:true, tipo:'rendimiento', desde:d1, hasta:d2, personas:[], catalogo:tareasActivas_(ss)};
  var d2r = dias[dias.length - 1];

  var gente = {};
  function de(n) {
    var k = String(n || '').trim();
    if (!k) return null;
    if (!gente[k]) gente[k] = {nombre:k, exigidas:0, hechas:0, parciales:0, propias:0, superadas:0,
                               fotos:0, conteos:0, ventas:0, demanda:0, publicaciones:0, dias:{}};
    return gente[k];
  }
  function clave(n, f) { return String(n || '').trim().toUpperCase() + '|' + f; }

  // --- una pasada por cada hoja ---
  var auto = {FOTOS:{}, CONTEOS:{}, DEMANDA:{}, VENTAS:{}};
  function suma(mapa, n, f, cuanto) {
    var k = clave(n, f); mapa[k] = (mapa[k] || 0) + cuanto;
  }

  var fl = ss.getSheetByName('FOTOS_LOG');
  if (fl && fl.getLastRow() >= 2) {
    fl.getRange(2, 1, fl.getLastRow() - 1, 8).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2r) return;
      var p = de(r[7]); if (!p) return;
      var n = Number(r[4]) || 0;
      p.fotos += n; p.dias[f] = true; suma(auto.FOTOS, r[7], f, n);
    });
  }
  var ct = ss.getSheetByName('CONTEOS');
  if (ct && ct.getLastRow() >= 2) {
    ct.getRange(2, 1, ct.getLastRow() - 1, 15).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2r) return;
      var p = de(r[8]); if (!p) return;
      p.conteos++; p.dias[f] = true; suma(auto.CONTEOS, r[8], f, 1);
    });
  }
  var dm = ss.getSheetByName('DEMANDA_NO_ATENDIDA');
  if (dm && dm.getLastRow() >= 2) {
    dm.getRange(2, 1, dm.getLastRow() - 1, 17).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2r) return;
      var p = de(r[2]); if (!p) return;
      p.demanda++; p.dias[f] = true; suma(auto.DEMANDA, r[2], f, 1);
    });
  }
  var v = ss.getSheetByName(SH_VENTAS);
  if (v && v.getLastRow() >= 2) {
    v.getRange(2, 1, v.getLastRow() - 1, Math.max(v.getLastColumn(), 3)).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2r) return;
      var p = de(r[2]); if (!p) return;
      p.ventas++; p.dias[f] = true; suma(auto.VENTAS, r[2], f, 1);
    });
  }

  // Lo marcado a mano, indexado por persona+dia+tarea
  var marcado = {};
  var shD = shTareasDia_(ss);
  if (shD.getLastRow() >= 2) {
    shD.getRange(2, 1, shD.getLastRow() - 1, 12).getValues().forEach(function(r) {
      var f = iso_(r[0]); if (!f || f < d1 || f > d2r) return;
      var p = de(r[4]); if (!p) return;
      p.dias[f] = true;
      if (String(r[11] || '').toUpperCase() === 'PROPIA') { p.propias++; return; }
      if (String(r[5] || '').toUpperCase() === 'ENLACE') p.publicaciones += Number(r[7]) || 0;
      var id = String(r[2] || '').trim();
      if (id) marcado[clave(r[4], f) + '|' + id] = Number(r[7]) || 0;
    });
  }

  // --- el cumplimiento, dia por dia y persona por persona ---
  // Se recorre el rango COMPLETO, no solo los dias con actividad: un dia en que no se hizo nada es
  // justamente el dia que hay que contar. Contar solo los dias trabajados daria 100% a quien no vino.
  var defs = tareasActivas_(ss);
  Object.keys(gente).forEach(function(nom) {
    var p = gente[nom];
    dias.forEach(function(f) {
      defs.forEach(function(t) {
        if (!tocaHoy_(t, nom, f)) return;
        p.exigidas++;
        var hecho = (t.tipo === 'AUTO') ? (auto[t.medida] ? (auto[t.medida][clave(nom, f)] || 0) : 0)
                                        : (marcado[clave(nom, f) + '|' + t.id] || 0);
        var est = estadoDe_(hecho, t.meta);
        if (est === 'HECHA') p.hechas++;
        else if (est === 'PARCIAL') p.parciales++;
        if (t.meta && hecho > t.meta) p.superadas++;
      });
    });
  });

  var lista = Object.keys(gente).map(function(k) {
    var p = gente[k];
    p.diasActivos = Object.keys(p.dias).length;
    delete p.dias;
    p.cumplimiento = p.exigidas ? Math.round(p.hechas * 100 / p.exigidas) : null;
    return p;
  }).sort(function(a, b) { return (b.cumplimiento || 0) - (a.cumplimiento || 0); });

  return {ok:true, tipo:'rendimiento', desde:d1, hasta:d2r, dias:dias.length,
          personas:lista, catalogo:defs};
}

// Los dias del rango, en aaaa-mm-dd. Con tope, para que un rango absurdo no tumbe el script.
function diasEntre_(d1, d2, tope) {
  var out = [];
  var a = d1.split('-'), b = d2.split('-');
  if (a.length !== 3 || b.length !== 3) return out;
  var cur = new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]), 12);
  var fin = new Date(Number(b[0]), Number(b[1]) - 1, Number(b[2]), 12);
  while (cur <= fin && out.length < (tope || 120)) {
    out.push(Utilities.formatDate(cur, TZ_VE, 'yyyy-MM-dd'));
    cur = new Date(cur.getTime() + 24 * 3600 * 1000);
    cur.setHours(12, 0, 0, 0);
  }
  return out;
}

// Deja las dos hojas creadas y con las tareas de arranque. Se corre una sola vez desde el editor.
function prepararTareas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  sembrarTareas_(ss);
  shTareasDia_(ss);
  return 'Listo: hojas TAREAS y TAREAS_DIA creadas.';
}
