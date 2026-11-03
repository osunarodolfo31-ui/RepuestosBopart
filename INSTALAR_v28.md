# Instalar v28.6 (build 2026-11-02.6)

1. Apps Script: abre el proyecto de la hoja, pega Code.gs completo, Guardar, Implementar > Administrar
   implementaciones > lapiz > Version: Nueva version > Implementar. La URL no cambia.
2. GitHub (https://github.com/osunarodolfo31-ui/RepuestosBopart): sube TODO lo de este paquete
   (14 .html, boparts_sesion.js, boparts_pdf.js, version.json, Code.gs, CHANGELOG.md, INSTALAR_v28.md).
   boparts_documentos.html y boparts_pdf.js son NUEVOS: sin boparts_pdf.js, Ventas no puede hacer la factura.
3. Borra en GitHub lo que sobra: "Code (1).gs", CHANGELOG_1.md, INSTALAR_v25.md, Reparacion.gs, Reparacion3.gs.
4. Abre PRIMERO la pantalla Dinero desde un telefono de socio. Eso crea la hoja CANALES y la cuenta
   OB International, y apaga Zelle y Binance en CUENTAS.
5. En Dinero, "Cargar saldo inicial" en cada cuenta (Efectivo USD, Efectivo Bs, Bancamiga, Bancrecer,
   Bancrecer Empresarial y OB International). Banesco NO lleva saldo propio: es parte de OB. El saldo inicial de
   OB International es, en dolares, todo lo que OB le guarda a la tienda, incluidos los Bs que haya en Banesco
   pasados a dolares a la tasa de trabajo.
6. Revisa la hoja CANALES: si un banco cobra comision por Pago Movil, punto o transferencia, escribela en FIJO / PCT.

Volver atras: Apps Script > Administrar implementaciones > version anterior (v28 o v27.3). GitHub > History de cada
archivo > commit anterior. CANALES y la fila OB International pueden quedarse: v27.3 no las lee (en CUENTAS,
vuelve a poner Zelle y Binance en SI si los necesitas).
