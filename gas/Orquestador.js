/**
 * ORQUESTADOR MULTIFUENTE 1-CLICK (Apps Script STAGING)
 *
 * Centro de control autónomo con un único botón «Buscar alumnos».
 * - Recorre automáticamente todas las fuentes habilitadas con conector funcional.
 * - Cola persistente en Google Sheets (hoja OrqCola), superando el límite de 10 videos.
 * - Conectores reales:
 *     1. YouTube Canales (YouTubeCanales.js: comentarios recientes a nivel de canal, filtro por fecha)
 *     2. Foros RSS/Atom (Core.js: parseRss, feeds públicos como UTNianos)
 *     3. Gmail Alertas (Core.js: extractFromEmail, alertas de plataformas docentes)
 * - Clasificación con Gemini Flash-Lite en lotes (evaluación de 4 dimensiones).
 * - Pausas, reintentos, recuperación de errores, límites de cuota y reanudación automática por triggers.
 * - Interfaz web privada (doGet + PanelOrquestador.html).
 * - CERO contactos o correos automáticos a potenciales alumnos.
 */

var ORQ_STAGING_ID = '1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';

var ORQ_HEADERS = {
  'OrqCorridas': ['Run ID', 'Inicio', 'Fin', 'Estado', 'Fuentes totales', 'Fuentes completas', 'Comentarios/Avisos leidos', 'Repetidos', 'Clasificados', 'Solicitudes', 'Candidatos', 'Errores', 'Llamadas YouTube', 'Llamadas Gemini', 'Duración segundos'],
  'OrqFuentes': ['Run ID', 'Fecha', 'Fuente ID', 'Nombre', 'Conector', 'Estado', 'Leidos', 'Repetidos', 'Clasificados', 'Solicitudes', 'Candidatos', 'Errores', 'YouTube API', 'Gemini API', 'Duracion s', 'Mensaje'],
  'OrqHallazgos': ['Run ID', 'Detectado', 'Plataforma', 'Fuente', 'Identificador', 'URL', 'Publicado', 'Texto público protegido', 'Busca clases', 'Destinatario', 'Contactabilidad', 'Candidato para revision', 'Materia', 'Nivel', 'Confianza', 'Resumen'],
  'OrqCola': ['Run ID', 'Job ID', 'Fuente ID', 'Plataforma', 'Conector', 'Estado', 'Intentos', 'Cursor', 'Error', 'Creado', 'Actualizado']
};

/** Entrada Web App privada: centro de control */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('PanelOrquestador')
    .setTitle('Captación de alumnos | Centro de control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Acceso seguro a la planilla STAGING */
function orqDb_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('SHEET_ID') !== ORQ_STAGING_ID) {
    throw new Error('Seguridad: este panel solo puede operar en STAGING (' + ORQ_STAGING_ID + ').');
  }
  return SpreadsheetApp.openById(ORQ_STAGING_ID);
}

function orqRows_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function orqSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var headers = ORQ_HEADERS[name] || ['Col1', 'Col2'];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function orqApiKey_(key) {
  var value = String(PropertiesService.getScriptProperties().getProperty(key) || '').trim();
  if (!value) throw new Error('Falta la Script Property obligatoria: ' + key);
  return value;
}

function orqSafeText_(text) {
  var clean = String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email oculto]')
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, '[telefono oculto]')
    .slice(0, 600);
  return typeof sanitizeForSheets === 'function' ? sanitizeForSheets(clean) : clean;
}

function orqHash_(str) {
  var s = String(str || ''), hash = 0;
  for (var i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function orqLoadConfig_() {
  var ss = orqDb_(), cfSheet = ss.getSheetByName('Config');
  if (!cfSheet) throw new Error('Falta la hoja Config en STAGING.');
  var r = orqRows_(cfSheet), cfg = {};
  r.forEach(function(row) { cfg[String(row[0])] = row[1]; });
  if (String(cfg.SISTEMA_ACTIVO).toUpperCase() !== 'FALSE') {
    throw new Error('SISTEMA_ACTIVO debe ser FALSE en STAGING para evitar activación del motor no supervisado.');
  }
  return cfg;
}

function orqResolveConnector_(source) {
  if (typeof clasificarFuenteCatalogo === 'function') {
    return clasificarFuenteCatalogo(source);
  }
  var plat = String(source.plataforma || '').toLowerCase();
  var url = String(source.url || '').toLowerCase();
  var resId = String(source.resourceId || '').trim();
  if (plat === 'youtube' || url.indexOf('youtube.com') >= 0 || url.indexOf('youtu.be') >= 0 || /^[\w-]{11}$/.test(resId) || /^UC[\w-]{22}$/.test(resId)) {
    return { tipoAcceso: 'api_oficial', conector: 'youtube_canales', disponibilidad: 'DISPONIBLE', prioridad: 'P1', motivoNoDisp: '' };
  }
  if (url.indexOf('syndication') >= 0 || url.indexOf('/rss') >= 0 || url.indexOf('/feed') >= 0 || url.endsWith('.xml')) {
    return { tipoAcceso: 'rss_publico', conector: 'rss_foros', disponibilidad: 'DISPONIBLE', prioridad: 'P2', motivoNoDisp: '' };
  }
  if (plat === 'tusclases' || url.indexOf('tusclases.com') >= 0 || plat.indexOf('superprof') >= 0 || url.indexOf('superprof') >= 0) {
    return { tipoAcceso: 'gmail_autorizado', conector: 'gmail_alertas', disponibilidad: 'DISPONIBLE', prioridad: 'P0', motivoNoDisp: '' };
  }
  return { tipoAcceso: 'no_automatizable', conector: 'ninguno', disponibilidad: 'NO_AUTOMATIZABLE', prioridad: 'P2', motivoNoDisp: 'No automatizable' };
}

/** Obtiene y sincroniza el catálogo de fuentes asegurando los 239 registros */
function orqSources_(ss) {
  if (typeof sincronizarCatalogoFuentes === 'function') {
    try { sincronizarCatalogoFuentes(ss); } catch(e) {}
  }
  var sh = ss.getSheetByName('Fuentes');
  if (!sh) throw new Error('La hoja Fuentes no existe.');
  var rows = orqRows_(sh);
  return rows.map(function(r) {
    var rawId = String(r[0] || '').trim();
    var plat = String(r[1] || '').trim();
    var name = String(r[2] || rawId).trim();
    var topics = String(r[3] || '').trim();
    var level = String(r[4] || '').trim();
    var url = String(r[5] || '').trim();
    var resId = String(r[6] || '').trim();
    var active = String(r[7]).toUpperCase() === 'TRUE' || r[7] === true;
    var access = String(r[8] || '').trim();
    var priority = String(r[9] || '').trim();
    var avail = String(r[10] || '').trim();
    var conn = String(r[11] || '').trim();
    var notes = String(r[12] || '').trim();

    // Fallback de clasificación si columnas extendidas están vacías
    if (!conn) {
      var c = orqResolveConnector_({ id: rawId, plataforma: plat, creador: name, url: url, resourceId: resId, notas: notes });
      access = c.tipoAcceso;
      priority = c.prioridad;
      avail = c.disponibilidad;
      conn = c.conector;
    }

    return {
      id: rawId,
      platform: plat,
      name: name,
      topics: topics,
      level: level,
      url: url,
      resourceId: resId,
      enabled: active,
      accessType: access || 'no_automatizable',
      priority: priority || 'P2',
      availability: avail || (conn === 'ninguno' ? 'NO_AUTOMATIZABLE' : 'DISPONIBLE'),
      connector: conn || 'ninguno',
      notes: notes
    };
  });
}

/** Estado persistente liviano en PropertiesService (sólo metadatos del run, sin listas) */
function orqGetRun_() {
  var raw = PropertiesService.getScriptProperties().getProperty('ORQ_RUN');
  if (!raw) return { id: '', estado: 'SIN_CORRIDAS', cursor: 0, total: 0, inicio: '', mensaje: 'Sin búsquedas activas.' };
  try { return JSON.parse(raw); } catch(e) { return { id: '', estado: 'ERROR', cursor: 0, total: 0, inicio: '', mensaje: 'Estado corrupto.' }; }
}

function orqSaveRun_(run) {
  PropertiesService.getScriptProperties().setProperty('ORQ_RUN', JSON.stringify(run));
}

function orqRemoveTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'orqTick') {
      try { ScriptApp.deleteTrigger(t); } catch(e) {}
    }
  });
}

function orqSchedule_() {
  orqRemoveTriggers_();
  ScriptApp.newTrigger('orqTick').timeBased().after(30000).create();
}

/** Registros vistos para deduplicación */
function orqSeen_(ss) {
  var known = {};
  orqRows_(orqSheet_(ss, 'OrqHallazgos')).forEach(function(r) {
    if (r[4]) known[String(r[4])] = true;
  });
  return known;
}

/** Totales agregados de la corrida */
function orqTotals_(ss, runId) {
  var res = { fuentes: 0, leidos: 0, repetidos: 0, clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0, youtube: 0, gemini: 0, detalles: [] };
  orqRows_(orqSheet_(ss, 'OrqFuentes')).forEach(function(r) {
    if (String(r[0]) !== runId) return;
    res.fuentes++;
    res.leidos += Number(r[6]) || 0;
    res.repetidos += Number(r[7]) || 0;
    res.clasificados += Number(r[8]) || 0;
    res.solicitudes += Number(r[9]) || 0;
    res.candidatos += Number(r[10]) || 0;
    res.errores += Number(r[11]) || 0;
    res.youtube += Number(r[12]) || 0;
    res.gemini += Number(r[13]) || 0;
    res.detalles.push({
      fuenteId: String(r[2]),
      nombre: String(r[3]),
      conector: String(r[4]),
      estado: String(r[5]),
      leidos: Number(r[6]) || 0,
      clasificados: Number(r[8]) || 0,
      candidatos: Number(r[10]) || 0,
      errores: Number(r[11]) || 0,
      duracion: Number(r[14]) || 0
    });
  });
  return res;
}

function orqUpdateRunRow_(ss, run) {
  var sh = orqSheet_(ss, 'OrqCorridas'), r = orqRows_(sh), idx = -1;
  for (var i = r.length - 1; i >= 0; i--) {
    if (String(r[i][0]) === run.id) { idx = i + 2; break; }
  }
  if (idx < 0) return;
  var t = orqTotals_(ss, run.id);
  var finished = ['FINALIZADO', 'DETENIDO', 'ERROR', 'PAUSADO_CUOTA'].indexOf(run.estado) >= 0;
  var now = new Date();
  var secs = Math.round((now.getTime() - new Date(run.inicio).getTime()) / 100) / 10;
  sh.getRange(idx, 1, 1, 15).setValues([[
    run.id, new Date(run.inicio), finished ? now : '', run.estado, run.total, t.fuentes,
    t.leidos, t.repetidos, t.clasificados, t.solicitudes, t.candidatos, t.errores,
    t.youtube, t.gemini, secs
  ]]);
}

/**
 * BOTÓN «BUSCAR ALUMNOS»: Inicia una búsqueda multifuente autónoma.
 * Selecciona por defecto todas las fuentes operativas habilitadas.
 */
function orqStart(sourceIds, maxComments) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Otra operación está en curso, intentá nuevamente.');
  try {
    var ss = orqDb_(), cfg = orqLoadConfig_();
    var current = orqGetRun_();
    if (current.estado === 'EJECUTANDO') throw new Error('Ya existe una búsqueda en curso (' + current.id + ').');

    // Cargar todas las fuentes del catálogo
    var all = orqSources_(ss);
    var functional = all.filter(function(s) {
      return ['youtube_canales', 'rss_foros', 'gmail_alertas'].indexOf(s.connector) >= 0;
    });

    if (Array.isArray(sourceIds) && sourceIds.length === 0) {
      throw new Error('Seleccioná al menos una fuente.');
    }

    var selectedSources = [];
    if (!sourceIds || sourceIds === 'ALL_ENABLED') {
      // Selección global de todas las fuentes operativas habilitadas
      selectedSources = functional.filter(function(s) { return s.enabled === true; });
      if (!selectedSources.length) {
        // Si ninguna está marcada como activa, tomar las fuentes operativas P0/P1 predeterminadas
        selectedSources = functional.filter(function(s) {
          return s.priority === 'P0' || s.priority === 'P1' || s.connector === 'youtube_canales' || s.connector === 'rss_foros';
        });
      }
    } else {
      var wanted = {}, raw = sourceIds.map(function(x){ return String(x).trim(); });
      raw.forEach(function(id) { wanted[id] = true; });
      selectedSources = functional.filter(function(s) { return wanted[s.id]; });
      if (selectedSources.length !== raw.length) {
        throw new Error('Hay fuentes seleccionadas sin video o conector funcional válido en Fuentes.');
      }
    }

    if (!selectedSources.length) {
      throw new Error('No se encontraron fuentes operativas con conectores funcionales para la búsqueda.');
    }

    var count = Number(maxComments) || 15;
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(PropertiesService.getScriptProperties(), { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true, max: 20, count: 0 };
    var estimated = selectedSources.length * Math.ceil(count / 5);
    if (gcap.allowed === false || (gcap.max && estimated > (gcap.max - (gcap.count || 0)))) {
      throw new Error('La configuración requiere hasta ' + estimated + ' llamadas a Gemini, pero quedan ' +
        ((gcap.max || 20) - (gcap.count || 0)) + '. Elegí menos fuentes o comentarios por fuente.');
    }

    // Validar claves necesarias según conectores seleccionados
    var hasYouTube = selectedSources.some(function(s) { return s.connector === 'youtube_canales'; });
    if (hasYouTube) orqApiKey_('YOUTUBE_API_KEY');
    orqApiKey_('GEMINI_API_KEY');

    var count = Number(maxComments) || 15;
    var runId = 'ORQ-' + Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd-HHmmss') +
      '-' + Utilities.getUuid().slice(0, 6);

    // Preparar hojas
    orqSheet_(ss, 'OrqCorridas');
    orqSheet_(ss, 'OrqFuentes');
    orqSheet_(ss, 'OrqHallazgos');
    var shCola = orqSheet_(ss, 'OrqCola');

    // Registrar trabajos en la cola persistente
    var now = new Date();
    var queueRows = selectedSources.map(function(s, idx) {
      return [
        runId, 'JOB-' + (idx + 1), s.id, s.platform, s.connector, 'PENDIENTE',
        0, '', '', now, now
      ];
    });
    shCola.getRange(shCola.getLastRow() + 1, 1, queueRows.length, 11).setValues(queueRows);

    // Registrar corrida inicial
    var shCorridas = orqSheet_(ss, 'OrqCorridas');
    shCorridas.getRange(shCorridas.getLastRow() + 1, 1, 1, 15).setValues([[
      runId, now, '', 'EJECUTANDO', selectedSources.length, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]]);

    var runState = {
      id: runId,
      estado: 'EJECUTANDO',
      cursor: 0,
      total: selectedSources.length,
      inicio: now.toISOString(),
      maxComments: count,
      mensaje: 'Búsqueda iniciada en ' + selectedSources.length + ' fuentes operativas.'
    };
    orqSaveRun_(runState);
    PropertiesService.getScriptProperties().deleteProperty('ORQ_DETENER_ID');
    orqRemoveTriggers_();
  } finally {
    lock.releaseLock();
  }

  // Ejecutar el primer paso inmediatamente; los siguientes se reanudan por trigger
  orqTick();
  return orqStatus();
}

/** BOTÓN «DETENER»: Solicita detener la corrida de forma segura */
function orqStop() {
  orqDb_();
  var run = orqGetRun_();
  if (run.estado === 'EJECUTANDO') {
    PropertiesService.getScriptProperties().setProperty('ORQ_DETENER_ID', run.id);
    return { estado: 'DETENCION_SOLICITADA', mensaje: 'Detención solicitada. Finalizará al terminar la fuente actual.' };
  }
  return { estado: run.estado, mensaje: 'No hay ninguna búsqueda en ejecución.' };
}

/**
 * MOTOR DE PASO AUTÓNOMO (orqTick):
 * - Invocado al iniciar y reanudado mediante triggers temporales.
 * - Recupera el próximo trabajo PENDIENTE de la cola OrqCola.
 * - Ejecuta el conector correspondiente y persiste resultados.
 * - Programa el siguiente paso hasta completar todas las fuentes.
 */
function orqTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  var ss, run;
  try {
    ss = orqDb_();
    var p = PropertiesService.getScriptProperties();
    run = orqGetRun_();

    if (run.estado !== 'EJECUTANDO') {
      orqRemoveTriggers_();
      return;
    }

    // Detención solicitada por el usuario
    if (p.getProperty('ORQ_DETENER_ID') === run.id) {
      run.estado = 'DETENIDO';
      run.mensaje = 'Búsqueda detenida por el usuario.';
      orqSaveRun_(run);
      orqUpdateRunRow_(ss, run);
      orqRemoveTriggers_();
      p.deleteProperty('ORQ_DETENER_ID');
      return;
    }

    // Buscar próximo trabajo en OrqCola
    var shCola = orqSheet_(ss, 'OrqCola');
    var colaRows = orqRows_(shCola);
    var jobIdx = -1, job = null;
    for (var i = 0; i < colaRows.length; i++) {
      var row = colaRows[i];
      if (String(row[0]) === run.id && String(row[5]) === 'PENDIENTE') {
        jobIdx = i + 2;
        job = {
          rowIdx: jobIdx,
          runId: String(row[0]),
          jobId: String(row[1]),
          sourceId: String(row[2]),
          platform: String(row[3]),
          connector: String(row[4]),
          attempts: Number(row[6]) || 0
        };
        break;
      }
    }

    if (!job) {
      // Todos los trabajos completados
      run.estado = 'FINALIZADO';
      run.mensaje = 'Búsqueda multifuente completada con éxito.';
      orqSaveRun_(run);
      orqUpdateRunRow_(ss, run);
      orqRemoveTriggers_();
      return;
    }

    // Marcar EN_PROCESO
    shCola.getRange(job.rowIdx, 6, 1, 2).setValues([['EN_PROCESO', job.attempts + 1]]);

    // Cargar detalles de la fuente
    var allSources = orqSources_(ss);
    var source = allSources.filter(function(s) { return s.id === job.sourceId; })[0];
    if (!source) {
      source = { id: job.sourceId, platform: job.platform, connector: job.connector, name: job.sourceId, url: '' };
    }

    var result = null;
    var tickStart = Date.now();
    var now = new Date();
    try {
      if (job.connector === 'youtube_canales') {
        result = orqExecuteYouTube_(ss, run, source);
      } else if (job.connector === 'rss_foros') {
        result = orqExecuteRss_(ss, run, source);
      } else if (job.connector === 'gmail_alertas') {
        result = orqExecuteGmail_(ss, run, source);
      } else {
        result = { estado: 'OMITIDO: conector no implementado', leidos: 0, repetidos: 0, clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0, youtube: 0, gemini: 0, mensaje: '' };
      }
      shCola.getRange(job.rowIdx, 1, 1, 11).setValues([[
        job.runId, job.jobId, job.sourceId, job.platform, job.connector,
        'COMPLETADO', job.attempts + 1, '', '', now, new Date()
      ]]);
    } catch(err) {
      var errMsg = String(err && err.message || err).slice(0, 160);
      var isQuota = /cuota|quota|429/i.test(errMsg);
      var finalState = isQuota ? 'PAUSADO_CUOTA' : 'ERROR';
      shCola.getRange(job.rowIdx, 1, 1, 11).setValues([[
        job.runId, job.jobId, job.sourceId, job.platform, job.connector,
        finalState, job.attempts + 1, '', errMsg, now, new Date()
      ]]);
      result = {
        runId: run.id,
        fecha: now,
        fuenteId: source.id,
        nombre: source.name,
        conector: job.connector,
        estado: finalState,
        leidos: 0,
        repetidos: 0,
        clasificados: 0,
        solicitudes: 0,
        candidatos: 0,
        errores: 1,
        youtube: 0,
        gemini: 0,
        duracion: Math.round((Date.now() - tickStart) / 100) / 10,
        mensaje: errMsg
      };
      orqRecordFuente_(ss, result);
      if (isQuota) {
        run.estado = 'PAUSADO_CUOTA';
        run.mensaje = 'Límite de cuota alcanzado. Reanudación automática en la próxima ventana.';
      }
    }

    // Contar progreso
    var doneCount = colaRows.filter(function(r) {
      return String(r[0]) === run.id && ['COMPLETADO', 'ERROR', 'OMITIDO'].indexOf(String(r[5])) >= 0;
    }).length + 1;
    run.cursor = doneCount;
    run.mensaje = 'Fuente procesada: ' + source.name + ' (' + result.estado + ')';

    orqSaveRun_(run);
    orqUpdateRunRow_(ss, run);

    // Si aún quedan tareas y el run sigue activo, programar el siguiente paso
    if (run.estado === 'EJECUTANDO') {
      var remaining = colaRows.some(function(r, idx) {
        return idx + 2 !== job.rowIdx && String(r[0]) === run.id && String(r[5]) === 'PENDIENTE';
      });
      if (remaining) {
        orqSchedule_();
      } else {
        run.estado = 'FINALIZADO';
        run.mensaje = 'Búsqueda multifuente completada con éxito.';
        orqSaveRun_(run);
        orqUpdateRunRow_(ss, run);
        orqRemoveTriggers_();
      }
    }
  } catch(e) {
    if (run && run.id) {
      run.estado = 'ERROR';
      run.mensaje = String(e && e.message || e).slice(0, 160);
      orqSaveRun_(run);
      if (ss) orqUpdateRunRow_(ss, run);
    }
    orqRemoveTriggers_();
  } finally {
    lock.releaseLock();
  }
}

/** CONECTOR 1: YouTube por CANALES (descubrimiento reciente a nivel de canal) */
function orqExecuteYouTube_(ss, run, source) {
  var tick = Date.now(), p = PropertiesService.getScriptProperties(), cfg = orqLoadConfig_();
  var ytKey = orqApiKey_('YOUTUBE_API_KEY');
  var gemKey = orqApiKey_('GEMINI_API_KEY');
  var maxComments = Number(run.maxComments) || 15;

  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id, nombre: source.name,
    conector: 'youtube_canales', estado: 'OK', leidos: 0, repetidos: 0,
    clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };

  // Cuota YouTube
  var ycap = typeof checkYouTubeQuota_ === 'function' ?
    checkYouTubeQuota_(p, { YOUTUBE_MAX_DAILY_QUOTA: Number(cfg.YOUTUBE_MAX_DAILY_QUOTA) || 100 }) : { allowed: true };
  if (!ycap.allowed) throw new Error('Cuota diaria de YouTube alcanzada');

  // Resolver canal usando YouTubeCanales.js
  var fetchFn = function(url, opts) { return UrlFetchApp.fetch(url, opts || { muteHttpExceptions: true }); };
  var comments = [];
  var resolved = null;
  if (typeof ytChannelResolve === 'function') {
    try {
      resolved = ytChannelResolve(source, ytKey, fetchFn);
      if (resolved && resolved.calls) {
        res.youtube += resolved.calls;
        if (typeof recordYouTubeQuota_ === 'function') recordYouTubeQuota_(p, resolved.calls);
      }
    } catch(e) {
      resolved = null;
    }
  }

  if (resolved && resolved.ok && resolved.channelId) {
    res.youtube++;
    if (typeof recordYouTubeQuota_ === 'function') recordYouTubeQuota_(p, 1);
    var stream = ytChannelFetchRecent(resolved.channelId, ytKey, fetchFn, {
      maxAgeDays: 14,
      maxResults: maxComments
    });
    comments = stream.items || [];
  } else if (/^[\w-]{11}$/.test(String(source.resourceId || source.videoId || '').trim())) {
    var vid = String(source.resourceId || source.videoId || '').trim();
    var vUrl = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' +
      encodeURIComponent(vid) + '&maxResults=' + maxComments +
      '&order=time&textFormat=plainText&key=' + encodeURIComponent(ytKey);
    res.youtube++;
    if (typeof recordYouTubeQuota_ === 'function') recordYouTubeQuota_(p, 1);
    var vRes = fetchFn(vUrl);
    var vCode = vRes.getResponseCode();
    if (vCode !== 200) {
      throw new Error('YouTube HTTP ' + vCode);
    }
    var vData = JSON.parse(vRes.getContentText());
    (vData.items || []).forEach(function(thread) {
      var c = thread.snippet && thread.snippet.topLevelComment;
      var sn = c && c.snippet;
      if (c && sn && c.id) {
        comments.push({
          id: String(c.id),
          sourceLabel: 'YouTube',
          title: 'Comentario en ' + source.name,
          text: String(sn.textOriginal || sn.textDisplay || '').slice(0, 580),
          publishedAt: String(sn.publishedAt || ''),
          url: 'https://www.youtube.com/watch?v=' + vid + '&lc=' + encodeURIComponent(c.id)
        });
      }
    });
  } else {
    res.estado = 'ERROR_RESOLUCION';
    res.errores++;
    res.mensaje = resolved && resolved.error ? resolved.error : 'No se pudo resolver canal ni video';
    orqRecordFuente_(ss, res);
    return res;
  }
  res.leidos = comments.length;

  if (!comments.length) {
    res.estado = 'SIN_COMENTARIOS_RECIENTES';
    res.duracion = Math.round((Date.now() - tick) / 100) / 10;
    orqRecordFuente_(ss, res);
    return res;
  }

  // Deduplicación contra OrqHallazgos
  var known = orqSeen_(ss);
  var unclassified = [];
  comments.forEach(function(c) {
    if (known[c.id]) res.repetidos++;
    else unclassified.push(c);
  });

  // Clasificación con Gemini Flash-Lite
  var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');
  var hallazgosRows = [];

  for (var b = 0; b < unclassified.length; b += 5) {
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };
    if (!gcap.allowed) { res.estado = 'PARCIAL: cuota Gemini'; res.errores++; break; }

    var batch = unclassified.slice(b, b + 5);
    res.gemini++;
    if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);

    var byId = {};
    try {
      byId = orqCallGeminiBatch_(batch, model, gemKey);
    } catch(err) {
      res.errores++;
      res.mensaje = String(err && err.message || err).slice(0, 140);
    }

    batch.forEach(function(it) {
      var r = byId[it.id] || null;
      var intention = !!(r && r.es_solicitud_clases === true);
      var candidate = !!(r && intention &&
        r.destinatario === 'pedido_abierto' &&
        r.oportunidad_comercial_alejo === true &&
        Number(r.confianza) >= 0.7 &&
        ['canal_publico_permitido', 'contacto_ofrecido_voluntariamente'].indexOf(r.contactabilidad) >= 0);

      if (r) {
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
      } else {
        res.errores++;
      }

      hallazgosRows.push([
        run.id, new Date(), 'YouTube', source.name, it.id, it.url,
        it.publishedAt, orqSafeText_(it.text), r ? String(intention) : 'SIN_CLASIFICAR',
        r ? r.destinatario : '', r ? r.contactabilidad : '', candidate ? 'REVISAR' : 'NO',
        r ? orqSafeText_(r.materia) : '', r ? orqSafeText_(r.nivel) : '',
        r ? r.confianza : '', r ? orqSafeText_(r.resumen) : ''
      ]);
    });
  }

  if (hallazgosRows.length) {
    var shH = orqSheet_(ss, 'OrqHallazgos');
    shH.getRange(shH.getLastRow() + 1, 1, hallazgosRows.length, 16).setValues(hallazgosRows);
  }

  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

/** CONECTOR 2: Foros RSS/Atom (UTNianos y fuentes públicas autorizadas) */
function orqExecuteRss_(ss, run, source) {
  var tick = Date.now(), p = PropertiesService.getScriptProperties(), cfg = orqLoadConfig_();
  var gemKey = orqApiKey_('GEMINI_API_KEY');

  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id, nombre: source.name,
    conector: 'rss_foros', estado: 'OK', leidos: 0, repetidos: 0,
    clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };

  if (!source.url) {
    res.estado = 'ERROR_URL_RSS';
    res.errores++;
    res.mensaje = 'Fuente RSS sin URL';
    orqRecordFuente_(ss, res);
    return res;
  }

  var response = UrlFetchApp.fetch(source.url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    res.estado = 'ERROR_HTTP_' + response.getResponseCode();
    res.errores++;
    res.mensaje = 'Fallo al consultar feed: HTTP ' + response.getResponseCode();
    orqRecordFuente_(ss, res);
    return res;
  }

  var xml = response.getContentText();
  var items = typeof parseRss === 'function' ? parseRss(xml, 'rss', source.name) : [];
  res.leidos = items.length;

  if (!items.length) {
    res.estado = 'SIN_NOVEDADES';
    res.duracion = Math.round((Date.now() - tick) / 100) / 10;
    orqRecordFuente_(ss, res);
    return res;
  }

  // Filtrar publicaciones recientes (14 días) y con palabras clave de estudio/clases
  var now = Date.now(), windowMs = 14 * 86400000;
  var relevant = items.filter(function(it) {
    var at = it.date ? new Date(it.date).getTime() : now;
    if (now - at > windowMs) return false;
    var txt = (it.title + ' ' + it.text).toLowerCase();
    return /clases|profesor|particular|parcial|final|ayuda|quimica|fisica|matematica|algebra|analisis/i.test(txt);
  });

  var known = orqSeen_(ss);
  var unclassified = [];
  relevant.forEach(function(it) {
    var id = 'RSS-' + orqHash_(it.url || it.title);
    it.computedId = id;
    if (known[id]) res.repetidos++;
    else unclassified.push(it);
  });

  // Clasificar con Gemini si hay items relevantes
  var hallazgosRows = [];
  if (unclassified.length > 0) {
    var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');
    var batch = unclassified.slice(0, 5).map(function(it) {
      return { id: it.computedId, sourceLabel: 'Foro RSS', title: it.title, text: it.text.slice(0, 500), url: it.url };
    });

    res.gemini++;
    if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);

    var byId = {};
    try { byId = orqCallGeminiBatch_(batch, model, gemKey); } catch(e) { res.errores++; }

    batch.forEach(function(it) {
      var r = byId[it.id] || null;
      var intention = !!(r && r.es_solicitud_clases === true);
      var candidate = !!(r && intention && r.destinatario === 'pedido_abierto' && r.oportunidad_comercial_alejo === true);
      if (r) {
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
      }
      hallazgosRows.push([
        run.id, new Date(), 'Foros', source.name, it.id, it.url,
        new Date().toISOString(), orqSafeText_(it.text), r ? String(intention) : 'SIN_CLASIFICAR',
        r ? r.destinatario : '', r ? r.contactabilidad : '', candidate ? 'REVISAR' : 'NO',
        r ? orqSafeText_(r.materia) : '', r ? orqSafeText_(r.nivel) : '',
        r ? r.confianza : '', r ? orqSafeText_(r.resumen) : ''
      ]);
    });

    if (hallazgosRows.length) {
      var shH = orqSheet_(ss, 'OrqHallazgos');
      shH.getRange(shH.getLastRow() + 1, 1, hallazgosRows.length, 16).setValues(hallazgosRows);
    }
  }

  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

/** CONECTOR 3: Alertas Gmail de plataformas docentes (Tusclases, Superprof, Google Alerts) */
function orqExecuteGmail_(ss, run, source) {
  var tick = Date.now(), cfg = orqLoadConfig_();
  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id, nombre: source.name,
    conector: 'gmail_alertas', estado: 'OK', leidos: 0, repetidos: 0,
    clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };

  try {
    var query = 'from:(tusclases.com.ar OR superprof.es OR alert-noreply@google.com) newer_than:7d';
    var threads = typeof GmailApp !== 'undefined' ? GmailApp.search(query, 0, 10) : [];
    var known = orqSeen_(ss);
    var hallazgosRows = [];

    threads.forEach(function(th) {
      var msgs = th.getMessages();
      msgs.forEach(function(m) {
        res.leidos++;
        var emailData = {
          id: m.getId(),
          threadId: th.getId(),
          from: m.getFrom(),
          subject: m.getSubject(),
          date: m.getDate(),
          plain: m.getPlainBody(),
          html: m.getBody()
        };
        var extracted = typeof extractFromEmail === 'function' ? extractFromEmail(emailData, cfg) : { items: [] };
        (extracted.items || []).forEach(function(it) {
          var id = it.id || ('GMAIL-' + m.getId());
          if (known[id]) { res.repetidos++; return; }
          res.clasificados++;
          res.solicitudes++;
          res.candidatos++;
          var pubDateStr = it.publishedAt || '';
          if (!pubDateStr && m.getDate) {
            try {
              var md = m.getDate();
              pubDateStr = (md instanceof Date ? md : new Date(md)).toISOString();
            } catch(e) { pubDateStr = new Date().toISOString(); }
          }
          hallazgosRows.push([
            run.id, new Date(), 'Gmail', source.name, id, it.url || ('https://mail.google.com/mail/#inbox/' + th.getId()),
            pubDateStr || new Date().toISOString(), orqSafeText_(it.text || it.title),
            'true', 'pedido_abierto', 'contacto_ofrecido_voluntariamente', 'REVISAR',
            orqSafeText_(it.subject || ''), orqSafeText_(it.level || ''), 0.95, orqSafeText_(it.title || '')
          ]);
        });
      });
    });

    if (hallazgosRows.length) {
      var shH = orqSheet_(ss, 'OrqHallazgos');
      shH.getRange(shH.getLastRow() + 1, 1, hallazgosRows.length, 16).setValues(hallazgosRows);
    }
  } catch(e) {
    res.errores++;
    res.estado = 'ERROR_GMAIL';
    res.mensaje = String(e && e.message || e).slice(0, 140);
  }

  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

/** Invocación en lote a Gemini Flash-Lite con validación estricta de 4 dimensiones */
function orqCallGeminiBatch_(batch, model, key) {
  var prompt = typeof buildGeminiPrompt === 'function' ? buildGeminiPrompt(batch) : JSON.stringify(batch);
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent';

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 8192 }
    }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    var body = {};
    try { body = JSON.parse(res.getContentText()); } catch(e) {}
    throw new Error('Gemini HTTP ' + res.getResponseCode() + ': ' + String(body.error && body.error.message || '').slice(0, 140));
  }

  var data = JSON.parse(res.getContentText());
  var parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  var parsed = typeof parseGeminiResponse === 'function' ?
    parseGeminiResponse(parts.map(function(p){ return p.text || ''; }).join('')) : null;

  if (!Array.isArray(parsed)) throw new Error('Gemini no devolvió una lista JSON válida.');
  var byId = {};
  parsed.forEach(function(item) { byId[item.id] = item; });
  return byId;
}

function orqRecordFuente_(ss, res) {
  var sh = orqSheet_(ss, 'OrqFuentes');
  sh.getRange(sh.getLastRow() + 1, 1, 1, 16).setValues([[
    res.runId, res.fecha, res.fuenteId, res.nombre, res.conector, res.estado,
    res.leidos, res.repetidos, res.clasificados, res.solicitudes, res.candidatos,
    res.errores, res.youtube, res.gemini, res.duracion, orqSafeText_(res.mensaje)
  ]]);
}

/** CONSULTA DE ESTADO COMPLETO PARA EL PANEL WEB */
function orqStatus() {
  var ss = orqDb_();
  var run = orqGetRun_();
  var allSources = orqSources_(ss);
  var totals = run.id ? orqTotals_(ss, run.id) : null;

  // Candidatos para revisión humana
  var candidates = [];
  if (run.id && ss.getSheetByName('OrqHallazgos')) {
    orqRows_(ss.getSheetByName('OrqHallazgos')).forEach(function(r) {
      if (String(r[0]) === run.id && String(r[11]) === 'REVISAR') {
        candidates.push({
          plataforma: String(r[2] || ''),
          fuente: String(r[3] || ''),
          id: String(r[4] || ''),
          url: String(r[5] || ''),
          publicado: String(r[6] || ''),
          texto: String(r[7] || '').slice(0, 300),
          materia: String(r[12] || ''),
          nivel: String(r[13] || ''),
          confianza: r[14],
          resumen: String(r[15] || '')
        });
      }
    });
  }

  // Historial diario
  var daily = {};
  if (ss.getSheetByName('OrqCorridas')) {
    orqRows_(ss.getSheetByName('OrqCorridas')).forEach(function(r) {
      var d = r[1] instanceof Date ? r[1] : new Date(r[1]);
      if (isNaN(d.getTime())) return;
      var k = Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
      if (!daily[k]) daily[k] = { fecha: k, corridas: 0, leidos: 0, clasificados: 0, candidatos: 0, errores: 0 };
      daily[k].corridas++;
      daily[k].leidos += Number(r[6]) || 0;
      daily[k].clasificados += Number(r[8]) || 0;
      daily[k].candidatos += Number(r[10]) || 0;
      daily[k].errores += Number(r[11]) || 0;
    });
  }

  // Resumen del catálogo por plataforma y conector
  var catalogSummary = { total: allSources.length, operativas: 0, noAutomatizables: 0, plataformas: {} };
  allSources.forEach(function(s) {
    if (s.connector !== 'ninguno') catalogSummary.operativas++;
    else catalogSummary.noAutomatizables++;
    catalogSummary.plataformas[s.platform] = (catalogSummary.plataformas[s.platform] || 0) + 1;
  });

  var pref = [];
  try { pref = JSON.parse(PropertiesService.getScriptProperties().getProperty('ORQ_SELECCION') || '[]'); } catch(e) {}
  var selected = pref.length ? pref : allSources.filter(function(x){ return x.enabled; }).map(function(x){ return x.id; });
  var opSources = allSources.filter(function(s) { return s.connector !== 'ninguno'; });

  return {
    estado: run.estado,
    id: run.id || '',
    inicio: run.inicio || '',
    cursor: run.cursor || 0,
    total: run.total || 0,
    mensaje: run.mensaje || '',
    maxComments: run.maxComments || 15,
    metricas: totals,
    candidatos: candidates.slice(0, 40),
    fuentes: opSources,
    fuentesOperativas: opSources,
    seleccion: selected,
    catalogoResumen: catalogSummary,
    historial: Object.keys(daily).sort().reverse().slice(0, 30).map(function(k){ return daily[k]; }),
    link: ss.getUrl(),
    version: 'orquestador-multifuente-v2'
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    doGet: doGet,
    orqStart: orqStart,
    orqStop: orqStop,
    orqTick: orqTick,
    orqStatus: orqStatus,
    orqSources_: orqSources_,
    orqTotals_: orqTotals_,
    orqSTAGING_ID: ORQ_STAGING_ID
  };
}
