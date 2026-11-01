# AGENTS.md — normas de continuidad para cualquier IA

Última revisión documental: **2026-11-01**. Repositorio de trabajo sobre captación de alumnos de clases particulares de Matemática, Física, Química y Biología, 100 % online. Idioma de colaboración: español.

## Antes de intervenir (obligatorio)
1. Leer este archivo, `docs/ESTADO_ACTUAL.md`, `docs/ESTRATEGIA_CAPTACION.md`, `SECURITY.md` y luego el código y las pruebas de la rama correcta.
2. No suponer que `main` tiene la aplicación: `main` sirve como punto de entrada; la candidata de código más avanzada verificada a 2026-11-01 es `fix/orquestador-cuota-gmail-progreso-20261101` (HEAD de ese momento: `5d33e1510628a3ed0c2e2d87df38c6b30bcaa97f`). Consultar GitHub por commits posteriores antes de trabajar.
3. Separar hechos confirmados por GitHub, estado de hojas, estado real de Apps Script y declaraciones de documentación anterior. No afirmar que un despliegue funciona porque una prueba simulada pasó.
4. Informar primero el estado encontrado, proponer el cambio mínimo, ejecutar pruebas y documentar resultados. No fusionar ni desplegar versiones solo por la existencia de una rama más nueva.

## Seguridad y autorización
- **Nunca enviar correos, mensajes de Tusclases, WhatsApp, comentarios, DM ni publicaciones a terceros sin aprobación explícita y específica del usuario.** Redactar no implica enviar.
- No activar triggers, automatizaciones, motores, integraciones o despliegues de producción; no ejecutar `instalar()`, `clasp push`, cambios de OAuth, ni reemplazar hojas operativas sin autorización previa.
- Preservar el estado de las corridas pausadas o recuperables. No reiniciar ni sobrescribir una corrida por error.
- El repositorio es **público** a 2026-11-01. No subir archivos de Gmail, identificadores/contactos personales de alumnos, hoja CRM, enlaces privados, historiales de mensajería, datos de menores, secretos, tokens, credenciales, `.clasp.json` o valores de Script Properties. Para explicar errores, usar datos sintéticos y cantidades agregadas.
- Respetar los términos de cada plataforma: no scraping de espacios privados ni publicidad automatizada no solicitada.
- Para interactuar con sistemas conectados, usar sus accesos autorizados. Si no hay acceso, informar la limitación y pedir un extracto **redactado/anónimo**; nunca inventar el estado de un contacto.
- Separar STAGING de producción y verificar la identidad del recurso antes de cualquier escritura.

## Regla crítica: prevención de doble contacto
Antes de recomendar un alumno como *nuevo y contactable*, ejecutar esta comprobación, en ese orden:
1. Normalizar URL: extraer dominio, ruta e ID real del aviso; eliminar parámetros de tracking y enlaces envoltorio de email. Un anuncio repetido en tres alertas cuenta una sola vez.
2. Consultar la pestaña privada `Contactados` de la planilla autorizada y las oportunidades históricas, por ID de aviso/URL canónica, no solo por nombre.
3. Buscar en Gmail `Enviados` *y* en `Recibidos` los comprobantes de contacto de plataformas. Tusclases envía confirmaciones recibidas con el asunto «Mensaje desde tusclases.com.ar: ...» y texto «se ha enviado correctamente»: esos registros prueban contacto **aunque no haya copia en Enviados**.
4. Si la plataforma tiene mensajería propia, reconocer que Gmail puede ser incompleto. Estado `INCIERTO_VERIFICAR_EN_PLATAFORMA`, no `SIN_CONTACTO`.
5. Si hay cualquier evidencia fiable de envío previo, excluir de recomendaciones de primer contacto; nunca escribir por segunda vez automáticamente.
6. Un email «tu aviso está publicado» de Superprof no es un alumno, ni una respuesta ni una oportunidad.

Estados sugeridos: `NUEVO_VERIFICADO` solo si las fuentes de contacto necesarias fueron realmente consultadas; `CONTACTADO_CONFIRMADO`; `INCIERTO_VERIFICAR_EN_PLATAFORMA`; `DESCARTADO`. En el caso de acceso incompleto, preferir `INCIERTO`.

## Control de contactos (actualizado 2026-11-01)
- Antes de proponer un primer mensaje, consultar [auditoría de contactos y protocolo](docs/AUDITORIA_CONTACTOS_2026-11-01.md).
- En la rama del [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12), `CONTACTADO_CONFIRMADO` queda fuera del primer contacto, mientras `VERIFICAR_CONTACTO` debe mostrarse como **pendiente de comprobar mensajes internos**, nunca «libre para escribir».
- Los comprobantes de Tusclases recibidos en Gmail son evidencia de envío, incluso cuando falta la fila en `Contactados`. La ausencia de resultados en Gmail/CRM no prueba ausencia de conversaciones dentro de la plataforma.
- La vista de diagnóstico de contactos devuelve **solo cantidades agregadas**. No copiar correos, URLs individuales ni identificadores de estudiantes al repositorio público.

## Cómo trabajar sobre el código
- Clonar/abrir la rama candidata indicada arriba; comprobar luego `git status`, `git log`, diff y existencia de cambios locales antes de editar.
- Usar `npm test` para las pruebas Node. Las pruebas son simuladas: además se necesita ensayo controlado con cuota real, logs de APIs y muestras de datos anónimos.
- No alterar el esquema de Sheets sin copia y prueba de migración reversible. No asumir que los identificadores de correo o de fuente equivalen a identificadores de anuncio.
- Mantener cambios pequeños, rastreables y cubiertos con pruebas para deduplicación, filtros de avisos administrativos, recuperación de corridas, cuotas y contactos.
- Documentar, en `docs/ESTADO_ACTUAL.md`, el último commit validado, fecha, pruebas, despliegue y bloqueantes al finalizar cada sesión; no incorporar nombres ni datos personales.
- La prioridad es conseguir oportunidades auténticas y reservas, no maximizar publicaciones, notificaciones o fuentes teóricas.

## Forma de entrega a otra IA
Explicar en español: «qué está confirmado», «qué falta comprobar», «cuál es la siguiente acción segura» y «qué no toqué». La estrategia docente y comercial está en `docs/ESTRATEGIA_CAPTACION.md`. El contexto técnico y el estado conocido están en `docs/ESTADO_ACTUAL.md`.
