// Spanish copy of the Welcome page, from docs/site/welcome-content.md (a7d9ba2). Alerts: Telegram Variant A and
// Roberto's email wording. CSV labels match app/src/i18n/es.ts (setup.csvTemplate, setup.importCsv).
import type { WelcomeContent } from './content';

const es: WelcomeContent = {
  lang: 'es',
  docTitle: 'Demenova: alertas de inundación para fincas bananeras de El Oro',
  tabs: { home: 'Inicio', instructions: 'Instrucciones', qa: 'Preguntas', nav: 'Secciones de bienvenida' },
  appAccess: 'Entrar a la app',
  languageLabel: 'Idioma',
  home: {
    title: 'Demenova',
    lead: 'Alertas de encharcamiento e inundación para fincas bananeras de la costa de El Oro, Ecuador. Sin sensores ni registros: basta un pin en el mapa para empezar.',
    credit: 'Hecho con observaciones de la Tierra de la NASA. Demenova es un proyecto independiente, sin aval de la NASA.',
    videoTitle: 'Demenova en 30 segundos',
    videoComing: 'Video próximamente',
    artLabel: 'Ilustración: satélites en órbita, lluvia que cae aguas arriba y agua que sube en un núcleo de suelo.',
    howTitle: 'De la órbita a la zona de raíces',
    how: [
      { title: 'Datos abiertos desde la órbita', body: 'Lluvia, clima, terreno y verdor de la NASA y de Copernicus Sentinel-2.' },
      { title: 'Un índice por lote', body: 'Cinco factores forman el índice de alerta W, de 0 a 1, cada día.' },
      { title: 'Un nivel para actuar', body: 'Normal, Vigilancia, Aviso o Severo, con color y palabra, y el porqué.' },
    ],
    whatTitle: 'Qué hace',
    what: [
      'Califica cada lote cada día: Normal, Vigilancia, Aviso o Severo, siempre con color y palabra.',
      'Muestra por qué: lluvia aguas arriba, saturación del suelo, humedad del terreno, lluvia local y balance hídrico de 7 días.',
      'Guarda un historial y sugiere tres estrategias de suelo y agua por lote.',
      'Muestra qué tan confiable es, con conteos, y lo que no sabe.',
    ],
    levelsLabel: 'Los cuatro niveles de alerta',
    demoNote:
      'La demo reproduce del 20 ene al 5 mar de 2026, alrededor de la inundación del río Buenavista del 22-23 feb (Pasaje, El Oro), en una finca demo sintética.',
    aboutTitle: 'Sobre el proyecto',
    challengeTitle: 'El reto',
    challenge: 'Hecho para el NASA Space Apps Challenge 2026, reto "Field Shift: Adapting Farms with NASA Data".',
    nameTitle: 'El nombre',
    name: 'Demenova = Deméter, la diosa griega de la cosecha, + nova, una estrella nueva.',
    whoTitle: 'Quién soy',
    who: 'Cristian Roberto Terán Paredes, dueño del producto y constructor de Demenova, hecho en solitario para NASA Space Apps 2026.',
  },
  instructions: {
    title: 'Cómo usar la app',
    lead: 'Cada pantalla, en el orden en que la encuentras. El día de la reproducción que eliges en Inicio manda en todas.',
    download: 'Descargar Instructions.pdf',
    steps: [
      {
        title: 'Inicio',
        body: 'Estado de la finca: el nivel más alto de hoy, los lotes por riesgo con su factor principal y el control de **Reproducción**. Mueve el día o toca **Reproducir**; todas las pantallas siguen ese día. Abre en el 23 feb 2026.',
      },
      {
        title: 'Mapa',
        body: 'Mapa de riesgo: lotes coloreados por nivel sobre imágenes NASA GIBS. Capas: Nivel de alerta, Humedad, Lluvia 24 h. Imágenes: Satélite (predeterminada), Calles, Color real o Relieve. Toca un lote y luego abre el lote.',
      },
      {
        title: 'Detalle del lote',
        body: 'Índice W, **Por qué** (cinco factores y su peso), valores de hoy, **Historial** (1W, 1M, 3M) y **Datos del lote**. Cada número lleva su origen; un dato que falta dice **Sin datos**.',
      },
      {
        title: '¿Qué tan confiable es esto?',
        body: 'Desde el lote: aciertos, fallos y falsas alarmas frente a inundaciones documentadas, la prueba de pesos, el tiempo de aviso y el límite conocido.',
      },
      {
        title: 'Estrategias',
        body: 'Desde el lote: tres opciones con por qué, evidencia, vacíos y riesgos. No revisado aún por un agrónomo local.',
      },
      {
        title: 'Alertas',
        body: 'Cambios de nivel, del más reciente al más antiguo, con la prueba por correo y el bot de Telegram (abajo).',
      },
      { title: 'Aprender', body: 'Definiciones cortas de las palabras de la app y de dónde vienen los datos.' },
      {
        title: 'Configurar finca (Ajustes)',
        body: 'Nivel 0: ubica un pin. Nivel 1: dibuja el contorno. Nivel 2: agrega lotes exactos dibujándolos, importando un archivo GeoJSON o escribiéndolos; en el paso 3 también puedes **Descargar plantilla CSV**, llenar una fila por lote e **Importar CSV**. Las alertas de tu finca necesitan una corrida del motor para su ubicación.',
      },
      {
        title: 'Ajustes',
        body: 'Idioma, Unidades (Métrico o Imperial, solo para mostrar), Modo (Productor o Agrónomo), Almacenamiento (Completo o Ahorro de datos), Tema (Sistema, Claro, Oscuro), **Exportar registros (CSV)** y **Conectar este dispositivo para sincronizar**.',
      },
    ],
    alertsTitle: 'Alertas por correo y Telegram',
    email:
      'Correo: en **Alertas por correo**, en la pantalla Alertas, escribe tu correo y toca **Enviarme una alerta Severa de prueba**. Durante la demo, la entrega funciona solo para la dirección del dueño del proyecto; la entrega a cualquier dirección es una actualización futura en desarrollo.',
    telegram:
      'Telegram: en **Alertas por Telegram**, en la pantalla Alertas, toca **Abrir @DemenovaBot** y envía /start para recibir las alertas Severas de la finca demo; /stop para dejar de recibirlas.',
    telegramLink: { label: 'Abrir @DemenovaBot en Telegram', href: 'https://t.me/DemenovaBot?start' },
  },
  qa: {
    title: 'Preguntas y detalles técnicos',
    questionsTitle: 'Preguntas',
    questions: [
      {
        q: '¿Predice inundaciones?',
        a: 'No. Califica el riesgo de encharcamiento e inundación con lluvia, suelo y terreno. En la reproducción de 2026, los lotes demo más húmedos (1 y 2) ya estaban en Severo por lluvias anteriores, y la lluvia de la inundación de febrero llegó al índice solo después de reportarse el desborde.',
      },
      {
        q: '¿La finca es real?',
        a: 'No. "Finca Demo El Oro" y sus 8 lotes son sintéticos y llevan la etiqueta Demo. La lluvia, el clima, el terreno y las imágenes debajo son datos reales.',
      },
      {
        q: '¿De dónde vienen los datos?',
        a: 'De datos abiertos globales: NASA GPM IMERG, NASA POWER, NASA SRTM, NASA GIBS, Copernicus Sentinel-2 y OpenStreetMap. Lista completa abajo.',
      },
      {
        q: '¿Funciona sin conexión?',
        a: 'Sí, con lo que ya cargó: se instala en la pantalla de inicio y muestra los datos guardados con la hora en que se guardaron.',
      },
      { q: '¿Es gratis?', a: 'La demo no pide cuenta ni pago.' },
      {
        q: '¿Y mis datos?',
        a: 'Tu finca se guarda primero en tu dispositivo. Sincronizar es opcional, no pide cuenta ni correo y usa una identidad privada del dispositivo. El registro de alertas no guarda correos, solo un hash.',
      },
      {
        q: '¿Qué tan confiable es?',
        a: 'En la cuenca de la finca en 2026: 1 acierto, 0 fallos, 4 falsas alarmas. Cuatro inundaciones documentadas son muy pocas para afirmar precisión, así que Demenova muestra solo conteos.',
      },
      {
        q: '¿Por qué un lote sigue en Severo semanas?',
        a: 'El índice compara cada día con todo el año, así que en la época lluviosa los días siguen altos. La comparación por temporada está planificada.',
      },
      {
        q: '¿Quién revisó la agronomía?',
        a: 'Aún ningún agrónomo local. Cada umbral y estrategia muestra su origen y estado de revisión para que un agrónomo local lo revise y ajuste. Demenova apoya el criterio del agrónomo; nunca lo reemplaza.',
      },
      {
        q: '¿Puedo usarla para mi finca?',
        a: 'Puedes agregar tu pin, contorno y lotes. Las alertas de una finca nueva necesitan una corrida del motor para su ubicación; solo se ha corrido el área de El Oro.',
      },
    ],
    techTitle: 'Detalles técnicos',
    tech: [
      {
        title: 'Datos usados',
        items: [
          'Lluvia: NASA GPM IMERG Early Run diario, GPM_3IMERGDE V07 (V07B hasta el 3 mar 2026, V07C después), NASA GES DISC.',
          'Clima para la evapotranspiración: NASA POWER Daily API v2.10.3; API horaria v2.10.4 para la ventana de la reproducción.',
          'Terreno y cuenca: NASA SRTM SRTMGL1 v003 (30 m), vía OpenTopography.',
          'Verdor (NDVI): Copernicus Sentinel-2 L2A, Element 84 Earth Search STAC v1.',
          'Imágenes del mapa: NASA GIBS (color real anual Landsat WELD con carreteras y nombres de lugares de referencia, color real MODIS Terra, relieve sombreado ASTER GDEM) y calles de OpenStreetMap (© colaboradores de OpenStreetMap).',
          'Río: colaboradores de OpenStreetMap (ODbL).',
          'Evaluados, no usados: SMAP SPL3SMP_E v006 (sin datos de calidad recomendada sobre la finca en la reproducción; D-019) y GLDAS Noah 2.1 (descargado para la reproducción, no lo usa el índice ni se muestra en la app).',
        ],
      },
      {
        title: 'Método en breve',
        body: 'Índice W (0 a 1) = pesos de diseño × cinco indicadores: lluvia de 72 h aguas arriba en la cuenca del río Buenavista (253,8 km²), saturación del suelo (índice de precipitación antecedente), humedad del terreno (TWI de SRTM), lluvia local y balance de 7 días de lluvia menos evapotranspiración del cultivo FAO-56. Lluvia y balance son percentiles frente a días anteriores. Niveles: Vigilancia 0,40, Aviso 0,60, Severo 0,90 (una decisión de diseño, no ajustada ni validada; D-029).',
      },
      {
        title: 'Tecnologías',
        body: 'PWA en React + TypeScript (Vite, Tailwind, Leaflet, uPlot); pipeline en Python (xarray, rasterio); Supabase Postgres con seguridad por fila; backend FastAPI en Render para el correo; GitHub Actions para CI.',
      },
      {
        title: 'Verificación (solo conteos)',
        body: 'Inundaciones documentadas en la cuenca de la finca, 1 ene a 13 nov 2026: 1 acierto, 0 fallos, 4 falsas alarmas. Una falsa alarma significa que no hubo inundación en las noticias revisadas, no que no haya ocurrido.',
      },
      {
        title: 'Límites',
        body: 'Finca demo sintética; pesos y umbrales de diseño; sin tiempo de aviso propio de la inundación de febrero de 2026; la prueba de pesos no es estable en 10 de 10 corridas, aunque los lotes 1 y 2 están en Severo en los días de la inundación en todas; los percentiles de todo el año mantienen altos los días de la época lluviosa; solo se ha corrido El Oro; la guía agronómica no ha sido revisada aún por un agrónomo local.',
      },
      {
        title: 'Cómo se usaron las herramientas de IA',
        body: 'El código, las pruebas y los documentos se produjeron con Claude Code (Anthropic), con agentes especializados bajo reglas escritas (ningún dato inventado; cada número con fuente o etiqueta) y revisiones independientes de ciencia y seguridad. Roberto eligió el problema, el lugar y el alcance y tomó las decisiones clave, incluidos el umbral Severo y la ventana de la reproducción. Registro: docs/SI_USE_LOG.md en el repositorio.',
      },
    ],
    links: [{ label: 'Código en GitHub', href: 'https://github.com/Robxter/NASA-Space-Apps-Demenova' }],
  },
};

export default es;
