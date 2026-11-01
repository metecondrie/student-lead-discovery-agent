# Adenda — quinta investigación (12 fuentes y 65 páginas), 2026-11-01

**Estado:** auditoría de evidencia; la investigación aún **no autoriza** activar conectores, recopilar datos personales ni enviar mensajes. El XLSX consolidado v2, que preserva las 114 filas anteriores y añade 12 revisiones con 13 hallazgos, se entregó al usuario por ChatGPT. No se publica contenido de alumnos en GitHub.

## Insumos nuevos
- 12 filas `SRC_001..SRC_012`, con 5 Grupo A, 4 B, 1 C y 2 D **según la otra IA**, no como clasificación auditada definitiva.
- PDF «Auditoría OSINT y Arquitectura de Fuentes de Demanda Comercial para la Captación Automatizada de Alumnos de Ciencias Exactas», **65 páginas**. Otros dos textos adjuntos proceden de ese estudio.
- Las **12 filas** indican `verification_date=2026-11-02`, fecha posterior a la revisión (2026-11-01). Se conservó como afirmación original, no como verificación real.

## Qué se pudo comprobar independientemente

| Fuente | Veredicto auditado | Evidencia | Límite |
|---|---|---|---|
| [Tusclases Argentina](https://www.tusclases.com.ar/buscar/alumnos.aspx) | P0 | Tablón real, solicitudes explícitas | Misma plataforma en distintas vistas; no se demostró tasa 12/20 ni autorización de scraping |
| [Tusclases Chile](https://www.tusclasesparticulares.cl/estudiantes/) | **P1 nuevo** | Tablón real con anuncios de Matemáticas PAES (28/10, 22/10), Física (26/10), Química (19/10), entre otros | Una fecha día/mes no prueba automáticamente el año; contacto/cobro desde Argentina y online **no verificados** individualmente |
| [Tusclases Perú](https://www.tusclases.pe/estudiantes/online/) | **P1 nuevo** | Existe sección de avisos de alumnos online e incluye Física/Matemática | Algunos anuncios publicados bajo sección «online» pueden requerir comprobar modalidad y vigencia |
| [Reddit r/Burises](https://www.reddit.com/r/Burises/comments/1vqwex4/) | P2 | Pedido remunerado de Física/Matemática, 17/08/2026 | No representa demanda de los últimos 7/30 días; comprobar si sigue abierto |
| [Reddit r/UTN](https://www.reddit.com/r/UTN/comments/1x517ur/) | P2 | Pedido explícito de profesor ASI, 13/10/2026 | ASI no es automáticamente compatible con Matemática/Física/Química/Biología; requiere examinar temario |
| [Reddit r/UBA](https://www.reddit.com/r/UBA/) | P2 | Comunidad real y pedidos históricos | Enlace al caso `1ulqq5o` no recuperado en la revisión; 5/5 anuncios *prefiltrados* no indica tasa de oportunidad de todo el subreddit |
| [Workana](https://www.workana.com/job/busco-profesor-particular-online-de-matematicas) | P3 | Proyecto de tutoría matemática realmente existió | La oferta ejemplar es del **21/03/2024**; no prueba flujo actual de solicitudes |
| [Preply — solicitudes](https://preply.com/es/online/ofertas-profesor) | C / evaluación comercial | Se muestran demandas explícitas, incluso Estadística universitaria y Matemática | Es contratación dentro de la plataforma, puede estar dirigida a perfiles concretos; comisiones y elegibilidad deben evaluarse; no son leads externos libremente contactables |
| [Tusclases España](https://www.tusclasesparticulares.com/estudiantes/) | P2 | Existe mecanismo de anuncios | Pago, elegibilidad y volumen reciente compatible no acreditados |
| Superprof Argentina | C | Perfiles docentes e inbound a su propio anuncio | No constituye tablón abierto para prospectar a usuarios de otros perfiles |
| Computrabajo Perú / Magneto365 | D para captación | Reclutamiento institucional | Separar del proyecto de búsqueda de empleo |

## Afirmaciones del informe que NO deben importarse como hechos

1. **Muestras sesgadas y superpuestas:** las tasas `12/20` de Tusclases AR, `14/20` de Chile, `5/5` de Reddit y `11/14` de correos se obtuvieron en universos distintos y, en algunos casos, filtrando por intención **antes** de contar. No son tasas comparables ni volúmenes totales diarios/semanales.
2. **Diez/once contactos:** el informe dice «11 solicitudes contactadas entre 28 y 30/10», mientras la lectura privada previa detectó 10 registros en `Contactados` y 11 comprobantes hasta el **01/11**. No atribuir una fecha a todos sin conciliación del CRM y recibos. No publicar alumnos ni sus enlaces.
3. **Riesgo de duplicación 0 %:** imposible certificarlo sin acceso a mensajería interna. Mantener `CONFIRMADO` / `VERIFICAR EN PLATAFORMA` y permiso humano para cada contacto.
4. **Gasto 0,00 garantizado:** no garantizable hasta conocer cuotas y tarifas reales, elegibilidad y límites de cuentas, sobre todo Reddit comercial y plataformas freelance.
5. **API de Reddit «gratis y permitida» para lead comercial:** [términos oficiales revisados el 20/07/2026](https://redditinc.com/es-es/policies/data-api-terms) indican que el uso comercial requiere **acuerdo separado con Reddit**. No incorporar como API comercial automáticamente autorizada.
6. **Tusclases HTML «público = scraping comercial permitido»:** [condiciones oficiales](https://www.tusclases.com.ar/informacion/condicionesuso-profesores.aspx) restringen reutilización de contenido con fines comerciales sin autorización y prohíben contacto comercial no consentido. Limitar a alertas y lectura manual por ahora.
7. **Mismo mercado varias veces:** filtros y alertas por materia de Tusclases son **vistas** de un mismo mercado; deduplicar anuncios por ID y cruce con comprobantes internos.
8. **Estimaciones de 5–12 nuevos leads diarios y 0 % doble contacto:** son proyecciones del documento, no datos medidos y verificables.
9. **Fechas de publicaciones:** páginas que solo indican día/mes no validan por sí solas año exacto.
10. **Referencias `[cite: 6]` y `Link`:** no constituyen URLs utilizables para un sistema de verificación. Toda afirmación crítica requiere enlace preciso.

## Recomendación de actualización de fuentes (NO activada)

- **Mantener P0:** Tusclases Argentina con alertas oficiales y revisión humana.
- **Ascender a P1 para prueba manual:** Tusclases Chile y Perú. Verificar modalidades online, elegibilidad de docente residente argentino, costos y formas de cobro.
- **Mantener P2 manual:** Reddit UTN, UBA y Burises para verificar pedidos recientes; no presumir que la API admite uso comercial sin acuerdo.
- **Mantener P3 experimental:** Workana con búsqueda de proyectos actuales, no anuncios históricos.
- **Separar C:** Preply (publica solicitudes, pero el proceso es inbound/contratación interna con comisiones), Superprof.
- **D:** portales institucionales de empleo y comentarios genéricos de YouTube.

**No sumar 12 familias nuevas:** casi todas ya estaban representadas en la auditoría previa como país, plataforma o foro. Se suman 12 **registros de investigación**, no 12 conectores. El catálogo consolidado de 83 familias no se recalcula sin confrontar IDs canónicos y rutas.

## Próximo paso seguro

Revisar manualmente 7 días de **solicitudes únicas reales** en AR, CL y PE, manteniendo registros agregados de muestra y sin contactar a nadie ni pagar. Deberá comprobarse viabilidad desde Argentina antes de crear conector; no activar `UrlFetchApp`, extracción programática, ni `Reddit API` para uso comercial sin permisos. La base técnica sigue en el [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12), sin desplegar.
