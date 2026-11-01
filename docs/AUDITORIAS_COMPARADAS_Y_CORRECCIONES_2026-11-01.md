# Comparación de dos auditorías externas — 2026-11-01

**Alcance:** auditoría de código y documentación sobre la rama `fix/gmail-diagnostico-y-piloto-20261101` @ `88f44c2`, realizada por dos agentes externos. Comparación posterior con los archivos de GitHub y GitHub Actions; modificaciones propuestas en [PR #14](https://github.com/metecondrie/student-lead-discovery-agent/pull/14) contra [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12). **No desplegado.**

## Conclusiones verificadas

1. **Fail-open al fallar Gemini (ALTO, confirmado):** RSS/Gmail fabricaban `destinatario=pedido_abierto`, `contactabilidad=contacto_ofrecido_voluntariamente` / `canal_publico_permitido` y `confianza=0.7–0.9` si `generateContent` daba error no-cuota. Esto atribuye permiso de contacto no comprobado y falsea métricas.
2. **Parser permisivo (ALTO, confirmado):** un enum desconocido podía transformarse automáticamente en `pedido_abierto` y `canal_publico_permitido`, incluso si el modelo marcaba oportunidad comercial positiva.
3. **Dos motores YouTube, control ambiguo (ALTO, confirmado):** el modo legacy recuperaba `EDUCATIONAL_SOURCES` si no había ninguna fila activa en `Fuentes`, contradiciendo el apagado manual del catálogo; además simulación llamaba a la API real.
4. **PESOS JSON vs objeto (MEDIO, confirmado):** el evaluador leía `cfg.PESOS` como string en Sheets; las operaciones aritméticas podían producir `NaN`. No todo `NO` era falta de oportunidad.
5. **Filtro RSS incompleto (ALTO para RSS, confirmado):** tildes sin normalizar y ausencia de fecha tratada como actual; la rama separada `feature/auditoria-descartes-manual` ya tenía NFD y trazas de descartes que no estaban presentes en PR #12.
6. **GitHub Actions duplicado (confirmado):** el workflow ejecutaba push Y pull_request por commit en ramas `fix/**`; había 19 notificaciones de fallos en Gmail correspondientes a pruebas de desarrollo del 01/11, que en GitHub se reproducían en pares. El HEAD de PR #12 finalizó `success`; los correos previos no implican fallo de Node.js en la PC.
7. **Seguridad de despliegue (BLOQUEANTE, no verificada):** el panel `doGet` y funciones públicas carecen de un mecanismo completo de autorización del llamador. El control efectivo depende, como mínimo, del acceso al web app en Apps Script. **No verificado en sesión.**
8. **Gestión de ramas (BLOQUEANTE organizativo):** `main` es entrada documental; PR #12 concentra programa corregido, `feature/auditoria-descartes-manual` agrega auditoría de descartes incompatible sin resolución de merge; PR #13 reúne investigaciones de fuentes. No fusionar a `main` sin integración y validación.
9. **Fuentes comerciales (NO RESUELTO):** el sistema no tiene un conector autorizado a tablones públicos de pedidos de estudiantes, y la corrida de 77 fuentes dejó 0 candidatos. El catálogo tiene 239 entradas, no 239 fuentes eficaces. El PR #13 es investigación, no software desplegado.

## Cambios en PR #14 — código y pruebas simuladas

| Área | Acción | Validación |
|---|---|---|
| Workflow CI | Ejecutar tests por PR en ramas de trabajo, por push solo en main; `concurrency.cancel-in-progress` | Inspección del YAML y de los eventos GitHub Actions nuevos |
| Error Gemini | Se elimina fallback con veredictos inventados; `ERROR_GEMINI` / `ERROR_MODELO` explícito, conserva estado de cola en ERROR | Nuevas pruebas negativas con HTTP 500, cero candidatos y cero filas inventadas |
| Regla comercial | `orqIsCommercialCandidate_` exige las 5 condiciones, incluida confianza >= 0.7, en RSS/Gmail/YouTube | Suite de integración y regresión |
| Enums | Valor desconocido -> ambiguo / no_verificada, jamás oportunidad positiva por suposición | Test con entradas manipuladas |
| Fuentes legacy | `Fuentes` con todas las entradas desactivadas produce 0 consultas YouTube; sin fallback embebido | Tests con fuentes explícitamente activadas y caso de apagado |
| PESOS | Se parsea JSON de Config, se aplican valores por defecto controlados, se evita `NaN` | Test de equivalencia objeto / JSON / JSON inválido |
| RSS | Normalización Unicode NFD, keywords ampliadas y fechas inválidas no contadas como actuales | Test con Química acentuada, fecha ausente y publicación antigua |
| Simulación | Sin solicitudes YouTube `UrlFetchApp` al activar `probarSinEnviar()` | Test de ausencia de API real |

**No confundir pruebas Node con integración real de Apps Script.** Antes de desplegar, confirmar modelo Gemini realmente disponible con la cuenta autorizada, HEAD y versión de despliegue, seguridad de web app, triggers, cuota y estado de corrida.

## Hallazgos pendientes que NO conviene mezclar en este PR

- Fusionar/cherry-pick controlado de `OrqAuditoria` con tests, sin sobrescribir correcciones de Gmail/cola de PR #12.
- Normalizar/migrar las 15 URLs YouTube inservibles y quitar la documentación de API del catálogo. De todos modos YouTube no es el motor comercial prioritario.
- Validar permisos de acceso a la web app (despliegue **SOLO YO**), y diseñar guardas de autorización verdaderas: **`Session.getEffectiveUser()` NO identifica necesariamente al visitante** si se ejecuta como propietario. No presentar esa función como seguridad completa.
- Test de locks concurrentes y mocks Gmail basados en operadores reales.
- Persistir paginación de YouTube, corregir estados y cuotas del 429 diario, parametrizar batch/lookback.
- Control de doble contacto simétrico: mantener el motor legacy apagado y no reactivarlo hasta incorporar comprobantes Gmail y mensajería interna a su lógica.
- Diseñar flujo de CRM explícitamente humano: aprobado → contactado → respuesta → reserva → pago. No registrar `Contactados` únicamente por aprobar.
- Reconciliar snapshots históricos de 77 fuentes y corregir enlaces/SHAs viejos en documentación general.
- Revisar y minimizar permisos OAuth; no ampliar scopes ni publicar IDs/tokens.

## Email de GitHub: explicación y solución

Al editar la rama técnica, GitHub disparaba dos ejecuciones del workflow `Node.js regression tests`: evento `push` y evento `pull_request`. En la sesión se encontraron **19 correos de error** de GitHub correspondientes a revisiones sucesivas. Para el PR #14 se conservó solo el evento de PR en ramas de trabajo; se cancelan corridas viejas solapadas. El proyecto **no ejecuta Node.js en la computadora** por recibir estas notificaciones. No se borraron ni archivaron correos y no se alteraron preferencias del usuario.

**Límite:** esta mejora está solo en la rama PR #14; PR #12 no hereda la nueva configuración hasta una fusión aprobada. GitHub puede continuar notificando fallos auténticos.

## Próximo control antes de usar el bot

1. Confirmar tests verdes en último SHA de PR #14 y revisar diff.
2. Resolver integración de PR #12, PR #14 y rama de descartes sin sobrescribir funciones.
3. Inspeccionar Apps Script STAGING de solo lectura con `clasp`, y revisar `Who has access` / `Execute as`. **No permitir "Anyone" ejecutando como propietario.**
4. Validar `SISTEMA_ACTIVO=FALSE`, trigger real, cola y credenciales antes de cualquier piloto.
5. Fuentes: usar alertas oficiales y revisión manual de pedidos abiertos antes de invertir cuota en un conector no autorizado.

**Política:** no tocar sistemas vivos, no enviar mensajes, no comprar API, no agregar permisos, no merge automático.
