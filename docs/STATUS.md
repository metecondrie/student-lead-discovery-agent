# STATUS — resumen ejecutivo del proyecto

**Última actualización documental: 2026-11-01.** Para la fotografía completa y trazable ver [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md), que prevalece sobre documentos históricos.

| Elemento | Estado confirmado o pendiente |
| --- | --- |
| Repositorio | **Público**; revisar privacidad antes de compartir información |
| `main` | Documentación; no código de orquestación actual |
| Rama con código candidato | `fix/auditoria-criticos-20261101` (PR #14 a PR #12; sin merge ni deploy) |
| Pruebas locales | 159 pruebas simuladas en PR #12; PR #14 agrega nuevos casos. Comprobar CI del último HEAD; no equivale a integración real. |
| Apps Script | Entorno STAGING y hojas de orquestación existentes; `/exec` y correspondencia de código **no revalidados** aquí |
| Hojas operativas/STAGING | `SISTEMA_ACTIVO=FALSE` en ambas configuraciones leídas el 2026-11-01 |
| Corrida de STAGING | Último estado observado en hoja: **FINALIZADO** (77 fuentes, 482 leídos, 350 clasificados, 6 solicitudes, 0 candidatos). **Script Properties y triggers no consultados**. |
| Captación Gmail/Tusclases | 10 contactos anteriores confirmados; no volver a recomendar como primer contacto |
| Calidad de oportunidades | 3 alertas = 1 anuncio (tracking); aviso de alta Superprof = falso positivo |
| YouTube/RSS/Gemini | Código/prototipos en ramas; permisos, cuotas y casos reales pendientes de revalidación |
| Instagram/TikTok/Facebook | Estrategia de contenido, **no** rastreo general automatizado de terceros |
| Contacto automático | **No autorizado** |

## Seguridad y ramas pendientes
- [PR #14](https://github.com/metecondrie/student-lead-discovery-agent/pull/14) contiene correcciones a las dos auditorías, sin despliegue. [Reporte](AUDITORIAS_COMPARADAS_Y_CORRECCIONES_2026-11-01.md).
- [PR #13](https://github.com/metecondrie/student-lead-discovery-agent/pull/13) investiga nuevas fuentes; no representa conectores autorizados ni funcionales.
- La rama `feature/auditoria-descartes-manual` tiene `OrqAuditoria` pendiente de integración consciente.
- No publicar/usar el web app si no está restringido a **solo el propietario**. La configuración «Execute as me / Anyone» es incompatible con este panel.

## Próximas acciones
1. Verificar HEAD, diferencias con STAGING, cuota/API, trigger y cola pausada/obsoleta sin modificar datos.
2. Corregir y probar deduplicación por ID de anuncio, falso positivo Superprof y cruce previo Gmail/Contactados.
3. Correr tests y auditoría de seguridad; probar en copia y pedir aprobación antes de despliegues.
4. Reanudar captación **manual** de alumnos nuevos verificados y medir reservas.
5. Recién después considerar fusionar a `main`.

Documentos de entrada: [AGENTS.md](../AGENTS.md), [estrategia](ESTRATEGIA_CAPTACION.md), [hoja de ruta](ROADMAP.md).
