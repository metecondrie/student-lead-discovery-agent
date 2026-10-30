# Arquitectura técnica — Diseño previsto

1. **Fuentes y conectores.** Registro de puntos de entrada con tipo, URL, permiso, estado de verificación, fecha de revisión y conector. YouTube: API oficial; sitios con RSS: lector de feeds; avisos de plataformas: alertas por correo; plataformas restringidas: revisión manual.
2. **Ingesta.** Lectura incremental y acotada por cuota; cada error de conector se aísla sin interrumpir los demás.
3. **Normalización.** URLs canónicas (incluidos enlaces de seguimiento), fechas originales, extracción conservadora de nombres y hash estable por publicación.
4. **Cola.** Persistencia e idempotencia: cada elemento se procesa una sola vez aunque el servicio se reinicie.
5. **Clasificación.** Reglas deterministas para exclusiones obvias; Gemini Flash-Lite para intención comercial, materias, modalidad y calidad de evidencia. Resultado validado con esquema y estado de incertidumbre.
6. **Contactabilidad.** Distinguir solicitudes abiertas, preguntas dirigidas a otros creadores, vías públicas autorizadas y ausencia de canal. No presumir correo electrónico a partir de un usuario social.
7. **Revisión humana.** Google Sheets almacena candidaturas justificadas; Gmail avisa únicamente al propietario. Los enlaces profesionales y conversiones ARS/USD solo aparecen cuando se configuran y verifican.
8. **Observabilidad.** Contadores de consultas, consumo de cuotas, volumen descartado, duplicados y precisión revisada manualmente.

**Límite arquitectónico:** un catálogo de fuentes no implica capacidad técnica ni autorización para consultar automáticamente todas ellas.
