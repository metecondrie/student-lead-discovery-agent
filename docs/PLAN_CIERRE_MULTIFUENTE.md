# Plan de cierre: buscador autónomo multifuente de alumnos

**Actualizado:** 2026-10-30. Estado: especificación operativa, no promesa de implementación.

## Resultado buscado

Una sola URL privada, botón **Buscar en todas las fuentes habilitadas**, y un orquestador que ejecuta trabajos en varios ciclos sin depender de nuevas órdenes a Antigravity. El usuario recibe resultados y errores con trazabilidad, y nunca se contacta automáticamente a nadie.

El catálogo de 239 entradas se preserva y reconcilia con la tabla operativa. **Catálogo ≠ conector**: una entrada puede estar registrada pero requerir permisos o no admitir acceso automatizado.

## Estado confirmado

| Elemento | Estado |
|---|---|
| Catálogo maestro | 239 entradas en `gas/Catalogo.js` |
| Fuentes en STAGING | Solo 8 videos de YouTube, Activo=FALSE |
| Piloto de un video | En vivo, 5 comentarios clasificados, 0 solicitudes, 0 mensajes |
| Piloto 3 videos | Instalado, no ejecutado |
| Orquestador v1 | Rama `feature/orquestador-1click`; interfaz y cola limitada a 10 video IDs; tests con simulaciones, no desplegado |
| Conector YouTube canales | Rama `feature/youtube-channel-discovery`; recupera comentarios de canal con API oficial; tests con simulaciones, todavía NO conectado a orquestador |
| RSS y Gmail | Funciones parciales en `Main.js`, no unificadas con el nuevo orquestador |
| Facebook/Instagram/TikTok/Reddit | Sin conector operativo demostrado; requieren verificación de permisos/métodos |
| Producción | No modificar ni activar |
| Contactos automáticos | Prohibidos |

## Orden de implementación (bloques entregables)

### A. Motor genérico y catálogo (prioridad crítica)

1. Crear/actualizar una tabla de catálogo completa sin borrar las 8 filas de STAGING ni duplicar IDs. Guardar por fuente: plataforma, URL, tipo de punto de entrada, conector, identificador externo resuelto, autorización/actividad, prioridad, motivo de no disponibilidad, ultima visita.
2. Reemplazar el límite de 10 videos y `ORQ_ESTADO` con **cola persistente en Sheets**: run_id, job_id, fuente, cursor/página, intentos, estado, próximo intento, cuotas y errores. PropertiesService contiene solo identificadores cortos (9 KB máximo por valor).
3. Botón **Buscar todas las fuentes conectadas y habilitadas**, con selección global predeterminada; no esperar que el usuario elija cada video.
4. Trabajos idempotentes con LockService, triggers temporales y recuperación después de fallos. Respetar límites de 6 min/ejecución y 90 min/día para triggers de cuentas personales. Una corrida puede durar horas de calendario, con pausas transparentes.
5. Si se agota presupuesto local o cuota del proveedor, marcar `PAUSADO_POR_CUOTA`, calcular próximo intento y reanudar; nunca habilitar cobro por accidente.

**Criterio de aceptación A:** el dashboard muestra 239 registros fuente sin afirmar que todos son operables; el botón procesa todas las habilitadas; se puede cerrar el navegador y el proceso continúa; errores/pendientes son visibles.

### B. Conectores y priorización comercial

1. Integrar `YouTubeCanales.js`: resolver channelId desde /channel/, @handle, /user/ o video semilla; obtener comentarios a nivel de canal mediante `allThreadsRelatedToChannelId`; antigüedad de **comentario** 7 días (configurable hasta 14 o más); paginación y deduplicación por comentario. Videos no son fuentes configuradas, sino entidades descubiertas.
2. Reusar/adecuar conector de Gmail de alertas docentes y RSS/Atom para foros y búsquedas públicas permitidas. Validar feed URL y relevancia de una muestra real antes de habilitar.
3. Sitios específicos que no exponen RSS/API: análisis individual del método de acceso, permiso y costo; registrar `NO_AUTOMATIZABLE` si corresponde, sin simular extracción.
4. Reddit, Facebook Groups, Instagram Reels, Discord, TikTok, WhatsApp/Telegram: tratar con cautela; incluir solo si se verifica API o mecanismo autorizado. Si no existe, modo asistido de importación/URLs, pero NO prometer búsqueda completa autónoma ni evasión de autenticación.
5. Pasar solo textos de fuentes verificadas a Gemini, con filtro de fecha, idioma español, alumnos remotos, materias (matemática/física/química/biología), nivel, destinatario abierto, contacto permitido. Guardar candidatos para **revisión humana**.

**Criterio B:** una corrida procesa al menos dos tipos de fuente (YouTube canal + RSS o Gmail) con datos reales, desduplica y documenta qué no pudo cubrir.

### C. Interfaz y pruebas de finalización

- App web privada Apps Script, run as owner, acceso restringido; controles Iniciar/Pausar/Detener, ejecución diaria opcional, columnas actividad/errores/candidatos por fuente, histórico diario.
- Sin activar el motor antiguo `runCycle` hasta cerrar el bug del fallback de fuentes desactivadas (Issue #4). No reutilizar código viejo a ciegas.
- Límite por corrida y presupuesto configurables; preferencia por plan gratuito, modelos Flash-Lite y máximo ahorro.
- Pruebas: 1 canal en vivo; 1 RSS/Gmail real; 10+ fuentes; reinicio de trigger; corte de cuota; 239 entradas catalogadas; ninguna llamada si una fuente carece de autorización; cero mensajes automáticos; prueba de integridad STAGING/producción.
- Desplegar SOLO cuando todo esté aprobado y explicar paso único de autorización, entrega de URL y uso.

**Definición de terminado:** el usuario usa siempre la URL y un botón para buscar en todas las fuentes actualmente operables y autorizadas. El reporte lista explícitamente el resto de las fuentes del catálogo con estado y razón de indisponibilidad. No equivaler 239 URLs con 239 buscadores.

## Deuda y decisiones

- Prioridad comercial: empezar a producir candidatos reales con fuentes accesibles sin esperar a integrar 239 sitios; agregar conectores incrementales de mayor probabilidad de conversión.
- GitHub Issues: #4 (fallback de YouTube antiguo), #5 (orquestador multifuente), #6 (YouTube por canales).
- No asumir que una búsqueda puede usar 5 horas de CPU en Apps Script; solo varias ejecuciones separadas con tiempo de calendario extendido.
- Todas las claves se quedan en Script Properties; nunca volcarlas a logs, prompts o código del cliente.
