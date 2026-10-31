# Centro de control: orquestador de un clic (STAGING)

**Estado:** implementado en GitHub y probado con mocks, **todavía NO desplegado en Apps Script ni probado con APIs reales**.

## Objetivo

El usuario configura una vez las fuentes y luego pulsa **Iniciar búsqueda** en una interfaz web de Google Apps Script. El sistema recorre automáticamente todas las fuentes seleccionadas (v1: videos YouTube oficiales), clasifica con Gemini en lotes, reanuda la tarea con triggers temporales, guarda hallazgos y permite supervisar progreso e histórico por día. Nunca contacta alumnos automáticamente.

## Componentes

- `gas/Orquestador.js`: `doGet()`, `orqStatus()`, `orqStart(sourceIds,maxComments)`, `orqStop()`, `orqTick()`.
- `gas/PanelOrquestador.html`: UI web con seleccionador de videos, botón Play/Detener, progreso, candidatos, estadísticas por video y evolución por día.
- `tests/orquestador.test.js`: validación aislada de límites, cuotas, continuación, stop, sin contacto automático, idempotencia de lecturas.
- Tablas creadas en **el primer inicio explícito**: `OrqCorridas`, `OrqFuentes`, `OrqHallazgos`.
- No requiere que `SISTEMA_ACTIVO`, `YOUTUBE_ACTIVO` o `GEMINI_ACTIVO` estén habilitados; la acción explícita de Play autoriza exclusivamente la corrida nueva.
- No usa el fallback de `EDUCATIONAL_SOURCES`: solo IDs seleccionados explícitamente de la hoja `Fuentes`.

## Alcance de v1

- YouTube: hasta 10 videos por corrida, 1–20 comentarios recientes por video, 5 comentarios por lote Gemini.
- Una fuente por invocación. Cuando faltan fuentes, un trigger temporal `orqTick` vuelve a ejecutar el siguiente paso (intervalo mínimo aproximado 1 minuto, no puntual). Las tareas continúan aunque el navegador esté cerrado.
- Antes de comenzar, reserva capacidad máxima proyectada sobre los contadores locales de YouTube/Gemini; las cuotas reales del proveedor pueden ser más bajas.
- Comentarios repetidos entre corridas no se clasifican nuevamente.
- Las posibles oportunidades aparecen en el panel como **candidatos para revisión**, con enlaces al comentario. No se guardan automáticamente en `Oportunidades` ni se envían mensajes, correos o DMs.
- Los errores de un video se muestran por fuente; el rastreo continúa.
- **No están implementados:** Facebook Groups, comentarios de Reels de Instagram ajenos, TikTok, API comercial Reddit, foros RSS, alertas Gmail como conector del nuevo panel. No simular funcionamiento ni afirmar compatibilidad sin probar.
- El dashboard embebido en la web se alimenta de las tres nuevas pestañas y muestra estadística por fuente y día. El dashboard histórico de Sheets sigue disponible por separado.

## Despliegue único (no ejecutar automáticamente durante la instalación)

1. Antigravity debe hacer `clasp pull` y comparar hashes del STAGING antes de modificar nada.
2. Recuperar los **dos archivos nuevos** de `feature/orquestador-1click`: `gas/Orquestador.js` y `gas/PanelOrquestador.html`. Mantener HTML como archivo de tipo HTML (no `.gs`).
3. Incorporarlos a STAGING sin borrar ni modificar `Core.js`, `Main.js`, `Catalogo.js`, `PilotoYouTubeReal.js`, `PilotoYouTubeAmpliado.js`, `appsscript.json`.
4. Ejecutar `clasp push`, `clasp pull` de verificación y comparar los hashes.
5. Revisar permisos OAuth del manifiesto. **No cambiar los alcances a ciegas**: se requieren Sheets, UrlFetchApp, PropertiesService y ScriptApp para crear triggers temporales. Si hacen falta permisos adicionales, mostrar exactamente cuáles.
6. Desde Apps Script, una vez que el usuario apruebe, desplegar **nueva implementación -> aplicación web**, ejecutar **como propietario** y conceder acceso **solo al propietario**. No publicar como `anyone` ni `anyone with Google account`.
7. Guardar URL del web app en un acceso directo; a partir de ese momento, usar ese enlace y el botón `Iniciar búsqueda`, sin volver a invocar Antigravity por corrida.
8. Primer ensayo: seleccionar 1 video, máximo 5 comentarios, una sola corrida. Revisar `OrqHallazgos`/dashboard; luego pasar a 3 fuentes.

**Importante:** el editor de Apps Script usado aquí es de un proyecto **standalone**, no enlazado a la planilla. No intentar `SpreadsheetApp.getUi().showSidebar()` ni asignar un botón de Dibujo en Sheets para este script; por eso la UI es una **web app** con `doGet`.

## Seguridad

- Si `SHEET_ID` no apunta exactamente a STAGING, falla antes de llamar APIs.
- Verifica `SISTEMA_ACTIVO=FALSE` al iniciar y antes de cada video.
- Usa las claves existentes de Script Properties; nunca volcarlas a registros ni al HTML.
- No toca `Oportunidades`, `Fuentes`, `Config`, `_vistos`, `_cola_ia`, contactos, ni producción.
- Redacta emails/teléfonos de textos y neutraliza fórmulas para Sheets.
- El usuario aprueba cada eventual contacto; está fuera del orquestador v1.
- **Bloqueante antiguo aún pendiente**: el fallback inseguro de YouTube en el motor global `ingestYouTubeComments_` (#4). Por eso no habilitar los interruptores generales del motor.

## Próximos desarrollos

1. Validar web app con YouTube real (no solo mocks) y detener/reanudar.
2. Conector para RSS de foros verificados y alertas Gmail autorizadas.
3. Cola de trabajo más amplia (sin el límite de 10 videos) con control persistente por fuente, rate limiting y reintentos escalonados.
4. Ingreso manual de resultados aprobados al CRM, incluyendo respuesta y cobro, para medir conversión real.
5. Facebook/Instagram/TikTok solo después de identificar métodos de acceso oficiales o permitidos; no son una consecuencia automática de cambiar el motor.
6. Integrar métricas del orquestador al Dashboard general de Sheets (Issue #3).
