# Piloto de solicitudes verificadas (sin scraping) — 2026-11-01

## Estado de implementación

- **Código**: PR [#15](https://github.com/metecondrie/student-lead-discovery-agent/pull/15), rama `feature/entrada-solicitudes-verificadas-20261101`, basado en PR #14.
- **Suite Node/GitHub Actions**: 171/171 aprobados en `d1ed8ec873075030e5ddc2af3329f60ab0d5058f`. Simulan Apps Script y servicios: **NO** prueban ejecución real de Gemini/Gmail.
- **STAGING**: hoja `Piloto_Demanda_20261101` contiene ocho anuncios revisados; se agregó fila `CAT-0240` a `Fuentes` como conector `solicitudes_verificadas`, **Activo=FALSE**, `PENDIENTE_DESPLIEGUE`. No se editaron datos de esas ocho fichas.
- **Despliegue Apps Script**: **NO REALIZADO**. No hay acceso a Scripts/trigger/propiedades desde esta conexión; no afirmar que el panel ejecute el nuevo conector.
- **Permisos y seguridad**: antes de desplegar, verificar acceso a web app (preferiblemente Solo yo; especialmente prohibido Anyone + Execute as me), seguridad de scripts y estado de triggers. Sin cambio de configuración activo.

## Por qué esta entrada existe

El catálogo de 239 fuentes confunde «vista» con «conector»: URLs de Tusclases marcadas `gmail_alertas` **no visitan esos sitios**. Este código permite que una persona verifique un aviso público, lo registre en una hoja privada y el orquestador reutilice la validación de materia, contactos previos y el clasificador Gemini. No intenta automatizar páginas de Tusclases ni leer Facebook/Reddit, lo que requiere permisos independientes.

## Modelo de datos y filtros

Fuente: hoja privada `Piloto_Demanda_20261101`. Cabeceras obligatorias:
`ID aviso | País | Fuente | URL pública | Materia | Fecha visible | Modalidad en ficha | Estado piloto | Historial verificado | Motivo/acción | Método`.

Se preseleccionan únicamente filas con estado `PENDIENTE_ELEGIBILIDAD` o `APTO_PARA_CLASIFICAR`, URL HTTPS de anuncio en dominios exactos permitidos, ID numérico idéntico al de URL, fecha `YYYY-MM-DD` válida no futura y dentro del máximo configurado (por defecto diez días), materia y modalidad online. No se infiere fecha. URLs de inbox, perfiles o dominios parecidos quedan fuera. Todo dato permanece en STAGING; en GitHub solo hay código/fixture ficticios.

Las filas `EXCLUIDO_CONTACTADO` o `VERIFICAR_FECHA` **nunca pasan a Gemini**. Antes de clasificar se comprueban IDs previos en `OrqHallazgos`, hoja `Contactados`, recibos de Tusclases y Gmail Enviados. Cuando la verificación de mensajería interna de plataforma sigue pendiente, la salida positiva se marca **`VERIFICAR_CONTACTO`** y `contactabilidad=no_verificada`. El criterio del LLM nunca equivale a permiso de mensaje.

## Qué hará otra IA con acceso al proyecto Apps Script

1. Revisar rama PR #15, [AGENTS](../AGENTS.md), este documento y [checklist de despliegue](VERIFICAR_DESPLIEGUE_APPS_SCRIPT_2026-11-01.md).
2. Ejecutar `npm test` local / comprobar CI verde en último commit. Revisar diff del conector, orquestador, UI y pruebas.
3. Inspeccionar **sin modificar** el proyecto Apps Script STAGING real, rama HEAD y `versionNumber` del despliegue. Identificar si hay cambios no versionados en Apps Script. Confirmar que la copia local de `gas/SolicitudesVerificadas.js` se incluye en el empaquetado junto con `gas/Orquestador.js` y la UI.
4. Confirmar acceso al web app limitado y control de triggers; en particular `SISTEMA_ACTIVO=FALSE` y corrida anterior finalizada.
5. Antes de cualquier push o despliegue, comparar y respaldar los archivos reales: **no sobrescribir cambios nuevos de STAGING**. No usar proyecto PROD. Pedir aprobación específica para cualquier modificación del despliegue.
6. Una vez desplegado con permiso y acceso seguro, llamar `orqPreviewSolicitudesVerificadas()`: debe devolver `SOLO_LECTURA`, ocho examinadas, cuatro preseleccionadas si aún están dentro de los diez días, cuatro excluidas por estado. Ninguna llamada a Gemini, Gmail, Sheets write o sitios externos.
7. Mantener `CAT-0240` desactivada hasta verificar preview y las pruebas de integración. Para un test funcional autorizado, habilitar **solo esa fila**, no `ALL_ENABLED`, iniciar un máximo de cinco ítems, comprobar `OrqCola`, `OrqFuentes`, `OrqHallazgos` y revertir `Activo=FALSE` después.
8. Comprobar que el mensaje al alumno no se envió y que cada oportunidad figura como `VERIFICAR_CONTACTO`, sin autorización de contacto atribuida; cotejar historial real y elegibilidad AR.
9. Registrar fecha, versión, métricas reales y costos. Actualizar documentación y biblioteca. Si falla una validación, no desplegar ni forzar.
10. **No añadir un scraper a Tusclases** ni usar RSS/API comercial de Reddit sin permisos.

## Métricas esperadas del pequeño piloto real

En el corte del 2026-11-01 la hoja contiene: ocho anuncios, cuatro marcados `PENDIENTE_ELEGIBILIDAD` (Chile x3, Colombia x1), tres `EXCLUIDO_CONTACTADO` (Argentina) y uno `VERIFICAR_FECHA` (Argentina). El número de preseleccionados caerá con el paso de los días; **no editar fechas para conseguir resultados**.

El resultado de la ejecución del clasificador real es **desconocido** hasta que ocurra con consentimiento y se mida; no prometer cuatro candidatos comerciales ni cuatro contactos.
