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

/**
 * Calcula el próximo reinicio diario de cuota de Gemini (medianoche del Pacífico, America/Los_Angeles, + 5 min de margen).
 */
function orqNextPacificReset_(nowDate) {
  var now = (nowDate instanceof Date && !isNaN(nowDate.getTime())) ? nowDate : new Date();
  try {
    var laDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    if (!isNaN(laDate.getTime())) {
      var nextMidnightLa = new Date(laDate.getTime());
      nextMidnightLa.setHours(24, 5, 0, 0); // 00:05 PT del día siguiente
      var diffMs = nextMidnightLa.getTime() - laDate.getTime();
      if (diffMs > 0 && diffMs <= 90000000) {
        return new Date(now.getTime() + diffMs);
      }
    }
  } catch (e) {}
  // Fallback PST (08:05 UTC)
  var fb = new Date(now.getTime());
  fb.setUTCHours(8, 5, 0, 0);
  if (fb.getTime() <= now.getTime()) {
    fb = new Date(fb.getTime() + 86400000);
  }
  return fb;
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

/** Registros vistos para deduplicación (excluye filas SIN_CLASIFICAR para no perderlas) */
function orqSeen_(ss) {
  var known = {};
  orqRows_(orqSheet_(ss, 'OrqHallazgos')).forEach(function(r) {
    if (r[4] && String(r[8]) !== 'SIN_CLASIFICAR') {
      known[String(r[4])] = true;
    }
  });
  return known;
}

/** Totales agregados de la corrida diferenciando completados, fallidos, pendientes, pausados y recuperables */
function orqTotals_(ss, runId) {
  var res = {
    fuentes: 0,
    completados: 0,
    fallidos: 0,
    pendientes: 0,
    pausados: 0,
    recuperables: 0,
    omitidos: 0,
    leidos: 0,
    repetidos: 0,
    clasificados: 0,
    solicitudes: 0,
    candidatos: 0,
    errores: 0,
    youtube: 0,
    gemini: 0,
    detalles: []
  };

  // Consolidar OrqFuentes por fuenteId para que múltiples registros históricos
  // (p. ej. PAUSADO_CUOTA repetidos en la corrida de 77 fuentes) nunca inflen las métricas.
  var byFuente = {};
  var fuenteOrder = [];
  orqRows_(orqSheet_(ss, 'OrqFuentes')).forEach(function(r) {
    if (String(r[0]) !== runId) return;
    var fId = String(r[2] || '');
    if (!fId) return;
    var st = String(r[5] || '');
    var isPaused = (st === 'PAUSADO_CUOTA' || st === 'PENDIENTE_REINTENTO');
    var hasProgress = (Number(r[6]) || 0) > 0 || (Number(r[8]) || 0) > 0 || (Number(r[10]) || 0) > 0 || (Number(r[12]) || 0) > 0 || (Number(r[13]) || 0) > 0;

    // Ignorar registros históricos PAUSADO_CUOTA sin progreso parcial (evita inflar errores o conteos)
    if (isPaused && !hasProgress) {
      return;
    }

    if (!byFuente[fId]) {
      fuenteOrder.push(fId);
    }
    byFuente[fId] = r;
  });

  fuenteOrder.forEach(function(fId) {
    var r = byFuente[fId];
    var st = String(r[5] || '');
    var isPaused = (st === 'PAUSADO_CUOTA' || st === 'PENDIENTE_REINTENTO');
    var isRecoverable = (st === 'INCOMPLETO_RECUPERABLE');
    var isErr = /^ERROR/i.test(st);
    var isOmit = /^OMITIDO/i.test(st);
    var isSuccess = !isPaused && !isRecoverable && !isErr && !isOmit;

    // Solo las fuentes que finalizaron exitosamente cuentan como procesadas/completas.
    if (isSuccess) {
      res.fuentes++;
    }

    res.leidos += Number(r[6]) || 0;
    res.repetidos += Number(r[7]) || 0;
    res.clasificados += Number(r[8]) || 0;
    res.solicitudes += Number(r[9]) || 0;
    res.candidatos += Number(r[10]) || 0;
    // Las pausas por cuota o estados recuperables nunca se contabilizan como errores de fuente.
    var rowErr = (isPaused || isRecoverable) ? 0 : (Number(r[11]) || (isErr ? 1 : 0));
    res.errores += rowErr;
    res.youtube += Number(r[12]) || 0;
    res.gemini += Number(r[13]) || 0;

    res.detalles.push({
      fuenteId: String(r[2]),
      nombre: String(r[3]),
      conector: String(r[4]),
      estado: st,
      leidos: Number(r[6]) || 0,
      clasificados: Number(r[8]) || 0,
      candidatos: Number(r[10]) || 0,
      errores: rowErr,
      duracion: Number(r[14]) || 0
    });
  });

  if (ss.getSheetByName('OrqCola')) {
    orqRows_(ss.getSheetByName('OrqCola')).forEach(function(r) {
      if (String(r[0]) !== runId) return;
      var qState = String(r[5] || '');
      if (qState === 'COMPLETADO') res.completados++;
      else if (qState === 'ERROR') res.fallidos++;
      else if (qState === 'PAUSADO_CUOTA') res.pausados++;
      else if (qState === 'INCOMPLETO_RECUPERABLE') {
        res.recuperables++;
        res.pausados++;
      }
      else if (qState === 'OMITIDO') res.omitidos++;
      else if (qState === 'PENDIENTE' || qState === 'EN_PROCESO') res.pendientes++;
    });
  } else {
    res.completados = res.fuentes;
  }

  return res;
}

function orqUpdateRunRow_(ss, run) {
  var sh = orqSheet_(ss, 'OrqCorridas'), r = orqRows_(sh), idx = -1;
  for (var i = r.length - 1; i >= 0; i--) {
    if (String(r[i][0]) === run.id) { idx = i + 2; break; }
  }
  if (idx < 0) return;
  var t = orqTotals_(ss, run.id);
  var finished = ['FINALIZADO', 'DETENIDO', 'ERROR', 'PAUSADO_CUOTA', 'INCOMPLETO_RECUPERABLE'].indexOf(run.estado) >= 0;
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
    // No reemplazar ORQ_RUN mientras exista una corrida pausada o recuperable.
    // Iniciar otra búsqueda en el mismo proyecto haría perder la referencia activa a esa cola.
    if (['EJECUTANDO', 'PAUSADO_CUOTA', 'INCOMPLETO_RECUPERABLE'].indexOf(String(current.estado)) >= 0) {
      throw new Error('Ya existe una búsqueda activa o pendiente de recuperación (' + current.id + ', ' + current.estado + '). Terminá o recuperá esa corrida antes de iniciar otra.');
    }

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
 * - Recupera trabajos abandonados (EN_PROCESO vencidos) evitando ejecuciones concurrentes.
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
      var localQuotaOk = gcap.allowed && (gcap.count === 0 || (gcap.max - (gcap.count || 0)) >= 1);

      // Si Google respondió HTTP 429 por límite diario real (RPD), no reintentar antes del reinicio del Pacífico.
      var waitingPacificRpd = (run.tipoCuota === 'RPD' && run.origenCuota === 'HTTP_429_RPD' && resumeAt > 0 && nowMs < resumeAt);
      var quotaReset = localQuotaOk && !waitingPacificRpd;

      if (quotaReset) {
        run.estado = 'EJECUTANDO';
        run.mensaje = 'Cuota restablecida. Reanudando búsqueda multifuente...';
        delete run.proximaReanudacion;
        delete run.motivoPausa;
        delete run.tipoCuota;
        delete run.origenCuota;

        // Resetear trabajos en OrqCola con estado PAUSADO_CUOTA a PENDIENTE preservando Cursor
        var shColaResume = orqSheet_(ss, 'OrqCola');
        var cRows = orqRows_(shColaResume);
        for (var ci = 0; ci < cRows.length; ci++) {
          if (String(cRows[ci][0]) === run.id && String(cRows[ci][5]) === 'PAUSADO_CUOTA') {
            var updatedRow = cRows[ci].slice();
            while (updatedRow.length < 11) updatedRow.push('');
            updatedRow[5] = 'PENDIENTE';
            updatedRow[10] = new Date();
            shColaResume.getRange(ci + 2, 1, 1, 11).setValues([updatedRow]);
          }
        }
        orqSaveRun_(run);
        orqUpdateRunRow_(ss, run);
      } else {
        // Aún no es seguro reanudar; mantener trigger programado según tipo de cuota (Pacífico para RPD vs espera corta para RPM/TPM)
        var nextCheckDate;
        if (run.tipoCuota === 'RPD') {
          var pacificResetMs = orqNextPacificReset_(new Date(nowMs)).getTime();
          nextCheckDate = new Date(Math.max(pacificResetMs, resumeAt || 0));
        } else {
          nextCheckDate = new Date(Math.max(nowMs + 60000, resumeAt || 0));
        }
        orqScheduleAt_(nextCheckDate);
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

    var shCola = orqSheet_(ss, 'OrqCola');
    var colaRows = orqRows_(shCola);

    // 1. Control de trabajos EN_PROCESO: evitar ejecución concurrente y recuperar trabajos abandonados tras tiempo máximo
    var staleTimeoutMs = (cfg && Number(cfg.ORQ_STALE_TIMEOUT_MS) > 0) ? Number(cfg.ORQ_STALE_TIMEOUT_MS) : 360000;
    var maxStaleRetries = (cfg && typeof cfg.ORQ_MAX_STALE_RETRIES !== 'undefined') ? Number(cfg.ORQ_MAX_STALE_RETRIES) : 3;
    var colaMutated = false;

    for (var si = 0; si < colaRows.length; si++) {
      var sRow = colaRows[si];
      if (String(sRow[0]) !== run.id || String(sRow[5]) !== 'EN_PROCESO') continue;

      var staleCur = null;
      if (sRow[7]) {
        try { staleCur = JSON.parse(String(sRow[7])); } catch(e) {}
      }
      var rawUpd = sRow[10] || (staleCur && staleCur.startedAt) || sRow[9];
      var updatedMs = rawUpd ? new Date(rawUpd).getTime() : 0;
      var elapsedMs = updatedMs > 0 && !isNaN(updatedMs) ? (Date.now() - updatedMs) : staleTimeoutMs;

      if (elapsedMs < staleTimeoutMs) {
        // Hay un trabajo activamente EN_PROCESO dentro de la ventana de tiempo máximo: evitar ejecución concurrente
        orqSchedule_();
        return;
      }

      // Trabajo abandonado (superó staleTimeoutMs)
      var staleRetries = (staleCur && Number(staleCur.staleRetries)) || 0;
      if (staleRetries < maxStaleRetries) {
        if (!staleCur || typeof staleCur !== 'object') staleCur = { offset: 0 };
        staleCur.staleRetries = staleRetries + 1;
        var recMsg = ('RECUPERADO_ABANDONADO (' + staleCur.staleRetries + '/' + maxStaleRetries + '): Reintento tras interrupción en EN_PROCESO').slice(0, 160);
        shCola.getRange(si + 2, 1, 1, 11).setValues([[
          String(sRow[0]), String(sRow[1]), String(sRow[2]), String(sRow[3]), String(sRow[4]),
          'PENDIENTE', Number(sRow[6]) || 0, JSON.stringify(staleCur), recMsg, sRow[9] || new Date(), new Date()
        ]]);
        colaMutated = true;
      } else {
        var abMsg = ('ERROR_TRABAJO_ABANDONADO: Excedió máximo de reintentos (' + maxStaleRetries + ') tras interrupción en EN_PROCESO').slice(0, 160);
        var abCurStr = staleCur ? JSON.stringify(staleCur) : String(sRow[7] || '');
        shCola.getRange(si + 2, 1, 1, 11).setValues([[
          String(sRow[0]), String(sRow[1]), String(sRow[2]), String(sRow[3]), String(sRow[4]),
          'ERROR', Number(sRow[6]) || 0, abCurStr, abMsg, sRow[9] || new Date(), new Date()
        ]]);
        orqRecordFuente_(ss, {
          runId: run.id,
          fecha: new Date(),
          fuenteId: String(sRow[2]),
          nombre: String(sRow[2]),
          conector: String(sRow[4]),
          estado: 'ERROR_TRABAJO_ABANDONADO',
          leidos: staleCur ? (Number(staleCur.leidos) || 0) : 0,
          repetidos: staleCur ? (Number(staleCur.repetidos) || 0) : 0,
          clasificados: staleCur ? (Number(staleCur.clasificados) || 0) : 0,
          solicitudes: staleCur ? (Number(staleCur.solicitudes) || 0) : 0,
          candidatos: staleCur ? (Number(staleCur.candidatos) || 0) : 0,
          errores: 1,
          youtube: staleCur ? (Number(staleCur.youtube) || 0) : 0,
          gemini: staleCur ? (Number(staleCur.gemini) || 0) : 0,
          duracion: 0,
          mensaje: abMsg
        });
        colaMutated = true;
      }
    }

    if (colaMutated) {
      colaRows = orqRows_(shCola);
    }

    // 2. Buscar próximo trabajo PENDIENTE en OrqCola
    var jobIdx = -1, job = null;
    for (var i = 0; i < colaRows.length; i++) {
      var row = colaRows[i];
      if (String(row[0]) === run.id && String(row[5]) === 'PENDIENTE') {
        jobIdx = i + 2;
        var parsedCursor = null;
        if (row[7]) {
          try { parsedCursor = JSON.parse(String(row[7])); } catch(e) {}
        }
        job = {
          rowIdx: jobIdx,
          runId: String(row[0]),
          jobId: String(row[1]),
          sourceId: String(row[2]),
          platform: String(row[3]),
          connector: String(row[4]),
          attempts: Number(row[6]) || 0,
          cursorRaw: String(row[7] || ''),
          cursor: parsedCursor,
          created: row[9] || new Date()
        };
        break;
      }
    }

    if (!job) {
      var checkRows = colaRows.filter(function(r) { return String(r[0]) === run.id; });
      var recCount = checkRows.filter(function(r) { return String(r[5]) === 'INCOMPLETO_RECUPERABLE'; }).length;
      var failCount = checkRows.filter(function(r) { return String(r[5]) === 'ERROR'; }).length;
      var compCount = checkRows.filter(function(r) { return String(r[5]) === 'COMPLETADO'; }).length;
      run.cursor = compCount;
      run.completados = compCount;
      run.fallidos = failCount;
      run.recuperables = recCount;
      run.pausados = recCount;
      run.pendientes = 0;
      if (recCount > 0) {
        run.estado = 'INCOMPLETO_RECUPERABLE';
        run.mensaje = 'Búsqueda con ' + recCount + ' fuente(s) en estado INCOMPLETO_RECUPERABLE.';
      } else {
        run.estado = 'FINALIZADO';
        run.mensaje = failCount > 0 ?
          ('Búsqueda finalizada: ' + compCount + ' completadas, ' + failCount + ' con error.') :
          'Búsqueda multifuente completada con éxito.';
      }
      orqSaveRun_(run);
      orqUpdateRunRow_(ss, run);
      orqRemoveTriggers_();
      return;
    }

    // Marcar EN_PROCESO preservando las 11 columnas y timestamp de inicio
    var inProcNow = new Date();
    shCola.getRange(job.rowIdx, 1, 1, 11).setValues([[
      job.runId, job.jobId, job.sourceId, job.platform, job.connector,
      'EN_PROCESO', job.attempts + 1, job.cursorRaw, '', job.created, inProcNow
    ]]);

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
        var preErr = new Error('PAUSADO_CUOTA [RPD]: Límite diario de Gemini alcanzado (' + (gcap.count || 0) + '/' + (gcap.max || 20) + '). Se reanudará en la próxima ventana.');
        preErr.isQuota = true;
        preErr.quotaType = 'RPD';
        throw preErr;
      }

      if (job.connector === 'youtube_canales') {
        result = orqExecuteYouTube_(ss, run, source, job.cursor);
      } else if (job.connector === 'rss_foros') {
        result = orqExecuteRss_(ss, run, source, job.cursor);
      } else if (job.connector === 'gmail_alertas') {
        result = orqExecuteGmail_(ss, run, source, job.cursor);
      } else {
        result = { estado: 'OMITIDO: conector no implementado', leidos: 0, repetidos: 0, clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0, youtube: 0, gemini: 0, mensaje: '' };
      }

      // Diferenciar estados coherentes en OrqCola: ERROR_GMAIL / ERROR_RESOLUCION / ERROR_* son trabajos fallidos (ERROR), no COMPLETADO
      var resStateStr = String(result && result.estado || 'OK');
      var isErrResult = /^ERROR/i.test(resStateStr);
      var isOmitResult = /^OMITIDO/i.test(resStateStr);
      var colaFinalState = isErrResult ? 'ERROR' : (isOmitResult ? 'OMITIDO' : 'COMPLETADO');
      var colaErrMsg = isErrResult ? String(result.mensaje || resStateStr).slice(0, 160) : '';

      shCola.getRange(job.rowIdx, 1, 1, 11).setValues([[
        job.runId, job.jobId, job.sourceId, job.platform, job.connector,
        colaFinalState, job.attempts + 1, '', colaErrMsg, job.created, new Date()
      ]]);
    } catch(err) {
      var errMsg = String(err && err.message || err).slice(0, 160);
      var isIncomplete = !!(err && err.isIncomplete);
      var isQuota = !isIncomplete && orqIsQuotaError_(err);
      var qInfo = isQuota ? orqClassifyQuotaError_(err && err.httpStatus || 429, errMsg, null) : null;
      var qType = qInfo ? qInfo.type : (err && err.quotaType ? err.quotaType : 'RPD');

      var prevOffset = (job.cursor && Number(job.cursor.offset)) || 0;
      var newOffset = (err && err.cursor && Number(err.cursor.offset)) || prevOffset;
      var madeProgress = newOffset > prevOffset;
      var prevPauseCount = (job.cursor && Number(job.cursor.pauseCount)) || 0;

      // Para RPD no se agota el contador de 5 pausas horarias; el tope aplica a bloqueos repetidos RPM/TPM sin avance
      var pauseCount = isQuota ? (qType === 'RPD' ? prevPauseCount : (madeProgress ? 1 : prevPauseCount + 1)) : 0;
      var maxQuotaPauses = Number(cfg.ORQ_MAX_QUOTA_RETRIES) || 5;

      if (isQuota && qType !== 'RPD' && pauseCount > maxQuotaPauses) {
        isQuota = false;
        errMsg = ('ERROR_CUOTA_AGOTADA_REITERADA: ' + errMsg).slice(0, 160);
      }

      var finalState = isQuota ? 'PAUSADO_CUOTA' : 'ERROR';
      var fuenteState = finalState;
      var cursorObj = (err && err.cursor) ? err.cursor : (job.cursor ? job.cursor : null);

      if (isIncomplete) {
        var maxIncRetries = (cfg && typeof cfg.ORQ_MAX_INCOMPLETE_RETRIES !== 'undefined') ? Number(cfg.ORQ_MAX_INCOMPLETE_RETRIES) : 2;
        var prevIncRetries = (job.cursor && Number(job.cursor.incompleteRetries)) || 0;
        var incRetries = prevIncRetries + 1;
        var missingList = (err.missingIds && err.missingIds.length) ? err.missingIds.join(', ') : 'sin_id';

        if (!cursorObj || typeof cursorObj !== 'object') cursorObj = { offset: newOffset };
        cursorObj.incompleteRetries = incRetries;
        cursorObj.missingIds = err.missingIds || [];

        if (incRetries <= maxIncRetries) {
          finalState = 'PENDIENTE';
          fuenteState = 'PENDIENTE_REINTENTO';
          errMsg = ('REINTENTO_INCOMPLETO (' + incRetries + '/' + maxIncRetries + '): Elementos pendientes [' + missingList + ']').slice(0, 160);
        } else {
          finalState = 'INCOMPLETO_RECUPERABLE';
          fuenteState = 'INCOMPLETO_RECUPERABLE';
          errMsg = ('INCOMPLETO_RECUPERABLE: Elementos afectados tras ' + maxIncRetries + ' reintentos [' + missingList + ']').slice(0, 160);
        }
      } else {
        if (cursorObj) {
          cursorObj.pauseCount = pauseCount;
        } else if (isQuota) {
          cursorObj = { offset: 0, pauseCount: pauseCount };
        }
      }

      var cursorStr = cursorObj ? JSON.stringify(cursorObj) : '';

      shCola.getRange(job.rowIdx, 1, 1, 11).setValues([[
        job.runId, job.jobId, job.sourceId, job.platform, job.connector,
        finalState, job.attempts + 1, cursorStr, errMsg, job.created, new Date()
      ]]);

      var partial = (err && err.partialResult) ? err.partialResult : null;
      var isNonErrState = (isQuota || isIncomplete);
      result = {
        runId: run.id,
        fecha: now,
        fuenteId: source.id,
        nombre: source.name,
        conector: job.connector,
        estado: fuenteState,
        leidos: partial ? (Number(partial.leidos) || 0) : 0,
        repetidos: partial ? (Number(partial.repetidos) || 0) : 0,
        clasificados: partial ? (Number(partial.clasificados) || 0) : 0,
        solicitudes: partial ? (Number(partial.solicitudes) || 0) : 0,
        candidatos: partial ? (Number(partial.candidatos) || 0) : 0,
        errores: isNonErrState ? (partial ? (Number(partial.errores) || 0) : 0) : Math.max(1, partial ? (Number(partial.errores) || 0) : 1),
        youtube: partial ? (Number(partial.youtube) || 0) : 0,
        gemini: partial ? (Number(partial.gemini) || 0) : 0,
        duracion: Math.round((Date.now() - tickStart) / 100) / 10,
        mensaje: errMsg
      };
      orqRecordFuente_(ss, result);

      if (isQuota) {
        // Distinguir ventana de espera según tipo de límite:
        // - RPD: programar después del reinicio de cuota del Pacífico (00:05 America/Los_Angeles).
        // - RPM / TPM: espera corta escalonada (1 a 15 minutos).
        var resetDate;
        if (qType === 'RPD') {
          resetDate = orqNextPacificReset_(new Date());
          run.origenCuota = (err && err.httpStatus === 429) ? 'HTTP_429_RPD' : 'LOCAL_RPD';
        } else {
          var waitMs = Math.min(900000, 60000 * Math.max(1, pauseCount));
          resetDate = new Date(Date.now() + waitMs);
          run.origenCuota = 'HTTP_429_' + qType;
        }
        run.estado = 'PAUSADO_CUOTA';
        run.tipoCuota = qType;
        run.proximaReanudacion = resetDate.toISOString();
        run.motivoPausa = errMsg;
        run.mensaje = 'Límite de cuota [' + run.tipoCuota + '] alcanzado (' + errMsg + '). Próxima reanudación: ' +
          Utilities.formatDate(resetDate, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm');
        orqScheduleAt_(resetDate);
      }
    }

    // Contar progreso diferenciando completados, fallidos, pendientes, pausados y recuperables.
    var updatedColaRows = orqRows_(shCola).filter(function(r) { return String(r[0]) === run.id; });
    var completedCount = updatedColaRows.filter(function(r) { return String(r[5]) === 'COMPLETADO'; }).length;
    var failedCount = updatedColaRows.filter(function(r) { return String(r[5]) === 'ERROR'; }).length;
    var recoverableCount = updatedColaRows.filter(function(r) { return String(r[5]) === 'INCOMPLETO_RECUPERABLE'; }).length;
    var pausedCount = updatedColaRows.filter(function(r) {
      var s = String(r[5]);
      return s === 'PAUSADO_CUOTA' || s === 'INCOMPLETO_RECUPERABLE';
    }).length;
    var pendingCount = updatedColaRows.filter(function(r) { return String(r[5]) === 'PENDIENTE'; }).length;

    run.cursor = completedCount;
    run.completados = completedCount;
    run.fallidos = failedCount;
    run.recuperables = recoverableCount;
    run.pausados = pausedCount;
    run.pendientes = pendingCount;

    if (run.estado === 'EJECUTANDO') {
      if (/^ERROR/i.test(String(result && result.estado || ''))) {
        run.mensaje = 'Fuente con error: ' + source.name + ' (' + result.estado + ')';
      } else if (result && (result.estado === 'PENDIENTE_REINTENTO' || result.estado === 'INCOMPLETO_RECUPERABLE')) {
        run.mensaje = 'Fuente con elementos pendientes: ' + source.name + ' (' + result.mensaje + ')';
      } else {
        run.mensaje = 'Fuente procesada: ' + source.name + ' (' + result.estado + ')';
      }
    }

    orqSaveRun_(run);
    orqUpdateRunRow_(ss, run);

    // Si aún quedan tareas PENDIENTE y el run sigue activo, programar el siguiente paso
    if (run.estado === 'EJECUTANDO') {
      if (pendingCount > 0) {
        orqSchedule_();
      } else if (recoverableCount > 0) {
        run.estado = 'INCOMPLETO_RECUPERABLE';
        run.mensaje = 'Búsqueda pausada con ' + recoverableCount + ' fuente(s) en estado INCOMPLETO_RECUPERABLE. ' + (result && result.mensaje || '');
        orqSaveRun_(run);
        orqUpdateRunRow_(ss, run);
        orqRemoveTriggers_();
      } else {
        run.estado = 'FINALIZADO';
        run.mensaje = failedCount > 0 ?
          ('Búsqueda finalizada: ' + completedCount + ' completadas, ' + failedCount + ' con error.') :
          'Búsqueda multifuente completada con éxito.';
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
  if (run.estado !== 'PAUSADO_CUOTA' && run.estado !== 'INCOMPLETO_RECUPERABLE') {
    return { ok: false, estado: run.estado, mensaje: 'La corrida no está pausada por cuota ni en estado recuperable.' };
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
  delete run.tipoCuota;
  delete run.origenCuota;

  var shCola = orqSheet_(ss, 'OrqCola');
  var cRows = orqRows_(shCola);
  for (var ci = 0; ci < cRows.length; ci++) {
    var rowSt = String(cRows[ci][5]);
    if (String(cRows[ci][0]) === run.id && (rowSt === 'PAUSADO_CUOTA' || rowSt === 'INCOMPLETO_RECUPERABLE')) {
      var updatedRow = cRows[ci].slice();
      while (updatedRow.length < 11) updatedRow.push('');
      if (updatedRow[7]) {
        try {
          var parsedCur = JSON.parse(String(updatedRow[7]));
          if (parsedCur && typeof parsedCur === 'object') {
            parsedCur.incompleteRetries = 0;
            updatedRow[7] = JSON.stringify(parsedCur);
          }
        } catch(e) {}
      }
      updatedRow[5] = 'PENDIENTE';
      updatedRow[10] = new Date();
      shCola.getRange(ci + 2, 1, 1, 11).setValues([updatedRow]);
    }
  }
  orqSaveRun_(run);
  orqUpdateRunRow_(ss, run);
  orqTick();
  return { ok: true, estado: 'EJECUTANDO', mensaje: 'Corrida reanudada.' };
}

function orqFlushHallazgos_(ss, rows, known) {
  if (!rows || !rows.length) return;
  var shH = orqSheet_(ss, 'OrqHallazgos');
  shH.getRange(shH.getLastRow() + 1, 1, rows.length, 16).setValues(rows);
  if (known) {
    rows.forEach(function(r) {
      if (r[4] && String(r[8]) !== 'SIN_CLASIFICAR') known[String(r[4])] = true;
    });
  }
}

function orqAttachPartial_(err, res, pendingItems, offset, pauseCount, extra) {
  var errorObj = (err instanceof Error) ? err : new Error(String(err || 'Error en lote'));
  var isQ = orqIsQuotaError_(errorObj);
  var isInc = !!(extra && extra.isIncomplete);
  res.estado = isQ ? 'PAUSADO_CUOTA' : (isInc ? 'INCOMPLETO_RECUPERABLE' : (/^ERROR/i.test(res.estado) ? res.estado : 'ERROR'));
  res.mensaje = String(errorObj.message || errorObj).slice(0, 140);
  if (!isQ && !isInc) res.errores = (res.errores || 0) + 1;
  errorObj.partialResult = res;
  errorObj.isIncomplete = isInc;
  errorObj.missingIds = (extra && Array.isArray(extra.missingIds)) ? extra.missingIds : [];
  errorObj.madeBatchProgress = !!(extra && extra.madeBatchProgress);
  var prevCur = (extra && extra.prevCursor && typeof extra.prevCursor === 'object') ? extra.prevCursor : {};
  errorObj.cursor = {
    offset: Number(offset) || 0,
    pauseCount: Number(pauseCount) || 0,
    staleRetries: Number(prevCur.staleRetries) || 0,
    incompleteRetries: Number(prevCur.incompleteRetries) || 0,
    missingIds: errorObj.missingIds,
    leidos: res.leidos,
    repetidos: res.repetidos,
    clasificados: res.clasificados,
    solicitudes: res.solicitudes,
    candidatos: res.candidatos,
    errores: res.errores,
    youtube: res.youtube,
    gemini: res.gemini,
    pendingItems: Array.isArray(pendingItems) ? pendingItems : []
  };
  return errorObj;
}

function orqExecuteYouTube_(ss, run, source, jobCursor) {
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

  var known = orqSeen_(ss);
  var unclassified = [];
  var baseOffset = 0;

  if (jobCursor && Array.isArray(jobCursor.pendingItems) && jobCursor.pendingItems.length > 0) {
    res.leidos = Number(jobCursor.leidos) || 0;
    res.repetidos = Number(jobCursor.repetidos) || 0;
    res.clasificados = Number(jobCursor.clasificados) || 0;
    res.solicitudes = Number(jobCursor.solicitudes) || 0;
    res.candidatos = Number(jobCursor.candidatos) || 0;
    res.errores = Number(jobCursor.errores) || 0;
    res.youtube = Number(jobCursor.youtube) || 0;
    res.gemini = Number(jobCursor.gemini) || 0;
    baseOffset = Number(jobCursor.offset) || 0;
    jobCursor.pendingItems.forEach(function(c) {
      if (!known[c.id]) unclassified.push(c);
    });
  } else {
    // Cuota YouTube
    var ycap = typeof checkYouTubeQuota_ === 'function' ?
      checkYouTubeQuota_(p, { YOUTUBE_MAX_DAILY_QUOTA: Number(cfg.YOUTUBE_MAX_DAILY_QUOTA) || 100 }) : { allowed: true };
    if (!ycap.allowed) throw new Error('PAUSADO_CUOTA [RPD]: Cuota diaria de YouTube alcanzada');

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
        if (orqIsQuotaError_(e)) throw e;
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

    comments.forEach(function(c) {
      if (known[c.id]) res.repetidos++;
      else unclassified.push(c);
    });
  }

  // Clasificación con Gemini Flash-Lite lote por lote, persistiendo cada lote completado
  var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');

  for (var b = 0; b < unclassified.length; b += 5) {
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };
    if (!gcap.allowed || (gcap.max && (gcap.max - (gcap.count || 0)) <= 0)) {
      var qErr = new Error('PAUSADO_CUOTA [RPD]: Límite diario de Gemini alcanzado (' + (gcap.count || 0) + '/' + (gcap.max || 20) + ').');
      qErr.isQuota = true;
      qErr.quotaType = 'RPD';
      throw orqAttachPartial_(qErr, res, unclassified.slice(b), baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }

    var batch = unclassified.slice(b, b + 5);
    var byId = {};
    try {
      byId = orqCallGeminiBatch_(batch, model, gemKey, cfg);
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
    } catch(err) {
      throw orqAttachPartial_(err, res, unclassified.slice(b), baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }

    var batchRows = [];
    var missingInBatch = [];
    batch.forEach(function(it) {
      if (known[it.id]) return;
      var r = byId[it.id] || null;
      if (!r) {
        missingInBatch.push(it);
        return;
      }
      var intention = !!(r.es_solicitud_clases === true);
      var candidate = !!(intention &&
        r.destinatario === 'pedido_abierto' &&
        r.oportunidad_comercial_alejo === true &&
        Number(r.confianza) >= 0.7 &&
        ['canal_publico_permitido', 'contacto_ofrecido_voluntariamente'].indexOf(r.contactabilidad) >= 0);

      res.clasificados++;
      if (intention) res.solicitudes++;
      if (candidate) res.candidatos++;

      batchRows.push([
        run.id, new Date(), 'YouTube', source.name, it.id, it.url,
        it.publishedAt, orqSafeText_(it.text), String(intention),
        r.destinatario || '', r.contactabilidad || '', candidate ? 'REVISAR' : 'NO',
        orqSafeText_(r.materia), orqSafeText_(r.nivel),
        r.confianza, orqSafeText_(r.resumen)
      ]);
    });

    orqFlushHallazgos_(ss, batchRows, known);

    if (missingInBatch.length > 0) {
      var missingIdsYt = missingInBatch.map(function(m) { return String(m.id || ''); });
      var remainingUnclassified = missingInBatch.concat(unclassified.slice(b + 5));
      throw orqAttachPartial_(
        new Error('Respuesta incompleta de Gemini en YouTube; elementos pendientes [' + missingIdsYt.join(', ') + ']'),
        res,
        remainingUnclassified,
        baseOffset + b + batchRows.length,
        jobCursor && jobCursor.pauseCount,
        {
          isIncomplete: true,
          missingIds: missingIdsYt,
          madeBatchProgress: batchRows.length > 0,
          prevCursor: jobCursor
        }
      );
    }
    if (jobCursor && typeof jobCursor === 'object') {
      jobCursor.incompleteRetries = 0;
      jobCursor.missingIds = [];
    }
  }

  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

function orqExecuteRss_(ss, run, source, jobCursor) {
  var tick = Date.now(), p = PropertiesService.getScriptProperties(), cfg = orqLoadConfig_();
  var gemKey = orqApiKey_('GEMINI_API_KEY');

  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id, nombre: source.name,
    conector: 'rss_foros', estado: 'OK', leidos: 0, repetidos: 0,
    clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };

  var known = orqSeen_(ss);
  var unclassified = [];
  var baseOffset = 0;

  if (jobCursor && Array.isArray(jobCursor.pendingItems) && jobCursor.pendingItems.length > 0) {
    res.leidos = Number(jobCursor.leidos) || 0;
    res.repetidos = Number(jobCursor.repetidos) || 0;
    res.clasificados = Number(jobCursor.clasificados) || 0;
    res.solicitudes = Number(jobCursor.solicitudes) || 0;
    res.candidatos = Number(jobCursor.candidatos) || 0;
    res.errores = Number(jobCursor.errores) || 0;
    res.youtube = Number(jobCursor.youtube) || 0;
    res.gemini = Number(jobCursor.gemini) || 0;
    baseOffset = Number(jobCursor.offset) || 0;
    jobCursor.pendingItems.forEach(function(it) {
      var cid = it.computedId || it.id || ('RSS-' + orqHash_(it.url || it.title));
      it.computedId = cid;
      if (!known[cid]) unclassified.push(it);
    });
  } else {
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

    relevant.forEach(function(it) {
      var id = 'RSS-' + orqHash_(it.url || it.title);
      it.computedId = id;
      if (known[id]) res.repetidos++;
      else unclassified.push(it);
    });
  }

  var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');

  // Procesar items en lotes de 5 persistiendo cada lote y sin dejar SIN_CLASIFICAR
  for (var b = 0; b < unclassified.length; b += 5) {
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };
    if (!gcap.allowed || (gcap.max && (gcap.max - (gcap.count || 0)) <= 0)) {
      var qErr = new Error('PAUSADO_CUOTA [RPD]: Límite diario de Gemini alcanzado (' + (gcap.count || 0) + '/' + (gcap.max || 20) + ').');
      qErr.isQuota = true;
      qErr.quotaType = 'RPD';
      throw orqAttachPartial_(qErr, res, unclassified.slice(b), baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }

    var rawBatch = unclassified.slice(b, b + 5);
    var batch = rawBatch.map(function(it) {
      return { id: it.computedId, sourceLabel: 'Foro RSS', title: it.title, text: String(it.text || '').slice(0, 500), url: it.url, publishedAt: it.publishedAt || it.date };
    });

    var byId = {};
    var geminiFailedNonQuota = false;
    try {
      byId = orqCallGeminiBatch_(batch, model, gemKey, cfg);
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
    } catch(e) {
      if (orqIsQuotaError_(e) || typeof evaluate !== 'function') {
        throw orqAttachPartial_(e, res, unclassified.slice(b), baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
      }
      geminiFailedNonQuota = true;
      res.errores++;
    }

    var batchRows = [];
    var missingInBatch = [];
    rawBatch.forEach(function(origIt, idx) {
      var it = batch[idx];
      if (known[it.id]) return;
      var r = byId[it.id] || null;
      var intention = false, candidate = false;
      if (r) {
        intention = !!(r.es_solicitud_clases === true);
        candidate = !!(intention && r.destinatario === 'pedido_abierto' && r.oportunidad_comercial_alejo === true);
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
      } else if (geminiFailedNonQuota && typeof evaluate === 'function') {
        // Fallback a evaluación por reglas solo ante fallos HTTP no-cuota de Gemini
        var ev = evaluate({ title: it.title, text: it.text, url: it.url, publishedAt: it.publishedAt, kind: 'tutoring' }, cfg, new Date(), {}, {});
        intention = ev.status !== 'Descartado';
        candidate = (['alta', 'media'].indexOf(String(ev.compatible || '').toLowerCase()) >= 0) && intention;
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
      } else {
        missingInBatch.push(origIt);
        return;
      }

      var pubStr = it.publishedAt ? new Date(it.publishedAt).toISOString() : new Date().toISOString();
      batchRows.push([
        run.id, new Date(), 'Foros', source.name, it.id, it.url,
        pubStr, orqSafeText_(it.text), String(intention),
        r.destinatario || '', r.contactabilidad || '', candidate ? 'REVISAR' : 'NO',
        orqSafeText_(r.materia), orqSafeText_(r.nivel),
        r.confianza, orqSafeText_(r.resumen)
      ]);
    });

    orqFlushHallazgos_(ss, batchRows, known);

    if (missingInBatch.length > 0) {
      var missingIdsRss = missingInBatch.map(function(m) { return String(m.computedId || m.id || ''); });
      var remainingRss = missingInBatch.concat(unclassified.slice(b + 5));
      throw orqAttachPartial_(
        new Error('Respuesta incompleta de Gemini en RSS; elementos pendientes [' + missingIdsRss.join(', ') + ']'),
        res,
        remainingRss,
        baseOffset + b + batchRows.length,
        jobCursor && jobCursor.pauseCount,
        {
          isIncomplete: true,
          missingIds: missingIdsRss,
          madeBatchProgress: batchRows.length > 0,
          prevCursor: jobCursor
        }
      );
    }
    if (jobCursor && typeof jobCursor === 'object') {
      jobCursor.incompleteRetries = 0;
      jobCursor.missingIds = [];
    }
  }

  orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

function orqExecuteGmail_(ss, run, source, jobCursor) {
  var tick = Date.now(), p = PropertiesService.getScriptProperties(), cfg = orqLoadConfig_();
  var gemKey = orqApiKey_('GEMINI_API_KEY');
  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id, nombre: source.name,
    conector: 'gmail_alertas', estado: 'OK', leidos: 0, repetidos: 0,
    clasificados: 0, solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };

  var known = orqSeen_(ss);
  var candidateItems = [];
  var baseOffset = 0;

  if (jobCursor && Array.isArray(jobCursor.pendingItems) && jobCursor.pendingItems.length > 0) {
    res.leidos = Number(jobCursor.leidos) || 0;
    res.repetidos = Number(jobCursor.repetidos) || 0;
    res.clasificados = Number(jobCursor.clasificados) || 0;
    res.solicitudes = Number(jobCursor.solicitudes) || 0;
    res.candidatos = Number(jobCursor.candidatos) || 0;
    res.errores = Number(jobCursor.errores) || 0;
    res.youtube = Number(jobCursor.youtube) || 0;
    res.gemini = Number(jobCursor.gemini) || 0;
    baseOffset = Number(jobCursor.offset) || 0;
    jobCursor.pendingItems.forEach(function(it) {
      var cid = it._computedId || it.id;
      it._computedId = cid;
      if (!known[cid]) candidateItems.push(it);
    });
  } else {
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

      // GmailThread es un objeto de servicio: al persistir ORQ_RUN como JSON pierde
      // getMessages()/getId(). No cachearlo en el estado serializado entre triggers.
      // Reconsultar una búsqueda acotada y deduplicar resultados en la planilla.
      var threads = typeof GmailApp !== 'undefined' ? GmailApp.search(query, 0, 15) : [];

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
    } catch(gmailErr) {
      if (orqIsQuotaError_(gmailErr)) throw gmailErr;
      res.errores++;
      res.estado = 'ERROR_GMAIL';
      res.mensaje = String(gmailErr && gmailErr.message || gmailErr).slice(0, 140);
      orqUpdateSourceState_(ss, source.id, 'FALLO');
      res.duracion = Math.round((Date.now() - tick) / 100) / 10;
      orqRecordFuente_(ss, res);
      return res;
    }
  }

  // Clasificación con Gemini por lotes, persistiendo progreso parcial y respetando pausas de cuota
  var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');

  for (var b = 0; b < candidateItems.length; b += 5) {
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };
    if (!gcap.allowed || (gcap.max && (gcap.max - (gcap.count || 0)) <= 0)) {
      var qErr = new Error('PAUSADO_CUOTA [RPD]: Límite diario de Gemini alcanzado (' + (gcap.count || 0) + '/' + (gcap.max || 20) + ').');
      qErr.isQuota = true;
      qErr.quotaType = 'RPD';
      throw orqAttachPartial_(qErr, res, candidateItems.slice(b), baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }

    var batch = candidateItems.slice(b, b + 5);
    var byId = {};
    var geminiFailedNonQuota = false;
    try {
      var gemBatch = batch.map(function(it){ return { id: it._computedId, sourceLabel: 'Gmail', title: it.title, text: (it.text || '').slice(0, 500), url: it.url }; });
      byId = orqCallGeminiBatch_(gemBatch, model, gemKey, cfg);
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
    } catch(e) {
      if (orqIsQuotaError_(e) || typeof evaluate !== 'function') {
        throw orqAttachPartial_(e, res, candidateItems.slice(b), baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
      }
      geminiFailedNonQuota = true;
      res.errores++;
    }

    var batchRows = [];
    var missingInBatch = [];
    batch.forEach(function(it) {
      if (known[it._computedId]) return;
      var r = byId[it._computedId] || null;
      var intention = false, candidate = false;

      if (r) {
        intention = !!(r.es_solicitud_clases === true);
        candidate = !!(intention && r.destinatario === 'pedido_abierto' && r.oportunidad_comercial_alejo === true &&
          ['canal_publico_permitido', 'contacto_ofrecido_voluntariamente'].indexOf(r.contactabilidad) >= 0);
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
      } else if (geminiFailedNonQuota) {
        // Evaluación por motor determinista de Core.js solo ante fallo HTTP no-cuota de Gemini
        var ev = it._ev || { compatible: 'media', status: 'Evaluado', score: 3 };
        intention = true;
        candidate = (['alta', 'media'].indexOf(String(ev.compatible || '').toLowerCase()) >= 0);
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
      } else {
        missingInBatch.push(it);
        return;
      }

      var pubDateStr = '';
      if (it.publishedAt) {
        try { pubDateStr = new Date(it.publishedAt).toISOString(); } catch(e) {}
      }
      if (!pubDateStr) pubDateStr = new Date().toISOString();

      batchRows.push([
        run.id, new Date(), 'Gmail', source.name, it._computedId, it.url || it.gmailLink,
        pubDateStr, orqSafeText_(it.text || it.title),
        String(intention), r.destinatario, r.contactabilidad, candidate ? 'REVISAR' : 'NO',
        orqSafeText_(r.materia), orqSafeText_(r.nivel), r.confianza, orqSafeText_(r.resumen)
      ]);
    });

    orqFlushHallazgos_(ss, batchRows, known);

    if (missingInBatch.length > 0) {
      var missingIdsGm = missingInBatch.map(function(m) { return String(m._computedId || m.id || ''); });
      var remainingGm = missingInBatch.concat(candidateItems.slice(b + 5));
      throw orqAttachPartial_(
        new Error('Respuesta incompleta de Gemini en Gmail; elementos pendientes [' + missingIdsGm.join(', ') + ']'),
        res,
        remainingGm,
        baseOffset + b + batchRows.length,
        jobCursor && jobCursor.pauseCount,
        {
          isIncomplete: true,
          missingIds: missingIdsGm,
          madeBatchProgress: batchRows.length > 0,
          prevCursor: jobCursor
        }
      );
    }
    if (jobCursor && typeof jobCursor === 'object') {
      jobCursor.incompleteRetries = 0;
      jobCursor.missingIds = [];
    }
  }

  orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
  res.duracion = Math.round((Date.now() - tick) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}

function orqIsQuotaError_(errOrMsg) {
  if (!errOrMsg) return false;
  if (typeof errOrMsg === 'object' && errOrMsg.isQuota === true) return true;
  var msg = String(errOrMsg.message || errOrMsg);
  return /PAUSADO_CUOTA|cuota|quota|429|resource_exhausted|rate.?limit|too many requests/i.test(msg);
}

/**
 * Distingue el tipo de límite de cuota alcanzado:
 * - RPD: límite diario de solicitudes (reinicia a medianoche del Pacífico; no reintentable en el mismo tick).
 * - TPM: límite de tokens por minuto (reintentable con espera controlada).
 * - RPM: límite de solicitudes por minuto (reintentable con espera controlada).
 */
function orqClassifyQuotaError_(status, msg, gcap) {
  var text = String(msg || '');
  if ((gcap && gcap.allowed === false) || /\[RPD\]|per.?day|perday|requestsperday|daily|rpd|day.?limit|cuota diaria|l[ií]mite diario/i.test(text)) {
    return { isQuota: true, type: 'RPD', retryableInTick: false };
  }
  if (/\[TPM\]|token|tpm|tokens per minute|tokensperminute|input_token/i.test(text)) {
    return { isQuota: true, type: 'TPM', retryableInTick: true };
  }
  return { isQuota: true, type: 'RPM', retryableInTick: true };
}

function orqEstimateTokens_(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4)) + 256;
}

/**
 * Control preventivo de cuotas RPM y TPM para el orquestador STAGING:
 * - RPM: espacia cada petición Gemini >= 7 segundos (aprox. 8-9 RPM, bajo los 15 RPM de Flash-Lite)
 *   y controla la ventana móvil de 60 segundos.
 * - TPM: contabiliza tokens estimados en la ventana móvil de 60 segundos y espera si se acerca al tope.
 * - No modifica el contador RPD diario de Google.
 */
function orqPaceGemini_(p, cfg, estimatedTokens) {
  var minMs = (cfg && Number(cfg.GEMINI_MIN_INTERVAL_MS) > 0) ? Number(cfg.GEMINI_MIN_INTERVAL_MS) : 7000;
  var lastMs = Number(p.getProperty('ORQ_GEMINI_LAST_CALL_MS') || 0);
  var waitMs = Math.max(0, minMs - (Date.now() - lastMs));
  if (waitMs > 0 && typeof Utilities !== 'undefined' && typeof Utilities.sleep === 'function') {
    Utilities.sleep(waitMs);
  }

  // Control de ventana RPM (solicitudes por minuto)
  var maxRpm = (cfg && Number(cfg.GEMINI_MAX_RPM) > 0) ? Number(cfg.GEMINI_MAX_RPM) : 12;
  var nowRpm = Date.now();
  var rpmWinStart = Number(p.getProperty('ORQ_GEMINI_RPM_WIN_MS') || 0);
  var rpmCount = Number(p.getProperty('ORQ_GEMINI_RPM_COUNT') || 0);
  if (rpmWinStart <= 0 || (nowRpm - rpmWinStart) >= 60000) {
    rpmWinStart = nowRpm;
    rpmCount = 0;
  }
  if (rpmCount >= maxRpm) {
    var rpmWait = Math.max(1000, 60000 - (nowRpm - rpmWinStart));
    if (typeof Utilities !== 'undefined' && typeof Utilities.sleep === 'function') {
      Utilities.sleep(rpmWait);
    }
    rpmWinStart = Date.now();
    rpmCount = 0;
  }
  p.setProperty('ORQ_GEMINI_RPM_WIN_MS', String(rpmWinStart));
  p.setProperty('ORQ_GEMINI_RPM_COUNT', String(rpmCount + 1));

  // Control de ventana TPM (tokens por minuto)
  var tokens = Number(estimatedTokens) || 0;
  if (tokens > 0) {
    var maxTpm = (cfg && Number(cfg.GEMINI_MAX_TPM) > 0) ? Number(cfg.GEMINI_MAX_TPM) : 250000;
    var nowTpm = Date.now();
    var tpmWinStart = Number(p.getProperty('ORQ_GEMINI_TPM_WIN_MS') || 0);
    var tpmUsed = Number(p.getProperty('ORQ_GEMINI_TPM_USED') || 0);
    if (tpmWinStart <= 0 || (nowTpm - tpmWinStart) >= 60000) {
      tpmWinStart = nowTpm;
      tpmUsed = 0;
    }
    if (tokens > maxTpm) {
      var tpmMaxErr = new Error('PAUSADO_CUOTA [TPM]: El lote estimado (' + tokens + ' tokens) excede el límite TPM (' + maxTpm + ').');
      tpmMaxErr.isQuota = true;
      tpmMaxErr.quotaType = 'TPM';
      throw tpmMaxErr;
    }
    if ((tpmUsed + tokens) > maxTpm) {
      var tpmWait = Math.max(1000, 60000 - (nowTpm - tpmWinStart));
      if (typeof Utilities !== 'undefined' && typeof Utilities.sleep === 'function') {
        Utilities.sleep(tpmWait);
      }
      tpmWinStart = Date.now();
      tpmUsed = 0;
    }
    p.setProperty('ORQ_GEMINI_TPM_WIN_MS', String(tpmWinStart));
    p.setProperty('ORQ_GEMINI_TPM_USED', String(tpmUsed + tokens));
  }

  p.setProperty('ORQ_GEMINI_LAST_CALL_MS', String(Date.now()));
}

function orqCallGeminiBatch_(batch, model, key, cfg) {
  var p = PropertiesService.getScriptProperties();
  var prompt = typeof buildGeminiPrompt === 'function' ? buildGeminiPrompt(batch) : JSON.stringify(batch);
  var estTokens = orqEstimateTokens_(prompt);
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent';

  var maxRetries = (cfg && typeof cfg.GEMINI_MAX_RETRIES !== 'undefined') ? Number(cfg.GEMINI_MAX_RETRIES) : 2;
  var baseRetryMs = (cfg && Number(cfg.GEMINI_RETRY_BASE_MS) > 0) ? Number(cfg.GEMINI_RETRY_BASE_MS) : 7000;

  var res = null;
  var lastErrMsg = '';
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    orqPaceGemini_(p, cfg, estTokens);
    res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 8192 }
      }),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    if (code === 200) break;

    var body = {};
    try { body = JSON.parse(res.getContentText()); } catch(e) {}
    lastErrMsg = String(body.error && body.error.message || '').slice(0, 140);

    if (code === 429 || /resource_exhausted|quota|rate.?limit/i.test(lastErrMsg)) {
      var qClass = orqClassifyQuotaError_(code, lastErrMsg, null);
      if (!qClass.retryableInTick || attempt >= maxRetries) {
        var qErr = new Error('PAUSADO_CUOTA [' + qClass.type + ']: Gemini HTTP ' + code + ': ' + lastErrMsg);
        qErr.isQuota = true;
        qErr.quotaType = qClass.type;
        qErr.httpStatus = code;
        throw qErr;
      }
      var waitRetry = baseRetryMs * (attempt + 1);
      if (typeof Utilities !== 'undefined' && typeof Utilities.sleep === 'function') {
        Utilities.sleep(waitRetry);
      }
      p.setProperty('ORQ_GEMINI_LAST_CALL_MS', String(Date.now()));
      continue;
    }

    throw new Error('Gemini HTTP ' + code + ': ' + lastErrMsg);
  }

  var data = JSON.parse(res.getContentText());
  var parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  var parsed = typeof parseGeminiResponse === 'function' ?
    parseGeminiResponse(parts.map(function(part){ return part.text || ''; }).join('')) : null;

  if (!Array.isArray(parsed)) throw new Error('Gemini no devolvió una lista JSON válida.');
  var byId = {};
  parsed.forEach(function(item) { if (item && item.id) byId[item.id] = item; });
  return byId;
}

function orqRecordFuente_(ss, res) {
  var sh = orqSheet_(ss, 'OrqFuentes');
  var rows = orqRows_(sh);
  var targetRow = -1;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][0]) === String(res.runId) && String(rows[i][2]) === String(res.fuenteId)) {
      targetRow = i + 2;
      break;
    }
  }
  var rowValues = [[
    res.runId, res.fecha, res.fuenteId, res.nombre, res.conector, res.estado,
    res.leidos, res.repetidos, res.clasificados, res.solicitudes, res.candidatos,
    res.errores, res.youtube, res.gemini, res.duracion, orqSafeText_(res.mensaje)
  ]];
  if (targetRow >= 2) {
    sh.getRange(targetRow, 1, 1, 16).setValues(rowValues);
  } else {
    sh.getRange(sh.getLastRow() + 1, 1, 1, 16).setValues(rowValues);
  }
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
    cursor: totals ? totals.completados : (run.cursor || 0),
    completados: totals ? totals.completados : (run.completados || 0),
    fallidos: totals ? totals.fallidos : (run.fallidos || 0),
    pendientes: totals ? totals.pendientes : (run.pendientes || 0),
    pausados: totals ? totals.pausados : (run.pausados || 0),
    recuperables: totals ? totals.recuperables : (run.recuperables || 0),
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
    orqClassifyQuotaError_: orqClassifyQuotaError_,
    orqNextPacificReset_: orqNextPacificReset_,
    orqPaceGemini_: orqPaceGemini_,
    orqSetSourceActive: orqSetSourceActive,
    orqSTAGING_ID: ORQ_STAGING_ID
  };
}
