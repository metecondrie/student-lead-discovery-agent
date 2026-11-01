# ESTADO_ACTUAL — punto de recuperación entre IAs

**Corte verificable de esta fotografía: 2026-11-01.** Este documento es un resumen para retomar el proyecto, **no** una verificación automática permanente. Actualizarlo tras cada cambio importante.

## Novedad técnica posterior — 2026-11-01

- **Diagnóstico de fuentes:** [auditoría e inventario de 77 fuentes](AUDITORIA_FUENTES_2026-11-01.md); 0 candidatos y fallos concretos en Gmail, resolución de canales y métricas.
- **Trabajo en curso:** [pull request borrador #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12), rama `fix/gmail-diagnostico-y-piloto-20261101` contra `fix/orquestador-cuota-gmail-progreso-20261101`. Implementa validación/rehidratación defensiva de GmailThread, tres tests y CI para ramas `fix/**`.
- **CI:** GitHub Actions pasó para el HEAD `d4de518a185d18f822d27070d7b3dd36f65a7369` (push y PR), pero **no certifica el error real en Apps Script**.
- **Piloto comercial propuesto:** [cuatro fuentes automáticas y vías de captación manual](https://github.com/metecondrie/student-lead-discovery-agent/blob/fix/gmail-diagnostico-y-piloto-20261101/docs/PILOTO_COMERCIAL_2026-11-01.md). No se modificaron fuentes ni triggers de STAGING y **no se desplegó el PR**.
- **Siguiente paso imprescindible:** identificar la versión real del despliegue, examinar la corrida sin sobrescribirla y reproducir `th.getMessages is not a function`; verificar que la corrección resuelva la causa antes de fusionar o desplegar.

## Actualización técnica — causas raíz y herramientas de diagnóstico (2026-11-01)

- **Causas históricas verificadas en código:** `feature/orquestador-multifuente` persistía objetos `GmailThread` en `run._gmailCache` (pierden `getMessages()` tras JSON) y etiquetaba `COMPLETADO` incondicionalmente al volver de conectores que registraban errores. **No está verificado que esa rama fuera la versión ejecutada en STAGING**.
- **Diagnóstico agregado seguro:** `orqDiagnosticoSoloLectura()` en el PR; muestra discrepancias entre cola, resultados, resumen, `ORQ_RUN` y recuento de triggers, sin ejecutar conectores ni mostrar datos de estudiantes.
- **Auditoría offline:** `tools/auditar-deploy-local.cjs` compara patrones y hashes SHA-256 del archivo Apps Script clonado o de la respuesta privada de `projects.getContent(versionNumber=N)`, con tests. Ver [guía de verificación](VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).
- **Deduplicación real:** Gmail usa ID canónico del anuncio Tusclases y un índice local para no procesar dos correos con diferentes enlaces de seguimiento como dos leads; pruebas con mismo aviso, distinto aviso y enlace genérico.
- **CI de PR:** pruebas de regresión automáticas aprobadas en commit `f25c1501907c05a9be11c108adf3b3158f0cd7d6` (posteriores a las pruebas de métricas, Gmail y diagnóstico). CI no equivale a desplegado.

## 1. Dónde está cada cosa
- **GitHub:** repositorio `metecondrie/student-lead-discovery-agent`, **público** al momento de la verificación. El README anterior de `main` decía «privado»; esa frase era incorrecta.
- **`main`:** solo documentación y configuración de ejemplo, **no** el código operativo del orquestador.
- **Rama candidata para desarrollo:** `fix/orquestador-cuota-gmail-progreso-20261101`, SHA revisado `5d33e1510628a3ed0c2e2d87df38c6b30bcaa97f`. En la revisión estaba **12 commits por delante y 0 por detrás** de `feature/orquestador-multifuente`.
- **Rama anterior:** `feature/orquestador-multifuente`. También existen ramas separadas de YouTube, briefing, auditorías y el orquestador de un clic. No mezclar versiones automáticamente.
- **Código en rama candidata:** `gas/Core.js`, `gas/Main.js`, `gas/Orquestador.js`, `gas/Catalogo.js`, panel HTML, módulos YouTube, manifiesto de Apps Script, pruebas Node y GitHub Actions.
- **Planilla operativa de captación:** Google Sheets con pestañas `Oportunidades`, `Contactados`, `Config`, `Ingresos`, `Consultas`, `Ejecuciones`, `Log` y `_vistos`. Identificarla mediante conexión autorizada, no publicar su ID ni exportaciones.
- **STAGING:** existe una planilla separada, con `OrqCorridas`, `OrqFuentes`, `OrqHallazgos`, `OrqCola` y otras pestañas de prueba. Verificar la ruta y los IDs directamente mediante acceso autorizado antes de operar.

## 2. Evidencia observada en sistemas (no extrapolar)
- En la planilla operativa, `Config/SISTEMA_ACTIVO = FALSE` y `MODO_B_AUTOENVIO = FALSE` al 2026-11-01. Última ejecución del motor antiguo visible: 2026-10-30 (22 emails procesados, 9 ítems, 4 nuevos, 5 descartes, 0 respuestas en esa fila).
- En la planilla STAGING, `Config/SISTEMA_ACTIVO = FALSE` en la lectura del 2026-11-01. Las dos primeras corridas registradas figuran `FINALIZADO`; otra corrida iniciada el 30/10 figura `EJECUTANDO`, con progreso parcial y errores. **Ese valor de celda no prueba que un trigger esté ejecutándose hoy**: comprobar estado real, edad del cursor y recuperación antes de reanudar o iniciar una nueva.
- Hay reportes de un despliegue STAGING de web app actualizado a versión 2 durante 2026-11-01, pero **en esta auditoría no se comprobó el estado HTTP /exec, ni se cotejó el código desplegado con el HEAD de GitHub**. No dar por validado el entorno basándose en documentación histórica.
- En `fix/...` se registran parches del 2026-11-01 para HTTP 429, cuotas RPM/TPM/RPD, cursores de lotes parciales, recuperación de `EN_PROCESO` obsoletos y protección contra sobrescribir corridas pausadas. La presencia de esos commits **no** demuestra que estén desplegados ni que su comportamiento sea correcto en producción.
- El README de la rama declara 90 pruebas simuladas aprobadas. **No se volvió a ejecutar `npm test` en esta revisión**; hacerlas correr en la copia actual.

## 3. Auditoría reciente de candidatos: evitar trabajo repetido
- Revisión manual del 2026-11-01 de Gmail y `Contactados`: **10 comprobantes** de contactos realizados desde Tusclases el 2026-10-28. Se excluyen del primer contacto; los nombres y enlaces se consultan **solo en las fuentes privadas**.
- Un único aviso de Matemática universitaria generó **3 alertas/filas** diferentes por URL de seguimiento. Normalizar usando el ID de aviso; son **1 oportunidad y 2 duplicados**, no tres alumnos.
- Un mensaje administrativo de Superprof («tu aviso está en línea») fue clasificado erróneamente como posible alumno. Falso positivo.
- La mensajería interna de Tusclases puede no reflejarse íntegramente en Gmail. Ausencia de correo = **contacto no confirmado**, no prueba de «nunca contactado».
- No hubo nuevos envíos a potenciales alumnos durante esta auditoría.

## 4. Arquitectura y cobertura: lo que sí/no significa
- Catálogo con **239 fuentes candidatas**: no significa 239 conectores activos, accesibles ni validados.
- Prototipos de Gmail/alertas, RSS de foros, YouTube y clasificación Gemini; revisar qué conector se usa efectivamente en **cada motor** (motor antiguo y orquestador). No confundir el catálogo con fuentes operativas.
- Instagram, TikTok, Facebook, WhatsApp, Telegram y espacios cerrados **no** cuentan con un rastreo general de terceros oficialmente autorizado por el solo hecho de figurar en el catálogo.
- No existe autorización para enviar mensajes de venta automáticamente.
- Documentos `docs/ORQUESTADOR_1CLICK.md` y `docs/PLAN_CIERRE_MULTIFUENTE.md` pueden describir una versión histórica; **priorizar este estado fechado y comprobar sistemas vivos** si hay contradicción.

## 5. Bloqueantes y próximas acciones, en orden
1. Verificar los commits más recientes y comparar rama candidata con STAGING mediante `clasp pull`, hashes y un mecanismo **solo lectura**, antes de cualquier `clasp push`.
2. Inspeccionar estado real de corrida/triggers en STAGING. Preservar cola y cursor; no duplicar ni sobrescribir corridas recuperables.
3. Implementar y probar deduplicación por URL canónica/ID de anuncio y filtrado de avisos administrativos.
4. Agregar comprobación de contacto previo con Gmail Enviados **más** confirmaciones recibidas y `Contactados`, con tres estados: confirmado, no verificado e incierto por mensajería interna.
5. Ejecutar `npm test` en rama actual; repetir un ensayo acotado en copia/STAGING si el usuario lo autoriza, sin escribir a terceros.
6. Auditoría de secretos y privacidad. **No fusionar a `main` ni activar el motor** hasta resolver pruebas/seguridad.
7. Mantener canal comercial manual: buscar solicitudes reales online, preparar anuncios de intensivos y después desarrollar videos cortos y blog, según `docs/ESTRATEGIA_CAPTACION.md`.


### Hallazgo de seguridad documental (revisión parcial 2026-11-01)
- Se buscaron patrones habituales de claves API/tokens en módulos principales, pruebas y documentos seleccionados; **no hubo coincidencias con los patrones revisados**, pero esto **no constituye una auditoría completa de secretos ni del historial de Git**.
- El repositorio **público** contiene referencias explícitas a identificadores completos de recursos STAGING en `gas/Orquestador.js`, módulos piloto YouTube, tests y documentación histórica. Los IDs **no son credenciales**, pero facilitan identificar recursos internos y deben ser evaluados antes de compartir el repositorio como portfolio.
- En `gas/Orquestador.js` el ID de STAGING cumple un rol de protección del entorno: **no eliminarlo ni reemplazarlo sin rediseñar la validación y correr pruebas**. Planificar migración segura a configuración privada, revisión de permisos de acceso y, si corresponde, saneamiento del historial.
- La conectividad de GitHub **no permite modificar la visibilidad del repositorio desde esta sesión**. Si se busca privacidad inmediata, el propietario debe revisar en GitHub **Settings → General → Danger Zone → Change repository visibility**. Eliminar un ID de HEAD no lo borra del historial previo.

## 6. Límites de la transferencia entre IAs
GitHub conserva código y decisiones **documentadas**, no el historial completo de ChatGPT, Gmail, mensajes internos ni estado actual de Google Sheets/Apps Script. Una IA sin conectores autorizados debe pedir acceso o un resumen redactado: no debe inventar datos ni repetir contactos.

## Cierre de etapa 3 — pruebas y próximos pasos (2026-11-01)

- PR borrador [#12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12): código y tests actualizados; CI pasó para el commit de código `51152cdb05f838b504f1823a421dd230307eb270`.
- **Causas raíz históricas halladas** en `feature/orquestador-multifuente`: (a) objetos `GmailThread` en `run._gmailCache` serializado; (b) transición incondicional a `COMPLETADO` tras retorno de un conector, incluso si reportaba `ERROR_GMAIL` o `ERROR_RESOLUCION`.
- Se agregaron `orqDiagnosticoSoloLectura()`, herramienta local para comparar versiones (sin red), tests de no modificación, deduplicación de avisos por ID de Tusclases y prueba para **no fusionar dos mensajes distintos de Superprof por tener la misma URL de perfil**.
- CI ahora impide volver a introducir ambos patrones antiguos (`tests/deployment-regression-guard.test.js`).
- **Sin despliegue en Apps Script ni modificaciones en Sheets:** no se pudieron consultar los contenidos de HEAD ni la versión inmutable desplegada con las conexiones disponibles. Seguir [guía de comparación](VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md), con acceso autorizado a la API Apps Script y sin divulgar el código/versiones privados.
- Próximo paso seguro: obtener solo lectura de HEAD y la versión activa, comparar hashes y patrones, y recién después evaluar integración/despliegue del PR. No iniciar una nueva corrida ni contactar alumnos automáticamente.

## Etapa 4 — protección contra mensajes duplicados (2026-11-01)

- **Auditoría privada agregada:** 10 contactos en `Contactados`, 11 comprobantes de Tusclases en Gmail (uno nuevo del 2026-11-01 no reflejado en la planilla; una confirmación sin ID legible). Ver [informe sin PII](AUDITORIA_CONTACTOS_2026-11-01.md).
- **Código propuesto en PR #12:** índices efímeros de contactos de Gmail Recibidos/Enviados + pestaña `Contactados`; enlaces directos y `awstrack.me/L0/` decodificados sin visitar URLs; contactos confirmados excluidos **antes** de Gemini. Sin coincidencia: `VERIFICAR_CONTACTO`, **no «libre para escribir»**.
- **Panel mejorado:** botón «Comprobar contactos», solo lectura, con totales agregados; mostrar el estado pendiente de cada candidato y mensajería interna no verificada.
- **Piloto operativo preparado:** interfaz sin modo `ALL_ENABLED` por defecto; selección explícita de las cuatro fuentes con `orqPreviewPilotoComercial()` y confirmación antes de iniciar. No se inició ninguna corrida.
- **Pruebas:** casos sintéticos cubren CRM, comprobantes, seguimiento codificado, errores de Gmail, no duplicación, privacidad y modo piloto seguro. Verificar CI del último commit de la rama.
- **Bloqueante:** estas funcionalidades no están instaladas en STAGING. Primero comprobar HEAD, deployment y triggers con acceso autorizado a Apps Script; [guía](VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).

