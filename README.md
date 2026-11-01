# Student Lead Discovery Agent — captación de alumnos

**Estado al 2026-11-01:** prototipo en desarrollo y auditoría. **Repositorio actualmente público**; no almacenar datos de alumnos ni credenciales. La rama `main` es el punto de entrada documental, **no** la copia ejecutable más reciente del sistema.


## Auditoría de fuentes y acciones prioritarias (2026-11-01)

- [Inventario de las 77 fuentes activas y diagnóstico del embudo](docs/AUDITORIA_FUENTES_2026-11-01.md).
- [Issue #11: reparar Gmail, priorizar fuentes con pedidos abiertos y reconciliar métricas](https://github.com/metecondrie/student-lead-discovery-agent/issues/11).
- [Guía de inspección del Apps Script desplegado (HEAD, versión y comprobación local)](docs/VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).
- [Postmortem: 16 falsos completados y 0 candidatos en 77 fuentes](docs/POSTMORTEM_CORRIDA_77_2026-11-01.md).


## ¿Otra IA debe continuar el proyecto?
Leer, en este orden:
1. [AGENTS.md](AGENTS.md) — reglas obligatorias y seguridad.
2. [Estado actual y transferencia entre IAs](docs/ESTADO_ACTUAL.md) — ramas, sistemas vivos verificados, problemas y siguiente trabajo.
3. [Estrategia de captación](docs/ESTRATEGIA_CAPTACION.md) — clases, canales, precios de referencia y prioridades.
4. [Seguridad](SECURITY.md), [hoja de ruta](docs/ROADMAP.md) y documentación técnica de **la rama de desarrollo**.

**Rama de código más avanzada verificada a esta fecha:** [`fix/orquestador-cuota-gmail-progreso-20261101`](https://github.com/metecondrie/student-lead-discovery-agent/tree/fix/orquestador-cuota-gmail-progreso-20261101). Su último commit de código auditado documentalmente es `5d33e1510628a3ed0c2e2d87df38c6b30bcaa97f`. Existen commits posteriores de documentación y podrían existir otros cambios futuros; comprobar GitHub antes de empezar. El código de Apps Script, panel y pruebas Node está en esa rama, no en `main`.

## Para qué sirve
Busca solicitudes explícitas y pertinentes de clases particulares de Matemática, Física, Química y Biología (secundaria, ingresos y universidad), prioritariamente **100 % online**. Propone oportunidades para revisión **humana**; **no contacta automáticamente estudiantes**.

Arquitectura de los prototipos: fuentes Gmail/RSS/YouTube autorizadas → normalización, deduplicación y clasificación → oportunidades en Sheets y avisos privados → evaluación y contacto manual con aprobación. No confundir **239 fuentes catalogadas** con conectores activos o validados.

## Qué se sabe y qué falta
- Existen hojas operativas y un entorno STAGING de Google Sheets. En la revisión, el interruptor del motor antiguo estaba en `FALSE`. Ver [estado actual](docs/ESTADO_ACTUAL.md).
- La rama candidata contiene correcciones recientes de orquestador y pruebas; su documentación de 90 tests aprobados corresponde a pruebas simuladas y **no se reejecutó en esta revisión**.
- Siguen pendientes la comprobación del código realmente desplegado en Apps Script, el estado real de una corrida antigua y la auditoría de credenciales/cuotas.
- **Hallazgos críticos:** el mismo aviso de Tusclases llegó tres veces por tracking; una confirmación administrativa de Superprof fue clasificada como alumno. Además, hay contactos previos que deben excluirse **antes** de sugerir mensajes.
- Para reconstruir el estado de contactos, buscar tanto Gmail Enviados como confirmaciones recibidas de la plataforma y la pestaña privada `Contactados`. Las conversaciones internas de plataformas pueden no estar en Gmail.

## Probar el código, sin operar sistemas vivos
Abrir la rama de desarrollo, revisar cambios y ejecutar `npm test` localmente. **No** ejecutar `instalar()`, modificar OAuth, `clasp push`, reanudar corridas, activar disparadores o enviar mensajes sin aprobación específica del propietario. Los tests simulados no sustituyen un piloto real supervisado.

## Instrucción para transferir el proyecto
> Leé `AGENTS.md`, `docs/ESTADO_ACTUAL.md` y `docs/ESTRATEGIA_CAPTACION.md` en `metecondrie/student-lead-discovery-agent`. Localizá el HEAD actual de `fix/orquestador-cuota-gmail-progreso-20261101` y comprobá si existe otra rama más nueva. Revisá y probá el código sin desplegar ni enviar nada. Primero decime qué está confirmado, qué falta y qué tarea segura sigue. Si necesitás datos de Gmail, Sheets o Apps Script, pedí acceso autorizado: no los supongas.

**Nota:** la documentación histórica puede contener afirmaciones ya superadas. El [estado fechado](docs/ESTADO_ACTUAL.md) y la evidencia viva prevalecen.
