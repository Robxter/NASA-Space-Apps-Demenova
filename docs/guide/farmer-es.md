# Demenova: guía para el productor

Demenova avisa cuando el agua puede encharcar o inundar los lotes de banano. Funciona en el teléfono, sin sensores.
Hecho con observaciones de la Tierra de la NASA.

> **Importante.** Lo que esta guía dice que hay que revisar es **orientación general, aún no revisada por un agrónomo
> local**. Son revisiones, no recetas: Demenova no recomienda productos ni dosis.
> Demenova apoya el criterio del agrónomo; nunca lo reemplaza.

## 1. Instalar la app

Demenova es una página web que se instala como una app. No necesita tienda de aplicaciones.

**Android (Chrome)**
1. Abre el enlace de Demenova en Chrome.
2. Toca el menú de tres puntos (⋮), arriba a la derecha.
3. Toca **Instalar app** o **Agregar a pantalla principal** (el nombre cambia según la versión de Chrome).
4. Confirma. El icono de Demenova aparece en tu pantalla.

**iPhone (Safari)**
1. Abre el enlace de Demenova en Safari.
2. Toca el botón **Compartir** (cuadro con flecha hacia arriba).
3. Toca **Agregar a pantalla de inicio** (o **Añadir a pantalla de inicio**).
4. Toca **Agregar**.

## 2. Poner la app a tu gusto

1. En **Inicio**, toca el engranaje (**Ajustes**), arriba a la derecha.
2. **Idioma**: Español o English.
3. **Unidades**: Métrico o Imperial.
4. **Modo**: elige **Productor**. La app empieza en modo Agrónomo, que muestra más números.

## 3. Tu finca, paso a paso

Cada paso se puede saltar y retomar. Lo que ingreses siempre reemplaza a las estimaciones.
Ve a **Ajustes** > **Configurar finca**.

1. **Ubica un pin** (nivel de datos 0). Escribe el **Nombre de la finca**. Toca **Poner pin en el mapa** y toca
   donde está tu finca, o toca **Usar mi ubicación**. Toca **Guardar pin**.
2. **Dibuja el contorno de la finca (opcional)** (nivel 1). Toca **Dibujar contorno**, toca las esquinas en orden
   (mínimo 3) y toca **Terminar forma**. Con el contorno, Demenova puede dividir la finca en zonas por humedad del terreno.
3. **Agrega lotes exactos (opcional)** (nivel 2). Toca **Dibujar lote**, o escribe el **Nombre del lote** y toca
   **Agregar lote escrito**. Área y edad de la planta son opcionales. Un lote escrito sin forma queda solo en este
   teléfono hasta que dibujes su forma.

Arriba verás una etiqueta como **Nivel de datos 0 · confianza baja**. Sube a media-baja con el contorno y a media
con los lotes.

**Lo que aún no hace esta versión:** las alertas de tu propia finca necesitan una corrida del motor para su ubicación.
Mientras tanto, **Inicio** muestra la finca demo sintética (marcada **Demo**).

Tu finca se guarda primero en el teléfono. Si borras los datos del navegador, se borran las fincas no sincronizadas.

## 4. Qué significa cada nivel y qué revisar

El nivel siempre se muestra con color **y** palabra. Estas revisiones vienen del archivo de acciones de Demenova
(modo Productor). Son **orientación general, aún no revisada por un agrónomo local**.

| Nivel | Qué revisar |
| --- | --- |
| Verde, **Normal** | "Todo normal. De vez en cuando, revisa que los canales de drenaje de tus lotes no estén tapados." |
| Amarillo, **Vigilancia** | "Puede venir agua. Hoy revisa que las salidas de drenaje de los lotes bajos no estén tapadas." |
| Naranja, **Aviso** | "Riesgo de encharcamiento. Hoy revisa los canales de drenaje de este lote y cada mañana mira si hay agua estancada. Evita entrar con maquinaria pesada en suelo saturado." |
| Rojo, **Severo** | "Inundación posible o en curso. Primero tu seguridad: no entres en agua que corre. Cuando sea seguro, mira si hay agua estancada en tus lotes y anota cuántos días se queda." |

La app muestra la revisión del nivel en la tarjeta **Qué revisar**: en el detalle de cada lote y, en **Inicio**, debajo
del aviso cuando un lote está en Aviso o Severo. La tarjeta lleva la marca de que aún no está revisada por un agrónomo
local. En modo Agrónomo el texto es más detallado.
Si ves **Desactualizado**, los datos son viejos: no confíes en el nivel hasta que se actualice.

**Dónde mirar en la app**
1. **Inicio**: si un lote está en Aviso o Severo, sale un aviso arriba. Tócalo para abrir el lote.
2. **Lotes por riesgo**: la lista empieza por el lote con más riesgo y dice el **Factor principal**.
3. **Alertas**: los **Cambios de nivel**, del más nuevo al más viejo.
4. **Mapa**: cada lote con su color y su palabra.

## 5. Correo cuando un lote llega a Severo

Demenova está hecho para enviar un correo cuando un lote pasa a **Severo**: uno por lote y por episodio, en español
y luego en inglés. **En esta versión aún no puedes escribir tu correo en la app.** La pantalla **Alertas** dice:
"Los ajustes de correo y Telegram llegan con el trabajo del backend."

## 6. Sin conexión y ahorro de datos

1. Abre la app una vez con conexión: guarda los datos en el teléfono.
2. Sin señal, la app abre igual y dice **Sin conexión, datos del …** con la fecha de esos datos.
3. Para gastar menos datos: **Ajustes** > **Almacenamiento** > **Ahorro de datos (7 días, sin imágenes)**.
   **Completo (90 días, imágenes)** guarda más historial e imágenes del mapa.

## 7. Registros y exportar a CSV

Demenova guarda los registros por ti.
1. **Ajustes** > **Registros**. Verás **Días guardados en este dispositivo**.
2. Toca **Exportar registros (CSV)**. Se descarga un archivo que abre Excel u Hojas de cálculo.
3. El CSV mantiene las unidades guardadas (mm, °C, fracciones) y el origen de cada valor.

En esta versión, los registros son los días de la reproducción de la finca demo sintética.
