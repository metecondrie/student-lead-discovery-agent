# Integración y pruebas — prototipo (2026-10-30)

Esta rama integra el catálogo de 239 fuentes de investigación de Antigravity y las mejoras de contactabilidad, referencias profesionales y precios orientativos ARS/USD.

El código ha pasado **90 pruebas locales sin red ni envíos a alumnos**. No implica validación de APIs en producción.

## Qué contiene
- `gas/Core.js`: parseo, puntuación, deduplicación, contactabilidad, plantillas y salida estructurada Gemini.
- `gas/Main.js`: Sheets, Gmail, conectores, Script Properties y cola persistente para Gemini.
- `gas/Catalogo.js`: catálogo de 239 entradas **desactivadas**, pendiente de verificación por fuente.
- `tests/core.test.js` y `tests/integration.extra.test.js`: casos de regresión y pruebas de extremo a extremo con simulaciones.

## Protección
- `SISTEMA_ACTIVO=false` por defecto.
- `GEMINI_ACTIVO=false` y `YOUTUBE_ACTIVO=false`.
- La carga de claves se realiza en Script Properties; no almacenarlas en repositorios ni celdas.
- Las decisiones de Gemini sobre solicitudes proactivas se conectan con el alta en `Oportunidades`.
- Una solicitud dirigida a otro creador o sin vía de contacto razonable no recibe borrador comercial.
- **Ningún envío automático a terceros**.

## Próxima auditoría
1. Ejecutar `npm test` sobre esta rama.
2. Probar una copia de la hoja de Sheets; comprobar que los datos y encabezados existentes sobreviven.
3. Verificar la disponibilidad del modelo `gemini-3.5-flash-lite` y los límites gratuitos de la propia cuenta.
4. Verificar IDs concretos de videos, enlaces y cuotas de YouTube.
5. Evaluar manualmente falsos positivos con solicitudes auténticas, sin generar spam.
6. Recién después desplegar, sin habilitar el motor ni instalar disparadores sin autorización.

El ZIP validado puede conservarse como copia local de recuperación. No incluye claves API reales.
