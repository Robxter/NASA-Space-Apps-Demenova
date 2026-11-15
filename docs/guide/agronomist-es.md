# Demenova: guía para el agrónomo

Demenova convierte observaciones globales de la Tierra de la NASA en un índice diario de encharcamiento e inundación
W (de 0 a 1) por lote o zona, con cuatro niveles: Normal (verde), Vigilancia (amarillo), Aviso (naranja), Severo
(rojo), siempre con color y palabra. Hecho con observaciones de la Tierra de la NASA.

> Toda la orientación agronómica de la app y de esta guía es **orientación general, aún no revisada por un agrónomo
> local**. Las acciones son revisiones, nunca productos ni dosis. Demenova apoya el criterio del agrónomo; nunca lo
> reemplaza.

Detalle completo: **Ajustes** (engranaje en Inicio) > **Modo** > **Agrónomo** (el valor por defecto).

## 1. Niveles de datos y etiqueta de confianza

| Nivel | Lo que aportas | Lo que habilita en esta versión |
| --- | --- | --- |
| 0 | Un pin | Etiqueta "Nivel de datos 0 · confianza baja" |
| 1 | Contorno de la finca | Zonas de humedad del terreno, solo donde el motor las calculó con NASA SRTM |
| 2 | Lotes: dibujados, importados (GeoJSON) o escritos | Registros por lote; etiqueta "confianza media" |

El nivel 3 (notas de campo, inundaciones pasadas, umbrales calibrados por finca; SPEC 04) no está en esta versión.
Hay dos etiquetas: la de configuración (**Nivel de datos N · confianza …**) y, en el detalle del lote,
**Confianza n de 3**, que el motor liga al nivel de datos de la finca. Las alertas de una finca ingresada por el
usuario requieren una corrida del motor para su ubicación; mientras tanto Inicio muestra la finca demo sintética.

## 2. Importar lotes (GeoJSON)

1. **Ajustes** > **Configurar finca** > paso 3 **Agrega lotes exactos (opcional)** > **Importar GeoJSON**.
2. Acepta un FeatureCollection, un Feature o un Polygon/MultiPolygon; coordenadas WGS 84 longitud, latitud
   (EPSG:4326). Máximo 2 MB.
3. El nombre se lee de la propiedad `name`, `nombre`, `lot` o `lote`. Un MultiPolygon da un lote por parte,
   numerado "(1)", "(2)". Solo se usa el borde exterior de cada polígono.
4. Los elementos que no son polígonos se omiten: "Se importaron {n} lotes; se omitieron {skipped} elementos."
La importación KML y CSV (SPEC 04 y 18) no está en esta versión.

## 3. Leer factores e historial

El **detalle del lote** muestra el nivel, el **Índice W** con su barra, **Nivel desde** y **Dato de lluvia más
reciente**. **Por qué** lista cinco factores ordenados por **Parte de W**:
- **Lluvia aguas arriba**: lluvia IMERG Early de 72 h sobre la cuenca del Buenavista (GPM_3IMERGDE, NASA GES DISC).
- **Saturación del suelo**: índice de precipitación antecedente a partir del historial de lluvia (SPEC 09, método 5).
- **Humedad del terreno**: posición del índice topográfico de humedad del lote dentro de la finca, de SRTMGL1 a 30 m.
- **Lluvia local**: lluvia IMERG Early en la celda de la finca.
- **Balance hídrico**: lluvia de 7 días menos evapotranspiración del cultivo (FAO-56 ETo × Kc, datos NASA POWER).
Cada indicador es un percentil frente a días estrictamente anteriores; W es la suma ponderada.
**Hoy** (modo Agrónomo) muestra lluvia local, lluvia aguas arriba 24 h, humedad del suelo y balance hídrico 7 días.
La humedad del suelo satelital está pendiente en esta versión y se muestra **Sin datos**: Demenova no la rellena.
**Historial**: Lluvia, Humedad del suelo, Temperatura media, NDVI, con **1S / 1M / 3M**; cada gráfico lleva su
origen. El NDVI (Sentinel-2 L2A) solo tiene valores en celdas sin nubes. La comparación con años anteriores aún no
está en la instantánea. **Indicadores complementarios**: Clima para Sigatoka, marcado **Experimental**. No hay nivel
de estrés por frío. Una actualización llega al final del día UTC de los datos más las 4 h de latencia de IMERG Early;
las horas se muestran en hora de Ecuador (America/Guayaquil). Severo se activa solo tras dos actualizaciones que
coinciden.

## 4. Estrategias A, B, C

**Ver estrategias para este lote** abre tres tarjetas: **A Manejo actual**, **B Drenaje mejorado**,
**C Drenaje, cobertura viva y bioinsumos**. Cada una muestra puntajes borrador de 1 a 5 (beneficio para el suelo,
control del agua, costo, mano de obra; origen Estimado) y **Por qué, evidencia, vacíos y riesgos**. Costos y mano de
obra en dinero o jornales: **Sin estimar**. Evidencia citada: Turner y col. 2007 (el banano tolera como máximo 2 días
de encharcamiento), Johns 1994 y De la Cruz y col. 1994 (maní forrajero), Jefwa y col. 2010 (micorrizas); enlaces y
fechas de consulta en las tarjetas. Cada tarjeta lleva **No revisado aún por un agrónomo local** y el pie dice
"Demenova apoya el criterio del agrónomo; nunca lo reemplaza." Los controles de prioridad (SPEC 18) no están en esta
versión.

## 5. "¿Qué tan confiable es esto?"

En el detalle del lote, toca **¿Qué tan confiable es esto?** Todo viene de `verification.json`.
- **Solo conteos**: aciertos, omisiones y falsas alarmas frente a inundaciones documentadas en prensa en la cuenca de
  la finca. En el archivo de verificación de la reproducción 2026: 1 acierto, 0 omisiones, 4 falsas alarmas del
  1 ene al 13 nov 2026, contados por episodio Severo. Una falsa alarma significa que no hubo inundación en las
  noticias revisadas, no prueba que no la hubiera. No se afirma ninguna precisión.
- **Tiempo de aviso**: los lotes demo ya estaban en Severo por lluvias anteriores (episodio desde el 5 feb 2026). La
  lluvia de la inundación del 23 feb llega a W solo después de que se reportó el desborde: no hay tiempo de aviso
  propio de esa inundación.
- **Límite conocido**: los percentiles se comparan con todo el año, así que en la temporada de lluvias los días se
  mantienen altos por semanas. Se planean percentiles por temporada después del hackathon.
- **Sensibilidad**: cada uno de los 5 pesos se movió ±0,10 (10 corridas). En la reproducción 2026, qué lotes están en
  Severo y en qué días cambia en 10 de 10 corridas; en los días de la inundación (21–24 feb) los lotes 1 y 2 están
  en Severo en todas.
- El umbral de Severo (W ≥ 0,90) es una decisión de diseño tomada tras ver la reproducción; no está ajustado ni validado.

## 6. Límites de la ciencia

- Pocas inundaciones documentadas: conteos, no porcentajes (SPEC 09, método 14).
- El tiempo de viaje de Kirpich se usa muy fuera de su rango (cuencas de 1 a 112 acres; esta mide 254 km²); el
  desfase de 0 días sale del mismo evento usado para verificar.
- El escurrimiento por Número de Curva está pendiente (sin CN calibrado).
- El TWI depende de la resolución y el método del DEM, por eso los lotes se ordenan dentro de la finca; D8 maneja mal
  las zonas bajas planas.
- Las tablas FAO-56 suponen condiciones subhúmedas estándar. Los días se definen distinto (IMERG en UTC, POWER en hora local).
- Si falta W (hueco de POWER), el nivel se mantiene. Las nubes bloquean el NDVI óptico en el trópico.
- Los umbrales de Sigatoka vienen de otras regiones bananeras. La lluvia IMERG Early de octubre de 2026 está muy por
  encima de 2015–2025 y no está verificada su independencia del cambio de producto de marzo de 2026.

## 7. Exportar registros

**Ajustes** > **Registros** > **Exportar registros (CSV)**. El CSV mantiene las unidades SI guardadas (mm, °C,
fracciones) y el origen de cada valor. En esta versión cubre los días de la reproducción demo cargados en el equipo.
