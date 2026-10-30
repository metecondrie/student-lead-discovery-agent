# Estado de implementación — 2026-10-30

## Integrado en desarrollo

- Google Apps Script / Gmail / Sheets / RSS / YouTube.
- Catálogo de 239 puntos de entrada, **todos desactivados salvo activación manual**.
- Gemini 3.5 Flash-Lite, cola persistente y aprobación semántica conectada al flujo de oportunidades.
- Contactabilidad multired, equivalentes ARS/USD solo con cotización vigente y perfiles docentes opcionales.
- Sistema desactivado por defecto. No hay mensajes automáticos a estudiantes.
- **90/90 pruebas locales simuladas aprobadas.**

## Limitaciones conocidas

- No se verificaron aún las credenciales, cuotas reales ni disponibilidad individual de las fuentes activables.
- Instagram, TikTok, Facebook y otras plataformas restringidas **no** tienen conectores automáticos funcionales en esta versión.
- La migración de una planilla existente requiere ensayo previo con una copia de los registros reales.
- Las pruebas del conector YouTube se basan en respuestas simuladas; los IDs y comentarios requieren validación en vivo.
- Faltan URL reales de perfiles docentes y verificar condiciones de publicación de las plataformas.
- Antes de un despliegue, validar privacidad, tratamiento de datos de menores, reintentos, cuotas y supervisión.

## Próxima etapa

1. Revisar GitHub Actions.
2. Probar permisos y cuotas de la API Gemini.
3. Validar el conector YouTube con un video y sin publicar respuestas.
4. Ensayar la migración de Sheets sin alterar el original.
5. Piloto corto con revisión manual de los resultados.

**No desplegar en producción todavía.**