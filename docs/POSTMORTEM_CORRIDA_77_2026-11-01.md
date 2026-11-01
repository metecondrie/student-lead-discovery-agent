# Postmortem — corrida STAGING de 77 fuentes (2026-11-01)

**Alcance:** lectura cruzada de `OrqCorridas`, `OrqCola`, `OrqFuentes` y `OrqHallazgos`, más revisión del código en GitHub. **No se consultó directamente el despliegue Apps Script ni sus triggers.** No se extrajeron datos personales de estudiantes. Instantánea final del 1/11/2026.

## Resultado final

| Métrica | Valor |
|---|---:|
| Fuentes en cola | 77 |
| Estado de corrida en OrqCorridas | FINALIZADO |
| Elementos leídos | 482 |
| Elementos clasificados persistidos | 350 |
| Posibles solicitudes | 6 |
| Oportunidades para revisión | **0** |
| Últimos resultados por fuente sin error | **47** |
| Fuentes cuyo último registro es error | **30** |
| Estado de cola COMPLETADO | 63 |
| Estado de cola ERROR | 14 |
| **Discordancia: COMPLETADO en cola con error en resultados** | **16** |

Los **16 falsos completados** consisten en **13 fuentes Gmail** con `ERROR_GMAIL` (`th.getMessages is not a function`) y **3 fuentes YouTube** con `ERROR_RESOLUCION`. Las 14 restantes con errores aparecen como `ERROR` también en cola. Es decir, **63 - 16 = 47** completados sin error, y **14 + 16 = 30** errores por último registro.

El resumen `OrqCorridas` registró 47 «Fuentes completas» y 30 errores; ese resumen concuerda con los **últimos resultados** y discrepa con la cola, que sigue reportando 63 COMPLETADO. Cualquier pantalla que utilice directamente la cola sobreestima completados. Una fuente sin error puede haber terminado SIN_COMENTARIOS_RECIENTES: no confundir ejecución correcta con contacto comercial.

### Embudo de oportunidades
- 347 resultados clasificados proceden de YouTube y **3** de alertas Gmail.
- Las **6 solicitudes detectadas** en YouTube estaban dirigidas al creador del contenido, no a cualquier profesor. Fueron correctamente descartadas como oportunidades de contacto comercial.
- **0 candidatos**, por combinación de baja intención de las fuentes y fallas en la vía de alta demanda (alertas Gmail).

## Diagnóstico prioritario

1. **Error de estado final en cola:** el código desplegado en alguna parte del recorrido pudo marcar como COMPLETADO un resultado `ERROR_GMAIL` / `ERROR_RESOLUCION`. La rama candidata en GitHub contiene validación de `/^ERROR/` al decidir la cola, pero **no se ha cotejado su versión con STAGING**. No concluir que el código GitHub causó el error sin comparar despliegue/historia de commits.
2. **Fallo Gmail:** en una llamada real `GmailApp.search` debería obtenerse `GmailThread`. El texto `th.getMessages is not a function` requiere reproducirse o verificar si el código desplegado aún intenta reutilizar objetos serializados. El [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12) incorpora validación y rehidratación defensiva; tests locales verdes **no validan el despliegue real**.
3. **Fuentes equivocadas para obtener alumnos:** muchos comentarios de canales de terceros son elogios o consultas al profesor que publicó el video. Es correcta la exclusión de pedidos dirigidos a ese profesor; cambiarla para inflar candidatos sería contrario a la finalidad.
4. **Cuotas gastadas en resultados poco útiles:** restringir el siguiente ensayo a fuentes de intención comercial verificable y pocos lotes. No hacer otra corrida de 77 fuentes a ciegas.
5. **Gmail «fuentes» nominales:** 23 entradas del catálogo usan búsquedas de un mismo buzón; no son 23 rastreadores de los sitios enlazados.

## Intervenciones ya realizadas en GitHub (NO desplegadas)

- [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12): protección Gmail, pruebas de regresión, CI para ramas `fix/**`, resumen «Fuentes completas» basado en `OrqCola` y test de desacuerdo histórico; ver el HEAD y la suite verde actual.
- `orqPreviewPilotoComercial()`: función de **solo lectura** que propone 4 fuentes y detecta fuentes fallidas, sin llamadas a APIs externas ni modificación de colas, triggers o configuración.
- [Inventario de 77 fuentes](AUDITORIA_FUENTES_2026-11-01.md), [plan de piloto de cuatro](https://github.com/metecondrie/student-lead-discovery-agent/blob/fix/gmail-diagnostico-y-piloto-20261101/docs/PILOTO_COMERCIAL_2026-11-01.md).

## Próxima etapa de trabajo (no improvisar despliegue)

1. Comprobar por medios autorizados versión y código de Apps Script STAGING, `ORQ_RUN` y triggers, sin escribir sobre datos; la corrida **figura finalizada en la hoja**, pero eso no certifica el estado de Script Properties.
2. Comparar exactamente `gas/Orquestador.js` entre STAGING y HEAD del PR #12, con lectura/backup antes de modificar nada.
3. Reproducir el error Gmail y la discordancia de cola en entorno controlado; corregir la **transición de estado**, además de la columna resumen.
4. Añadir test end-to-end que obligue a que `ERROR_GMAIL` y `ERROR_RESOLUCION` dejen el trabajo en cola `ERROR`, sin generar falsos completados, y migración/reconciliación segura de corridas históricas (solo con autorización expresa).
5. Validar un piloto con 4 fuentes y un umbral de gasto pequeño, **después** de comprobar conectores y la situación previa de contactos. Comparar oportunidades únicas y contactables por unidad de cuota.
6. No activar motores, enviar mensajes ni iniciar nuevas corridas sin autorización y sin comprobar el estado anterior.

**Limitación:** este documento contiene observaciones de Sheets a la fecha indicada, no información en tiempo real y no es sustituto de inspección del Apps Script desplegado.