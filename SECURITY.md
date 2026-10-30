# Seguridad y privacidad

**No añadir al repositorio:** claves API de Gemini o YouTube, tokens OAuth, archivos `.clasp.json`, hojas reales, datos identificatorios de estudiantes, correos exportados, listas de contactados, logs privados o información obtenida en grupos cerrados.

## Credenciales
Guardar claves operativas en Script Properties de Google Apps Script (y nunca en una hoja compartida). Usar proyectos separados cuando sea posible. Revocar inmediatamente cualquier credencial expuesta por error. No incrustar claves temporales en funciones que puedan quedar versionadas.

## Restricciones de uso
- No enviar correos, DM ni comentarios promocionales automáticamente.
- El nombre de usuario y el enlace a un comentario **no** acreditan consentimiento para contacto privado.
- Respetar políticas, permisos y límites de las APIs y sitios.
- Minimizar la retención de contenido y tratar los datos de menores con especial cuidado.
- Excluir fuentes privadas o restringidas salvo autorización específica.
- Evitar enviar textos personales a servicios externos cuando no sea necesario para la clasificación.

## Despliegue
`SISTEMA_ACTIVO=false` y envío automático desactivado durante pruebas. Habilitar componentes por separado después de validar tasas, duplicados, errores de API, recuperación tras fallos y monitoreo.
