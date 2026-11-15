# Cola de revisión — para un futuro agrónomo local (Review queue — for a future local agronomist)

Actualizado: 15 nov 2026 (FIX2.md §5, D-025). Desde el 14 nov 2026 el equipo no tiene agrónomo. Todo lo que está en
`domain/` es **borrador revisado solo por agentes** (`reviewed_by: [agronomist-agent, scientist-reviewer]`,
`human_review: none`); la app lo muestra como "No revisado aún por un agrónomo local". Estas preguntas quedan
abiertas para un agrónomo local que algún día quiera validar Demenova. **Nada espera estas respuestas; no hay
plazos.** Lo que no se sabe queda vacío; no inventamos valores.

Archivos: `domain/thresholds.yaml`, `practices.yaml`, `strategies.yaml`, `actions.yaml`, `glossary.yaml`,
`flood_memories.yaml`. Fuente cerrada: `domain/agronomist-answers-archive.md` (tolerancia de 2 días de
encharcamiento, raíces a 70 cm, zona Machala/El Oro: `sourced`, "team agronomist, 14 Nov 2026").

## A. Thresholds / Umbrales

- **Q-01 Regla de daño.** Hoy: nivel freático a menos de 70 cm durante **más de 2 días** = daño (desde el día 3).
  ¿O el daño empieza al cumplir 2 días?
- **Q-02 Sigatoka negra (Vigilancia, experimental).** 3 días seguidos con temperatura media > 23 °C, humedad
  relativa > 75 % y lluvia; con HR < 70 % las condiciones son desfavorables. Los PDF citados (TEC Costa Rica, Atena)
  no se pudieron leer, así que los valores son "estimados". ¿Qué umbrales usaría en El Oro?
- **Q-03 Frío (experimental).** Temporada fresca en Machala 1 jul – 13 nov, agosto el mes más frío (mínima media
  21 °C, WeatherSpark). Un reporte de productores (Ecuador Times, 2010) habla de noches de 20 °C que frenan el llenado
  de fruta. ¿Sirven noches ≤ 20 °C como señal?
- **Q-04 Unidades de calor.** Base 14 °C sin fuente abierta; suma semanal frente a la climatología. ¿Qué base y qué
  diferencia cuentan como estrés por frío?

## B. Strategies / Estrategias (A actual · B drenaje · C drenaje + maní forrajero + bioinsumos)

- **Q-05 Textos.** ¿Son correctos el qué, por qué, beneficios, vacíos y riesgos de A, B y C?
- **Q-06 Puntajes 1–5** (borrador de Claude, nunca validado; 5 = mejor: más beneficio al suelo, más control del
  agua, menor costo, menos mano de obra). A: 2, 1, 5, 5 · B: 3, 4, 3, 3 · C: 5, 4, 2, 2. ¿Escala y números?
- **Q-07 Costos y mano de obra** (hoy "no estimado") de drenaje, maní forrajero, micorrizas y drench de MM en El
  Oro: ¿hay una fuente publicada (USD/ha, jornales/ha)?
- **Q-08 Prácticas.** Las fuentes abiertas sobre maní forrajero (Johns 1994; De la Cruz y col. 1994) y micorrizas
  (Jefwa y col. 2010) no son de El Oro. ¿Hay ensayos locales? ¿Cómo se preparan los MM en las fincas?

## C. Actions per level / Acciones por nivel (revisiones, no prescripciones)

- **Q-09** Los 8 textos de `actions.yaml` (modo productor solo, sin personal; modo agrónomo) son revisiones:
  canales de drenaje, agua estancada, días con agua, evitar maquinaria pesada en suelo saturado, seguridad primero.
  ¿Falta o sobra alguna revisión para Normal, Vigilancia, Aviso y Severo?

## D. Questionnaire 5.1–5.10 / Cuestionario (cerrado; valores por defecto `estimated`)

- **Q-10 (5.1)** Variedad: Cavendish Williams. **Q-11 (5.2)** Densidad de siembra: vacía. **Q-12 (5.3)** Suelo:
  franco. **Q-13 (5.4)** Profundidad y espaciamiento de drenes: vacíos.
- **Q-14 (5.6)** Vocabulario de campo: encharcamiento, lote, drenaje, inundación, nivel freático, crecida, maní
  forrajero, micorrizas, MM, drench, Sigatoka negra, llenado de fruta, temporada fresca, cuadrilla.
- **Q-15 (5.7)** Canal preferido: WhatsApp (la app envía email; Telegram opcional). **Q-16 (5.10)** Tiempo de
  revisión: el mismo día.

## E. Biosecurity / Bioseguridad Fusarium R4T (5.8)

- **Q-17** La app no da recomendaciones propias. Solo muestra una línea neutral: "Para Fusarium R4T, infórmate por
  los canales oficiales de Agrocalidad, la agencia fitosanitaria del Ecuador" (página oficial de Agrocalidad abierta
  el 15 nov 2026). ¿Basta así?

## F. Demo farm and floods / Finca demo e inundaciones

- **Q-18** La finca demo es sintética y final para v1 (8 lotes cerca de Pasaje, río Buenavista); sus atributos
  quedan vacíos. ¿Qué atributos serían plausibles en El Oro, con fuente?
- **Q-19** `flood_memories.yaml` solo tiene inundaciones documentadas en prensa (22 feb, 11 oct, 19 y 26 oct 2026).
  Si conoce inundaciones de fincas reales (fecha, lotes, días con agua), pueden agregarse como `observed`.
