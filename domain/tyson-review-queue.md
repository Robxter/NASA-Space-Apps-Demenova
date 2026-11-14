# Cola de revisión para Tyson

Actualizado: 14 nov 2026 (agronomist, T-017). Todo lo de abajo es **borrador**: nada queda aprobado hasta que
escribas "OK". Responde por número: **OK**, **cambio: ...** o **no sé**. Lo que no sepas queda vacío; no inventamos.
Archivos: `domain/thresholds.yaml`, `practices.yaml`, `strategies.yaml`, `actions.yaml`, `glossary.yaml`.

Ya confirmado por ti (no hace falta revisar): tolerancia 2 días de encharcamiento; raíces a 70 cm; Machala/El Oro.

## A. Umbrales

- **Q-01 Regla de daño.** Nivel freático a menos de 70 cm durante **más de 2 días** = daño (el daño empieza el
  día 3). ¿Correcto, o el daño empieza ya al cumplir 2 días?
- **Q-02 Sigatoka negra (Vigilancia).** 3 días seguidos con temperatura media > 23 °C, humedad relativa > 75 % y
  lluvia; con HR < 70 % las condiciones son desfavorables. Ojo: no pude leer los PDF citados (TEC Costa Rica,
  Atena), así que hoy figuran como "estimado". ¿Los apruebas o los cambias?
- **Q-03 Frío.** Temporada fresca en Machala: 1 jul – 13 nov, agosto el mes más frío (mínima media 21 °C,
  WeatherSpark). Productores de El Oro reportan noches de 20 °C que frenan el llenado de fruta (Ecuador Times,
  2010). ¿Usamos noches ≤ 20 °C como señal de frío?
- **Q-04 Unidades de calor.** Base 14 °C; suma semanal comparada con la climatología. ¿Cuánto por debajo de lo
  normal cuenta como estrés por frío?

## B. Estrategias (A actual · B drenaje · C drenaje + maní forrajero + bioinsumos con suelo no saturado)

- **Q-05 Textos.** ¿Están bien el qué, por qué, beneficios, vacíos y riesgos de A, B y C (`strategies.yaml`)?
- **Q-06 Puntajes 1–5** (5 = mejor: más beneficio al suelo, más control del agua, **menor** costo, **menos** mano
  de obra). A: suelo 2, agua 1, costo 5, mano de obra 5 · B: 3, 4, 3, 3 · C: 5, 4, 2, 2. ¿Confirmas la escala y
  los números?
- **Q-07 Costos y mano de obra.** Vacíos para drenaje, maní forrajero, micorrizas y drench de MM. ¿Tienes un
  rango en USD/ha y jornales/ha? Si no, quedan vacíos.
- **Q-08 Prácticas.** Beneficios y riesgos en borrador (p. ej. "aplicar bioinsumos en suelo saturado puede
  desperdiciar la aplicación"; "competencia del maní con plantas jóvenes": ¿es real?). Definición de MM:
  "microorganismos colectados de suelo de bosque": ¿así se preparan en las fincas?

## C. Acciones por nivel (5.5 agrónomo · 5.9 productor solo, sin personal)

- **Q-09** Revisa los 8 textos (`actions.yaml`). Versión productor:
  - Normal (verde): "Todo normal. Mantén limpios los drenajes."
  - Vigilancia (amarillo): "Puede venir agua. Hoy limpia las salidas de los drenajes de los lotes bajos."
  - Aviso (naranja): "Riesgo de encharcamiento. Abre y limpia los drenajes hoy y revisa cada mañana si hay agua
    estancada."
  - Severo (rojo): "Peligro de inundación. Primero la seguridad de las personas. Cuando sea seguro, abre los
    drenajes y anota cuántos días se queda el agua."
  - Agrónomo: más detalle (posponer fertilización y bioinsumos en suelo saturado, priorizar lotes bajos, evaluar
    cortar racimos cercanos a cosecha en Aviso, registrar daños por lote en Severo). ¿Algo que falte o sobre?

## D. Cuestionario 5.1–5.10 (hoy con valores por defecto, marcados "estimado")

- **Q-10 (5.1) Variedad:** Cavendish Williams. ¿Correcto en El Oro?
- **Q-11 (5.2) Densidad:** vacía. ¿Plantas/ha típicas?
- **Q-12 (5.3) Suelo:** franco. ¿Correcto para la zona de Pasaje/Machala?
- **Q-13 (5.4) Drenes:** profundidad y espaciamiento vacíos. ¿Valores típicos en El Oro (cm y m)?
- **Q-14 (5.6) Vocabulario:** ¿cómo se dice en campo? encharcamiento, lote, cuadrilla, drenaje, nivel freático,
  crecida, maní forrajero, micorrizas, MM, drench, Sigatoka negra, llenado de fruta, temporada fresca.
- **Q-15 (5.7) Canal:** WhatsApp. (La app envía email; Telegram es opcional.) ¿Confirmas?
- **Q-16 (5.10) Tiempo de revisión:** el mismo día. ¿Confirmas?

## E. Bioseguridad Fusarium R4T (5.8) — NO aparece en la app hasta que lo apruebes

- **Q-17 Borrador** (base: Agrocalidad citado por Primicias, 1 mar 2026: el hongo se disemina por el suelo y el
  agua puede llevarlo, sobre todo con inundaciones):
  > "Después de una inundación, el agua y el suelo arrastrado pueden llevar Fusarium R4T a otros lotes y fincas.
  > Evita mover suelo, herramientas, vehículos y calzado desde lotes inundados sin limpiarlos y desinfectarlos.
  > Si ves plantas con síntomas sospechosos, no las muevas y avisa a Agrocalidad."
  
  ¿Apruebas este texto exacto, lo cambias, o no mostramos nada?

## F. Finca demo y tareas de tu doc

- **Q-18 (T-064) Finca Demo El Oro:** los lotes son imaginarios (8 lotes de 5–7 ha cerca de Pasaje, río
  Buenavista). Cuando veas el mapa, redefine la disposición y los atributos (edad de planta, clase de drenaje,
  cobertura, análisis de suelo, nemátodos, fechas de bioinsumos). Hoy esos atributos quedan vacíos.
- **Q-19 Tareas 5–7:** evidencia de fincas sin registros; memoria de inundación de tu finca (fecha o mes, qué
  parte, cuántos días con agua); comparaciones por pares (AHP) de las cinco señales de alerta.
