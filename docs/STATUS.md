# STATUS — resumen ejecutivo del proyecto

**Última actualización documental: 2026-11-01.** Para la fotografía completa y trazable ver [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md), que prevalece sobre documentos históricos.

| Elemento | Estado confirmado o pendiente |
| --- | --- |
| Repositorio | **Público**; revisar privacidad antes de compartir información |
| `main` | Documentación; no código de orquestación actual |
| Rama con código candidato | `fix/orquestador-cuota-gmail-progreso-20261101` |
| Pruebas locales | El README de desarrollo informa 90 tests simulados; **pendiente repetir `npm test`** en HEAD vigente |
| Apps Script | Entorno STAGING y hojas de orquestación existentes; `/exec` y correspondencia de código **no revalidados** aquí |
| Hojas operativas/STAGING | `SISTEMA_ACTIVO=FALSE` en ambas configuraciones leídas el 2026-11-01 |
| Corrida de STAGING | Registro histórico `EJECUTANDO`: **estado real/trigger incierto**; preservar hasta verificación |
| Captación Gmail/Tusclases | 10 contactos anteriores confirmados; no volver a recomendar como primer contacto |
| Calidad de oportunidades | 3 alertas = 1 anuncio (tracking); aviso de alta Superprof = falso positivo |
| YouTube/RSS/Gemini | Código/prototipos en ramas; permisos, cuotas y casos reales pendientes de revalidación |
| Instagram/TikTok/Facebook | Estrategia de contenido, **no** rastreo general automatizado de terceros |
| Contacto automático | **No autorizado** |

## Próximas acciones
1. Verificar HEAD, diferencias con STAGING, cuota/API, trigger y cola pausada/obsoleta sin modificar datos.
2. Corregir y probar deduplicación por ID de anuncio, falso positivo Superprof y cruce previo Gmail/Contactados.
3. Correr tests y auditoría de seguridad; probar en copia y pedir aprobación antes de despliegues.
4. Reanudar captación **manual** de alumnos nuevos verificados y medir reservas.
5. Recién después considerar fusionar a `main`.

Documentos de entrada: [AGENTS.md](../AGENTS.md), [estrategia](ESTRATEGIA_CAPTACION.md), [hoja de ruta](ROADMAP.md).
