# ROADMAP — prioridades verificables

Actualizado: 2026-11-01. Los ítems marcados «documentado» no equivalen a «desplegado y validado».

## Documentación / continuidad
- [x] Publicar `AGENTS.md`, `docs/ESTADO_ACTUAL.md` y `docs/ESTRATEGIA_CAPTACION.md` en `main` y la rama candidata.
- [x] Señalar la rama que contiene el código actual y el carácter público del repositorio.
- [x] Separar documentación técnica, estados históricos y datos privados externos.

## Verificar estado técnico antes de tocar sistemas
- [ ] Confirmar HEAD actual y comparar archivos de GitHub con STAGING mediante copia de solo lectura y hashes.
- [ ] Validar respuesta de web app `/exec`, despliegue/versiones y permisos, sin confundirlos con pruebas simuladas.
- [ ] Inspeccionar cola y triggers de la corrida antigua; determinar si sigue activa, pausada o quedó con estado obsoleto. No sobrescribirla.
- [ ] Ejecutar `npm test` y examinar GitHub Actions en la rama candidata.
- [ ] Verificar cuota y disponibilidad real del modelo Gemini, llamadas YouTube y RSS autorizados.
- [ ] Revisar privacidad del repositorio **público**, secretos e información personal en historial/código.

## Calidad de captación y deduplicación
- [ ] Unificar URLs de alertas Tusclases por ID canónico de anuncio (parámetros de tracking ≠ oportunidades nuevas).
- [ ] Excluir avisos administrativos de Superprof y notificaciones sin intención real de solicitar clases.
- [ ] Integrar consulta previa de Gmail `Enviados`, confirmaciones `Recibidos` de Tusclases y CRM `Contactados`.
- [ ] Marcar como incierto un contacto que pudo hacerse por mensajería interna no accesible.
- [ ] Probar con datos sintéticos: mismo anuncio en tres alertas, contacto previo confirmado, falso positivo administrativo, falta de acceso.
- [ ] Auditar métricas de alumnos únicos, respuestas y reservas frente a cantidad de alertas.

## Estrategia comercial docente
- [ ] Captación manual dirigida a solicitudes nuevas de clases **online** con autorización de publicación/contacto.
- [ ] Probar oferta de intensivos preexamen y grupos pequeños compatibles.
- [ ] Preparar un video corto reutilizable en YouTube Shorts, Instagram y TikTok; medir consultas.
- [ ] Crear contenidos largos de YouTube y blog gratuito, después de habilitar canal de conversión verificable.

## Condiciones para integrar y desplegar
- [ ] Pruebas actualizadas, piloto real acotado y seguridad revisada.
- [ ] Aprobación explícita del usuario para cualquier cambio en Apps Script/Sheets, triggers, envíos o publicaciones.
- [ ] Estrategia de rollback comprobada y datos de prueba segregados.
- [ ] Solo entonces evaluar merge a `main`, sin prometer funcionamiento no verificado.

Ver [estado actual](ESTADO_ACTUAL.md) y [AGENTS.md](../AGENTS.md).
