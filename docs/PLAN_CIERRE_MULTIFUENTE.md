> **AVISO 2026-11-01: documento histórico.** La fuente de verdad para reanudar el proyecto es [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Verificar despliegue y corridas en vivo; no ejecutar instrucciones de instalación sin aprobación. Se retiraron identificadores de STAGING del texto público; pueden persistir referencias en código y en el historial.

# Plan de cierre: Buscador autónomo multifuente de alumnos

**Actualizado:** 2026-10-30. **Estado:** Arquitectura unificada e implementada en rama `feature/orquestador-multifuente`.

## 1. Resultado Alcanzado

El sistema opera mediante una **aplicación web privada en Google Apps Script** con un único botón principal: **«▶ Buscar alumnos»**.
No requiere dar nuevas instrucciones a Antigravity para cada corrida de búsqueda.

### Principales capacidades operativas:
1. **Un solo botón de activación:** Inicia el recorrido automático sobre todas las fuentes operativas habilitadas del catálogo.
2. **Cola persistente en Google Sheets (`OrqCola`):** Supera el límite de 10 videos y la restricción de 9 KB de `PropertiesService`. Cada fuente es un trabajo encolado con estado, reintentos y trazabilidad.
3. **Conectores reales multicanal:**
   - **YouTube Canales (`youtube_canales`):** Descubrimiento de comentarios recientes a nivel de canal completo mediante `allThreadsRelatedToChannelId`. Filtro estricto por antigüedad del **comentario** (14 días), no del video. Permalinks directos (`&lc=...`).
   - **Foros RSS/Atom (`rss_foros`):** Consulta a feeds públicos autorizados (ej. UTNianos RSS `https://www.utnianos.com.ar/foro/syndication.php`). Detección de pedidos de clases y preparación de finales.
   - **Gmail Alertas (`gmail_alertas`):** Reutilización de alertas docentes en correo (Tusclases, Superprof, Google Alerts).
4. **Clasificador Gemini Flash-Lite con 4 dimensiones:** Evalúa `es_solicitud_clases`, `destinatario`, `contactabilidad` y `oportunidad_comercial_alejo`. Anula oportunidades dirigidas al creador o ambiguas.
5. **Autonomía y resiliencia:** Ejecución paso a paso mediante triggers temporales (`orqTick`). El proceso continúa de fondo aunque el usuario cierre el navegador.
6. **Aislamiento de errores:** El fallo o indisponibilidad de una fuente (ej. HTTP 503 en YouTube) no bloquea la consulta de los foros ni de Gmail.
7. **Control y Supervisión:** Botón de detención segura (`⏹ Detener`), métricas en vivo, historial diario y tabla de candidatos calificados para revisión humana.
8. **Seguridad y CGU:** Cero mensajes o correos enviados a potenciales alumnos.

---

## 2. Reconciliación del Catálogo Central (239 Entradas)

El catálogo maestro consolidado en `gas/Catalogo.js` (`MASTER_CATALOG_SOURCES`) cuenta con 239 entradas clasificadas según viabilidad técnica y normativa:

| Categoría | Fuentes | Conector | Disponibilidad | Descripción |
|---|---|---|---|---|
| **YouTube** | 54 | `youtube_canales` | `DISPONIBLE` | Canales y creadores educativos con API oficial v3. |
| **Alertas Gmail** | 23 | `gmail_alertas` | `DISPONIBLE` | Tusclases, Superprof y Google Alerts vía Gmail del usuario. |
| **Foros RSS** | 1 | `rss_foros` | `DISPONIBLE` | UTNianos y feeds RSS universitarios autorizados. |
| **No automatizables** | 131 | `ninguno` | `NO_AUTOMATIZABLE` | Facebook Groups, Instagram Reels, TikTok, Discord, Telegram, WhatsApp. Prohibido scraping/bots por CGU; sin API pública de comentarios ajenos. |
| **Requieren Config** | 30 | `ninguno` | `REQUIERE_CONFIG` | Comunidades de Reddit que requieren registro de App OAuth oficial. |
| **Total** | **239** | — | — | **Catálogo maestro preservado al 100%** |

---

## 3. Guía de Instalación del Panel Privado en STAGING

### Requisitos previos:
- Script ID de STAGING: `CONSULTAR_ENTORNO_PRIVADO`
- Planilla STAGING (`SHEET_ID`): `CONSULTAR_ENTORNO_PRIVADO`
- `Script Properties` configuradas: `SHEET_ID`, `YOUTUBE_API_KEY`, `GEMINI_API_KEY`.
- Banderas en hoja `Config`: `SISTEMA_ACTIVO = FALSE` (evita la activación del motor desatendido antiguo).

### Pasos de despliegue:
1. **Sincronizar archivos a STAGING con clasp:**
   - `gas/appsscript.json`
   - `gas/Catalogo.js`
   - `gas/Core.js`
   - `gas/Main.js`
   - `gas/Orquestador.js`
   - `gas/PanelOrquestador.html`
   - `gas/YouTubeCanales.js`
   - `gas/PilotoYouTubeReal.js`
   - `gas/PilotoYouTubeAmpliado.js`
2. **Implementar Aplicación Web (Web App):**
   - En el editor de Apps Script, seleccionar **Implementar** > **Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo (tu cuenta de Google)**.
   - Quién tiene acceso: **Solo yo (acceso privado restringido)**.
   - Copiar la URL generada (`https://script.google.com/macros/s/.../exec`).
3. **Uso operativo:**
   - Abrir la URL en el navegador.
   - Pulsar **«▶ Buscar alumnos»**.
   - El orquestador ejecuta el primer paso en tiempo real y programa triggers temporales para procesar las siguientes fuentes sin requerir más interacción con Antigravity ni mantener el navegador abierto.
