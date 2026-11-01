# Student Lead Discovery Agent — rama de desarrollo del orquestador

**Fecha de corte:** 2026-11-01. Prototipo con código, panel de Apps Script y pruebas Node. **Repositorio público**; datos personales y credenciales prohibidos.

## Retomar sin perder contexto
1. [AGENTS.md](AGENTS.md) — normas para cualquier IA.
2. [Estado actual](docs/ESTADO_ACTUAL.md) — fotografía de GitHub, Gmail/Sheets y STAGING, límites de verificación.
3. [Estrategia de captación](docs/ESTRATEGIA_CAPTACION.md).
4. [Roadmap](docs/ROADMAP.md), [seguridad](SECURITY.md) y documentación técnica de esta rama.

**Rama:** `fix/orquestador-cuota-gmail-progreso-20261101`. Último commit de código documentado: `5d33e1510628a3ed0c2e2d87df38c6b30bcaa97f`. Revisar si hubo nuevos commits antes de intervenir; no usar `main` como si contuviera el código.

## Arquitectura general
`gas/Core.js` (normalización, filtros, deduplicación, clasificación), `gas/Main.js` (Gmail/Sheets, funciones auxiliares), `gas/Catalogo.js` (catálogo de fuentes), `gas/Orquestador.js` (corridas, cuotas, cola y continuación), `gas/PanelOrquestador.html` (interfaz), módulos de YouTube y `tests/`.

Conectores investigados/implementados en distinto grado: alertas Gmail, RSS públicos, YouTube API y Gemini; **239 fuentes del catálogo no equivalen a 239 fuentes operativas**. Instagram, TikTok y redes restringidas no son conectores de rastreo automático habilitados.

## Evidencia y límites
- Commits recientes de cuota/reintento HTTP 429, persistencia del cursor, recuperación de trabajos y protección de corridas pausadas.
- El README previo declaraba 90 pruebas locales simuladas aprobadas. No se volvieron a correr en la preparación de esta documentación: ejecutar `npm test` y comprobar CI en el commit actual.
- Existe una planilla STAGING con estados de orquestación. Una corrida antigua consta como `EJECUTANDO`, pero no se verificó en vivo su trigger; **no iniciar una corrida nueva sobre la existente sin inspección y autorización**.
- Una sesión de despliegue STAGING reportó actualización a versión 2, pero no hay comprobación aquí de que el `/exec` operativo corresponda a este código de GitHub. No afirmar producción validada.
- Estado del motor antiguo: `SISTEMA_ACTIVO = FALSE` en Sheets al 2026-11-01.
- Se encontraron duplicados de un aviso Tusclases y falso positivo administrativo Superprof en el motor anterior; falta validar la corrección end-to-end.
- La regla de contacto previo está en [AGENTS.md](AGENTS.md): comprobar Gmail Enviados, confirmaciones recibidas y `Contactados` antes de sugerir un nuevo mensaje.

## Seguridad
Sin envío automático a terceros, sin publicación automatizada ni manipulación de credenciales. No subir exportaciones de Gmail/Sheets, listas de alumnos, información de menores ni datos privados. Validar cambios sobre copia/STAGING únicamente con permiso. Mantener `main` sin código no verificado hasta la auditoría de integración.

## Pruebas locales
`npm test` (comprobar dependencias según `package.json`). Los tests simulados no acreditan funcionamiento real de Gmail/Gemini/YouTube; comprobar permisos/cuotas y ensayos puntuales con autorización.
