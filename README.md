# Student Lead Discovery Agent — rama de desarrollo del orquestador

**Fecha de corte:** 2026-11-01. Prototipo con código, panel de Apps Script y pruebas Node. **Repositorio público**; datos personales y credenciales prohibidos.


## Auditoría de fuentes y acciones prioritarias (2026-11-01)

- [Inventario de las 77 fuentes activas y diagnóstico del embudo](docs/AUDITORIA_FUENTES_2026-11-01.md).
- [Issue #11: reparar Gmail, priorizar fuentes con pedidos abiertos y reconciliar métricas](https://github.com/metecondrie/student-lead-discovery-agent/issues/11).
- [Guía de inspección del Apps Script desplegado (HEAD, versión y comprobación local)](docs/VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).
- [Postmortem: 16 falsos completados y 0 candidatos en 77 fuentes](docs/POSTMORTEM_CORRIDA_77_2026-11-01.md).
 - [Auditoría de contactos realizados y doble mensaje (Gmail + Contactados)](docs/AUDITORIA_CONTACTOS_2026-11-01.md).


## Retomar sin perder contexto
1. [AGENTS.md](AGENTS.md) — normas para cualquier IA.
2. [Estado actual](docs/ESTADO_ACTUAL.md) — fotografía de GitHub, Gmail/Sheets y STAGING, límites de verificación.
3. [Estrategia de captación](docs/ESTRATEGIA_CAPTACION.md).
4. [Roadmap](docs/ROADMAP.md), [seguridad](SECURITY.md) y documentación técnica de esta rama.

**Rama técnica de referencia para continuar:** `fix/auditoria-criticos-20261101` ([PR #14](https://github.com/metecondrie/student-lead-discovery-agent/pull/14) contra `fix/gmail-diagnostico-y-piloto-20261101`, [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12)). La rama `feature/auditoria-descartes-manual` conserva funciones que **no** se integraron todavía. Consultar el SHA y el CI vigentes; no usar `main` como si tuviera el código.

## Estado de auditorías y seguridad (2026-11-01)
- [Comparación de dos auditorías externas y correcciones del PR #14](docs/AUDITORIAS_COMPARADAS_Y_CORRECCIONES_2026-11-01.md).
- **Bloqueante de despliegue:** revisar que el web app no sea accesible a terceros ejecutando como propietario. Ver [checklist](docs/VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).
- Motor legacy `runCycle`: **no reactivar** hasta igualar la protección anti doble contacto del orquestador. El fallback oculto YouTube y la simulación con consumo real se corrigieron solo en PR #14.

## Arquitectura general
`gas/Core.js` (normalización, filtros, deduplicación, clasificación), `gas/Main.js` (Gmail/Sheets, funciones auxiliares), `gas/Catalogo.js` (catálogo de fuentes), `gas/Orquestador.js` (corridas, cuotas, cola y continuación), `gas/PanelOrquestador.html` (interfaz), módulos de YouTube y `tests/`.

Conectores investigados/implementados en distinto grado: alertas Gmail, RSS públicos, YouTube API y Gemini; **239 fuentes del catálogo no equivalen a 239 fuentes operativas**. Instagram, TikTok y redes restringidas no son conectores de rastreo automático habilitados.

## Evidencia y límites
- Commits recientes de cuota/reintento HTTP 429, persistencia del cursor, recuperación de trabajos y protección de corridas pausadas.
- A 2026-11-01, el código de PR #12 tenía 159 pruebas simuladas verdes. PR #14 agrega regresiones: verificar **último HEAD y CI** en GitHub Actions. La batería de Node no demuestra funcionamiento real de Apps Script.
- En el último registro de la planilla STAGING consultado el 2026-11-01, la corrida de 77 fuentes figura `FINALIZADO` (482 elementos leídos, 350 clasificados, 6 solicitudes y 0 candidatos). **No se verificaron Script Properties ni triggers**; no reanudar ni reiniciar sin comprobarlo.
- Una sesión de despliegue STAGING reportó actualización a versión 2, pero no hay comprobación aquí de que el `/exec` operativo corresponda a este código de GitHub. No afirmar producción validada.
- Estado del motor antiguo: `SISTEMA_ACTIVO = FALSE` en Sheets al 2026-11-01.
- Se encontraron duplicados de un aviso Tusclases y falso positivo administrativo Superprof en el motor anterior; falta validar la corrección end-to-end.
- La regla de contacto previo está en [AGENTS.md](AGENTS.md): comprobar Gmail Enviados, confirmaciones recibidas y `Contactados` antes de sugerir un nuevo mensaje.

## Seguridad
Sin envío automático a terceros, sin publicación automatizada ni manipulación de credenciales. No subir exportaciones de Gmail/Sheets, listas de alumnos, información de menores ni datos privados. Validar cambios sobre copia/STAGING únicamente con permiso. Mantener `main` sin código no verificado hasta la auditoría de integración.

## Pruebas locales
`npm test` (comprobar dependencias según `package.json`). Los tests simulados no acreditan funcionamiento real de Gmail/Gemini/YouTube; comprobar permisos/cuotas y ensayos puntuales con autorización.
