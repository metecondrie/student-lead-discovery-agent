# Auditoría de fuentes y embudo de captación — 2026-11-01

**Inventario público, sin datos personales ni secretos.** Datos de lectura de la planilla STAGING de Google Sheets; las métricas pueden variar si la corrida continúa. Este documento no confirma el estado real de los triggers de Apps Script.

Documentos de continuidad: [AGENTS.md](../AGENTS.md), [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md), [ESTRATEGIA_CAPTACION.md](ESTRATEGIA_CAPTACION.md).

## Resumen verificable

- Catálogo: **239 entradas**, **77 activas**: **53 YouTube**, **23 alertas Gmail** y **1 RSS**.
- Estados de verificación de fuentes activas: {"OPERATIVA":34,"FALLO":27,"PENDIENTE_VERIFICACION":16}.
- Corrida de referencia: `ORQ-20261030-235513-4ef06f`, resumen en OrqCorridas: 34/77 fuentes completas; 325 elementos leídos; 305 clasificados; 6 solicitudes; 0 candidatos; 27 errores. Estado de celda: `EJECUTANDO`.
- OrqCola: {"COMPLETADO":50,"ERROR":11,"PENDIENTE":16}; **no coincide necesariamente con el contador de completados de OrqCorridas**, revisar actualización de métricas.
- OrqHallazgos (corrida): 305 registros; 6 marcados como necesidad/solicitud; 0 candidatos.

## Causas observadas

1. **Desajuste comercial de fuentes:** predominan comentarios de YouTube dirigidos a creadores, no avisos abiertos de contratación de un profesor. No usar comentarios dirigidos a otro docente para ofrecer clases.
2. **Gmail no es scraping:** las 23 entradas de Tusclases/Superprof dependen de `gmail_alertas`, que busca en la casilla autorizada. No recorre las URLs de los sitios web en esas filas; gran parte son búsquedas redundantes.
3. **Errores técnicos:** 13 filas ERROR_GMAIL (`th.getMessages is not a function`) y 14 filas ERROR_RESOLUCION (canal no resuelto). La causa exacta en el despliegue requiere inspección: no presuponer que la rama GitHub equivale al código activo.
4. **Cuota:** 15 filas históricas de pausa; no son fuentes distintas. El orquestador usa 20 llamadas Gemini/día como valor por defecto si no se configura otro. Confirmar las cuotas reales y las ventanas de reinicio.
5. **Geografía y duplicados:** canales centrados en Chile (PAES), México (UNAM/EXANI), Perú (UNI/UNMSM), etc.; también hay nombres de canales repetidos y descripciones geográficas inexactas. Priorizar demandas compatibles con las materias, Argentina y modalidad online.
6. **Regla crítica de contacto previo:** cotejar Gmail Enviados, comprobantes de Tusclases recibidos y la pestaña privada Contactados antes de recomendar. Si mensajería interna no está accesible, estado INCIERTO; nunca enviar automáticamente.

## Próximo trabajo para otra IA

- Prioridad 0: diagnosticar ERROR_GMAIL y confirmar el despliegue STAGING (lectura, triggers y versión); no modificar datos en una corrida activa.
- Prioridad 1: reducir fuentes Gmail nominales a consultas efectivas, deduplicar por anuncio y descartar correos administrativos.
- Prioridad 1: probar manualmente tableros públicos de pedidos explícitos (p. ej. Tusclases), sin automatizar el scraping sin autorización o método permitido.
- Prioridad 2: piloto limitado a fuentes con audiencia compatible, métricas de conversión reales y cuota supervisada; YouTube preferentemente para contenido propio, no interpelar clientes ajenos.
- Prioridad 2: validar el embudo oportunidades únicas → contactabilidad → contacto aprobado → respuesta → reserva → cobro.

## Listado completo de las 77 fuentes habilitadas

La columna **Referencia** corresponde a la URL pública declarada en el catálogo, no garantiza que el bot la consulte; en las filas Gmail únicamente consulta el correo.

| ID y fuente | Conector | Público declarado | Verificación | Estado en cola | Último resultado / leídos | Referencia |
|---|---|---|---|---|---|---|
| CAT-0178 — Mathematics with Juan | youtube_canales | Secundaria / Universitario | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/watch?v=_6uyQISZvBc) |
| CAT-0036 — Filadd UBA (@FiladdUBA) | youtube_canales | CBC / UBA XXI | OPERATIVA | COMPLETADO | OK / 2 | [abrir](https://www.youtube.com/c/FiladdUBA) |
| CAT-0034 — Academia Filadd (@AcademiaFiladd) | youtube_canales | Ingreso UNC / Universidades | OPERATIVA | COMPLETADO | SIN_COMENTARIOS_RECIENTES / 0 | [abrir](https://www.youtube.com/channel/UC6PoYEu79xbbUGSM0s38Esg) |
| CAT-0167 — Quimiayudas (@Quimiayudas) | youtube_canales | Secundaria / Universidad | OPERATIVA | COMPLETADO | OK / 12 | [abrir](https://www.youtube.com/user/Quimiayudas) |
| CAT-0142 — Grupo Ciencias San Marcos | youtube_canales | Ingreso Universitario | OPERATIVA | COMPLETADO | OK / 13 | [abrir](https://www.youtube.com/@GrupoCienciasSanMarcos) |
| CAT-0165 — Puntaje Nacional Colombia | youtube_canales | Secundaria / Exámenes | OPERATIVA | COMPLETADO | OK / 10 | [abrir](https://www.youtube.com/c/PuntajeNacionalColombia) |
| CAT-0137 — Biología desde cero (@biologiadesdecero) | youtube_canales | Secundaria / Universidad | OPERATIVA | COMPLETADO | OK / 12 | [abrir](https://www.youtube.com/@biologiadesdecero) |
| CAT-0158 — Preu Cpech (@PreuCpechCanalOficial) | youtube_canales | Admisión / Exámenes | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/@PreuCpechCanalOficial) |
| CAT-0001 — Tusclases ARG > quimica | gmail_alertas | todas | OPERATIVA | COMPLETADO | OK / 1 | [abrir](https://www.tusclases.com.ar/alumnos/quimica.aspx) |
| CAT-0002 — Tusclases ARG > sitemap de anuncios de alumnos | gmail_alertas | todas | OPERATIVA | COMPLETADO | OK / 16 | [abrir](https://www.tusclases.com.ar/sitemap-anuncios.aspx?tipo=Alumnos) |
| CAT-0003 — Tusclases Argentina | gmail_alertas | Validar por anuncio | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com.ar/alumnos/matematica.aspx) |
| CAT-0004 — Tusclases: alumnos buscando profesor | gmail_alertas | Argentina / online | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com.ar/buscar/alumnos.aspx) |
| CAT-0005 — Tusclases: alumnos de ciencias | gmail_alertas | Argentina / enseñanza online en español | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com.ar/alumnos/ciencias.aspx) |
| CAT-0006 — Tusclases: alumnos de física | gmail_alertas | Argentina / enseñanza online en español | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com.ar/alumnos/fisica.aspx) |
| CAT-0035 — El Traductor de Ingeniería | youtube_canales | Universidad; tecnicaturas | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/@eltraductor_ok) |
| CAT-0037 — FISICA EN SEGUNDOS | youtube_canales | CBC; universidad | FALLO | COMPLETADO | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/FISICAENSEGUNDOS) |
| CAT-0038 — Física en Segundos | youtube_canales | Argentina / enseñanza online en español | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/channel/UCfC8fA12mBQB5_0h_CJAdcg) |
| CAT-0039 — Física Exactas UBA | youtube_canales | Universidad | OPERATIVA | COMPLETADO | OK / 1 | [abrir](https://www.youtube.com/channel/UCQ6bzKVkLIqwYUpzyUDx4qg) |
| CAT-0040 — Popularización Exactas UBA | youtube_canales | Secundaria; universidad | FALLO | COMPLETADO | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/PopExactasUBAOficial) |
| CAT-0041 — Preu Filadd Chile | youtube_canales | PAES | OPERATIVA | COMPLETADO | OK / 8 | [abrir](https://www.youtube.com/@FiladdChile) |
| CAT-0042 — Suma Exactas UNLP: YouTube | youtube_canales | Argentina / enseñanza online en español | OPERATIVA | COMPLETADO | SIN_COMENTARIOS_RECIENTES / 0 | [abrir](https://www.youtube.com/channel/UCgKm7GRhhRBpMlZt9oT1qTw) |
| CAT-0066 — UTNianos — RSS | rss_foros | Argentina / UTN | OPERATIVA | COMPLETADO | OK / 5 | [abrir](https://www.utnianos.com.ar/foro/syndication.php) |
| CAT-0086 — Superprof AR | gmail_alertas | todas | OPERATIVA | COMPLETADO | OK / 1 | [abrir](https://www.superprof.com.ar) |
| CAT-0087 — Superprof Argentina | gmail_alertas | Argentina / enseñanza online en español | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.superprof.com.ar/dar-clases-particulares/) |
| CAT-0088 — Superprof Colombia | gmail_alertas | Validar por anuncio | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.superprof.co/dar-clases-particulares/) |
| CAT-0089 — Superprof España | gmail_alertas | Validar por anuncio | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.superprof.es/dar-clases-particulares/) |
| CAT-0128 — Alertas Tusclases — Gmail | gmail_alertas | Argentina / online | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com.ar/) |
| CAT-0129 — Tusclases > marketplace internacional | gmail_alertas | todas | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com) |
| CAT-0130 — Tusclases ARG > CABA | gmail_alertas | todas | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.com.ar/alumnos/buenos-aires.aspx) |
| CAT-0131 — Tusclases Colombia | gmail_alertas | Validar por anuncio | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.co/estudiantes/) |
| CAT-0132 — Tusclases México | gmail_alertas | Validar por anuncio | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.mx/estudiantes/) |
| CAT-0133 — Tusclases Perú | gmail_alertas | Validar por anuncio | FALLO | COMPLETADO | ERROR_GMAIL / 0 | [abrir](https://www.tusclases.pe/estudiantes/) |
| CAT-0134 — Academia Saco Oliveros | youtube_canales | Ingreso UNI; UNMSM | OPERATIVA | COMPLETADO | SIN_COMENTARIOS_RECIENTES / 0 | [abrir](https://www.youtube.com/@AcademiaSacoOliveros) |
| CAT-0135 — Amigos de la Química | youtube_canales | Bachillerato; ingreso | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/channel/UCTiu0apxEtCGpuLYeI-owkg) |
| CAT-0136 — Bio[ESO]sfera | youtube_canales | Argentina / enseñanza online en español | OPERATIVA | COMPLETADO | OK / 11 | [abrir](https://www.youtube.com/channel/UCFUf1FXAUF4C20a9O896TuQ) |
| CAT-0138 — Ciencias con la Bióloga Elena | youtube_canales | Secundaria; bachillerato | FALLO | COMPLETADO | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/biologaelena) |
| CAT-0139 — Daniel Carreón | youtube_canales | Secundaria | OPERATIVA | COMPLETADO | OK / 14 | [abrir](https://www.youtube.com/channel/UCwScwtu5zVqc_wHtRx9XvDA) |
| CAT-0140 — Date un Vlog | youtube_canales | Divulgación | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/@dateunvlog) |
| CAT-0141 — Derivando | youtube_canales | Divulgación | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/channel/UCH-Z8ya93m7_RD02WsCSZYA) |
| CAT-0143 — Grupo Ciencias UNI | youtube_canales | Ingreso UNI | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/GrupoCienciasUNI) |
| CAT-0144 — IkniuM Media Superior | youtube_canales | Ingreso media superior | OPERATIVA | COMPLETADO | OK / 14 | [abrir](https://www.youtube.com/@IkniuM) |
| CAT-0145 — IkniuM UNAM | youtube_canales | Ingreso UNAM | OPERATIVA | COMPLETADO | OK / 9 | [abrir](https://www.youtube.com/@IkniuMUNAM) |
| CAT-0146 — Julioprofe | youtube_canales | Argentina / enseñanza online en español | OPERATIVA | COMPLETADO | SIN_COMENTARIOS_RECIENTES / 0 | [abrir](https://www.youtube.com/channel/UC92hfTUYx8N3QKYRcFxljyg/) |
| CAT-0147 — julioprofe | youtube_canales | Secundaria; universidad | OPERATIVA | COMPLETADO | OK / 12 | [abrir](https://www.youtube.com/user/julioprofe) |
| CAT-0148 — La Hiperactina | youtube_canales | Divulgación | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/Lahiperactina) |
| CAT-0149 — La Prof Lina M3 | youtube_canales | Argentina / enseñanza online en español | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/LaProfLinaM3) |
| CAT-0150 — La RuBisCO es lo más | youtube_canales | ESO; bachillerato | OPERATIVA | COMPLETADO | SIN_COMENTARIOS_RECIENTES / 0 | [abrir](https://www.youtube.com/channel/UCxkyw-ewW3pPZ5Wab345PVw) |
| CAT-0151 — Matemáticas profe Alex | youtube_canales | Argentina / enseñanza online en español | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/matematicasprofealex) |
| CAT-0152 — Matemáticas profe Alex | youtube_canales | Secundaria; universidad | OPERATIVA | COMPLETADO | OK / 10 | [abrir](https://www.youtube.com/channel/UCanMxWvOoiwtjLYm08Bo8QQ) |
| CAT-0153 — Matemóvil | youtube_canales | Argentina / enseñanza online en español | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://youtube.com/matemovil) |
| CAT-0154 — Matemóvil | youtube_canales | Secundaria; universidad | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/Matemovil) |
| CAT-0155 — Mates con Andrés | youtube_canales | Argentina / enseñanza online en español | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/@MatesconAndr%C3%A9s) |
| CAT-0156 — Math2me | youtube_canales | Argentina / enseñanza online en español | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/math2me) |
| CAT-0157 — Pablo Borsoi / Matetutoriales | youtube_canales | Argentina / enseñanza online en español | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/pabloborsoi) |
| CAT-0159 — Preu M30M | youtube_canales | PAES | OPERATIVA | COMPLETADO | OK / 12 | [abrir](https://www.youtube.com/channel/UCQ3DtXinWzMgCGEjwJVQfnw) |
| CAT-0160 — Preuniversitario Pedro de Valdivia | youtube_canales | PAES | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/@PreuniversitarioPDV) |
| CAT-0161 — Profe Luis Conchas | youtube_canales | PAA; EXANI II; ingreso | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/c/ProfeLuisConchas) |
| CAT-0162 — Profesor Sergio Llanos | youtube_canales | Secundaria; universidad | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/@ProfesorSergioLlanos) |
| CAT-0163 — Profesor10demates | youtube_canales | Argentina / enseñanza online en español | OPERATIVA | COMPLETADO | OK / 12 | [abrir](https://www.youtube.com/channel/UCx2Y_55MBCq3lkc3aOtmAiw) |
| CAT-0164 — Puntaje Nacional Chile | youtube_canales | PAES | FALLO | ERROR | ERROR_RESOLUCION / 0 | [abrir](https://www.youtube.com/PuntajeNacionalChile) |
| CAT-0166 — QuantumFracture | youtube_canales | Divulgación | OPERATIVA | COMPLETADO | OK / 15 | [abrir](https://www.youtube.com/user/QuantumFracture) |
| CAT-0168 — Quimitube | youtube_canales | Bachillerato; ingreso | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/channel/UCJW41iRv8GtXPNr7hVgKc4Q) |
| CAT-0169 — Salvador FI | youtube_canales | Argentina / enseñanza online en español | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/@SalvadorFI) |
| CAT-0170 — Susi Profe | youtube_canales | Argentina / enseñanza online en español | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/susiprofe) |
| CAT-0171 — Susi Profe | youtube_canales | Secundaria; bachillerato | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/c/SusiProfe) |
| CAT-0172 — unicoos | youtube_canales | ESO; bachillerato; ingreso | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/@unicoos) |
| CAT-0173 — Unitips | youtube_canales | Ingreso UNAM; IPN | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/@unitipsmx) |
| CAT-0175 — YouTube > Daniel Carreón | youtube_canales | secundaria | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/@DanielCarreon) |
| CAT-0176 — YouTube > Matemáticas con Grajeda | youtube_canales | secundaria/universidad | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/@MatematicasConGrajeda) |
| CAT-0177 — YouTube > Matemáticas profe Alex | youtube_canales | secundaria | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.youtube.com/@MatematicasProfeAlex) |
| CAT-0231 — Tusclases ARG > API host | gmail_alertas | todas | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://api.tusclasesparticulares.com) |
| CAT-0232 — Tusclases ARG > biologia | gmail_alertas | todas | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.tusclases.com.ar/alumnos/biologia.aspx) |
| CAT-0233 — Tusclases ARG > ingles | gmail_alertas | todas | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.tusclases.com.ar/alumnos/ingles.aspx) |
| CAT-0234 — Tusclases España — Biología | gmail_alertas | Validar por anuncio | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.tusclasesparticulares.com/alumnos/biologia.aspx?pagina=2) |
| CAT-0235 — Tusclases España — Física | gmail_alertas | Validar por anuncio | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.tusclasesparticulares.com/alumnos/fisica.aspx) |
| CAT-0236 — Tusclases España — Matemáticas | gmail_alertas | Validar por anuncio | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.tusclasesparticulares.com/alumnos/matematicas.aspx) |
| CAT-0237 — Tusclases España — Química | gmail_alertas | Validar por anuncio | PENDIENTE_VERIFICACION | PENDIENTE | sin registro / 0 | [abrir](https://www.tusclasesparticulares.com/alumnos/quimica.aspx) |

**Límites:** auditoría de Sheets y GitHub, sin acceso verificado a ejecución real de Apps Script ni lectura privada de mensajería de las plataformas. No se copiaron comentarios de personas, correos, credenciales ni IDs privados al documento. No se activaron bots ni se contactaron alumnos.
