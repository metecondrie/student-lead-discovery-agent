# Auditoría cruzada de investigaciones de fuentes — 2026-11-01

**Estado:** investigación; **NO es catálogo operativo, NO autoriza scraping ni contactos**.

## Material comparado

- XLSX de 60 entradas + CSV equivalente (60); top15 verificación rigurosa.
- XLSX de 30 entradas / 20 muestras.
- XLSX de 15 entradas / ranking de 7 días.
- CSV de 9 entradas (una fila desalineada) + informe de verificación de menor cobertura.
- PDF y texto de «Deconstruyendo la Demanda Explícita», 24 páginas: **muchos datos y fechas de 2024**, no se convalidan como mediciones de noviembre de 2026.

**Resultado de cruce estructurado:** 114 filas de las cuatro tablas, que se agrupan en 83 familias/vías mediante deduplicación conservadora por plataforma/país/comunidad. Hay mezclas de filtros, páginas de resultados, directorios de profesores y mecanismos distintos. **83 no son fuentes de alumnos verificadas ni integrables**. El Excel de auditoría detallada fue entregado al usuario en ChatGPT y conserva los 114 registros, contradicciones y trazabilidad; **no se sube íntegramente al repositorio público**.

## Evidencia independiente en sitios oficiales

| Candidato | Veredicto | Dato comprobado | Lo que falta |
|---|---|---|---|
| [Tusclases AR — alumnos](https://www.tusclases.com.ar/buscar/alumnos.aspx) | P0 — demanda explícita | Existe tablón real de avisos; filtros por materia son **vistas de la misma plataforma**, no fuentes independientes | Volumen semanal único, vigencia y contacto previo; permiso para extracción programática |
| [Tusclases AR — matemática](https://www.tusclases.com.ar/alumnos/matematica.aspx) | Vista del anterior | Página oficial muestra solicitudes de matemática | No usar variante `matematicas.aspx` como URL confirmada: no fue accesible durante esta revisión |
| [Tusclases CO — bioquímica](https://www.tusclases.co/estudiantes/quimica/bogota/busco-profesor-bioquimica-biotecnologia-afines-2466833) | P1 — demanda explícita | Hay ficha oficial de pedido online en bioquímica/biotecnología | Registro, elegibilidad, pago desde Argentina y vigencia del pedido |
| [TeacherOn — tutor jobs](https://www.teacheron.com/online-maths-tutor-jobs) | P1 — demanda explícita | Listado global de solicitudes online | La [guía oficial](https://www.teacheron.com/how-it-works-teachers) informa que parte del contacto requiere **coins**; mayoría de anuncios en inglés y fuera de Latinoamérica |
| [Workana — ejemplo de proyecto](https://www.workana.com/job/asistencia-y-desarrollo-de-contenido-en-temas-de-matematicas) | P1 — proyectos STEM | Publica encargos de apoyo y elaboración de contenidos | Es empleo/proyecto, no necesariamente clase privada recurrente; comprobar convocatorias actuales y costo de propuesta |
| [Reddit r/UBA — ejemplo histórico](https://www.reddit.com/r/UBA/comments/1v6g5nt/profesor_particular_para_algebra_y_analisis/) | P1 — evidencia histórica | Publicación julio 2026 pidiendo ayuda en Álgebra y Análisis | No hay muestreo de volumen semanal; revisar reglas de la comunidad |
| [Reddit r/empleos_AR — ejemplo](https://www.reddit.com/r/empleos_AR/comments/1v6g0c5/busco_profesor_particular_para_materias_de_uba/) | P1 — evidencia histórica | Solicitud julio 2026 compatible con física/matemática, online posible | No asumir que sigue abierta; comprobar normas |
| [BuscaTuClase — anuncio de alumno](https://www.buscatuclase.com/uy/blog/publicar-anuncios-gratis) | P1 — mecanismo | Blog oficial documenta que los alumnos pueden solicitar profesor | Falta acceso a listado de pedidos activos y frecuencia actual |
| Facebook/Telegram/Discord | P2 o P3 — por validar | Existencia de comunidad no prueba demanda abierta de tutores | Muestra reciente, acceso y normas; **nunca rastreo automático de grupos privados** |
| Superprof, Classgap, Preply (perfiles) | C — inbound | Directorios donde el alumno contacta al profesor | No confundir con tablón de solicitudes abierto para terceros |
| YouTube, agregadores de ofertas docentes, portales de apuntes | D para captación directa | No aportaron demanda contactable comprobada en la auditoría del bot | No consumir cuotas en estos sitios sin nueva evidencia |

## Contradicciones que impiden una importación directa

1. **Datos declarados como medidos sin muestra:** la base de 60 filas dice 12 solicitudes/7 días y 45/30 días para el filtro de matemática y 25/7 días para el listado general; su propio «Top15» indica que solo tomó 20 registros del listado general y presenta tasas de páginas filtradas como **estimaciones**. Poner conteos de demanda a `NO MEDIDO`.
2. **Mismo anuncio multiplicado:** `/alumnos/matematica.aspx`, `/alumnos/fisica.aspx`, `/alumnos/quimica.aspx`, `/buscar/alumnos.aspx` son **vistas** que pueden mostrar los mismos pedidos. Deduplicar por identificador de anuncio; no duplicar fuente y no recontactar al estudiante.
3. **Permisos:** el HTML público no equivale a autorización de scraping. [Condiciones de Tusclases](https://www.tusclases.com.ar/informacion/condicionesuso-profesores.aspx) restringen uso de directorio para extracción y comunicaciones comerciales no consentidas. Trabajar con **alertas oficiales y revisión manual** hasta aclarar permiso programático.
4. **PDF histórico:** presenta como `comprobadas` cifras del 2024 para foros UNLP, Mercado Libre, Facebook, Reddit y plataformas locales sin solicitudes actuales evidenciadas. No copiar puntajes ni tasas a STAGING.
5. **Costos:** TeacherOn no es gratis de forma general para que un tutor inicie contacto; puede requerir monedas. Plataformas con créditos/membresías solo como oportunidades pendientes de evaluación, sin compras.
6. **CSV DeepSeek:** una fila de Facebook tiene desplazamiento de campos por comas sin entrecomillar; no importar como catálogo operativo.
7. **Ejemplos ya trabajados:** algunos informes reiteran un mismo aviso de Tusclases previamente contactado; un ejemplo visible **no equivale a un nuevo lead**. Debe cotejarse `Contactados` + Gmail Recibidos (comprobantes), Enviados y mensajería interna.

## Diseño de datos recomendado

Guardar por separado:

- **Fuente base:** plataforma/país/comunidad + método autorizado + estado legal + costo.
- **Vista/consulta:** URL de filtro/alerta, materia, modalidad, prioridad y `source_id` padre.
- **Solicitud individual:** ID canónico, fecha, materia, nivel, modalidad, contacto previo, apertura, evidencia. Datos privados **solo en planilla privada**.
- **Evidencia:** fecha observada, URL, número de anuncios examinados, solicitudes compatibles únicas, limitaciones técnicas y certeza.
- **Descartes:** mantener fuentes C/D sin consumir cuota, conservando razones de exclusión.

## Piloto de siete días, gasto adicional cero

1. Tusclases Argentina: tablón y alertas oficiales; contar **solicitudes únicas** compatibles, no vistas; revisar que no estén contactadas.
2. Tusclases Colombia/otros países: investigar elegibilidad y medios de cobro antes de tratar como oportunidades viables.
3. TeacherOn: revisar **solo puestos contactables gratuitamente** y compatibles con castellano/precios.
4. Workana: buscar encargos STEM online actuales, sin propuestas automáticas.
5. Reddit UBA/empleos_AR y comunidades seleccionadas: lectura autorizada, demanda de la última semana y respeto a normas.
6. BuscaTuClase: verificar si el tablón existe y tiene actividad actual. Facebook: manual, sin extracción de grupos.
7. Medir `pedidos_únicos -> compatibles_online -> no_contactados_confirmados -> solicitudes_para_revisión -> contactos_autorizados -> respuestas -> reservas`.

**Bloqueante actual:** antes de activar un conector nuevo, verificar el código realmente desplegado y la ejecución de STAGING; [PR de corrección técnica #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12) permanece separado y sin despliegue.

**Protección explícita:** este informe no autoriza compras, respuestas, envíos, scraping, triggers, merge ni cambios en hojas operativas.
