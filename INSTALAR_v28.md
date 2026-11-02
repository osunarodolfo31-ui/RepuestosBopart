# Instalar v28 (build 2026-11-01.1)

1. Apps Script: abre el proyecto de la hoja, pega Code.gs completo, Guardar, Implementar > Administrar
   implementaciones > lapiz > Version: Nueva version > Implementar. La URL no cambia.
2. GitHub (https://github.com/osunarodolfo31-ui/RepuestosBopart): sube TODO lo de este paquete
   (13 .html, boparts_sesion.js, version.json, Code.gs, CHANGELOG.md, INSTALAR_v28.md).
3. Borra en GitHub lo que sobra: "Code (1).gs", CHANGELOG_1.md, INSTALAR_v25.md, Reparacion.gs, Reparacion3.gs.
4. Abre PRIMERO la pantalla Dinero desde un telefono de socio. Eso crea la hoja CANALES y la cuenta
   OB International, y apaga Zelle y Binance en CUENTAS.
5. En Dinero, "Cargar saldo inicial" en cada cuenta (Efectivo USD, Efectivo Bs, Banesco, Bancamiga, Bancrecer,
   Bancrecer Empresarial, OB International) con lo que hay al abrir.
6. Revisa la hoja CANALES: si un banco cobra comision por Pago Movil, punto o transferencia, escribela en FIJO / PCT.

Volver atras: Apps Script > Administrar implementaciones > version anterior (v27.3). GitHub > History de cada
archivo > commit anterior. CANALES y la fila OB International pueden quedarse: v27.3 no las lee (en CUENTAS,
vuelve a poner Zelle y Binance en SI si los necesitas).
