# Repuesto BoParts — Sistema Operativo · CHANGELOG

Regla: cada vez que se sube un archivo a GitHub o se implementa una versión nueva del Apps Script,
se agrega una línea aquí. Si un cambio requiere subir varios archivos juntos, se listan juntos.
Los nombres de archivo nunca cambian (el nav y los favoritos dependen de ellos); la versión va
en el comentario del encabezado de cada HTML y en la cabecera de `Code.gs`.

## Compatibilidad actual

| Archivo                 | Versión | Requiere Apps Script |
|-------------------------|---------|----------------------|
| index.html              | v7      | v7 o superior        |
| boparts_ventas.html     | v10.2   | **v10.2**            |
| boparts_cobros.html     | v1      | **v9**               |
| boparts_fotos.html      | v7      | v7 o superior        |
| boparts_demanda.html    | v8      | v7 o superior        |
| boparts_reportes.html   | v7      | ninguno (solo lee CSV) |
| Code.gs (Apps Script)   | v10.2   | —                    |

Deployment ID (no cambia): `AKfycbwSOG2btzrvEt-VklzXY8_LlYlkT2nGACRNK2gt61t3gDRs8ZDsmUFRhN99teDTKIlsSg`

Para volver atrás:
- HTML: GitHub → History del archivo → commit anterior → descargar → subir de nuevo.
- Apps Script: Implementar → Administrar implementaciones → lápiz → elegir la versión anterior → Implementar.

---

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
- index.html, fotos y demanda no tienen aun el enlace a Cobros en su nav.
- boparts_reportes.html cuenta las ventas a credito como ingreso del dia; falta separar vendido de cobrado.
