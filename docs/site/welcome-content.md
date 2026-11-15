# Welcome page ("reception") copy, English and Spanish

Owner: technical-writer. Copy only; the UI is built by frontend-engineer. Sources: README.md, docs/CITATIONS.md,
config/datasets.yaml, app/src/i18n/en.ts and es.ts (app at 2231e63), docs/guide/*.md,
app/public/data/demo/verification.json, docs/SI_USE_LOG.md, design/logo/README.md:3, PRODUCT.md:59.
Notes for the main session are in square brackets and are not shown on the page.
Spanish follows the app's es dictionary (Normal, Vigilancia, Aviso, Severo; lote, finca, encharcamiento).

---

## Tab 1 — Home / Inicio

### EN
**Demenova**
Waterlogging and flood alerts for banana farms in coastal El Oro, Ecuador. No sensors, no records needed: a pin on
the map is enough to start.

Built with NASA Earth observations. Demenova is an independent project, not endorsed by NASA.

[VIDEO]

**What it does**
- Rates each lot every day: Normal, Watch, Warning or Severe, always as colour and word.
- Shows why: upstream rain, soil saturation, terrain wetness, local rain and the 7-day water balance.
- Keeps a history and suggests three soil and water strategies per lot.
- Shows how reliable it is, as counts, and what it does not know.

The demo replays 20 Jan to 5 Mar 2026 around the 22–23 Feb Buenavista river flood (Pasaje, El Oro) on a synthetic
demo farm.

**The challenge**
Built for the 2026 NASA Space Apps Challenge, challenge "Field Shift: Adapting Farms with NASA Data".

**The name**
Demenova = Demeter, the Greek goddess of the harvest, + nova, a new star.

**Who am I**
Cristian Roberto Terán Paredes, product owner and builder of Demenova, built solo for NASA Space Apps 2026.

**[Button] Enter the app**

### ES
**Demenova**
Alertas de encharcamiento e inundación para fincas bananeras de la costa de El Oro, Ecuador. Sin sensores ni
registros: basta un pin en el mapa para empezar.

Hecho con observaciones de la Tierra de la NASA. Demenova es un proyecto independiente, sin aval de la NASA.

[VIDEO]

**Qué hace**
- Califica cada lote cada día: Normal, Vigilancia, Aviso o Severo, siempre con color y palabra.
- Muestra por qué: lluvia aguas arriba, saturación del suelo, humedad del terreno, lluvia local y balance hídrico de 7 días.
- Guarda un historial y sugiere tres estrategias de suelo y agua por lote.
- Muestra qué tan confiable es, con conteos, y lo que no sabe.

La demo reproduce del 20 ene al 5 mar de 2026, alrededor de la inundación del río Buenavista del 22–23 feb (Pasaje,
El Oro), en una finca demo sintética.

**El reto**
Hecho para el NASA Space Apps Challenge 2026, reto "Field Shift: Adapting Farms with NASA Data".

**El nombre**
Demenova = Deméter, la diosa griega de la cosecha, + nova, una estrella nueva.

**Quién soy**
Cristian Roberto Terán Paredes, dueño del producto y constructor de Demenova, hecho en solitario para NASA Space Apps 2026.

**[Botón] Entrar a la app**

---

## Tab 2 — Instructions / Instrucciones

### EN
**[Button] Download Instructions.pdf**

1. **Home** — Farm status: the highest level today, lots by risk with their top factor, and the **Replay** control.
   Drag the replay day or tap **Play replay**; every screen follows that day. It opens on 23 Feb 2026.
2. **Map** — Risk map: lots coloured by level over NASA GIBS imagery. Layers: Alert level, Wetness, Rain 24 h.
   Imagery: Relief or True colour. Tap a lot, then **Open lot**.
3. **Lot detail** — Index W, **Why** (five factors and their share), today's values, **History** (1W, 1M, 3M) and
   **Lot facts**. Every number carries its origin badge; a missing value shows **No data**.
4. **How reliable is this?** — From Lot: hits, misses and false alarms against documented floods, the weight check,
   warning time and the known limit.
5. **Strategies** — From Lot: three options (Current management, Improved drainage, Drainage, living cover and
   bio-inputs) with why, evidence, gaps and risks. Not yet reviewed by a local agronomist.
6. **Alerts** — Level changes, newest first. [Email and Telegram copy: see "Alerts wording" below.]
7. **Learn** — Short definitions of the app's words and where the data comes from.
8. **Farm setup** (Settings) — Level 0: drop a pin. Level 1: trace the outline. Level 2: add exact lots by drawing,
   importing a GeoJSON file or typing them. [CSV template and CSV import: add one line here once built; not in
   en.ts at 2231e63.] Alerts for your own farm need an engine run for its location.
9. **Settings** — Language, Units (Metric or Imperial, display only), Mode (Farmer or Agronomist), Storage (Full or
   Data saver), Theme (System, Light, Dark), **Export records (CSV)**, and **Connect this device for sync**.

### ES
**[Botón] Descargar Instructions.pdf**

1. **Inicio** — Estado de la finca: el nivel más alto de hoy, los lotes por riesgo con su factor principal y el control
   de **Reproducción**. Mueve el día o toca **Reproducir**; todas las pantallas siguen ese día. Abre en el 23 feb 2026.
2. **Mapa** — Mapa de riesgo: lotes coloreados por nivel sobre imágenes NASA GIBS. Capas: Nivel de alerta, Humedad,
   Lluvia 24 h. Imágenes: Relieve o Color real. Toca un lote y luego abre el lote.
3. **Detalle del lote** — Índice W, **Por qué** (cinco factores y su peso), valores de hoy, **Historial** (1W, 1M, 3M)
   y **Datos del lote**. Cada número lleva su origen; un dato que falta dice **Sin datos**.
4. **¿Qué tan confiable es esto?** — Desde el lote: aciertos, fallos y falsas alarmas frente a inundaciones
   documentadas, la prueba de pesos, el tiempo de aviso y el límite conocido.
5. **Estrategias** — Desde el lote: tres opciones con por qué, evidencia, vacíos y riesgos. No revisado aún por un
   agrónomo local.
6. **Alertas** — Cambios de nivel, del más reciente al más antiguo. [Correo y Telegram: ver "Texto de alertas".]
7. **Aprender** — Definiciones cortas de las palabras de la app y de dónde vienen los datos.
8. **Configurar finca** (Ajustes) — Nivel 0: ubica un pin. Nivel 1: dibuja el contorno. Nivel 2: agrega lotes
   exactos dibujándolos, importando un archivo GeoJSON o escribiéndolos. [Plantilla CSV e importación CSV: añadir una
   línea cuando existan.] Las alertas de tu finca necesitan una corrida del motor para su ubicación.
9. **Ajustes** — Idioma, Unidades (Métrico o Imperial, solo para mostrar), Modo (Productor o Agrónomo),
   Almacenamiento (Completo o Ahorro de datos), Tema (Sistema, Claro, Oscuro), **Exportar registros (CSV)** y
   **Conectar este dispositivo para sincronizar**.

### Alerts wording / Texto de alertas
[Roberto's wording. The email test form is not in en.ts at 2231e63; the field and button labels must match the built UI.]

**Email (EN)** — Type your email and request a test Severe alert. During the demo, delivery works only for the
project owner's address; delivery to any address is a future update in development.
**Correo (ES)** — Escribe tu correo y pide una alerta Severo de prueba. Durante la demo, la entrega funciona solo para
la dirección del dueño del proyecto; la entrega a cualquier dirección es una actualización futura en desarrollo.

**Variant A — Telegram works [keep only if it ships]**
EN: Telegram — open the Demenova bot from the Alerts screen and start it to receive Severe alerts for the demo farm.
ES: Telegram — abre el bot de Demenova desde la pantalla Alertas e inícialo para recibir alertas Severo de la finca demo.
[Check the exact steps against the built bot before publishing.]

**Variant B — Telegram planned [default today]**
EN: Telegram alerts are planned and not available in this version.
ES: Las alertas por Telegram están planificadas y no están disponibles en esta versión.

---

## Tab 3 — Q&A + Technical details / Preguntas + Detalles técnicos

### EN — Questions
**Does it predict floods?** No. It rates waterlogging and flood risk from rain, soil and terrain. In the 2026 replay
the wettest demo lots (1 and 2) were already Severe from earlier storms, and the February flood rain reached the index
only after the overflow was reported.
**Is the farm real?** No. "Finca Demo El Oro" and its 8 lots are synthetic and labelled Demo. The rain, weather,
terrain and imagery under them are real data.
**Where does the data come from?** Global open datasets: NASA GPM IMERG, NASA POWER, NASA SRTM, NASA GIBS, Copernicus
Sentinel-2 and OpenStreetMap. Full list below.
**Does it work offline?** Yes, for what it has already loaded: it installs to the home screen and shows saved data
with the time it was saved.
**Is it free?** The demo needs no account and no payment.
**What about my data?** Your farm is saved on your device first. Sync is optional, needs no account or email, and
uses a private device identity. Email addresses are not stored in the alert log; only a hash is kept.
**How reliable is it?** In the farm's catchment in 2026: 1 hit, 0 misses, 4 false alarms. Four documented floods are
too few to claim accuracy, so Demenova shows counts only.
**Why is a lot Severe for weeks?** The index compares each day with the whole year, so wet-season days stay high.
Seasonal comparison is planned.
**Who checked the agronomy?** Nobody local yet. Every threshold and strategy shows its origin and review status so a
local agronomist can check and tune it. Demenova supports the agronomist's judgment; it never replaces it.
**Can I use it for my farm?** You can add your pin, outline and lots. Alerts for a new farm need an engine run for its
location; only the El Oro area has been run.

### ES — Preguntas
**¿Predice inundaciones?** No. Califica el riesgo de encharcamiento e inundación con lluvia, suelo y terreno. En la
reproducción de 2026, los lotes demo más húmedos (1 y 2) ya estaban en Severo por lluvias anteriores, y la lluvia de
la inundación de febrero llegó al índice solo después de reportarse el desborde.
**¿La finca es real?** No. "Finca Demo El Oro" y sus 8 lotes son sintéticos y llevan la etiqueta Demo. La lluvia, el
clima, el terreno y las imágenes debajo son datos reales.
**¿De dónde vienen los datos?** De datos abiertos globales: NASA GPM IMERG, NASA POWER, NASA SRTM, NASA GIBS,
Copernicus Sentinel-2 y OpenStreetMap. Lista completa abajo.
**¿Funciona sin conexión?** Sí, con lo que ya cargó: se instala en la pantalla de inicio y muestra los datos guardados
con la hora en que se guardaron.
**¿Es gratis?** La demo no pide cuenta ni pago.
**¿Y mis datos?** Tu finca se guarda primero en tu dispositivo. Sincronizar es opcional, no pide cuenta ni correo y
usa una identidad privada del dispositivo. El registro de alertas no guarda correos, solo un hash.
**¿Qué tan confiable es?** En la cuenca de la finca en 2026: 1 acierto, 0 fallos, 4 falsas alarmas. Cuatro
inundaciones documentadas son muy pocas para afirmar precisión, así que Demenova muestra solo conteos.
**¿Por qué un lote sigue en Severo semanas?** El índice compara cada día con todo el año, así que en la época lluviosa
los días siguen altos. La comparación por temporada está planificada.
**¿Quién revisó la agronomía?** Aún ningún agrónomo local. Cada umbral y estrategia muestra su origen y estado de
revisión para que un agrónomo local lo revise y ajuste. Demenova apoya el criterio del agrónomo; nunca lo reemplaza.
**¿Puedo usarla para mi finca?** Puedes agregar tu pin, contorno y lotes. Las alertas de una finca nueva necesitan una
corrida del motor para su ubicación; solo se ha corrido el área de El Oro.

### Technical details (EN)
**Data used**
- Rain: NASA GPM IMERG Early Run daily, `GPM_3IMERGDE` V07 (V07B to 3 Mar 2026, V07C after), NASA GES DISC.
- Weather for evapotranspiration: NASA POWER Daily API v2.10.3; hourly API v2.10.4 for the replay window.
- Terrain and catchment: NASA SRTM `SRTMGL1` v003 (30 m), via OpenTopography.
- Greenness (NDVI): Copernicus Sentinel-2 L2A, Element 84 Earth Search STAC v1.
- Map imagery: NASA GIBS (ASTER GDEM shaded relief, MODIS Terra true colour).
- River: OpenStreetMap contributors (ODbL).
- Evaluated, not used: SMAP `SPL3SMP_E` v006 (no recommended-quality retrieval over the farm in the replay; D-019) and
  GLDAS Noah 2.1 (downloaded for the replay window, not used by the index or shown in the app).

**Method in short**
Index W (0 to 1) = design weights × five indicators: upstream 72 h rain over the 253.8 km² Río Buenavista catchment,
soil saturation (antecedent precipitation index), terrain wetness (TWI from SRTM), local rain, and the 7-day balance
of rain minus FAO-56 crop evapotranspiration. Rain and balance are percentiles against earlier days. Levels: Watch
0.40, Warning 0.60, Severe 0.90 (a design choice, not fitted or validated; D-029).

**Stack**
React + TypeScript PWA (Vite, Tailwind, Leaflet, uPlot); Python pipeline (xarray, rasterio); Supabase Postgres with
row-level security; FastAPI backend on Render for email; GitHub Actions for CI.

**Verification (counts only)**
Documented floods in the farm's catchment, 1 Jan to 13 Nov 2026: 1 hit, 0 misses, 4 false alarms. A false alarm means
no flood in the press reports checked, not proof that none happened.

**Limits**
Synthetic demo farm; design weights and thresholds; no flood-specific warning time in February 2026; weight check not
stable in 10 of 10 runs, though lots 1 and 2 are Severe on the flood days in every run; whole-year percentiles keep
wet-season days high; only El Oro has been run; agronomic guidance not yet reviewed by a local agronomist.

**How AI tools were used**
Code, tests and documents were produced with Claude Code (Anthropic) working as specialised agents under written
rules (no invented data, a source or a label for every number), with independent science and security reviews.
Roberto chose the problem, place and scope and made the key decisions, including the Severe threshold and the replay
window. Log: docs/SI_USE_LOG.md.

**Links**
Code: https://github.com/Robxter/NASA-Space-Apps-Demenova · Sources: docs/CITATIONS.md

### Detalles técnicos (ES)
**Datos usados**
- Lluvia: NASA GPM IMERG Early Run diario, `GPM_3IMERGDE` V07 (V07B hasta el 3 mar 2026, V07C después), NASA GES DISC.
- Clima para la evapotranspiración: NASA POWER Daily API v2.10.3; API horaria v2.10.4 para la ventana de la reproducción.
- Terreno y cuenca: NASA SRTM `SRTMGL1` v003 (30 m), vía OpenTopography.
- Verdor (NDVI): Copernicus Sentinel-2 L2A, Element 84 Earth Search STAC v1.
- Imágenes del mapa: NASA GIBS (relieve sombreado ASTER GDEM, color real MODIS Terra).
- Río: colaboradores de OpenStreetMap (ODbL).
- Evaluados, no usados: SMAP `SPL3SMP_E` v006 (sin datos de calidad recomendada sobre la finca en la reproducción;
  D-019) y GLDAS Noah 2.1 (descargado para la reproducción, no lo usa el índice ni se muestra en la app).

**Método en breve**
Índice W (0 a 1) = pesos de diseño × cinco indicadores: lluvia de 72 h aguas arriba en la cuenca del río Buenavista
(253,8 km²), saturación del suelo (índice de precipitación antecedente), humedad del terreno (TWI de SRTM), lluvia
local y balance de 7 días de lluvia menos evapotranspiración del cultivo FAO-56. Lluvia y balance son percentiles
frente a días anteriores. Niveles: Vigilancia 0,40, Aviso 0,60, Severo 0,90 (una decisión de diseño, no ajustada ni
validada; D-029).

**Tecnologías**
PWA en React + TypeScript (Vite, Tailwind, Leaflet, uPlot); pipeline en Python (xarray, rasterio); Supabase Postgres
con seguridad por fila; backend FastAPI en Render para el correo; GitHub Actions para CI.

**Verificación (solo conteos)**
Inundaciones documentadas en la cuenca de la finca, 1 ene a 13 nov 2026: 1 acierto, 0 fallos, 4 falsas alarmas. Una
falsa alarma significa que no hubo inundación en las noticias revisadas, no que no haya ocurrido.

**Límites**
Finca demo sintética; pesos y umbrales de diseño; sin tiempo de aviso propio de la inundación de febrero de 2026; la
prueba de pesos no es estable en 10 de 10 corridas, aunque los lotes 1 y 2 están en Severo en los días de la
inundación en todas; los percentiles de todo el año mantienen altos los días de la época lluviosa; solo se ha corrido
El Oro; la guía agronómica no ha sido revisada aún por un agrónomo local.

**Cómo se usaron las herramientas de IA**
El código, las pruebas y los documentos se produjeron con Claude Code (Anthropic), con agentes especializados bajo
reglas escritas (ningún dato inventado; cada número con fuente o etiqueta) y revisiones independientes de ciencia y
seguridad. Roberto eligió el problema, el lugar y el alcance y tomó las decisiones clave, incluidos el umbral Severo y
la ventana de la reproducción. Registro: docs/SI_USE_LOG.md.

**Enlaces**
Código: https://github.com/Robxter/NASA-Space-Apps-Demenova · Fuentes: docs/CITATIONS.md
