# Piloto comercial reducido — propuesta de prueba, no ejecución

**Fecha de diseño:** 2026-11-01. **Estado:** preparado en GitHub; **NO se cambió la planilla STAGING, el código desplegado ni los triggers**. La corrida de 77 fuentes iniciada el 30/10 debe ser evaluada y preservada antes de comenzar cualquier ensayo.

## Hipótesis comprobables
H1. Más comentarios de YouTube no implica más alumnos contactables; los mensajes suelen dirigirse a los creadores.
H2. Las 23 entradas de Tusclases/Superprof no son 23 sitios rastreados: todas usan **Gmail**, con búsquedas muy similares y errores registrados.
H3. Priorizar pedidos explícitos en plataformas docentes y foros dará más solicitudes útiles por hora y por llamada de Gemini.

## Fuentes automáticas para un **piloto de 4**, después de reparar Gmail

| Orden | ID en Fuentes | Nombre | Mecanismo real | Propósito | Precaución |
|---|---|---|---|---|---|
| 1 | `CAT-0002` | Tusclases ARG — anuncios | **gmail_alertas**, NO navegador/sitemap | Detectar alertas de la plataforma y comparar contra búsquedas manuales | El enlace del catálogo no se rastrea; comprobar remitentes y parser |
| 2 | `CAT-0086` | Superprof Argentina | **gmail_alertas** | Detectar consultas de estudiantes a tu anuncio | Excluir mensajes administrativos «tu anuncio está publicado» |
| 3 | `CAT-0066` | UTNianos — RSS | `rss_foros` | Solicitudes abiertas en foros universitarios argentinos | El feed puede contener publicaciones no comerciales |
| 4 | `CAT-0036` | Filadd UBA | `youtube_canales` | Control comparativo de comentarios de audiencia CBC | No contactar a quienes escriben al creador; detener si el rendimiento es nulo |

**No se recomienda 'ALL_ENABLED' en este piloto.** Cuando se valide STAGING, el llamador puede seleccionar explícitamente `['CAT-0002','CAT-0086','CAT-0066','CAT-0036']` con pocas lecturas por canal. No invocar `orqStart` ni reiniciar una corrida pausada/recuperable sin aprobación del usuario, revisión de triggers y respaldo de la cola.

## Fuentes manuales de mayor intención (no automatizadas)
1. **Tusclases — estudiantes buscando profesor:** https://www.tusclases.com.ar/buscar/alumnos.aspx . Hay anuncios públicos de alumnos; el bot todavía NO tiene un conector web autorizado para recorrer esta página. Revisar manualmente solicitudes de Matemática/Física/Química/Biología, modalidad online, vigencia y compatibilidad. Respetar las condiciones de la plataforma.
2. **Estudi — portal de docentes universitarios:** https://www.estudi.com.ar/teachers/about . Plataforma de inscripción docente; evaluar requisitos, costos y actividad real antes de recomendar postularse. No confundir con tablón de solicitudes abiertas.
3. **Una Mano — profesor particular:** https://unamano.ar/servicios/profesor-particular . Sitio que describe publicación de tareas de apoyo escolar; verificar si muestra encargos reales y si el alta como prestador es gratuita, apta para online y viable desde La Plata. **Fuente exploratoria, no validada como generadora de leads.**

Ninguna de estas vías justifica scraping de páginas privadas, enviar mensajes no solicitados ni comprar promociones.

## Prevención de contactos duplicados: paso obligatorio
- Consultar Gmail `Enviados`, confirmaciones recibidas de Tusclases y pestaña privada `Contactados` **antes** de sugerir primer mensaje.
- Normalizar URL e ID de anuncio, eliminar parámetros de tracking y considerar repetidos los diferentes enlaces a una misma solicitud.
- Si la mensajería interna de la plataforma no es accesible, poner estado **INCIERTO** y pedir comprobación, no afirmar «sin contacto previo».
- Cero mensajes o publicaciones automáticos; cada mensaje requiere aprobación específica.

## Instrumentación del embudo por fuente
Guardar en Sheets (no en el repositorio público) por ID canónico:
`leídos -> clasificados -> pedidos_abiertos -> elegibles_online -> no_contactados_verificados -> contactos_aprobados -> respuestas -> reservas -> pagos`.

Para cada etapa registrar la causa de descarte; distinguir cuota Gemini, error Gmail, fuente sin mensajes recientes, solicitud dirigida a otro profesor, anuncio vencido, solicitud presencial y materia incompatible.

## Criterios para decidir después del piloto
1. **Gmail funciona sin ERROR_GMAIL** en casos controlados y las pruebas se ejecutan.
2. Cola y panel informan estados coherentes; cero fuentes contabilizadas simultáneamente como error y completadas.
3. Cada fuente presenta solicitudes abiertas **únicas**, no comentarios dirigidos a creadores ni confirmaciones administrativas.
4. Si tras una muestra representativa no aparecen pedidos abiertos, **no ampliar automáticamente YouTube**: revisar primero los tablones explícitos, filtros y contacto previo.
5. Comparar resultados reales por **cuota consumida, hora invertida y reserva**, no cantidad de fuentes. Sin publicar ni enviar sin permiso.

## Trabajo previo indispensable
- Cotejar el código desplegado en Apps Script STAGING con la rama de GitHub mediante inspección no destructiva. El error `th.getMessages is not a function` es anómalo para la API `GmailApp.search`, que normalmente devuelve objetos `GmailThread`; podría indicar adaptación de datos o despliegue viejo. Hay que **demostrar** su causa, no suponerla.
- Ejecutar `npm test` y revisar GitHub Actions del PR.
- Revisar el estado de una corrida antigua marcada `EJECUTANDO`; no sobrescribirla.
- Recién con aprobación y evidencia hacer prueba controlada sobre STAGING.

Referencias internas: [auditoría completa de 77 fuentes](AUDITORIA_FUENTES_2026-11-01.md), [normas entre agentes](../AGENTS.md) y [estrategia de clases](ESTRATEGIA_CAPTACION.md).
