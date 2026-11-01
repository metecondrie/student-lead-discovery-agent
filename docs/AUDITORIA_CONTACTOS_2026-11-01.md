# Auditoría de contactos previos y protocolo seguro — 2026-11-01

**Objetivo:** ninguna IA ni bot debe presentar como «alumno nuevo listo para contactar» a una persona a la que ya se le escribió. Este documento es público y NO contiene nombres, emails, enlaces de alumnos ni identificadores de anuncios.

## Hallazgo en las fuentes privadas (lectura 2026-11-01)
- Hoja `Contactados` de STAGING: **10 filas** de contacto, con **9 enlaces que permiten recuperar el identificador de anuncio**.
- Gmail, comprobantes de Tusclases con asunto específico «Mensaje desde tusclases.com.ar: ...»: **11 confirmaciones** de envío (10 con ID de anuncio recuperable y 1 sin ID verificable por el método actual).
- Intersección verificable por ID entre ambas fuentes: **9 anuncios**.
- **1 confirmación recuperable del 2026-11-01 no figura en Contactados**. No se añadió automáticamente a la hoja: esta revisión fue de solo lectura.
- Los comprobantes de Tusclases están en **Recibidos**, no necesariamente en **Enviados**. Parte de los enlaces usa redirección `awstrack.me/L0/` percent-encoded. La identificación requiere decodificar localmente, sin seguir enlaces.
- Los números no prueban que Gmail tenga el historial completo ni que no existan conversaciones dentro de la plataforma. La presencia de un comprobante sí demuestra el contacto realizado.

## Implementación candidata — PR #12
- `orqTusclasesIds_`: extrae identificadores de anuncios desde enlaces directos o percent-encoded, sin llamadas de red.
- `orqContactHistory_`: consulta la hoja privada `Contactados`, comprobantes específicos de Gmail **Recibidos** y una consulta acotada de Gmail **Enviados**; mantiene los índices exclusivamente en memoria de la ejecución. Límite: hasta 100 hilos recientes por búsqueda, 365 días. Si falla/queda truncada, marca revisión incompleta.
- `orqContactDecision_`: un identificador confirmado en CRM o en comprobante excluye al alumno de nuevas propuestas. El mero enlace a un perfil en Gmail Enviados se trata como indicio **no concluyente**, no como prueba.
- `orqExecuteGmail_`: omite una solicitud con contacto confirmado **antes de gastar cuota de Gemini**; para las demás, etiqueta `VERIFICAR_CONTACTO`, no «disponible para escribir».
- `orqStatus()` y panel HTML: muestran las solicitudes sin contacto comprobado como **PENDIENTE_VERIFICAR_EN_PLATAFORMA**, separadas conceptualmente de un envío autorizado. Las solicitudes históricas se marcan sin auditoría.
- `orqDiagnosticoContactosSoloLectura()`: botón explícito para mostrar totales agregados sin enviar mensajes ni modificar Sheets; no se ejecuta automáticamente al consultar el panel.

**Importante:** un resultado `VERIFICAR_CONTACTO` es una **solicitud para investigación**, no permiso para ofrecer clases. El usuario debe verificar la mensajería interna de Tusclases/Superprof antes de redactar y autorizar contacto. No se envían mensajes automáticamente en ninguna fase.

## Pruebas de regresión
GitHub Actions comprobó:
1. Reconocimiento de identificadores dentro de redirecciones de seguimiento (sin visitar enlaces).
2. Exclusión de contacto CRM antes de Gemini.
3. Exclusión por comprobante recibido aunque no figure en CRM.
4. Solicitudes desconocidas se conservan para revisión con estado explícito.
5. Fallos de permisos de Gmail se presentan como **verificación incompleta**.
6. Informes agregados sin nombres/correos/IDs y sin mutaciones.
7. Panel predeterminado en **modo piloto sin ejecución**, con confirmación antes de empezar; modo exhaustivo de 77 fuentes solo opt-in.

## Limitaciones y próximos pasos
- **No desplegado:** la funcionalidad está en la rama `fix/gmail-diagnostico-y-piloto-20261101` y PR #12, no comprobada contra Apps Script real.
- Para ejecutar en STAGING, verificar previamente código HEAD, deployment versionado y permisos; seguir [guía de despliegue seguro](VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).
- Los comprobantes sin ID requieren inspección humana; no inferir ID a partir de nombres parciales.
- Como no se tiene acceso automático a todos los mensajes internos de plataformas, el estado de «sin contacto previo» **no puede certificarse automáticamente**.
- Se debe medir en un piloto real la proporción de solicitudes únicas con contacto permitido, de respuestas y de clases reservadas. Las pruebas Node son simuladas.
- Evitar escanear de forma continua 77 fuentes hasta validar primero los cuatro conectores previstos.

[Reglas para agentes](../AGENTS.md) · [Plan del piloto](https://github.com/metecondrie/student-lead-discovery-agent/blob/fix/gmail-diagnostico-y-piloto-20261101/docs/PILOTO_COMERCIAL_2026-11-01.md) · [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12).
