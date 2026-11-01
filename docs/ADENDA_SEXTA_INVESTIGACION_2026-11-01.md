# Sexta investigación: base de 76 fuentes (01/11/2026)

**Entrada**: archivo de Biblioteca del usuario `base_datos_fuentes_demanda.xlsx`, recibido el 2026-11-01, con hojas: `Fuentes`, `Leyenda`, `Ranking`, `Piloto 7 días`, `Descartadas` y `Revisión`. Archivo original privado en Biblioteca de ChatGPT, **no se copió entero a GitHub**.

## Resultado de la revisión estructural

- **76 registros reales**, más una línea final que explica la convención `null`; no son 77 fuentes.
- Clasificación declarada: **9 A**, **19 B**, **7 C** y **41 D**. Es una clasificación del investigador, **no** verificación independiente.
- Contiene mecanismos de adquisición y «vistas» de una misma plataforma; no se pueden sumar como 76 conectores.
- La propia base declara `observed_requests_7d=0` para **8 de 9 entradas A**; las de Reddit tampoco muestran evidencia de volumen diario suficiente. No confundir un ejemplo histórico con demanda vigente.
- Añade: `r/LaPlataCiudad`, `r/UNLaM`, `r/BuenosAires`, `r/Matematicas`, `r/empleos_AR`, la búsqueda multi-comunidad de Reddit y un esquema para alertas de Google/Talkwalker; varios ya figuraban en informes anteriores.
- Error geográfico: `r/Burises` aparece como comunidad argentina, pero es una comunidad de **Uruguay**.
- Las URLs de ejemplos de Reddit como `r/empleos_AR/comments/1x4ic4i` y `r/UNLaM/comments/1x5z71u` **no pudieron recuperarse de manera independiente** en la revisión del 01/11; estado `NO_VERIFICADO`, aunque el informe diga «verificado».
- Los puntajes de 60–74 asignados a subreddits reflejan existencia de comunidades y observaciones históricas, no pruebas de que produzcan alumnos nuevos cada semana.

## Advertencia crítica sobre automatización comercial de Reddit

El informe presenta `reddit.com/search.rss` y las rutas `/new/.rss` como método gratuito y listo para encender de inmediato. **No se incorpora esa recomendación sin autorización.**

La política [Reddit Data API Terms, revisada 2026-07-20](https://redditinc.com/policies/data-api-terms) especifica que el uso comercial de API requiere acuerdo separado. [Reddit Developer Platform & Accessing Reddit Data](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data) y [Responsible Builder Policy](https://mods.reddithelp.com/hc/en-us/articles/16693988535309-Moderation-Bots-Tooling) agregan requerimientos de autorización y transparencia para aplicaciones/bots.

**Visibilidad pública o feed RSS no implica licencia comercial**; evitar programar monitor de 4–6 lecturas diarias o convertir RSS de Reddit en `rss_foros` sin aprobación. Se conserva **revisión manual individual** y registro solo de enlaces, sin extraer datos privados ni contactar a terceros.

## Aplicación operativa de la sexta investigación

1. **P0: Tusclases Argentina**. Ya estaba en el catálogo; preferir alertas oficiales y lectura manual sin scraping. Nueva evidencia no equivale a un conector web autónomo.
2. **P1: alertas Google/Talkwalker**. Investigar creación explícita de alertas públicas por términos de alta intención, sólo con mecanismos oficiales y sin perfiles privados. Las alertas no garantizan nuevos alumnos: medir ruido y duplicación.
3. **P2: comunidades Reddit r/LaPlataCiudad, r/UNLaM, r/BuenosAires, r/Matematicas**. Solo vigilancia manual hasta corroborar ejemplos, reglas y permisos. No activar RSS/API.
4. **P2: Facebook comunidades temáticas**. Acceso según normas de cada grupo; sin extracción automática ni mensajes masivos.
5. **C: directorios docentes**: perfiles y marketing entrante, conservar como otro proyecto; no contarlos en solicitudes abiertas.
6. **D: sin cuota**, incluyendo YouTube, directorios sin demanda y foros de apuntes.

## Relación con el piloto técnico

La entrada [PR #15](https://github.com/metecondrie/student-lead-discovery-agent/pull/15), `solicitudes_verificadas`, lee **únicamente** la hoja STAGING `Piloto_Demanda_20261101` (8 avisos revisados, 4 preseleccionados, 3 ya contactados y uno sin fecha). Se diseñó un nuevo registro `CAT-0240` **desactivado**, para que los avisos manualmente validados ingresen al clasificador y al CRM sin scraping ni mensajes automáticos. **No se desplegó.**

La investigación sexta incrementa el inventario documental, **no agrega fuentes activas ni crea por sí misma contactos comerciales**. Si aparece un pedido público nuevo y vigente de Reddit/Facebook, puede evaluarse manualmente antes de incluirlo como solicitud individual en una futura entrada autorizada.

## Decisión

- **Aceptar** el libro como inventario de exploración y la idea de alertas de búsqueda autorizadas.
- **No importar** las 76 filas en la hoja `Fuentes` ni publicar su contenido completo sin verificación externa y control de permisos.
- **No adoptar** «9 fuentes A verificadas» como medición de rendimiento.
- **No activar** monitoreo RSS de Reddit ni hacer contacto automático.

Fecha de corte: 2026-11-01. Ningún servicio externo fue modificado por esta adenda.
