# Repuesto BoParts — Sistema Operativo · CHANGELOG

Regla: cada vez que se sube un archivo a GitHub o se implementa una versión nueva del Apps Script,
se agrega una línea aquí. Si un cambio requiere subir varios archivos juntos, se listan juntos.
Los nombres de archivo nunca cambian (el nav y los favoritos dependen de ellos); la versión va
en el comentario del encabezado de cada HTML y en la cabecera de `Code.gs`.

## Compatibilidad actual

| Archivo                 | Versión | Requiere Apps Script |
|-------------------------|---------|----------------------|
| index.html              | v11.2   | **v25**              |
| boparts_tareas.html     | v1      | **v25**              |
| boparts_ventas.html     | v14.3   | **v25**              |
| boparts_cobros.html     | v2.7    | **v25**              |
| boparts_compras.html    | v2.7    | **v25**              |
| boparts_gastos.html     | v1.8    | **v25**              |
| boparts_fotos.html      | v9.3    | **v25**              |
| boparts_demanda.html    | v8.7    | **v25**              |
| boparts_gerencia.html   | v2.8    | **v25**              |
| boparts_apartados.html  | v1.6    | **v25**              |
| boparts_devoluciones.html| v1.5   | **v25**              |
| boparts_inventario.html | v2.1    | **v25**              |
| boparts_reportes.html   | —       | **SE ELIMINA** (lo reemplazo gerencia) |
| Code.gs (Apps Script)   | v25     | —                    |

Deployment ID (no cambia): `AKfycbwSOG2btzrvEt-VklzXY8_LlYlkT2nGACRNK2gt61t3gDRs8ZDsmUFRhN99teDTKIlsSg`

Para volver atrás:
- HTML: GitHub → History del archivo → commit anterior → descargar → subir de nuevo.
- Apps Script: Implementar → Administrar implementaciones → lápiz → elegir la versión anterior → Implementar.

---

## v25 + tareas — 2026-09-19 · Medir el trabajo, no la sensación

**Archivo nuevo: `boparts_tareas.html` ("Mi día").** Y dos hojas nuevas: `TAREAS` y `TAREAS_DIA`.

### La idea de fondo
Una tarea que se marca a mano mide una sola cosa: si la persona dice que la hizo. Por eso las tareas
tienen **tres tipos distintos, a propósito**, y no valen lo mismo:

| Tipo | Cómo se comprueba | Se puede inflar |
|------|-------------------|-----------------|
| **Se cuenta sola** | Sale de lo que ya se registró en el sistema: fotos nuevas en FOTOS_LOG, conteos, demanda, ventas. **No tiene botón.** | No |
| **Con enlace** | Pide el link de la publicación. Sin link, no hay cumplimiento. | Difícil |
| **Se marca a mano** | Un botón. Solo para lo que no deja rastro, como abrir la tienda. | Sí |

En "Cargar 10 fotos" no hay nada que marcar: Reinaldo sube fotos desde Cargar Fotos y la barra sube sola.
Si dejara marcarse a mano, el número dejaría de medir algo.

### Los tres marcadores, separados
En Gerencia, sección **Tareas · quién cumple**:

1. **Cumplimiento** — de lo que se le pidió, cuánto hizo. En %. Cuenta **todos los días del período**,
   incluidos los que no se hizo nada; si solo contara los días trabajados, quien no vino daría 100%.
2. **Volumen** — el trabajo crudo, sin convertir a nota: fotos, conteos, ventas, demanda, publicaciones.
3. **Iniciativa** — tareas propias (lo que nadie mandó) y metas superadas.

**No hay un número único, y no lo va a haber.** Un promedio entre "cumplió sus tareas" y "vendió mucho"
no significa nada: son cosas distintas y hay que poder verlas separadas para decidir. Alguien puede
cumplir todo y no vender; otro puede vender mucho y no tocar el catálogo. Eso es justo lo que hay que ver.

### Lo que puede hacer cada quien
- **El empleado** (Mi día): ve sus tareas de hoy, marca las que se marcan, pega enlaces, ve su avance,
  y anota **tareas propias** — lo que hizo por su cuenta. Esas no suman al cumplimiento: se miden aparte.
- **Los socios** (Gerencia): ven los tres marcadores por persona, **asignan tareas nuevas** (a todos o a
  una persona, diarias / lunes a viernes / una vez, con meta) y **quitan** las que ya no aplican.
  Quitar apaga, no borra: el histórico de lo que se cumplió tiene que seguir teniendo sentido.

### Lo que NO hace todavía
- No está atado a dinero. Ninguna cifra de aquí toca comisiones ni pagos. Eso se decide después,
  cuando haya dos o tres meses de historia y se vea si los números son justos.
- La foto de apertura sigue por WhatsApp, como quedamos. Aquí solo queda la hora.
- Volver a marcar "Abrí la tienda" **no cambia la hora original**: la primera marca es el dato.

### Corrección aparte
`VERSION_SCRIPT` seguía en **v21.4** mientras el encabezado del `Code.gs` decía v24. El sello que sirve
justamente para saber qué hay desplegado estaba mintiendo, así que el menú mostraba "script v21.4" para
un script v24. Corregido, y de aquí en adelante se cambia junto con el encabezado.

### Cambios menores en todas las pantallas
Las 11 pantallas ganan la tarjeta **"Mi día"** en el menú. Solo eso: nada más cambió en ellas.

---

## ventas v14.1 / apartados v1.5 — 2026-09-18 · El bloqueo de persona, para todas las pantallas
En v14 el selector solo se fijaba en `ventas.html`. En apartados seguía diciendo "Seleccionar...".

Ahora lo hace el módulo compartido, así que vale igual en las ocho pantallas que preguntan quién hace la
operación (vendedor, quién recibe, quién cuenta, quién registra).

Regla: **solo se toca un desplegable que ya ofrece ese nombre.** Por eso el de "Autoriza" de devoluciones,
que solo lista a los socios, no se fuerza con un vendedor que no tiene permiso para autorizar.

Con el login apagado nada de esto ocurre: los desplegables siguen libres, como siempre.

## ventas v14 / apartados v1.4 — 2026-09-18 · Bloque D, parte 2 (2 de 3): se va el CSV de CLIENTES
**boparts_ventas.html v14 · boparts_apartados.html v1.4** — requieren Apps Script v21.4

Las dos pantallas que leían el CSV publicado de **CLIENTES** — cédulas y teléfonos de todos los clientes en
una URL pública — ya no lo hacen. Piden `action=clientes` y `action=productos` al script.

- **El token se agrega en un solo lugar.** Se envuelve `fetch` y se le pone a toda llamada al script, GET o
  POST. En una pantalla con veinte llamadas no hay forma de olvidarlo en una.
- **Con sesión activa, el vendedor es quien inició sesión.** En `ventas.html` el selector se fija y se bloquea.
  Hasta ahora cualquiera podía registrar una venta a nombre de Reinaldo cambiando un desplegable, y eso
  contamina las comisiones y el reporte por vendedor. El servidor también lo impone.
- El costo se sigue leyendo para la línea de venta cuando quien vende es socio; cuando es vendedor, no viaja
  al teléfono y lo pone el servidor al guardar (v21).
- Ambas muestran `app · script` en el menú.
- `ventas.html` guarda la lista en el teléfono (`boparts_prod_v14`), así que se puede seguir vendiendo
  mientras el script tarda.

Con esto, las hojas que faltan por migrar son **LISTA DE PRODUCTOS** (compras, fotos, devoluciones) y
**CATALOGO_PROVEEDORES** (demanda).

## index v11.1 — 2026-09-19 · El selector de tasa pasa al encabezado
En v11 el selector quedó al final de la lista: para cambiar de modo había que recorrer 400 productos.
Ahora vive donde antes salía el número de la tasa.

- El badge del encabezado dice **Tasa**, y **Tasa · BCV** (resaltado) cuando se está dando precios a BCV.
  Así el modo activo se ve siempre, sin bajar.
- Al tocarlo se abre una ventana con las dos opciones, cada una con un ejemplo hecho con las tasas
  reales del día: *"Dólares — tasa de trabajo 1.000: $10,00 son Bs 10.000"* /
  *"BCV — esos mismos Bs 10.000 a tasa BCV 846,51: $11,81"*. No hay que adivinar cuál es cuál.
- Al elegir, la ventana se cierra sola y la lista se repinta.
- Si todavía no hay tasa BCV cargada, la opción aparece apagada y dice quién la carga.
- **Se eliminó el editor de tasa local** (`applyTasa`), que ya estaba muerto desde que la tasa se
  sincroniza desde Gerencia. Era una vía de escape para que un teléfono diera precios con una tasa
  distinta a la del sistema.
- Sigue intacto lo importante: `motoauto_tasa` (la tasa que lee Registrar Venta) no se toca.

## index v11 — 2026-09-19 · Dar precios en Dólares o en BCV
Interruptor en la lista de precios: **Dólares** (como siempre) o **BCV**.

**Los bolívares no cambian nunca.** Lo único que cambia es en qué dólar se expresa ese mismo precio:

| Modo | Dólares | Bolívares |
|---|---|---|
| Dólares | $8,00 | Bs 8.000 |
| BCV | $9,45 | Bs 8.000 |

La cuenta es `Bs ÷ tasa BCV`. El número es más alto porque quien paga con un dólar valorado a BCV necesita
más dólares para cubrir los mismos bolívares.

**Es solo presentación.** No toca `motoauto_tasa`, que es la tasa de trabajo que lee Registrar Venta. Si la
tocara, el modo de dar precios se colaría en el registro de ventas, las comisiones y el margen.

Para que nadie cotice en el modo equivocado:
- El interruptor va arriba, grande, y dice debajo qué tasa está usando
- Cada precio en la lista lleva la marca **BCV** al lado
- El detalle dice "Dólares a BCV" en vez de "Dólares"
- El mensaje de WhatsApp dice *"Equivalente en divisa a BCV"*, y no promete el precio preferencial por pagar
  en dólares, que en ese modo sería falso

El modo se recuerda entre aperturas. Si no hay tasa BCV cargada en Gerencia, el botón no deja pasar y lo avisa.
La tasa BCV llega por `action=config`, que ya se pedía.

## fotos v9.2 — 2026-09-19 · El botón Subir parecía no hacer nada
Sí hacía: seleccionaba el producto y abría su panel. Pero el panel está **debajo** de la cola, y con 446
productos sin foto quedaba a cientos de filas de distancia, fuera de pantalla. Desde el teléfono se veía
como un botón muerto.

Ahora, al elegir un producto, la cola se esconde y la pantalla sube. Al cerrar el producto, la cola vuelve
y se repinta ya sin él.

**Por qué no lo detectaron las pruebas:** llamaban a la función directamente en vez de hacer clic en el botón,
así que comprobaban el estado y nunca si eso se veía. La prueba ahora hace clic de verdad.

## v24 / fotos v9.1 / gerencia v2.7 — 2026-09-19 · Quién trabajó el catálogo, y rendimiento por persona

### Cargar Fotos: la cola de trabajo
Pestañas **Sin foto · Solo 1 · Con foto · Todos**, con el contador arriba:
*"312 de 798 productos con foto · 486 sin ninguna · 94 con una sola"*.

"Sin foto" es la cola: se abre, se sube, y el producto **desaparece de la lista al instante**. "Solo 1" es una
cola distinta y vale la pena: un producto con una sola imagen se ve pobre en la lista de precios y en
Mercado Libre.

### FOTOS_LOG
Hasta ahora una foto se escribía en la fila del producto y **no quedaba rastro de nada**: ni quién, ni cuándo.
Ahora cada carga deja fecha, hora, producto, quién, y — lo que importa para medir — cuántas fotos son
**nuevas** y cuántas **reemplazan** una que ya estaba. Para medir trabajo sobre el catálogo cuenta lo nuevo,
no lo que se volvió a subir.

### Rendimiento por persona (Gerencia)
Nada de esto son datos nuevos. `VENTAS_DETALLE` guarda el vendedor en cada línea desde el v8 y nadie lo
miraba. Por persona y por período:

- Vendido, utilidad y **margen** · ventas (no líneas), ticket promedio y productos por venta
- Fotos nuevas, conteos hechos (y cuántos con diferencia), demanda registrada

**Tres bloques separados a propósito, sin puntaje único.** Un número solo se manipula solo: la persona
encuentra la métrica más barata y llena el puntaje con esa.

El margen va marcado cuando baja de 20%: es lo que separa vender de despachar. Dos personas con el mismo
total vendido pueden dejar utilidades muy distintas.

`action=ventas` devuelve ahora también conteos, demanda y fotos del período, para no pedir lo mismo dos veces.

## v23 / inventario v2 — 2026-09-19 · Ficha del producto y cambio de precio con registro
**Code.gs v23 · boparts_inventario.html v2**

Inventario queda partido en dos pestañas, como compras:

- **Contar** — la de siempre, para el vendedor. Cuenta a ciegas, sin ver cuánto debería haber.
- **Producto** — solo socios (sesión de socio, o el PIN si el login está apagado).

### Lo que trae la ficha

- **Stock explicado**, no solo el número: *contado 8 el 17/09 · recibidas +5 · vendidas −1*. Si el número no
  cuadra con el estante, ahí se ve dónde se rompió.
- **Costo bloqueado.** Solo se cambia costeando una compra, como hasta ahora.
- **Precio de venta editable.** Es la primera vez que se puede cambiar un precio sin abrir la hoja a mano.
  Hasta hoy las únicas formas eran editar `LISTA DE PRODUCTOS` o costear una compra de ese producto.
- **Margen en vivo mientras escribes.** Si el precio queda bajo el costo, lo dice antes de guardar y calcula
  cuánto se pierde por venta; pide confirmación aparte. Si el margen baja de 15%, avisa que revise si cubre la
  comisión del punto.
- **Historial completo**: ventas, devoluciones, compras, conteos y cambios de precio, en una línea de tiempo.

### Cada cambio de precio queda registrado

Hoja **`PRECIOS_LOG`**: fecha, hora, código, producto, precio anterior, precio nuevo, quién lo cambió, motivo,
costo al momento y los dos márgenes.

Esto es la mitad del valor de la pantalla. Hasta ahora un precio cambiaba sin dejar rastro: cuando el margen de
un producto se moviera raro dentro de tres meses, no había forma de saber si fue el costo o alguien que tocó el
precio. Ahora el historial del producto lo muestra.

Al ponerle precio a un producto marcado como `NUEVO - SIN PRECIO`, la marca se quita sola.

## v22.1 — 2026-09-19 · Las notas de la hoja salían como métodos de pago
El archivo que se pasó para llenar `METODOS_PAGO` traía las explicaciones de cada columna **en la misma hoja**,
debajo de los datos. Al pegarlo completo, esas filas quedaron con texto en la columna LABEL, y el lector las
tomaba por métodos: en la pantalla de venta aparecían *"Estos son EXACTAMENTE los métodos…"* y
*"PCT comisión porcentual…"* como si fueran formas de pago.

Un método de pago real tiene **METODO y MONEDA**. Una nota solo tiene texto en la primera columna. Ahora se
exigen los dos, así que cualquier fila suelta en esa hoja se ignora en vez de ensuciar la venta. También se
descartan las etiquetas de más de 60 caracteres y las monedas que no sean USD o BS.

Mismo criterio en el respaldo de `ALIADOS`: sin porcentaje no es un aliado.

Conviene borrar igual esas filas de la hoja, aunque ya no molesten.

## gerencia v2.6 / ventas v14.2 — 2026-09-19 · Liquidación de aliados (parte 2: pantallas)

**En la ficha del cliente** (Gerencia → Clientes) hay ahora tres campos más: Aliado Sí/No, Comisión % y
Su negocio. Un aliado marcado lleva su chip dorado con el porcentaje.

No deja marcar como aliado a quien no tiene cédula. **La cédula es lo que une su comisión con lo que debe**;
sin ella la liquidación no puede cruzar las dos cuentas y pagaría de más.

**Sección "Liquidación de aliados"**, arriba de Clientes. Por cada uno:

- Comisiones cobrables, con cuántas ventas
- Pendiente de cobro aparte, cuando la venta fue a crédito y el cliente todavía no paga
- La mercancía que se llevó, en rojo y restando
- El neto: verde si hay que pagarle, rojo si te debe

El botón dice lo que va a pasar: *"Liquidar y pagarle $17.00"* o *"Aplicar $10.00 a su deuda"*. Pide confirmación
con el desglose antes de tocar nada. Si alguna comisión es anterior a la v22 y se convirtió con la tasa de hoy,
lo avisa: ese monto es aproximado.

**ventas v14.2** deja de tener los métodos de pago y los aliados escritos por dentro: los pide con
`action=metodos`. Los métodos salen de `METODOS_PAGO` y los aliados de `CLIENTES` con ALIADO = SI. Agregar un
banco o un aliado deja de ser un cambio de código. Si el script no responde, se queda con lo que ya tenía y la
venta se puede hacer igual: nunca se deja al vendedor sin métodos de pago.

La venta manda ahora la cédula del aliado, que es con lo que el servidor busca su ficha y su porcentaje.

## v22 — 2026-09-19 · El aliado es un cliente más (parte 1: servidor)
**Code.gs v22.** Todavía sin pantallas: se instala y no cambia nada visible.

`CLIENTES` gana tres columnas — **J ALIADO (SI/NO) · K COMISION_PCT · L NEGOCIO** — y se crean solas al
desplegar. Con eso, el aliado deja de ser una lista aparte: es una fila de clientes, con su cédula.

**El problema que esto resuelve.** Cuando un aliado se llevaba mercancía a crédito, esa deuda quedaba en
`CXC_MOV` a nombre del cliente y su comisión en `COMISIONES` a nombre del aliado. Dos registros que nadie
cruzaba: se le podía pagar la comisión completa a alguien que debía mercancía y nada avisaba.

- **El porcentaje lo pone el servidor**, leído de `CLIENTES` al guardar la venta. Lo que mande el teléfono se
  ignora, así que no se puede alterar desde el navegador — y no hace falta mandárselo al teléfono de un
  vendedor. `action=clientes` se lo entrega en blanco a quien no es socio.
- **Sin autocomisión**: si el aliado de la venta es el mismo cliente que compra, no se genera comisión.
- **`COMISIONES` gana `COMISION_USD`** (columna N). La comisión se guardaba solo en Bs y la deuda está en USD;
  sin ese dato, restar una de otra dependía de la tasa del día en que se liquida, no de la de la venta. Las
  comisiones viejas se convierten con la tasa actual y la pantalla las marcará como aproximadas.
- **`action=liquidacion`** — por aliado: comisiones cobrables, lo que está pendiente de cobro, su deuda y el
  neto a pagar.
- **`tipo=liquidar_aliado`** — marca las comisiones PAGADA, abona la deuda con método **COMPENSACION** y deja
  constancia en la hoja `LIQUIDACIONES`.

**Por qué COMPENSACION y no un abono normal:** ese dinero no entró. Si entrara como cobro, el día que concilies
la caja te sobraría ese monto sin explicación.

**Una comisión de una venta a crédito no se liquida** mientras el cliente final no pague — queda como
`PENDIENTE COBRO` y se muestra aparte. Pagarla sería adelantarle dinero al aliado sin haberlo decidido.

Si el aliado debe más de lo que ganó, no se le paga nada y el saldo en contra se arrastra al siguiente ciclo.

Mientras no haya ningún cliente marcado como aliado, se sigue usando la hoja `ALIADOS` para que nada se rompa
al instalar. Esa hoja queda obsoleta en cuanto marques a Luis y a David en `CLIENTES`.

## gerencia v2.5 — 2026-09-19 · Relación de gastos, línea por línea
Gerencia mostraba el total de gastos del período y la barra por categoría, pero no **qué** se gastó. Y esa es
la vista que sirve para revisar.

El detalle ya venía en la respuesta del script desde v12 — fecha, categoría, descripción, monto USD, monto Bs
y quién pagó — y la pantalla solo lo sumaba. No hizo falta tocar el backend.

Ahora, debajo de la barra por categoría: cada gasto con su descripción, fecha, categoría y quién lo pagó,
ordenados del más reciente al más viejo, con el total arriba.

## v21.6 / compras v2.6 — 2026-09-19 · Una recepción reenviada ya no se duplica
Mismo fallo que se corrigió en ventas con v20, que quedó fuera en compras: el `idCompra` se generaba nuevo en
cada pulsación del botón, así que un reintento tras un fallo de red entraba como recepción distinta.

Duplicaba más de lo que parece:
- la recepción y sus líneas — y con ellas el stock, que suma las compras;
- **los productos marcados como NUEVOS se volvían a crear en LISTA DE PRODUCTOS**, ensuciando el catálogo con
  códigos repetidos. Eso es lo que costaba más limpiar después.

- **compras v2.6**: el ID se conserva mientras no se empiece una recepción nueva. El botón "Nueva recepción"
  es lo único que lo renueva.
- **Code.gs v21.6**: si ya existe una recepción con ese ID, no escribe nada y devuelve lo de la primera vez.
  La app lo dice en pantalla en vez de callarse.

Con 9 casos de prueba, incluido el de un envío que falla por red y se reintenta.

## Bloque D, parte 2 completa — 2026-09-18 · Ninguna pantalla depende ya de una hoja publicada
**Code.gs v21.5** + las once pantallas.

Con esta tanda, **ningún HTML lee un CSV publicado**, salvo EQUIVALENCIAS en la lista de precios, que no
tiene nada sensible y sirve de respaldo si el script no responde.

| Pantalla | Qué cambió |
|---|---|
| index v10.3 | el token también viaja en `action=config`; antes la tasa no cargaba con el login encendido |
| compras v2.5 | productos por `action=productos` |
| devoluciones v1.4 | productos por `action=productos` |
| demanda v8.6 | catálogo de proveedores por `action=catalogo` |
| fotos v9 | productos por `action=productos`, y **la fila la dice el script** |
| gastos v1.7 · cobros v2.6 · inventario v1.4 | no leían CSV; se les agregó el login |
| gerencia v2.4 | con el login encendido, un socio que ya entró **no tiene que meter dos claves** |

**Lo de fotos merece una nota.** Calculaba la fila de cada producto contando filas del CSV. La respuesta del
script omite las filas sin producto, así que esa cuenta se habría corrido y una foto podía caer en otro
producto. Ahora `action=productos` devuelve el número de fila real y la app no adivina nada.
**Requiere el script v21.5**: con el v21.4, fotos guardaría en la fila equivocada.

**Gerencia y las dos puertas.** Tenía su propio PIN en el navegador. Con el login encendido, un socio que ya
inició sesión entra directo; a un vendedor que se meta por la URL, el servidor le niega cada dato igual, que
es donde debe negarse. Con el login apagado, ese PIN sigue siendo la única puerta y se pide como siempre.

Pendiente para cerrar el bloque D:
1. Borrar `boparts_reportes.html` del repo — es el único que todavía lee el CSV de VENTAS.
2. Despublicar LISTA DE PRODUCTOS, CLIENTES, CATALOGO_PROVEEDORES, VENTAS, CONFIG, METODOS_PAGO, ALIADOS
   y DEMANDA_NO_ATENDIDA. Queda publicada solo EQUIVALENCIAS.
3. Poner `CONFIG!B15 = SI` y probar con los tres usuarios.

## v21.4 / index v10.2 — 2026-09-18 · Saber qué versión está corriendo
Dos veces esta noche un error se vio igual que un fallo de código cuando en realidad era un archivo sin subir
o sin desplegar. Ahora se ve de un vistazo:

- **Code.gs v21.4**: cada respuesta del script trae el campo `v` con su versión.
- **index.html v10.2**: el menú (botón ☰) muestra `app v10.2 · script v21.4`, y el cuadro de error también.
  Si el menú dice `script v21.2`, lo que falta es **Implementar → Nueva versión**, no una corrección.

Recordatorio de instalación: en Apps Script, **Ctrl+S no despliega**. Guardar cambia el editor; la app web
sigue sirviendo la versión anterior hasta que se hace Implementar → Administrar implementaciones → lápiz →
Versión: **Nueva versión** → Implementar.

## v21.3 / index v10.1 — 2026-09-18 · Corrección: celdas con tipo
`(q[0] || "").trim is not a function` al abrir la lista de precios con index v10.

El CSV publicado entregaba **todas** las celdas como texto. La hoja las entrega con su tipo real: un código
como `1021` llegaba como número, y `.trim()` no existe en un número. Reventaba antes de pintar un solo producto.

- **Code.gs v21.3**: `action=productos` y `action=catalogo` convierten cada celda a texto antes de responder,
  igual que hacía el CSV. Las fechas salen como `dd/MM/yyyy`.
- **index.html v10.1**: además convierte a texto de su lado, por si un teléfono se queda con una versión
  anterior del script.

Esto aplica a las cinco pantallas que faltan por migrar: ninguna va a ver el problema.

## v21.2 / index v10 — 2026-09-18 · Bloque D, parte 2 (1 de 3): la lista de precios deja el CSV
**Code.gs v21.2 · index.html v10**

- `action=quienes` devuelve los nombres activos para el desplegable del login. Es la **única** acción que no
  exige sesión, porque hace falta antes de tener una. No entrega PIN, ni hash, ni token.
- **index.html v10** ya no lee el CSV publicado de LISTA DE PRODUCTOS: pide `action=productos` al script.
  Con esto esa hoja puede dejar de estar publicada en cuanto las otras cinco pantallas también migren.
- Incluye el **módulo de sesión** que va idéntico en todas las pantallas: pantalla de login, token guardado
  12 h en el teléfono, y cuando el token vence manda al login en vez de mostrar un error técnico.
- Mientras `CONFIG!B15 = NO`, **el login no aparece nunca** y la pantalla funciona como siempre.
- Si el script no responde, la pantalla **no se queda trancada en el login**: sigue con la caché.
- EQUIVALENCIAS se sigue leyendo por CSV a propósito: no tiene nada sensible y sirve de respaldo.
- La caché local cambió de nombre (`boparts_prod_v10`), así que el primer arranque de cada teléfono baja la
  lista de nuevo.

## v21.1 — 2026-09-18 · Métodos de pago y aliados, desde la hoja
**Code.gs v21.1.** Sin cambios en ningún HTML todavía (lo consume `boparts_ventas.html` en la parte 2).

Los métodos de pago y los aliados estaban escritos **dentro** de `boparts_ventas.html`: agregar un banco o
corregir la comisión de un punto obligaba a editar el archivo y subirlo. Peor: una comisión equivocada no da
error, solo calcula mal el NETO de cada venta sin que nadie lo note.

- `action=metodos` los devuelve desde las hojas **METODOS_PAGO** (LABEL, METODO, BANCO, MONEDA, FIJO_BS, PCT,
  CREDITO, ACTIVO) y **ALIADOS** (ID, NOMBRE, NEGOCIO, PCT, ACTIVO).
- Si la hoja está vacía, se llena con **exactamente** los valores que hoy están en `ventas.html` v13.3.
  El día que se instala, nada cambia.
- Si la hoja existe con **otras columnas** (las heredadas, que ya nadie leía), no se interpreta: se usan los
  valores de siempre y la respuesta trae un aviso. Leer columnas equivocadas sería peor que no leer.
- `ACTIVO = NO` saca un método o un aliado de la pantalla sin borrar su historia.
- El orden de las filas es el orden en que salen en la pantalla de venta.

## v21 — 2026-09-18 · Bloque D, parte 1: identidad en el servidor
**Code.gs v21.** Sin cambios en ningún HTML. La operación sigue exactamente igual hasta que se active.

**Interruptor: `CONFIG!B15`.** `NO` (o vacío) = sistema abierto, como hasta hoy. `SI` = exige sesión.
Es una celda de la hoja, no código: si algo falla en plena venta, se escribe `NO` y todo vuelve a
funcionar en segundos sin volver a desplegar.

Qué trae:
- **Hoja `USUARIOS`** — NOMBRE, ROL (SOCIO/VENDEDOR), ACTIVO, PIN_NUEVO, PIN_HASH, TOKEN, TOKEN_VENCE,
  ULTIMO_ACCESO. Los PIN se escriben en claro en `PIN_NUEVO` y el script los convierte a hash y borra
  el texto. El PIN nunca queda guardado en ninguna parte, ni en el código ni en la hoja.
- **`tipo:'login'`** — valida usuario y PIN y devuelve un token que vale 12 horas.
- **Rol mínimo por acción, verificado en el servidor.** Lo que no está en la tabla de permisos exige
  SOCIO: se niega por defecto. Hasta ahora el PIN lo validaba el navegador y se saltaba con la consola.
- **Con sesión activa, el nombre lo pone el servidor.** El selector de vendedor deja de decidir a nombre
  de quién se registra una venta, un gasto o una recepción.
- **`action=productos` y `action=catalogo`** — sirven LISTA DE PRODUCTOS y el catálogo de proveedores por
  el script, para poder despublicar esos CSV. A un VENDEDOR se le entrega la lista **sin** las columnas
  Costo, descuento y Costo Final; las columnas no se corren de sitio, llegan vacías.
- **El costo de la venta se toma de la hoja**, no del teléfono. Si la línea no trae costo, el script lo
  busca en LISTA DE PRODUCTOS en el momento de guardar y lo congela ahí, igual que antes.
- **Revocar a alguien:** borrar su TOKEN en USUARIOS, o poner NO en ACTIVO. Surte efecto de inmediato.
  Cambiarle el PIN también cierra sus sesiones abiertas.

Instalación (no rompe nada, se puede hacer en horario de tienda):
1. Pegar `Code.gs` v21 completo encima del v20 → Implementar → Administrar implementaciones → lápiz →
   Nueva versión → Implementar.
2. En el editor, ejecutar una vez la función `prepararBloqueD`. Crea la hoja USUARIOS con los tres
   usuarios y escribe `NO` en `CONFIG!B15`.
3. Escribir los PIN en la columna `PIN_NUEVO` de USUARIOS. Desaparecen solos en el primer inicio de sesión.

Pendiente de bloque D: las 12 pantallas con login (parte 2) y despublicar las hojas (parte 3).

## v2.4 / v1.6 — 2026-09-18 · Foto de factura sobrescrita
**boparts_compras.html v2.4 · boparts_gastos.html v1.6**
Las fotos de factura subían a Cloudinary siempre con el nombre `factura.jpg` (y `gasto.jpg`), sin `public_id`.
El preset resolvía el nombre desde el archivo, así que **cada subida sobrescribía la anterior** y todas las
compras quedaban apuntando a la misma imagen: la última subida. Ahora cada foto lleva nombre único
(`factura_<timestamp>_<aleatorio>`), sin depender de cómo esté configurado el preset.
Las fotos anteriores no se recuperan: ya no existen en Cloudinary.

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
- boparts_fotos.html: las fotos subidas antes de v8 conservan su nombre aleatorio y su peso original.
- index.html usa tasa `1000` por defecto si no hay valor guardado ni en la hoja.
- Todas las hojas están publicadas como CSV público (incluyendo VENTAS y CLIENTES). CXC_MOV no esta publicada; solo se lee via Apps Script.
- boparts_reportes.html cuenta las ventas a credito como ingreso del dia; falta separar vendido de cobrado.
