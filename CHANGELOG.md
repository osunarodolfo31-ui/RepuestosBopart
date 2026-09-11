# Repuesto BoParts — Sistema Operativo · CHANGELOG

Regla: cada vez que se sube un archivo a GitHub o se implementa una versión nueva del Apps Script,
se agrega una línea aquí. Si un cambio requiere subir varios archivos juntos, se listan juntos.
Los nombres de archivo nunca cambian (el nav y los favoritos dependen de ellos); la versión va
en el comentario del encabezado de cada HTML y en la cabecera de `Code.gs`.

## Compatibilidad actual

| Archivo                 | Versión | Requiere Apps Script |
|-------------------------|---------|----------------------|
| index.html              | v9      | v7 o superior        |
| boparts_ventas.html     | v10.9   | **v10.5**            |
| boparts_cobros.html     | v1.2    | **v9**               |
| boparts_compras.html    | v1.2    | **v11**              |
| boparts_gastos.html     | v1.1    | **v11.2**            |
| boparts_fotos.html      | v7.1    | v7 o superior        |
| boparts_demanda.html    | v8.2    | v7 o superior        |
| boparts_reportes.html   | v8      | ninguno (solo lee CSV) |
| Code.gs (Apps Script)   | v11.2   | —                    |

Deployment ID (no cambia): `AKfycbwSOG2btzrvEt-VklzXY8_LlYlkT2nGACRNK2gt61t3gDRs8ZDsmUFRhN99teDTKIlsSg`

Para volver atrás:
- HTML: GitHub → History del archivo → commit anterior → descargar → subir de nuevo.
- Apps Script: Implementar → Administrar implementaciones → lápiz → elegir la versión anterior → Implementar.

---

## index v9 — 2026-09-11 · Velocidad
**index.html v9**
- Abre al instante con la ultima lista guardada en el dispositivo (localStorage, persiste entre sesiones) y pide la
  nueva por detras; si cambio, se refresca sola. Sin red, sigue mostrando la ultima lista.
- Productos y equivalencias se piden en paralelo (antes uno detras de otro).
- El logo era una imagen incrustada de 130 KB dentro del HTML: ahora usa icon-192.png. HTML de 175 KB a 32 KB.
- Quitada sintaxis `?.` (Chrome 80+): en navegadores viejos (la PC del local) el archivo entero fallaba y no cargaba nada.

## v11.2 — 2026-09-11 · Menu completo, cuenta de socios
**Code.gs v11.2**, **boparts_gastos.html v1.1**, **index.html v8.1**, **boparts_fotos.html v7.1**, **boparts_demanda.html v8.2**
- Menu de 7 modulos en todas las pantallas (index, fotos y demanda solo mostraban 4).
- Gastos: "CUENTA BOPART" en vez de "CUENTA BOSC".
- Cuenta corriente de socios (hoja SOCIOS_MOV): un gasto pagado por RODOLFO o JAVIER genera automaticamente un
  PRESTAMO del socio a la tienda. REEMBOLSO, APORTE_CAPITAL y RETIRO se registran con doPost tipo='socio' (pantalla
  en gerencia). doGet action=socios devuelve por socio: prestamos, reembolsos, por pagar, aportes, retiros, capital.
- Pendiente: compras pagadas por un socio (camino B no registra pago); se resuelve en el costeo desde gerencia.

## v11.1 — 2026-09-10 · Gastos
**Code.gs v11.1** + **boparts_gastos.html v1** (+ enlace Gastos en el nav de ventas, cobros y compras)
- Registro de gasto: fecha, categoria (ALQUILER, SUELDOS Y COMISIONES, SERVICIOS, LOGISTICA, IMPUESTOS Y BANCARIOS,
  MANTENIMIENTO Y EQUIPOS, PAPELERIA Y LIMPIEZA, PUBLICIDAD, OTROS), descripcion, monto en Bs o USD (se guarda en ambas
  a la tasa del telefono), metodo/banco, pagado por (CAJA TIENDA / RODOLFO / JAVIER / CUENTA BOSC), registrado por,
  foto del comprobante (Cloudinary boparts/gastos), notas. Hoja GASTOS se crea sola.
- Inventario NO es categoria de gasto: entra por Compras. Evita contar el costo dos veces en el estado de resultados.
- "Pagado por" existe para saber cuanto pusieron los socios de su bolsillo y cuanto salio de caja.

## compras v1.1 — 2026-09-10
- Marca de producto nuevo: lista desplegable con las marcas ya existentes en LISTA DE PRODUCTOS (permite escribir una nueva).
- "Pegar lista": para recepciones grandes, se pega codigo + cantidad por linea (o dos columnas desde Excel);
  reconoce por codigo, suma cantidades, y deja en el cuadro las lineas que no reconocio.

## Coma decimal — 2026-09-10
**index.html v8, boparts_ventas.html v10.8, boparts_demanda.html v8.1, boparts_reportes.html v8**
- Con la region de la hoja en Venezuela, el CSV exporta '0,6' y '7,5'; las apps leian 0 y 7. Ahora todas leen
  coma o punto decimal (parseNum). La region de la hoja puede quedar en Venezuela.
- Pendiente: index.html aun no oculta productos sin precio ni tiene enlaces a Cobros/Compras (ronda de fotos).

## v11 — 2026-09-10 · Compras / Recepcion de mercancia
**Code.gs v11** + **boparts_compras.html v1** (+ ventas v10.7 y cobros v1.1: solo el enlace a Compras en el nav)
- Nueva pantalla Compras (camino B: sin costos). Quien recibe registra proveedor (buscar o crear), nro de factura,
  foto de la factura (Cloudinary, carpeta boparts/facturas, comprimida), productos y cantidades recibidas, notas.
- Hojas nuevas: PROVEEDORES, COMPRAS (cabecera, estado PENDIENTE COSTO), COMPRAS_DETALLE (una fila por producto).
- "+ Producto nuevo": se crea en LISTA DE PRODUCTOS con codigo, marca, nombre y categoria; sin costo ni precio,
  REF = "NUEVO - SIN PRECIO". Rechaza codigos que ya existen.
- El costeo (poner costo por linea, actualizar Costo en la lista, cerrar la compra) queda para la app de gerencia.
- Pendiente: index.html muestra los productos nuevos con precio vacio; hay que ocultarlos o marcarlos hasta que tengan precio.

## v10.6 — 2026-09-10
**boparts_ventas.html v10.6**
- Nota de entrega: si la tarjeta del cliente esta en pantalla, se usa ese cliente aunque la variable interna se haya
  perdido (caso reportado con cliente de credito prellenado). Causa raiz no reproducida; el respaldo cubre el sintoma.

## v10.5 — 2026-09-10
**boparts_ventas.html v10.5** + **Code.gs v10.5**
- Corregido: el encabezado mostraba "undefined" como version.
- Clientes: si el CSV publicado falla o tarda, la app pide la lista a Apps Script (`?action=clientes`); si ambos fallan,
  el selector de credito muestra el error real y un enlace "Reintentar" en vez de quedarse en "Cargando...".

## v10.4 — 2026-09-10
**boparts_ventas.html v10.4** (script v10.2 sirve)
- Corregido: "Agregar forma de pago" borraba lo escrito en las formas anteriores.
- Al elegir un metodo, el monto se rellena con lo que falta por cubrir, en la moneda del metodo (editable).
- Comision del punto oculta al vender (la asume la tienda); se sigue calculando y guardando en COMISION/NETO.
- Avisos: se ocultan solos de verdad y se cierran al tocarlos; el aviso de pagos incompletos desglosa cada forma de pago.
- Clientes: la ultima lista se guarda en el telefono y se usa mientras llega la de la hoja; si la hoja no responde,
  reintenta; el selector de credito espera la carga en vez de decir "no hay autorizados".

## v10.3 — 2026-09-10
**boparts_ventas.html v10.3** (el script v10.2 sirve)
- El mensaje de WhatsApp de la nota lista la forma de pago recibida (metodo, banco, monto en su moneda; credito marcado como pendiente).
- La version de la app se ve en el encabezado, debajo del titulo, para saber que version corre cada telefono.

## v10.2 — 2026-09-10
**Code.gs v10.2** + **boparts_ventas.html v10.2** (van juntos)
- Toda venta recibe su numero de nota al registrarse (CONFIG!B2), sin saltos, y el script lo devuelve en la respuesta.
  Generar el PDF ya no espera al script. VENTAS (Y), VENTAS_DETALLE (P) y CXC_MOV (G) reciben el numero de una vez.
- El numero de cotizacion se pide al abrir la pantalla de cotizar, en paralelo a elegir cliente.
- La nota de entrega ya no muestra la tasa BCV (queda la referencia en USD bajo el total).

## v10.1 — 2026-09-10
**boparts_ventas.html v10.1**
- La cotizacion se emite en Bs o en USD (selector, recuerda la ultima eleccion) y no muestra la tasa BCV.
  La nota de entrega sigue igual (tasa y referencia USD).

## v10 — 2026-09-10 · Nota y cotizacion en PDF
**boparts_ventas.html v10** + **Code.gs v10** (orden: script → HTML)
- La nota de entrega ya no se abre como pagina HTML: se genera un PDF en el telefono (jsPDF, desde cdnjs) y se abre
  la hoja de compartir de Android → Gmail, WhatsApp, Drive, con el PDF adjunto. En escritorio se descarga.
- Nueva pantalla de nota: "Generar Nota (PDF)" → "Compartir PDF" / "Ver-Descargar" / "Solo mensaje por WhatsApp".
- La nota muestra condicion CREDITO cuando la venta fue a credito, la tasa BCV y el total de referencia en USD.
- Boton **Cotizar** junto a Registrar Venta: mismo carrito, genera COT-xxxx (contador en CONFIG!B3) con validez 24 h,
  se comparte igual, y queda registrada en la hoja COTIZACIONES (estado ENVIADA). No registra venta ni toca el carrito.
  Opcion "Cotizar sin datos del cliente" para clientes ocasionales.
- Manual, una vez: en CONFIG poner `0` en B3 (contador de cotizaciones). Si B3 esta vacia, arranca en 1 igual.
- Requiere internet para cargar la libreria PDF la primera vez; despues queda en cache del navegador.

## v9.1 — 2026-09-10
**Code.gs v9.1** + **boparts_ventas.html v9.1**
- Fechas: la app manda `10/9/2026` (dia/mes) y la hoja, en configuracion regional EE.UU., lo leia como 9 de octubre.
  El script ahora convierte el texto a fecha real y aplica formato `dd/MM/yyyy` en VENTAS, VENTAS_DETALLE y CXC_MOV.
- ventas.html: si el script responde algo que no es JSON valido, el aviso muestra la respuesta; los avisos de error
  duran 7 s y ya no se cortan en pantalla.

## v9 — 2026-09-10 · Cuentas por cobrar
**boparts_ventas.html v9** + **Code.gs v9** + **boparts_cobros.html v1** (van juntos; orden: script → HTML)
- Metodo de pago `CREDITO (cuenta por cobrar)`: solo se puede usar con clientes que tengan `SI` en la columna
  `CREDITO` (G) de CLIENTES. Rodolfo/Javier marcan esa columna a mano. La deuda queda en **USD**.
- La venta ahora guarda cliente (Z, AA), moneda de cada pago (AB–AD) y monto a credito (AE).
- Validacion nueva: los pagos deben cubrir el total de la venta (tolerancia 1%); ninguna forma de pago sin metodo o sin monto.
- Corregido: al buscar cliente para la nota, se seleccionaba el cliente equivocado (indice sobre la lista filtrada).
- Si la venta fue a credito, la nota de entrega ya trae el cliente elegido.
- **Code.gs**: hoja `CXC_MOV` (CARGO automatico al vender a credito; ABONO desde Cobros); `doGet?action=cxc`
  devuelve saldos y notas por cliente con abonos aplicados a las notas mas viejas primero; `tipo:'abono'` en doPost;
  ventas a credito entran en COMISIONES como `PENDIENTE COBRO`.
- **boparts_cobros.html**: lista de clientes con saldo, detalle por notas (PENDIENTE / PARCIAL / PAGADA), registro
  de abono en USD o Bs con metodo, banco y comision, estado de cuenta por WhatsApp. Enlace agregado al nav de ventas.
- Manual, una vez: VENTAS Z1..AE1 = `CLIENTE, CLIENTE_RIF, MONEDA_1, MONEDA_2, MONEDA_3, CREDITO_USD`;
  CLIENTES G1 = `CREDITO`, y `SI` en los clientes autorizados.
- Cargado historico jun-sep 2026 en VENTAS_DETALLE (442 lineas, IDs H-VTA-xxx).

## v8.1 — 2026-09-09
**boparts_ventas.html**
- El costo de la hoja llega como texto con formato moneda (`$ 6.04`); se limpia antes de convertir (`parseNum`).
- Verificado: `VENTAS_DETALLE` recibe costo y utilidad por línea.

## v8 — 2026-09-09
**boparts_ventas.html** + **Code.gs** (van juntos)
- Cada línea del carrito lleva `costo` (columna H de LISTA DE PRODUCTOS, `Costo Final`). No se muestra al vendedor.
- Cada venta genera un `idVenta` único (`VAAAAMMDD-HHMMSS-XXXX`).
- El POST lee la respuesta del script (`text/plain` en vez de `no-cors`). Botón en "Guardando...";
  éxito solo con `{ok:true}`; si falla, el carrito queda intacto y avisa. Mismo patrón al guardar cliente.
- Si el dispositivo no tiene tasa en `localStorage`, la toma de la celda E1 de la hoja. Sin tasa válida no deja registrar.
- Corregido `</div>/div>` en la línea 315.
- **Code.gs**: VENTAS guarda `ID_VENTA` en col X y `NOTA_NUM` en col Y; nueva hoja `VENTAS_DETALLE`
  (una fila por producto con costo congelado, utilidad, tasa, subtotal Bs); COMISIONES guarda `ID_VENTA` en col L;
  `nextNota` acepta `&idVenta=` y escribe el número en VENTAS y VENTAS_DETALLE; lock de 10 s en la venta.
- Manual, una vez: encabezados `ID_VENTA` en X1 y `NOTA_NUM` en Y1 de VENTAS; corregidos S1–W1
  (ALIADO, ALIADO_NEGOCIO, ALIADO_PCT, ALIADO_COMISION, NOTAS).
- Contador global de notas (`CONFIG!B2`) arranca en 1.

## v7 — hasta 2026-09-09 (línea base)
Estado con el que arrancó el control de versiones. Commits en GitHub: `4269b17` y anteriores.
- index.html: lista de precios (767 productos), búsqueda fuzzy, filtros, carrusel de fotos, WhatsApp, editor de tasa.
- boparts_ventas.html: carrito, métodos de pago con comisión, aliados, nota de entrega con numeración global, clientes.
- boparts_fotos.html: hasta 3 fotos por producto a Cloudinary, escribe links por número de fila.
- boparts_demanda.html: demanda no atendida, cruce con catálogo de proveedores.
- boparts_reportes.html: totales por día/semana/mes, por categoría, canal, vendedor, top productos.
- Code.gs: doGet `nextNota`; doPost fotos / cliente / demanda / venta (+ COMISIONES si hay aliado).

## Pendientes conocidos (no son versiones, son deudas)
- boparts_demanda.html y boparts_fotos.html siguen con `no-cors`: no detectan si el guardado falló.
- boparts_fotos.html escribe por número de fila: se rompe si alguien inserta u ordena filas mientras se suben fotos.
- index.html usa tasa `1000` por defecto si no hay valor guardado ni en la hoja.
- Todas las hojas están publicadas como CSV público (incluyendo VENTAS y CLIENTES). CXC_MOV no esta publicada; solo se lee via Apps Script.
- boparts_reportes.html cuenta las ventas a credito como ingreso del dia; falta separar vendido de cobrado.
