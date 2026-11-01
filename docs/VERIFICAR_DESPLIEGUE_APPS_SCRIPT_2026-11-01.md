# Verificación segura del Apps Script realmente desplegado

**Fecha:** 2026-11-01. **Objetivo:** distinguir tres cosas que pueden tener código diferente: (a) rama de GitHub, (b) HEAD de Apps Script —que ejecutan los triggers— y (c) versión inmutable asociada al web app `/exec`.

**Importante:** la conexión de ChatGPT a Google Drive/Sheets permite leer datos y estados, **no expone aquí la API de Apps Script para obtener código de proyectos y versiones**. No se pudo leer el código real del despliegue desde esta sesión. El endpoint `/exec` tampoco fue accesible por lectura pública. No afirmar que la rama GitHub está desplegada.

## Alternativa automatizada para Windows (PowerShell)

Se agregó una herramienta de **solo lectura** en el [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/blob/fix/gmail-diagnostico-y-piloto-20261101/tools/verificar-staging-solo-lectura.ps1), `tools/verificar-staging-solo-lectura.ps1`, para que otra IA con acceso local ejecute la comparación sin tener que escribir comandos sueltos. Requiere que `clasp` esté instalado y autenticado con la cuenta propietaria; **no instala paquetes, no ejecuta push, deploy, triggers ni funciones Apps Script**.

Desde la raíz de la rama de desarrollo:

```powershell
.\tools\verificar-staging-solo-lectura.ps1 -ScriptId '<SCRIPT_ID_PRIVADO>' -VersionNumber 2
```

El `2` es **solo un ejemplo histórico**. Antes de ejecutarlo, confirmar el `versionNumber` real en **Apps Script → Implementar → Administrar implementaciones**. La herramienta clona HEAD y esa versión a carpetas temporales distintas, calcula hashes y patrones, no imprime IDs ni fuentes, y borra los archivos temporales al terminar. Sin `-VersionNumber`, solo verifica HEAD y avisa que falta la versión publicada. **No confirma que el código funcione; es una comparación estática.**

El ID de proyecto privado debe permanecer en la computadora del usuario. No insertarlo en GitHub ni usar el ID del despliegue web en lugar del ID del proyecto.

## 1. Causas raíz halladas en el historial de GitHub

En `feature/orquestador-multifuente` se observó este patrón defectuoso:

```javascript
run._gmailCache = run._gmailCache || {};
var threads = run._gmailCache[query];
if (!threads) {
  threads = GmailApp.search(query, 0, 15);
  run._gmailCache[query] = threads;
}
// ...
var msgs = th.getMessages();
```

**Causa:** el estado `ORQ_RUN` se guarda como JSON; los objetos `GmailThread` dejan de conservar métodos. Al reanudar tras un trigger, `th.getMessages is not a function` es una consecuencia esperable **si se ejecutaba ese código antiguo**.

También se observó que la misma rama vieja escribía `'COMPLETADO'` sin verificar el estado devuelto por el conector. Eso explica que `ERROR_GMAIL` y `ERROR_RESOLUCION` quedaran etiquetados como finalizados en cola.

El código en `fix/orquestador-cuota-gmail-progreso-20261101` **ya había eliminado la caché serializada** y distinguía estados `ERROR`. El [PR #12](https://github.com/metecondrie/student-lead-discovery-agent/pull/12) agrega validación, regresiones, diagnóstico agregado de solo lectura y reconciliación de las métricas. Esta relación entre versiones es **evidencia de una causa en el código histórico, no prueba de qué versión estuvo desplegada**.

## 2. Pasos NO destructivos para un agente con acceso al equipo / Apps Script

1. Abrir el proyecto STAGING de Apps Script usando la cuenta propietaria. En **Configuración del proyecto**, identificar el `scriptId` real. **No publicarlo en GitHub**. La URL `/exec` usa un ID de despliegue diferente, no es el ID del proyecto.
2. En una **carpeta temporal separada del repositorio Git**, con el acceso OAuth ya configurado, ejecutar:
   ```powershell
   npx @google/clasp deployments
   npx @google/clasp versions
   ```
   `clasp` necesita que esa carpeta tenga la configuración local del proyecto; si no existe, ejecutar primero `npx @google/clasp clone <SCRIPT_ID_STAGING>` desde una carpeta vacía. **No subir `.clasp.json` a GitHub**.
3. Identificar el deployment existente y **su versionNumber real**. El usuario informó un despliegue STAGING a versión 2 en noviembre, pero puede haber cambiado: no inferirlo del número del nombre de archivo ni del HEAD.
4. Clonar/pullar **HEAD** en carpeta temporal con `clasp clone`/`clasp pull`. Para identificar el código de una versión inmutable, emplear la [API oficial `projects.getContent`](https://developers.google.com/apps-script/api/reference/rest/v1/projects/getContent) autenticada con alcance **`script.projects.readonly`**, indicando `versionNumber=<N>`. **No publicar tokens OAuth ni la respuesta completa**. Guardar el JSON recibido **solo localmente** (fuera del repositorio).
5. Evaluar ambos archivos de forma local. Si el archivo clonado se llama `Orquestador.js` o `Orquestador.gs`, localizarlo, sin renombrar/desplegar proyectos. Ejecutar desde PowerShell (ajustando rutas):
   ```powershell
   node tools/auditar-deploy-local.cjs --file "C:\ruta\temporal\Orquestador.js" --compare-file "gas/Orquestador.js"
   node tools/auditar-deploy-local.cjs --content-json "C:\ruta\temporal\version-desplegada.json" --compare-file "gas/Orquestador.js"
   ```
   Ambas órdenes **solo leen** los archivos locales y muestran hashes/patrones sin mostrar el código.
6. Verificar por separado el estado de ejecución real, los triggers de `orqTick` y `ORQ_RUN` con el proyecto correcto. No ejecutar `orqResume`, `orqStart`, `instalar`, `clasp push`, `clasp deploy` ni `clasp redeploy` durante la auditoría.

## 3. Cómo interpretar los resultados

- Si `cacheGmailThreadEnRun=true`, la versión analizada conserva la caché problemática. **No desplegar esa versión**.
- Si `completadoIncondicionalAntiguo=true`, la versión analizada puede contabilizar como éxito conectores que informaron error.
- `reconoceErroresAntesDeCompletar=true` indica el patrón de corrección; no prueba que sea funcional en todas las situaciones.
- `coincideExactamenteConReferencia=true` indica misma secuencia de bytes UTF-8 del archivo; diferencias de saltos de línea o comentarios pueden producir `false` sin equivaler a un fallo funcional.
- `diagnosticoSoloLectura=true` indica que la versión contiene `orqDiagnosticoSoloLectura()`, pero **esa función no estará accesible hasta que ese código se instale**. La función, una vez disponible, informa los recuentos de estado, triggers y discrepancias sin exponer correos ni claves.
- **Los triggers ejecutan el HEAD del proyecto; la web app `/exec` suele ejecutar una versión inmutable específica.** Por tanto, comparar **HEAD y versión publicada por separado**. La API permite obtener ambos de manera autorizada.

## 4. Qué entregar a la IA que continúe

Informar **sin IDs ni datos personales**: número de versión publicada; si HEAD difiere de dicha versión; valores true/false de las seis comprobaciones; hashes solo si se necesitan; número de triggers y estado del `ORQ_RUN`; resultado de los tests. **No pegar un JSON completo de `getContent` en un issue público.**

Conservar la corrida final del 2026-11-01 como evidencia. No modificar filas históricas para hacer coincidir contadores visuales sin respaldo, migración y autorización explícita del usuario.

## Documentación oficial
- [Google: despliegues HEAD vs versionados](https://developers.google.com/apps-script/concepts/deployments)
- [Google: API projects.getContent y versionNumber](https://developers.google.com/apps-script/api/reference/rest/v1/projects/getContent)
- [Google: clasp clone/pull/deployments/versions](https://developers.google.com/apps-script/guides/clasp)
- [Postmortem de la corrida de 77 fuentes](POSTMORTEM_CORRIDA_77_2026-11-01.md)
