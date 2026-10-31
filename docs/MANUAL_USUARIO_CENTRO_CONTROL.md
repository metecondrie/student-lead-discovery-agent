# Manual de usuario — Centro de Control de Captación de Alumnos

**Versión 1.1 (STAGING, 30/10/2026).** Uso personal. Esta documentación describe el sistema actual y sus límites comprobados, no promete que las 239 fuentes puedan rastrearse automáticamente.

## 1. Objetivo y acceso

Abrí la aplicación web privada de Apps Script en Chrome. El sistema busca señales de demanda de clases particulares de matemática, física, química y biología. Ejecuta trabajos automáticamente, guarda resultados en Google Sheets y propone **candidatos para revisión humana**. No manda mensajes por su cuenta, no publica anuncios y no contrata alumnos. STAGING es un entorno de pruebas, no producción.

En este momento el catálogo central contiene **239 entradas** de diferentes plataformas. Solamente las fuentes con un conector admitido y **Activo=TRUE** en la hoja `Fuentes` pueden ejecutarse. Tener una fuente en el catálogo, o un conector asignado, **no garantiza** que la API, feed o sitio funcione ni que existan potenciales alumnos.

## 2. Qué hace cada control

| Control | Acción | Qué no hace |
|---|---|---|
| **Buscar alumnos** | Crea una corrida y una cola para todas las fuentes habilitadas; procesa la primera tarea y programa las restantes | No contacta alumnos ni consulta fuentes inactivas |
| **Detener** | Solicita parar los trabajos restantes; los resultados ya escritos permanecen | No borra el historial |
| **Consultar estado** | Actualiza los datos visibles | No ejecuta ni reanuda nuevas búsquedas |
| **Reanudar corrida pausada** | Intenta continuar una corrida detenida por cuotas cuando las condiciones lo permiten | No agrega nuevas fuentes a la corrida |
| **Recorrer todas las fuentes operativas habilitadas** | Usa automáticamente las fuentes con un conector reconocido y `Activo=TRUE` | No ejecuta las 239 entradas del catálogo ni elimina permisos de acceso |
| **Máx. ítems por fuente** | Define un límite pequeño de consulta/procesamiento para controlar tiempo/cuotas | No garantiza cobertura exhaustiva, especialmente de feeds o canales muy activos |

La interfaz consulta automáticamente el estado cada **10 segundos**. No es necesario pulsar «Consultar estado» constantemente.

**Aclaración importante:** si «Detener» aparece gris, significa que no hay corrida en curso (o que ya hay una operación en tránsito); **no significa que el usuario haya detenido una corrida finalizada**.

## 3. Estados del orquestador

- `SIN_CORRIDAS`: el centro de control todavía no ejecutó una búsqueda.
- `EJECUTANDO`: existen trabajos en cola que pueden continuar mediante disparadores temporales.
- `FINALIZADO`: se recorrieron todos los trabajos programados. **No implica que hayan aparecido alumnos**. Conviene comprobar errores y resultados por fuente.
- `DETENIDO`: se solicitó detener una corrida; no se ejecutan los trabajos pendientes.
- `PAUSADO_CUOTA`: se alcanzó un límite de API/modelo. El sistema puede necesitar esperar un restablecimiento de cuota.
- `ERROR`: hubo un problema general que requiere revisar los detalles.

**100 % de progreso = trabajos procesados / trabajos programados.** No equivale al porcentaje de las 239 fuentes, ni a porcentaje de alumnos encontrados.

Estados por fuente: `OK` (consulta sin error aparente), `SIN_COMENTARIOS_RECIENTES` (YouTube sin comentarios dentro de la ventana consultada), `SIN_NOVEDADES` (feed sin publicaciones), `ERROR_RESOLUCION` (no se pudo identificar un canal), `ERROR_HTTP_...` (falló la consulta externa), `PARCIAL` (resultado incompleto por limitación).

## 4. Cómo leer las métricas

- **Leídos:** publicaciones, comentarios o avisos recuperados por el conector.
- **Clasificados por Gemini:** elementos efectivamente evaluados con una respuesta válida del clasificador; **no todos los leídos pasan los filtros previos**. Algunos conectores aplican además heurísticas.
- **Solicitudes:** textos detectados como demandas de clases.
- **Candidatos:** solicitudes que cumplen filtros comerciales y de contactabilidad; revisar siempre la fuente original antes de responder.
- **Repetidos:** ítems cuyo identificador ya había sido guardado, no vuelven a clasificarse.
- **Errores:** fallos técnicos o de procesamiento registrados.
- **Llamadas YouTube/Gemini:** consumos observados por la corrida; no son equivalentes a alumnos.

**Auditoría de descartes (versión nueva):** la pestaña `OrqAuditoria` registra el ID/enlace/título reducido de cada publicación RSS y el motivo de excluirla. El panel muestra el número de descartados por tipo; los comentarios antiguos omitidos por YouTube se resumen en forma agregada. Los motivos posibles son `FUERA_DE_VENTANA_14_DIAS`, `FECHA_DESCONOCIDA`, `FECHA_FUTURA`, `SIN_PALABRAS_CLAVE`, `YA_PROCESADO`, y `FILTROS_SUPERADOS` para los que sí se envían al clasificador.

**Primera corrida real (30/10/2026):** corrida `ORQ-20261030-233924-92f331`; procesó dos fuentes, 5 publicaciones RSS leídas, 0 comentarios recientes de YouTube, 0 respuestas Gemini, 0 candidatos, 0 errores; finalizó en 85,1 segundos de tiempo de pared. La primera versión no guardó razones de descarte de esos cinco ítems. No inferir que todos eran irrelevantes sin ver la auditoría de una corrida posterior.

## 5. Fuentes y alcance real

La hoja `Fuentes` es el inventario central. Sus columnas incluyen: identificador, plataforma, nombre, materia, URL, identificador externo, `Activo`, conector y estado de verificación.

Para activar una fuente nueva, comprobá que el enlace sea correcto y que el conector esté disponible. Cambiá **solo la celda de `Activo` de esa fuente** a `TRUE`. El centro de control la incluirá cuando pulses «Buscar alumnos» (no hace falta darle un prompt a Antigravity). Para desactivarla poné `FALSE`; una corrida ya iniciada puede conservar la tarea en cola, por eso conviene esperar al siguiente ciclo o detenerla.

Fuentes conectadas en esta versión: comentarios recientes de canales de YouTube, un feed RSS/Atom público de UTNianos y búsqueda de alertas específicas en Gmail (sujeta a que existan correos autorizados). Para Facebook Groups, comentarios de Reels de Instagram ajenos, TikTok, Reddit sin acceso aprobado y grupos privados, **no hay un conector operativo validado**. Que estén catalogados no equivale a haberlos rastreado.

## 6. Dónde consultar los resultados

La planilla de STAGING es la fuente de verdad:

- `Fuentes`: catálogo y activación.
- `Fuentes_Backup_...`: copia anterior a la migración; no modificar.
- `OrqCorridas`: fecha, estado, contadores y duración de cada ejecución.
- `OrqCola`: tareas programadas, procesadas, pendientes o pausadas.
- `OrqFuentes`: resultado específico de cada conector/fuente.
- `OrqHallazgos`: publicaciones que llegaron a clasificación y candidatos revisables.
- `OrqAuditoria`: registros de exclusión de RSS y resumen de exclusiones temporales de YouTube; creada solo tras ejecutar la versión con auditoría.

## 7. Qué hacer al encontrar un candidato

Abrí el enlace original, comprobá que la solicitud siga vigente, que sea una petición abierta y que exista una forma apropiada y permitida de responder. Si sirve, redactá una respuesta personalizada; **el sistema no envía mensajes automáticamente**. No contactes a usuarios que únicamente agradecen al creador ni publiques respuestas masivas.

## 8. Problemas frecuentes

**100 % y cero candidatos.** La corrida terminó, pero podría haber cero publicaciones recientes, cero textos que pasaron filtros, o datos insuficientes. Mirá `OrqFuentes` y `OrqAuditoria`; no repitas automáticamente la misma consulta sin entender el motivo.

**«Sin comentarios recientes».** El canal respondió, pero la ventana de fechas (actualmente 14 días) no produjo comentarios recientes entre los recuperados. No significa que el canal nunca reciba consultas.

**«No hay fuentes habilitadas».** Todas las filas siguen en FALSE. Activá manualmente solo las que querés buscar.

**«PAUSADO_CUOTA».** No vuelvas a pulsar «Buscar alumnos» para intentar forzar una corrida nueva: revisá el estado y el botón de reanudación o esperá el siguiente reinicio de cuota.

**«Detener» gris.** Comportamiento normal al concluir una corrida.

**No aparece un conector.** Registrarlo en `Fuentes` no lo implementa; requiere desarrollo y permisos específicos. La cifra de «fuentes operativas» en el panel clasifica conectores asignados, no accesibilidad verificada en vivo.

**Actualicé GitHub pero el panel se ve igual.** La URL de una implementación web `/exec` puede usar una versión congelada. Hace falta sincronizar STAGING y crear/actualizar una implementación para el nuevo código; no se modifica sola con un commit.

## 9. Privacidad y costos

El sistema lee mensajes de plataformas donde tenés acceso y contenido público permitido. Las claves de API permanecen en las propiedades del script, no se copian al navegador. No pegues secretos en capturas ni correos. Mantener STAGING separado de producción. Las llamadas de APIs/modelos consumen cuotas y, según plan de proveedor, pueden tener costos; revisar los límites de configuración antes de ampliar la búsqueda.

**Glosario:** *fuente* = canal/foro/alerta registrada; *conector* = programa que sabe consultar una plataforma; *corrida* = búsqueda iniciada con un clic; *job* = tarea para una fuente; *candidato* = posible solicitud para que la revises; *trigger* = tarea programada que permite continuar sin navegador abierto.

---

**Notas de versión:** la auditoría de descartes y el acceso al manual están implementados en la rama de desarrollo `feature/auditoria-descartes-manual`. Solo aparecerán en el panel luego de sincronizar y actualizar el despliegue privado.