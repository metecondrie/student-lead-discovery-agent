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
    .setTitle('Captación de alumnos | Centro de control');
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

function orqUpdateSourceState_(ss, sourceId, newState) {
  try {
    var sh = ss.getSheetByName('Fuentes');
    if (!sh || sh.getLastRow() < 2) return;
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(sourceId).trim()) {
        // Columna 13 es Estado Verificacion (1-based index 13)
        if (sh.getLastColumn() >= 13) {
          sh.getRange(i + 2, 13).setValue(newState);
        }
        break;
      }
    }
  } catch(e) {}
}

function orqSetSourceActive(sourceId, active) {
  var ss = orqDb_();
  var sh = ss.getSheetByName('Fuentes');
  if (!sh || sh.getLastRow() < 2) throw new Error('Hoja Fuentes no encontrada.');
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(sourceId).trim()) {
      sh.getRange(i + 2, 8).setValue(!!active);
      return { ok: true, sourceId: sourceId, activo: !!active };
    }
  }
  throw new Error('Fuente no encontrada: ' + sourceId);
}

function orqScheduleAt_(dateObj) {
  orqRemoveTriggers_();
  var ms = Math.max(30000, dateObj.getTime() - Date.now());
  ScriptApp.newTrigger('orqTick').timeBased().after(ms).create();
}

function orqSources_(ss) {
  // LECTURA PURA: NUNCA sincroniza, muta ni borra la hoja Fuentes en consultas de estado o ticks
  var sh = ss.getSheetByName('Fuentes');
  if (!sh) return [];
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];

  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var hMap = {};
  headers.forEach(function(h, idx) {
    var norm = String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    hMap[norm] = idx;
  });

  function val(row, keys, fallbackIdx) {
    for (var k = 0; k < keys.length; k++) {
      var idx = hMap[keys[k]];
      if (typeof idx === 'number' && idx >= 0 && idx < row.length) return row[idx];
    }
    return typeof fallbackIdx === 'number' && fallbackIdx < row.length ? row[fallbackIdx] : '';
  }

  var rows = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return rows.map(function(r) {
    var rawId = String(val(r, ['idfuente', 'id', 'idfuentes'], 0) || '').trim();
    var plat = String(val(r, ['plataforma', 'plat'], 1) || '').trim();
    var name = String(val(r, ['canalcreador', 'creador', 'canal', 'nombre'], 2) || rawId).trim();
    var topics = String(val(r, ['temasmaterias', 'materias', 'tema'], 3) || '').trim();
    var level = String(val(r, ['niveluniversidad', 'nivel'], 4) || '').trim();
    var url = String(val(r, ['urlcanalrecurso', 'urlrecurso', 'url'], 5) || '').trim();
    var resId = String(val(r, ['idrecurso', 'resourceid', 'recursoid'], 6) || '').trim();

    var rawAct = val(r, ['activo'], 7);
    var active = (String(rawAct).toUpperCase() === 'TRUE' || rawAct === true);

    var access = String(val(r, ['tipoacceso', 'acceso'], 8) || '').trim();
    var priority = String(val(r, ['prioridad'], 9) || '').trim();
    var avail = String(val(r, ['disponibilidad'], 10) || '').trim();
    var conn = String(val(r, ['conector'], 11) || '').trim();
    var verState = String(val(r, ['estadoverificacion', 'estado'], 12) || '').trim();
    var notes = String(val(r, ['notas', 'observaciones'], 14) || '').trim();

    if (!conn) {
      var c = orqResolveConnector_({ id: rawId, plataforma: plat, creador: name, url: url, resourceId: resId, notas: notes });
      access = access || c.tipoAcceso;
      priority = priority || c.prioridad;
      avail = avail || c.disponibilidad;
      conn = conn || c.conector;
    }
    if (!verState) {
      verState = (conn !== 'ninguno') ? 'PENDIENTE_VERIFICACION' : (avail === 'NO_AUTOMATIZABLE' ? 'NO_AUTOMATIZABLE' : 'PENDIENTE_VERIFICACION');
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
      verificationState: verState,
      notes: notes
    };
  });
}

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

    // Cargar fuentes del catálogo
    var all = orqSources_(ss);
    var functional = all.filter(function(s) {
      return ['youtube_canales', 'rss_foros', 'gmail_alertas'].indexOf(s.connector) >= 0;
    });

    if (Array.isArray(sourceIds) && sourceIds.length === 0) {
      throw new Error('Seleccioná al menos una fuente.');
    }

    var selectedSources = [];
    if (!sourceIds || sourceIds === 'ALL_ENABLED') {
      // Regla estricta: ÚNICAMENTE fuentes operativas con Activo=TRUE en la planilla
      selectedSources = functional.filter(function(s) { return s.enabled === true; });
      if (!selectedSources.length) {
        throw new Error('SIN_FUENTES_HABILITADAS: No hay ninguna fuente activa (Activo=TRUE) en la hoja Fuentes. Habilitá al menos una fuente operativa antes de iniciar la búsqueda.');
      }
    } else {
      var wanted = {}, raw = sourceIds.map(function(x){ return String(x).trim(); });
      raw.forEach(function(id) { wanted[id] = true; });
      selectedSources = functional.filter(function(s) { return wanted[s.id]; });
      if (selectedSources.length !== raw.length) {
        throw new Error('Hay fuentes seleccionadas sin video o conector funcional válido en Fuentes.');
      }
      // Verificar que las fuentes seleccionadas estén activas
      var inactive = selectedSources.filter(function(s) { return s.enabled !== true; });
      if (inactive.length > 0) {
        throw new Error('SIN_FUENTES_HABILITADAS: La fuente ' + inactive[0].id + ' (' + inactive[0].name + ') tiene Activo=FALSE. Habilitala en la hoja Fuentes antes de buscar.');
      }
    }

    if (!selectedSources.length) {
      throw new Error('SIN_FUENTES_HABILITADAS: No se encontraron fuentes operativas habilitadas para la búsqueda.');
    }

    var count = Number(maxComments) || 15;

    // Preflight de cuota diaria Gemini: sólo bloquea si la cuota ya está completamente agotada hoy
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(PropertiesService.getScriptProperties(), { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true, max: 20, count: 0 };
    if (gcap.allowed === false || (gcap.max && (gcap.max - (gcap.count || 0)) <= 0)) {
      throw new Error('PAUSADO_CUOTA: La cuota diaria de Gemini para hoy está agotada (' + (gcap.count || 0) + '/' + (gcap.max || 20) + '). Esperá a la próxima ventana de reinicio.');
    }
    // Modo distribuido: encola todas las fuentes seleccionadas y gestiona la cuota real progresivamente por lote

    // Validar claves necesarias según conectores seleccionados
    var hasYouTube = selectedSources.some(function(s) { return s.connector === 'youtube_canales'; });
    if (hasYouTube) orqApiKey_('YOUTUBE_API_KEY');
    orqApiKey_('GEMINI_API_KEY');

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
      mensaje: 'Búsqueda iniciada en ' + selectedSources.length + ' fuentes operativas habilitadas.'
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
    var cfg = orqLoadConfig_();
    run = orqGetRun_();

    // Reanudación desde PAUSADO_CUOTA
    if (run.estado === 'PAUSADO_CUOTA') {
      var nowMs = Date.now();
      var resumeAt = run.proximaReanudacion ? new Date(run.proximaReanudacion).getTime() : 0;
      var gcap = typeof checkGeminiQuota_ === 'function' ?
        checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true, count: 0, max: 20 };
      var quotaReset = gcap.allowed && (gcap.count === 0 || (gcap.max - (gcap.count || 0)) >= 1);
      var timeReached = resumeAt > 0 && nowMs >= resumeAt;

      if (quotaReset || timeReached) {
        run.estado = 'EJECUTANDO';
        run.mensaje = 'Cuota restablecida. Reanudando búsqueda multifuente...';
        delete run.proximaReanudacion;
        delete run.motivoPausa;

        // Resetear trabajos en OrqCola con estado PAUSADO_CUOTA a PENDIENTE
        var shColaResume = orqSheet_(ss, 'OrqCola');
        var cRows = orqRows_(shColaResume);
        for (var ci = 0; ci < cRows.length; ci++) {
          if (String(cRows[ci][0]) === run.id && String(cRows[ci][5]) === 'PAUSADO_CUOTA') {
            shColaResume.getRange(ci + 2, 6, 1, 1).setValue('PENDIENTE');
          }
        }
        orqSaveRun_(run);
        orqUpdateRunRow_(ss, run);
      } else {
        // Aún no es seguro reanudar; mantener trigger programado
        var waitTarget = new Date(resumeAt > 0 ? resumeAt : (nowMs + 3600000));
        orqScheduleAt_(waitTarget);
        return;
      }
    }

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
      source = { id: job.sourceId, platform: job.platform, connector: job.connector, name: job.sourceId, url: '', enabled: true };
    }

    var result = null;
    var tickStart = Date.now();
    var now = new Date();
    try {
      // Verificar cuota antes de ejecutar llamadas a APIs
      var gcap = typeof checkGeminiQuota_ === 'function' ?
        checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true, count: 0, max: 20 };
      if (gcap.allowed === false || (gcap.max && (gcap.max - (gcap.count || 0)) <= 0)) {
        throw new Error('PAUSADO_CUOTA: Límite diario de Gemini alcanzado (' + (gcap.count || 0) + '/' + (gcap.max || 20) + '). Se reanudará en la próxima ventana.');
      }

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
      var isQuota = /cuota|quota|429|resource_exhausted/i.test(errMsg);
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
        // Programar reanudación al siguiente reset (próxima medianoche o +1h)
        var resetDate = new Date();
        resetDate.setHours(resetDate.getHours() + 1); // Ventana de 1h de seguridad
        run.estado = 'PAUSADO_CUOTA';
        run.proximaReanudacion = resetDate.toISOString();
        run.motivoPausa = errMsg;
        run.mensaje = 'Límite de cuota alcanzado (' + errMsg + '). Próxima reanudación: ' +
          Utilities.formatDate(resetDate, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm');
        orqScheduleAt_(resetDate);
      }
    }

    // Contar progreso
    var doneCount = colaRows.filter(function(r) {
      return String(r[0]) === run.id && ['COMPLETADO', 'ERROR', 'OMITIDO'].indexOf(String(r[5])) >= 0;
    }).length + 1;
    run.cursor = doneCount;
    if (run.estado === 'EJECUTANDO') {
      run.mensaje = 'Fuente procesada: ' + source.name + ' (' + result.estado + ')';
    }

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

function orqResume() {
  var ss = orqDb_(), p = PropertiesService.getScriptProperties(), cfg = orqLoadConfig_();
  var run = orqGetRun_();
  if (run.estado !== 'PAUSADO_CUOTA') {
    return { ok: false, estado: run.estado, mensaje: 'La corrida no está pausada por cuota.' };
  }
  var gcap = typeof checkGeminiQuota_ === 'function' ?
    checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };
  if (!gcap.allowed) {
    return { ok: false, estado: run.estado, mensaje: 'La cuota de Gemini aún no se ha restablecido (' + (gcap.count || 0) + '/' + (gcap.max || 20) + ').' };
  }
  run.estado = 'EJECUTANDO';
  run.mensaje = 'Reanudación forzada por el usuario.';
  delete run.proximaReanudacion;
  delete run.motivoPausa;

  var shCola = orqSheet_(ss, 'OrqCola');
  var cRows = orqRows_(shCola);
  for (var ci = 0; ci < cRows.length; ci++) {
    if (String(cRows[ci][0]) === run.id && String(cRows[ci][5]) === 'PAUSADO_CUOTA') {
      shCola.getRange(ci + 2, 6, 1, 1).setValues([['PENDIENTE']]);
    }
  }
  orqSaveRun_(run);
  orqUpdateRunRow_(ss, run);
  orqTick();
  return { ok: true, estado: 'EJECUTANDO', mensaje: 'Corrida reanudada.' };
}

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
      resolved = { ok: false, error: String(e.message || e) };
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
    orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
  } else {
    // Si no se pudo resolver el canal a partir del enlace o video semilla, fallar explícitamente.
    // NUNCA simular búsqueda del canal consultando un video fijo sin recencia.
    res.estado = 'ERROR_RESOLUCION';
    res.errores++;
    res.mensaje = resolved && resolved.error ? resolved.error : 'No se pudo resolver el canal a partir del recurso provisto';
    orqUpdateSourceState_(ss, source.id, 'FALLO');
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
    if (!gcap.allowed) { throw new Error('PAUSADO_CUOTA: Límite diario de Gemini alcanzado (' + (gcap.count || 0) + '/' + (gcap.max || 20) + ').'); }

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
    orqUpdateSourceState_(ss, source.id, 'FALLO');
    orqRecordFuente_(ss, res);
    return res;
  }

  var response = UrlFetchApp.fetch(source.url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    res.estado = 'ERROR_HTTP_' + response.getResponseCode();
    res.errores++;
    res.mensaje = 'Fallo al consultar feed: HTTP ' + response.getResponseCode();
    orqUpdateSourceState_(ss, source.id, 'FALLO');
    orqRecordFuente_(ss, res);
    return res;
  }

  var xml = response.getContentText();
  var items = typeof parseRss === 'function' ? parseRss(xml, 'rss', source.name) : [];
  res.leidos = items.length;

  if (!items.length) {
    res.estado = 'SIN_NOVEDADES';
    res.duracion = Math.round((Date.now() - tick) / 100) / 10;
    orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
    orqRecordFuente_(ss, res);
    return res;
  }

  // Filtrar publicaciones recientes (14 días) y con palabras clave de estudio/clases
  var now = Date.now(), windowMs = 14 * 86400000;
  var relevant = items.filter(function(it) {
    var rawDate = it.publishedAt || it.date;
    var at = rawDate ? new Date(rawDate).getTime() : now;
    if (now - at > windowMs) return false;
    var txt = ((it.title || '') + ' ' + (it.text || '')).toLowerCase();
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

  var hallazgosRows = [];
  var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');

  // Procesar items en lotes de 5 sin descartar silenciosamente los restantes
  for (var b = 0; b < unclassified.length; b += 5) {
    var batch = unclassified.slice(b, b + 5).map(function(it) {
      return { id: it.computedId, sourceLabel: 'Foro RSS', title: it.title, text: it.text.slice(0, 500), url: it.url, publishedAt: it.publishedAt || it.date };
    });

    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };

    var byId = {};
    if (gcap.allowed) {
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
      try {
        byId = orqCallGeminiBatch_(batch, model, gemKey);
      } catch(e) {
        res.errores++;
      }
    }

    batch.forEach(function(it) {
      var r = byId[it.id] || null;
      var intention = false, candidate = false;
      if (r) {
        intention = !!(r.es_solicitud_clases === true);
        candidate = !!(intention && r.destinatario === 'pedido_abierto' && r.oportunidad_comercial_alejo === true);
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
      } else if (typeof evaluate === 'function') {
        // Fallback a evaluación por reglas para no perder items
        var ev = evaluate({ title: it.title, text: it.text, url: it.url, publishedAt: it.publishedAt, kind: 'tutoring' }, cfg, new Date(), {}, {});
        intention = ev.status !== 'Descartado';
        candidate = (ev.compatible === 'alta' || ev.compatible === 'media') && intention;
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
        r = {
          destinatario: 'pedido_abierto',
          contactabilidad: 'canal_publico_permitido',
          materia: ev.subject || '',
          nivel: '',
          confianza: ev.score >= 5 ? 0.9 : 0.7,
          resumen: ev.reasons || ''
        };
      }

      var pubStr = it.publishedAt ? new Date(it.publishedAt).toISOString() : new Date().toISOString();
      hallazgosRows.push([
        run.id, new Date(), 'Foros', source.name, it.id, it.url,
        pubStr, orqSafeText_(it.text), r ? String(intention) : 'SIN_CLASIFICAR',
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

  orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

function orqExecuteGmail_(ss, run, source) {
  var tick = Date.now(), p = PropertiesService.getScriptProperties(), cfg = orqLoadConfig_();
  var gemKey = orqApiKey_('GEMINI_API_KEY');
  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id, nombre: source.name,
    conector: 'gmail_alertas', estado: 'OK', leidos: 0, repetidos: 0,
    clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };

  try {
    // Determinar consulta específica por fuente
    var plat = String(source.platform || '').toLowerCase();
    var name = String(source.name || '').toLowerCase();
    var url = String(source.url || '').toLowerCase();
    var query = 'newer_than:7d ';

    if (plat.indexOf('tusclases') >= 0 || url.indexOf('tusclases') >= 0 || name.indexOf('tusclases') >= 0) {
      query += 'from:(tusclases.com.ar OR tusclasesparticulares.com OR noreply@tusclases.com.ar)';
      if (source.topics && /quimica|fisica|matematica|biologia/i.test(source.topics)) {
        query += ' ' + source.topics.split(';')[0].trim();
      }
    } else if (plat.indexOf('superprof') >= 0 || url.indexOf('superprof') >= 0 || name.indexOf('superprof') >= 0) {
      query += 'from:(superprof.com.ar OR superprof.es OR superprof.co OR superprof.com)';
    } else if (name.indexOf('google alerts') >= 0 || name.indexOf('alertas') >= 0) {
      query += 'from:alert-noreply@google.com';
    } else {
      query += 'from:(tusclases.com.ar OR superprof.com.ar OR alert-noreply@google.com)';
    }

    // Cachear hilos de Gmail en memoria del run para no re-consultar la misma query 20 veces
    run._gmailCache = run._gmailCache || {};
    var threads = run._gmailCache[query];
    if (!threads) {
      threads = typeof GmailApp !== 'undefined' ? GmailApp.search(query, 0, 15) : [];
      run._gmailCache[query] = threads;
    }

    var known = orqSeen_(ss);
    var candidateItems = [];

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

        // Si el extractor descartó el correo (confirmación de aviso, no es solicitud, etc.), no crear candidatos falsos
        if (extracted.ignored || !extracted.items || !extracted.items.length) {
          return;
        }

        extracted.items.forEach(function(it) {
          var id = it.id || ('GMAIL-' + orqHash_(it.url || (m.getId() + '_' + it.title)));
          if (known[id]) { res.repetidos++; return; }

          // Evaluar calidad con evaluate() de Core.js
          var ev = typeof evaluate === 'function' ?
            evaluate(it, cfg, new Date(), {}, {}) : { compatible: 'media', status: 'Evaluado', score: 3 };

          // Excluir descartes estrictos (avisos institucionales, materias fuera de perfil, etc.)
          if (ev.status === 'Descartado' || ev.compatible === 'no') {
            return;
          }

          it._computedId = id;
          it._ev = ev;
          candidateItems.push(it);
        });
      });
    });

    // Clasificación con Gemini (si hay cuota) o regla validada de 4 dimensiones
    var hallazgosRows = [];
    var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');

    for (var b = 0; b < candidateItems.length; b += 5) {
      var batch = candidateItems.slice(b, b + 5);
      var gcap = typeof checkGeminiQuota_ === 'function' ?
        checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };

      var byId = {};
      if (gcap.allowed) {
        res.gemini++;
        if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
        try {
          var gemBatch = batch.map(function(it){ return { id: it._computedId, sourceLabel: 'Gmail', title: it.title, text: (it.text || '').slice(0, 500), url: it.url }; });
          byId = orqCallGeminiBatch_(gemBatch, model, gemKey);
        } catch(e) {
          res.errores++;
        }
      }

      batch.forEach(function(it) {
        var r = byId[it._computedId] || null;
        var intention = false, candidate = false;

        if (r) {
          intention = !!(r.es_solicitud_clases === true);
          candidate = !!(intention && r.destinatario === 'pedido_abierto' && r.oportunidad_comercial_alejo === true &&
            ['canal_publico_permitido', 'contacto_ofrecido_voluntariamente'].indexOf(r.contactabilidad) >= 0);
          res.clasificados++;
          if (intention) res.solicitudes++;
          if (candidate) res.candidatos++;
        } else {
          // Evaluación por motor determinista de Core.js
          var ev = it._ev;
          intention = true;
          candidate = (ev.compatible === 'alta' || ev.compatible === 'media');
          res.clasificados++;
          res.solicitudes++;
          if (candidate) res.candidatos++;
          r = {
            destinatario: 'pedido_abierto',
            contactabilidad: 'contacto_ofrecido_voluntariamente',
            materia: ev.subject || it.title || '',
            nivel: it.level || '',
            confianza: ev.score >= 5 ? 0.9 : 0.75,
            resumen: ev.reasons || 'Solicitud de alumno extraída de alerta de plataforma docente'
          };
        }

        var pubDateStr = '';
        if (it.publishedAt) {
          try { pubDateStr = new Date(it.publishedAt).toISOString(); } catch(e) {}
        }
        if (!pubDateStr) pubDateStr = new Date().toISOString();

        hallazgosRows.push([
          run.id, new Date(), 'Gmail', source.name, it._computedId, it.url || it.gmailLink,
          pubDateStr, orqSafeText_(it.text || it.title),
          String(intention), r.destinatario, r.contactabilidad, candidate ? 'REVISAR' : 'NO',
          orqSafeText_(r.materia), orqSafeText_(r.nivel), r.confianza, orqSafeText_(r.resumen)
        ]);
      });
    }

    if (hallazgosRows.length) {
      var shH = orqSheet_(ss, 'OrqHallazgos');
      shH.getRange(shH.getLastRow() + 1, 1, hallazgosRows.length, 16).setValues(hallazgosRows);
    }
    orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
  } catch(e) {
    res.errores++;
    res.estado = 'ERROR_GMAIL';
    res.mensaje = String(e && e.message || e).slice(0, 140);
    orqUpdateSourceState_(ss, source.id, 'FALLO');
  }

  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

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
    orqResume: orqResume,
    orqStatus: orqStatus,
    orqSources_: orqSources_,
    orqTotals_: orqTotals_,
    orqSetSourceActive: orqSetSourceActive,
    orqSTAGING_ID: ORQ_STAGING_ID
  };
}
