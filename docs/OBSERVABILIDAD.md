# Observabilidad y briefing por ejecución

**Estado:** especificación de implementación; no desplegado en STAGING ni producción.

## Semántica de los indicadores

- **Fuentes consultadas:** conectores/sitios efectivamente interrogados, no fuentes existentes en catálogo.
- **Recursos consultados:** videos, feeds, URLs de avisos u otros recursos específicos recorridos.
- **Publicaciones leídas:** comentarios/mensajes/posts recibidos de conectores. No equivale a personas únicas ni a publicidad vista.
- **Registros evaluados:** publicaciones pasadas por reglas o Gemini. Una misma publicación puede transitar por ambas etapas, pero debe contarse una sola vez como unidad detectada.
- **Duplicados:** identificadores canónicos ya existentes.
- **Descartes:** separación por motivo (sin intención de contratación, publicidad de otro profesor, dirigido al creador, fuera de materias, sin vía de contacto, etc.).
- **Pendientes de IA / revisiones manuales:** resultados que no llegaron a una decisión comercial.
- **Oportunidades calificadas:** nuevas solicitudes abiertas, contactables y compatibles; no equivale a contratos.
- **Contactados, respuestas, reservas y cobros:** etapas reales del CRM, solo cuando se registran explícitamente.
- **Geografía:** país/región *declarada o provista explícitamente*; nunca inferir residencia de idioma, YouTube/TikTok o IP inexistente; «Desconocido» es un valor importante.

## Campos por corrida

ID corrida, inicio y fin en zona horaria, duración real en segundos, modo (manual/automático/simulación), estado, conectores activos y consultados, fuentes con error, recursos leídos, publicaciones procesadas, duplicados, descartados, pendientes IA, modelos IA, solicitudes realizadas, cuotas consumidas, oportunidades nuevas, oportunidades altas, avisos al propietario, errores y tiempo por conector.

Se requiere desglose por plataforma, fuente/ID, materia, nivel y país/región cuando esté documentado. Para retención mínima, las métricas históricas son **agregadas**, sin nombres ni textos de menores.

## Persistencia en Sheets

1. Mantener `Ejecuciones` (sus 10 columnas existentes no se desplazan): agregar identificador y duración al final solamente si se implementa migración aditiva.
2. Nueva `MetricasFuente`: una fila por corrida y fuente, con intentos, leídos, evaluados, descartados, duplicados, pendientes IA, oportunidades, fallos, latencia y cuotas.
3. Nueva `MetricasSegmento`: una fila por corrida/dimensión/valor/conteo; dimensiones Materia, Nivel, Plataforma, Contactabilidad, País/Región.
4. Nueva `Briefings`: un resumen textual por corrida e indicadores totales. Proveer enlace a la hoja.
5. No borrar estadísticas ni modificar hojas operativas existentes.

## Distribución

- Guardar resumen por ejecución **incluso si hay 0 oportunidades**.
- Correo al propietario configurable (`BRIEFING_EMAIL`, desactivado por defecto mientras se prueba), separado de alertas urgentes.
- No enviar correo a alumnos.
- Para intervalos horarios evitar inundar la bandeja: opción de resumen diario o correo solo al ejecutar manualmente.

## Ejemplo (datos ilustrativos, NO reales)

```text
Corrida DEMO-001 · 3m 18s · finalizada con advertencias
Fuentes efectivamente consultadas: 8 / 20 activas
Publicaciones leídas: 241 (no personas alcanzadas)
Duplicadas: 96 · descartadas: 119 · pendientes IA: 18
Oportunidades nuevas: 8 · contactables: 5 · prioridad alta: 3
Por materia: Matemática 4, Física 2, Química 2
País: Argentina declarada 2, Perú declarada 1, sin datos 5
Gemini: 4 solicitudes API · 0 pagos confirmados
Errores: 1 (fuente sin respuesta)
```

## Criterios de aceptación

- Una corrida que encuentra 0 alumnos guarda un briefing y estadísticas de fuente.
- No inventa un denominador de personas alcanzadas ni ubicaciones.
- Las estadísticas son consistentes con las filas realmente agregadas a Oportunidades.
- No cuenta dos veces un mismo ítem cuando sale de `_cola_ia`.
- Las cuotas de Gemini y YouTube son medidas por contador, no supuestos monetarios.
- Errores parciales no silencian resultados de conectores restantes.
- Pruebas de regresión y dry-run sin escrituras persistentes.
- `SISTEMA_ACTIVO=false`, sin triggers ni mensajes a terceros durante STAGING.
