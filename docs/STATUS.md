# Estado de implementación y auditoría

Fecha de referencia: 2026-10-30. No confundir pruebas simuladas con resultados de producción.

| Área | Estado |
| --- | --- |
| Carpeta local y 80 pruebas Node | Verificado en una copia entregada por Antigravity |
| Base maestra: 239 puntos de entrada | Catálogo preparado; accesibilidad variable |
| Google Apps Script / Sheets / Gmail | Prototipo; no desplegado desde este repositorio |
| Deduplicación de Tusclases | Pruebas de regresión; requiere piloto real |
| YouTube | Conector y límites en prototipo; requiere verificar videos y permisos |
| Gemini | **Bloqueado:** configuración local usa modelo 2.0 Flash-Lite, retirado en junio 2026 |
| Integración de decisiones Gemini | Requiere verificar que afecten clasificación y alertas, no solo estado de cola |
| Contactabilidad + precio internacional + perfiles docentes | Existe prototipo separado; pendiente de integración |
| Datos reales, tokens y secretos | No deben publicarse |
| Contacto automático | Deshabilitado y fuera del alcance inicial |

## Criterios de salida
- API Gemini vigente y límites del plan comprobados.
- Resultados de Gemini conectados al filtrado de oportunidades con pruebas end-to-end.
- Una sola versión integrada de los cambios, sin regresiones.
- Casos reales de duplicación, falsos positivos y notificaciones aprobados.
- Sistema apagado por defecto; habilitación explícita y reversible.
- Revisión final de privacidad, licencias y secretos antes de convertirlo en público.
