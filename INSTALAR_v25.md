# Instalar v25 — Módulo de tareas

Hazlo en este orden. El paso 1 es obligatorio antes de los demás: las pantallas nuevas piden cosas
que solo existen en el script v25.

---

## 1. El Apps Script (primero)

1. Abre el editor: **https://script.google.com**
2. Abre el proyecto de BoParts → archivo `Code.gs`
3. Selecciona todo (Ctrl+A) y pega encima el `Code.gs` nuevo completo
4. Guarda (Ctrl+S)
5. **Implementar → Administrar implementaciones → lápiz → Versión: Nueva versión → Implementar**
   (Ctrl+S por sí solo NO despliega nada. Este paso es el que cuenta.)
6. Todavía en el editor, arriba donde dice la lista de funciones, elige **`prepararTareas`** y
   dale a **Ejecutar**. Eso crea las hojas `TAREAS` y `TAREAS_DIA` con 5 tareas de arranque.

Para comprobar que quedó: abre
**https://script.google.com/macros/s/AKfycbwSOG2btzrvEt-VklzXY8_LlYlkT2nGACRNK2gt61t3gDRs8ZDsmUFRhN99teDTKIlsSg/exec?action=config**
Tiene que decir `"v":"v25"`. Si dice otra cosa, el paso 5 no se completó.

---

## 2. El archivo nuevo

En GitHub: **https://github.com/osunarodolfo31-ui/RepuestosBopart**

→ **Add file → Create new file** → nombre exacto: `boparts_tareas.html` → pega el contenido →
**Commit new file**

---

## 3. Los archivos que cambian

Los 11 llevan el mismo cambio: la tarjeta **"Mi día"** en el menú. Gerencia además trae la sección
de tareas completa, e index.html el selector de tasa del encabezado.

Para cada uno: **https://github.com/osunarodolfo31-ui/RepuestosBopart/blob/main/NOMBRE**
→ lápiz → borrar todo → pegar el archivo nuevo → **Commit changes**

| Archivo | Versión nueva | Qué cambia |
|---|---|---|
| `boparts_gerencia.html` | v2.8 | **Los tres marcadores + asignar tareas** |
| `index.html` | v11.2 | Selector de tasa en el encabezado + menú |
| `boparts_ventas.html` | v14.3 | Solo el menú |
| `boparts_fotos.html` | v9.3 | Solo el menú |
| `boparts_inventario.html` | v2.1 | Solo el menú |
| `boparts_compras.html` | v2.7 | Solo el menú |
| `boparts_cobros.html` | v2.7 | Solo el menú |
| `boparts_gastos.html` | v1.8 | Solo el menú |
| `boparts_demanda.html` | v8.7 | Solo el menú |
| `boparts_apartados.html` | v1.6 | Solo el menú |
| `boparts_devoluciones.html` | v1.5 | Solo el menú |

**Si andas con poco tiempo**, sube solo estos tres y el resto después — el sistema funciona igual,
solo que "Mi día" no aparecerá en el menú de las demás pantallas:
`Code.gs`, `boparts_tareas.html`, `boparts_gerencia.html`.

---

## 4. Comprobar

1. **https://osunarodolfo31-ui.github.io/RepuestosBopart/boparts_tareas.html?v=25**
   Entra con tu PIN. Tienen que salir las 5 tareas del día.
2. En el menú (☰) tiene que decir **app v1 · script v25**.
3. **https://osunarodolfo31-ui.github.io/RepuestosBopart/boparts_gerencia.html?v=28**
   Baja hasta **"Tareas · quién cumple"**. Ahí están los tres marcadores y el formulario para asignar.

Si alguna pantalla dice `script v21.4`, el despliegue del paso 1.5 no se hizo.

---

## 5. Las tareas de arranque

Se crean estas cinco. Cámbialas desde Gerencia cuando quieras — quitar una no borra lo ya cumplido.

| Tarea | Tipo | Meta | Cuándo |
|---|---|---|---|
| Abrí la tienda | se marca a mano | 1 | todos los días |
| Cargar 10 fotos de productos | **se cuenta sola** (fotos nuevas) | 10 | todos los días |
| Subir 5 publicaciones | con enlace | 5 | todos los días |
| Contar 20 productos | **se cuenta sola** (conteos) | 20 | lunes a viernes |
| Registrar la demanda no atendida | **se cuenta sola** (demanda) | 3 | todos los días |

Las que dicen "se cuenta sola" **no tienen botón**: suben cuando Reinaldo registra el trabajo en su
pantalla. Es la única forma de que el número no dependa de que alguien diga que lo hizo.
