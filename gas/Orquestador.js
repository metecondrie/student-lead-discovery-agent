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

/**
 * Diagnóstico seguro del despliegue (v1): consulta exclusivamente configuración
 * y estados agregados. No llama APIs externas, no muta planillas ni crea
 * triggers. Nunca devuelve cuerpos de correos, comentarios o credenciales.
 *
 * Permite contrastar el ORQ_RUN de Script Properties con la cola y la fila
 * de resumen sin confiar en porcentajes potencialmente obsoletos.
 */
function orqDiagnosticoSoloLectura() {
  var ss = orqDb_();
  var run = orqGetRun_();
  var id = String(run.id || '');
  var cola = ss.getSheetByName('OrqCola');
  var fuenteLog = ss.getSheetByName('OrqFuentes');
  var resumen = ss.getSheetByName('OrqCorridas');

  var latestBySource = {};
  if (fuenteLog && id) {
    orqRows_(fuenteLog).forEach(function(row) {
      if (String(row[0]) === id) latestBySource[String(row[2] || '')] = String(row[5] || '');
    });
  }

  var count = {
    trabajos: 0, completadosCola: 0, completadosVerificados: 0,
    erroresCola: 0, pendientes: 0, enProceso: 0, pausados: 0,
    recuperables: 0, omitidos: 0, inconsistencias: 0,
    completadosConError: 0, completadosSinRegistro: 0
  };
  if (cola && id) {
    orqRows_(cola).forEach(function(row) {
      if (String(row[0]) !== id) return;
      count.trabajos++;
      var state = String(row[5] || '');
      var last = latestBySource[String(row[2] || '')];
      if (state === 'COMPLETADO') {
        count.completadosCola++;
        if (typeof last === 'undefined') {
          count.inconsistencias++;
          count.completadosSinRegistro++;
        } else if (/^ERROR/i.test(last)) {
          count.inconsistencias++;
          count.completadosConError++;
        } else if (last === 'PAUSADO_CUOTA' || last === 'PENDIENTE_REINTENTO' ||
                   last === 'INCOMPLETO_RECUPERABLE' || /^OMITIDO/i.test(last)) {
          count.inconsistencias++;
        } else {
          count.completadosVerificados++;
        }
      } else if (state === 'ERROR') {
        count.erroresCola++;
      } else if (state === 'PENDIENTE') {
        count.pendientes++;
      } else if (state === 'EN_PROCESO') {
        count.enProceso++;
      } else if (state === 'PAUSADO_CUOTA') {
        count.pausados++;
      } else if (state === 'INCOMPLETO_RECUPERABLE') {
        count.recuperables++;
      } else if (state === 'OMITIDO') {
        count.omitidos++;
      }
    });
  }

  var sheetState = 'SIN_REGISTRO', sheetCompleted = null;
  if (resumen && id) {
    orqRows_(resumen).forEach(function(row) {
      if (String(row[0]) === id) {
        sheetState = String(row[3] || '');
        sheetCompleted = Number(row[5]) || 0;
      }
    });
  }

  var triggerCount = 0;
  if (typeof ScriptApp !== 'undefined' &&
      typeof ScriptApp.getProjectTriggers === 'function') {
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction && trigger.getHandlerFunction() === 'orqTick') {
        triggerCount++;
      }
    });
  }

  return {
    versionDiagnostico: 'solo-lectura-v1',
    sinEfectosLaterales: true,
    estadoScriptProperties: String(run.estado || 'SIN_CORRIDAS'),
    estadoResumen: sheetState,
    completadosResumen: sheetCompleted,
    triggersOrqTick: triggerCount,
    cola: count,
    aviso: 'Los registros pueden ser históricos; comparar HEAD y versión desplegada antes de editar o reanudar.'
  };
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
    completadosVerificados: 0,
    discrepanciasEstado: 0,
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
      if (qState === 'COMPLETADO') {
        res.completados++;
        // No considerar éxito si el último resultado registrado indica error,
        // aun cuando una versión antigua dejó la cola en COMPLETADO.
        var fRow = byFuente[String(r[2] || '')];
        var fState = fRow ? String(fRow[5] || '') : '';
        if (fRow && !/^ERROR/i.test(fState) &&
            ['PAUSADO_CUOTA', 'PENDIENTE_REINTENTO', 'INCOMPLETO_RECUPERABLE', 'OMITIDO'].indexOf(fState) < 0) {
          res.completadosVerificados++;
        } else {
          res.discrepanciasEstado++;
        }
      }
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
    res.completadosVerificados = res.fuentes;
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
  // 'Fuentes completas' exige coincidencia entre la cola y el último
  // resultado de OrqFuentes. Previene falsos COMPLETADO históricos.
  var finished = ['FINALIZADO', 'DETENIDO', 'ERROR', 'PAUSADO_CUOTA', 'INCOMPLETO_RECUPERABLE'].indexOf(run.estado) >= 0;
  var now = new Date();
  var secs = Math.round((now.getTime() - new Date(run.inicio).getTime()) / 100) / 10;
  sh.getRange(idx, 1, 1, 15).setValues([[
    run.id, new Date(run.inicio), finished ? now : '', run.estado, run.total, t.completadosVerificados,
    t.leidos, t.repetidos, t.clasificados, t.solicitudes, t.candidatos, t.errores,
    t.youtube, t.gemini, secs
  ]]);
}

/**
 * Previsualización pura del piloto comercial. NO inicia la búsqueda,
 * NO consume APIs/cuotas, NO altera hojas/triggers ni toca la corrida existente.
 * Los conectores Gmail leen correos, no las páginas declaradas en su URL.
 */
function orqPreviewPilotoComercial() {
  var ss = orqDb_();
  var configured = orqSources_(ss);
  var requested = [
    { id: 'CAT-0002', razon: 'Alertas Tusclases (NO rastrea sitemap ni web)' },
    { id: 'CAT-0086', razon: 'Consultas Superprof (excluir confirmaciones administrativas)' },
    { id: 'CAT-0066', razon: 'Solicitudes abiertas en RSS UTNianos' },
    { id: 'CAT-0240', razon: 'Solicitudes preseleccionadas desde hoja manual, sin scraping' }
  ];
  var byId = {};
  configured.forEach(function(s) { byId[s.id] = s; });
  var items = requested.map(function(entry) {
    var s = byId[entry.id] || null;
    var ready = !!s && s.enabled === true &&
      ['gmail_alertas', 'rss_foros', 'youtube_canales', 'solicitudes_verificadas'].indexOf(s.connector) >= 0 &&
      s.verificationState !== 'FALLO';
    return {
      id: entry.id,
      nombre: s ? s.name : '(no configurada)',
      conector: s ? s.connector : 'ninguno',
      activada: !!(s && s.enabled),
      estadoVerificacion: s ? s.verificationState : 'NO_ENCONTRADA',
      listaParaPiloto: ready,
      nota: entry.razon
    };
  });
  return {
    modo: 'SOLO_PREVISUALIZACION',
    despliegueVerificado: false,
    corridaModificada: false,
    fuentesListas: items.filter(function(s) { return s.listaParaPiloto; }).map(function(s) { return s.id; }),
    fuentes: items,
    aviso: 'No iniciar una nueva corrida sin verificar primero el despliegue, los triggers y el estado recuperable de la corrida anterior.'
  };
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
      return ['youtube_canales', 'rss_foros', 'gmail_alertas', 'solicitudes_verificadas'].indexOf(s.connector) >= 0;
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
      } else if (job.connector === 'solicitudes_verificadas') {
        result = orqExecuteSolicitudesVerificadas_(ss, run, source, job.cursor);
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
      var candidate = orqIsCommercialCandidate_(r);

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

/** Candidato comercial: misma regla estricta para YouTube, RSS y Gmail. */
function orqIsCommercialCandidate_(r) {
  return !!(r && r.es_solicitud_clases === true &&
    r.destinatario === 'pedido_abierto' &&
    r.oportunidad_comercial_alejo === true &&
    Number(r.confianza) >= 0.7 &&
    ['canal_publico_permitido', 'contacto_ofrecido_voluntariamente'].indexOf(r.contactabilidad) >= 0);
}

/** Error Gemini no-cuota. No asignar contacto ofrecido ni confianza ficticia. */
function orqSafeGeminiError_(err) {
  if (orqIsQuotaError_(err)) return err;
  var message = String(err && err.message || err || '');
  var isModel = /Gemini HTTP (400|404)\b/i.test(message) ||
    /(?:model not found|model.*not supported|invalid model)/i.test(message);
  var result = new Error((isModel ? 'ERROR_MODELO' : 'ERROR_GEMINI') +
    ': No se pudo verificar clasificación ni contactabilidad. ' +
    message.replace(/[\r\n]+/g, ' ').slice(0, 110));
  result.classificationUnavailable = true;
  return result;
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

    // Nunca inferir recencia si el RSS no trae fecha válida. Normalizar
    // tildes: física/analisis/química deben pasar el mismo prefiltro.
    var now = Date.now(), windowMs = 14 * 86400000;
    var withoutDate = 0;
    var relevant = items.filter(function(it) {
      var rawDate = it.publishedAt || it.date;
      var at = rawDate ? new Date(rawDate).getTime() : NaN;
      if (!isFinite(at)) { withoutDate++; return false; }
      if (at > now + 86400000 || now - at > windowMs) return false;
      var txt = ((it.title || '') + ' ' + (it.text || '')).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return /clases?|profesor(?:a)?|particular|parcial|final|ayuda|busco|necesito|necesitan|tutori[ao]|examen|quimica|fisica|matematica|algebra|analisis|biologia|ingreso/i.test(txt);
    });
    if (withoutDate) res.mensaje = withoutDate + ' publicación(es) sin fecha válida, excluidas del filtro de recencia';

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
    try {
      byId = orqCallGeminiBatch_(batch, model, gemKey, cfg);
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
    } catch(e) {
      throw orqAttachPartial_(orqSafeGeminiError_(e), res, unclassified.slice(b),
        baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
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
        candidate = orqIsCommercialCandidate_(r);
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
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

/**
 * Decodifica únicamente secuencias percent-encoded válidas (%XX), preservando
 * caracteres "%" no escapados comunes en HTML y CSS (ej. width="100%").
 * Evita excepciones URIError: URI malformed que detengan el procesamiento de enlaces.
 */
function orqSafeDecodeUriComponent_(str) {
  if (!str) return '';
  return str.replace(/(%[0-9A-Fa-f]{2})+/g, function(match) {
    try {
      return decodeURIComponent(match);
    } catch(e) {
      return match;
    }
  });
}

/**
 * Decodifica Base64URL (web-safe) a cadena UTF-8.
 */
function orqDecodeBase64WebSafe_(data) {
  if (!data) return '';
  var clean = String(data).replace(/\s+/g, '');
  try {
    if (typeof Utilities !== 'undefined' && typeof Utilities.base64DecodeWebSafe === 'function') {
      return Utilities.newBlob(Utilities.base64DecodeWebSafe(clean)).getDataAsString('UTF-8');
    }
  } catch(e) {}
  try {
    if (typeof Utilities !== 'undefined' && typeof Utilities.base64Decode === 'function') {
      var stdB64 = clean.replace(/-/g, '+').replace(/_/g, '/');
      while (stdB64.length % 4) stdB64 += '=';
      return Utilities.newBlob(Utilities.base64Decode(stdB64)).getDataAsString('UTF-8');
    }
  } catch(e) {}
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(clean, 'base64url').toString('utf8');
    }
  } catch(e) {}
  try {
    var b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (typeof atob === 'function') {
      return decodeURIComponent(escape(atob(b64)));
    }
  } catch(e) {}
  return '';
}

function orqGetHeader_(headers, name) {
  var target = String(name || '').toLowerCase();
  for (var i = 0; i < (headers || []).length; i++) {
    var h = headers[i];
    if (h && h.name && String(h.name).toLowerCase() === target) {
      return String(h.value || '');
    }
  }
  return '';
}

function orqExtractMessageBodies_(payload) {
  var result = { plain: '', html: '' };
  if (!payload) return result;

  function walk(part) {
    if (!part) return;
    var mime = String(part.mimeType || '').toLowerCase();
    var data = part.body && part.body.data;
    if (data) {
      var decoded = orqDecodeBase64WebSafe_(data);
      if (/^text\/plain\b/i.test(mime)) {
        result.plain += (result.plain ? '\n' : '') + decoded;
      } else if (/^text\/html\b/i.test(mime)) {
        result.html += (result.html ? '\n' : '') + decoded;
      }
    }
    if (Array.isArray(part.parts)) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);
  return result;
}

function orqWrapAdvancedMessage_(msg, threadId) {
  var headers = (msg.payload && msg.payload.headers) || [];
  var bodies = orqExtractMessageBodies_(msg.payload);
  var usedSnippet = !bodies.plain && !bodies.html && !!msg.snippet;
  var plainBody = bodies.plain || msg.snippet || '';
  var htmlBody = bodies.html || '';
  var subject = orqGetHeader_(headers, 'Subject');
  var from = orqGetHeader_(headers, 'From');
  var mDate = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date();

  return {
    getId: function() { return String(msg.id || ''); },
    getThreadId: function() { return String(threadId || msg.threadId || ''); },
    getFrom: function() { return from; },
    getSubject: function() { return subject; },
    getDate: function() { return mDate; },
    getPlainBody: function() { return plainBody; },
    getBody: function() { return htmlBody || plainBody; },
    isSnippetFallback: function() { return usedSnippet; }
  };
}

function orqWrapAdvancedThread_(threadResource) {
  var thId = String(threadResource.id || '');
  var rawMsgs = Array.isArray(threadResource.messages) ? threadResource.messages : [];
  var wrappedMsgs = rawMsgs.map(function(m) {
    return orqWrapAdvancedMessage_(m, thId);
  });

  return {
    getId: function() { return thId; },
    getMessages: function() { return wrappedMsgs; }
  };
}

function orqGetGmailThreadById_(id) {
  if (!id) return null;
  // 1. Servicio Avanzado Gmail (Gmail API v1 - compatible con gmail.readonly)
  if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Threads) {
    try {
      var fullThread = Gmail.Users.Threads.get('me', id, { format: 'full' });
      return fullThread ? orqWrapAdvancedThread_(fullThread) : null;
    } catch(e) {
      // Ante error en el Servicio Avanzado (ej: 403 o no encontrado), NO invocar GmailApp
      return null;
    }
  }

  // 2. En Apps Script (entorno real con Session), prohibido usar GmailApp bajo gmail.readonly
  if (typeof Session !== 'undefined') {
    return null;
  }

  // 3. Fallback a GmailApp (exclusivo para mocks de pruebas unitarias locales Node.js)
  if (typeof GmailApp !== 'undefined' && typeof GmailApp.getThreadById === 'function') {
    return GmailApp.getThreadById(id);
  }
  return null;
}

/**
 * Adaptador unificado para búsqueda y lectura de Gmail.
 * Prioriza el servicio avanzado Gmail.Users (compatible con https://www.googleapis.com/auth/gmail.readonly).
 * Maneja paginación con nextPageToken y declara búsquedas incompletas.
 * PROHÍBE invocar GmailApp en Apps Script bajo alcance gmail.readonly.
 */
function orqSearchGmail_(query, maxResults) {
  var limit = Number(maxResults) || 20;
  limit = Math.min(Math.max(limit, 1), 100);

  // 1. Servicio Avanzado Gmail (Gmail API v1) - scope: gmail.readonly
  if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Threads) {
    var results = [];
    var pageToken = null;
    var maxPages = 5;
    var pageCount = 0;
    var hasMore = false;

    do {
      pageCount++;
      var listParams = {
        q: query,
        maxResults: Math.min(limit - results.length, 100)
      };
      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      var resp = Gmail.Users.Threads.list('me', listParams);
      if (!resp || typeof resp !== 'object') {
        throw new Error('Gmail.Users.Threads.list no devolvió una lista de conversaciones; revisar versión y adaptadores.');
      }
      var threadItems = resp.threads || [];
      if (!Array.isArray(threadItems)) {
        throw new Error('Gmail.Users.Threads.list no devolvió una lista de conversaciones; revisar versión y adaptadores.');
      }

      for (var i = 0; i < threadItems.length; i++) {
        var item = threadItems[i];
        if (!item || !item.id) continue;
        try {
          var fullThread = Gmail.Users.Threads.get('me', item.id, { format: 'full' });
          if (fullThread) {
            results.push(orqWrapAdvancedThread_(fullThread));
          }
        } catch(err) {
          console.warn('Error al leer hilo de Gmail:', err.message);
        }
        if (results.length >= limit) {
          break;
        }
      }

      pageToken = resp.nextPageToken || null;
      if (pageToken && results.length >= limit) {
        hasMore = true;
        break;
      }
    } while (pageToken && results.length < limit && pageCount < maxPages);

    if (pageToken && !hasMore && pageCount >= maxPages) {
      hasMore = true;
    }

    results.nextPageToken = pageToken;
    results.incompleto = hasMore;
    if (hasMore) {
      console.warn('orqSearchGmail_: la búsqueda alcanzó el límite de ' + limit + ' hilos pero existen más páginas disponibles (nextPageToken presente).');
    }

    return results;
  }

  // 2. Si estamos en Google Apps Script (entorno real con Session disponible) y el servicio avanzado no está activo:
  // PROHIBIDO usar GmailApp porque requiere https://mail.google.com/ y el proyecto declara gmail.readonly.
  if (typeof Session !== 'undefined') {
    throw new Error('Servicio Avanzado Gmail (Gmail API v1) no habilitado en el proyecto Apps Script. No se permite invocar GmailApp con alcance gmail.readonly por requerir https://mail.google.com/.');
  }

  // 3. Fallback a GmailApp EXCLUSIVAMENTE para arnés de pruebas unitarias / mocks locales (Node.js)
  if (typeof GmailApp !== 'undefined' && typeof GmailApp.search === 'function') {
    var rawList = GmailApp.search(query, 0, limit);
    if (!Array.isArray(rawList)) {
      throw new Error('GmailApp.search no devolvió una lista de conversaciones; revisar versión y adaptadores.');
    }
    rawList.nextPageToken = null;
    rawList.incompleto = false;
    return rawList;
  }

  throw new Error('Servicio de Gmail no disponible en este entorno.');
}

/**
 * Rehidrata un hilo de Gmail desde objeto o identificador string.
 * Compatible tanto con el servicio avanzado como con GmailApp.
 */
function orqHydrateGmailThread_(rawThread) {
  if (rawThread && typeof rawThread.getMessages === 'function' &&
      typeof rawThread.getId === 'function') {
    return rawThread;
  }
  var id = '';
  if (typeof rawThread === 'string') id = rawThread;
  else if (rawThread && typeof rawThread === 'object') {
    id = String(rawThread.threadId || rawThread.id || '');
  }
  if (id) {
    var rehydrated = orqGetGmailThreadById_(id);
    if (rehydrated && typeof rehydrated.getMessages === 'function' &&
        typeof rehydrated.getId === 'function') return rehydrated;
  }
  throw new Error('Servicio de Gmail no entregó un GmailThread válido; revisar versión desplegada, adaptadores y serialización del estado (sin datos del correo).');
}

/**
 * Identidad estable de una solicitud recuperada desde Gmail.
 * Un mismo aviso de Tusclases puede venir en múltiples emails/enlaces de
 * seguimiento: deduplicar por ID de anuncio, no por URL completa ni msgId.
 * No reemplazar el enlace de contacto mostrado al usuario.
 */
function orqGmailStableId_(item, msgId) {
  var it = item || {};
  var raw = String(it.url || '');
  // Usar solo identificadores presentes en la URL PÚBLICA del anuncio.
  // Un enlace /inbox o /perfil puede corresponder a alumnos diferentes.
  var manualId = typeof orqManualAdId_ === 'function' ? orqManualAdId_(raw) : '';
  if (manualId) return 'GMAIL-TUSCLASES-' + manualId;
  if (it.id) return String(it.id);

  // Otras plataformas pueden enviar el mismo enlace a un perfil o bandeja
  // para alumnos DIFERENTES. Solo un ID de anuncio comprobable permite fusionar
  // dos alertas. El nombre, asunto, URL de perfil o bandeja NO alcanzan.
  return 'GMAIL-' + orqHash_(String(it.source || 'gmail') + '|' +
    String(it.msgId || msgId || it.threadId || '') + '|' +
    String(it.title || '').slice(0, 100) + '|' + raw);
}


/**
 * Extrae IDs de anuncios de Tusclases desde enlaces directos o envoltorios
 * de seguimiento percent-encoded (ej. /L0/ de AWS SES). No sigue enlaces.
 * No deducir identidad por nombre del alumno, URL de perfil ni asunto.
 */
function orqTusclasesIds_(input) {
  var s = String(input || '').replace(/&amp;/gi, '&');
  var result = {};
  for (var i = 0; i < 4; i++) {
    var regex = /(?:tusclases\.(?:com\.ar|com|co|pe|mx)|tusclasesparticulares\.(?:cl|com))\/[^\s"'<>]{0,500}?(\d{5,})(?:\.aspx)?(?=[?#/&\s"'<>,.;:)]|$)/gi;
    var hit;
    while ((hit = regex.exec(s)) !== null) result[hit[1]] = true;
    var query = /(?:tusclases\.(?:com\.ar|com|co|pe|mx)|tusclasesparticulares\.(?:cl|com))\/[^\s"'<>]{0,500}?[?&]id=(\d{5,})(?=[&#\s"'<>,.;:)]|$)/gi;
    while ((hit = query.exec(s)) !== null) result[hit[1]] = true;
    var decoded = orqSafeDecodeUriComponent_(s);
    if (decoded === s) break;
    s = decoded;
  }
  var trimmed = s.trim();
  if (/^\d{5,8}$/.test(trimmed)) {
    result[trimmed] = true;
  }
  var mBare = trimmed.match(/\b(?:aviso|solicitud|id|anuncio)[:\s#]*(\d{5,8})\b/i);
  if (mBare) {
    result[mBare[1]] = true;
  }
  return Object.keys(result);
}

/**
 * Identifica el dominio normalizado de Tusclases para evitar colisiones
 * numéricas entre portales (Chile, Colombia, Argentina, etc.).
 */
function orqTusclasesDomain_(input) {
  var s = String(input || '');
  for (var i = 0; i < 4; i++) {
    var m = s.match(/(?:https?:\/\/)?(?:www\.)?((?:tusclases\.(?:com\.ar|com|co|pe|mx)|tusclasesparticulares\.(?:cl|com)))/i);
    if (m) {
      var dom = m[1].toLowerCase();
      if (/\.cl\b/i.test(dom) || dom.indexOf('tusclasesparticulares') >= 0) return 'tusclasesparticulares.cl';
      if (/\.co\b/i.test(dom)) return 'tusclases.co';
      if (/\.com\.ar\b/i.test(dom)) return 'tusclases.com.ar';
      if (/\.pe\b/i.test(dom)) return 'tusclases.pe';
      if (/\.mx\b/i.test(dom)) return 'tusclases.mx';
      return dom;
    }
    var decoded = orqSafeDecodeUriComponent_(s);
    if (decoded === s) break;
    s = decoded;
  }
  return '';
}

function orqDomainToCountry_(domain) {
  var d = String(domain || '').toLowerCase();
  if (/\.cl\b/i.test(d) || d === 'cl') return 'CL';
  if (/\.co\b/i.test(d) || d === 'co') return 'CO';
  if (/\.com\.ar\b/i.test(d) || d === 'ar') return 'AR';
  if (/\.pe\b/i.test(d) || d === 'pe') return 'PE';
  if (/\.mx\b/i.test(d) || d === 'mx') return 'MX';
  if (/\.com\b/i.test(d) || d === 'com' || d === 'es') return 'ES';
  return 'GENERIC';
}

/**
 * Extrae claves compuestas de anuncios Tusclases: [dominio:id], distinguiendo
 * país y portal (ej. tusclasesparticulares.cl:2466158, tusclases.co:2466833, tusclases.com.ar:2466634).
 * Evita colisiones numéricas entre distintos países.
 */
function orqTusclasesAdKeys_(input) {
  var s = String(input || '').replace(/&amp;/gi, '&');
  var result = {};
  for (var i = 0; i < 4; i++) {
    var regex = /((?:tusclases\.(?:com\.ar|com|co|pe|mx)|tusclasesparticulares\.(?:cl|com)))\/[^\s"'<>]{0,500}?(\d{5,})(?:\.aspx)?(?=[?#/&\s"'<>,.;:)]|$)/gi;
    var hit;
    while ((hit = regex.exec(s)) !== null) {
      var dom = String(hit[1]).toLowerCase();
      var id = String(hit[2]);
      result[dom + ':' + id] = true;
    }
    var query = /((?:tusclases\.(?:com\.ar|com|co|pe|mx)|tusclasesparticulares\.(?:cl|com)))\/[^\s"'<>]{0,500}?[?&]id=(\d{5,})(?=[&#\s"'<>,.;:)]|$)/gi;
    while ((hit = query.exec(s)) !== null) {
      var dom = String(hit[1]).toLowerCase();
      var id = String(hit[2]);
      result[dom + ':' + id] = true;
    }
    var decoded = orqSafeDecodeUriComponent_(s);
    if (decoded === s) break;
    s = decoded;
  }
  return Object.keys(result);
}

/**
 * Historial privado de contactos conocidos; solo índices temporales en RAM.
 * Conserva compatibilidad con IDs numéricos anteriores pero indexa claves canónicas
 * compuestas para evitar colisiones entre Chile, Colombia y Argentina.
 */
function orqContactHistory_(ss, opts) {
  opts = opts || {};
  var output = {
    known: {},
    knownCanonical: {},
    knownOrigins: {},
    legacyBareIds: {},
    possibleSent: {},
    possibleSentCanonical: {},
    crmChecked: false,
    receiptsChecked: false,
    sentChecked: false,
    incomplete: false,
    crmRows: 0,
    crmWithId: 0,
    receiptMatches: 0,
    receiptMessages: 0,
    receiptUnparsed: 0,
    crmUnique: 0,
    receiptUnique: 0,
    receiptNotInCrm: 0,
    etapas: {
      busqueda: {
        hilosRecuperados: 0,
        busquedaIncompleta: false
      },
      lectura: {
        mensajesTotal: 0,
        mensajesAsuntoCoincidente: 0,
        mensajesConfirmacionTexto: 0
      },
      decodificacion: {
        conTextoPlano: 0,
        conHtml: 0,
        conSnippetFallback: 0
      },
      extraccion: {
        conEnlacesTracking: 0,
        conClavesExtraidas: 0,
        anunciosUnicos: 0,
        anunciosPorPais: {},
        mensajesSinIdentificador: 0
      }
    }
  };
  var crmKeys = {}, receiptKeys = {};
  var sh = ss.getSheetByName('Contactados');
  if (sh) {
    output.crmChecked = true;
    orqRows_(sh).forEach(function(row) {
      if (!row || (!row[0] && !row[2])) return;
      output.crmRows++;
      var urlStr = String(row[2] || '');
      var noteStr = String(row[4] || '');
      var combo = urlStr + ' ' + noteStr;
      var rowKeys = orqTusclasesAdKeys_(combo);
      var rowBareIds = orqTusclasesIds_(combo);

      if (rowKeys.length) {
        output.crmWithId++;
        rowKeys.forEach(function(k) {
          output.knownCanonical[k] = true;
          crmKeys[k] = true;
          var dom = k.split(':')[0];
          var num = k.split(':')[1];
          output.known[num] = true;
          var country = orqDomainToCountry_(dom);
          if (country) output.knownCanonical[country.toLowerCase() + ':' + num] = true;
        });
      } else if (rowBareIds.length) {
        output.crmWithId++;
        rowBareIds.forEach(function(id) {
          output.known[id] = true;
          output.legacyBareIds[id] = true;
          crmKeys['legacy:' + id] = true;
        });
      }
    });
  } else {
    output.incomplete = true;
  }

  if (opts.skipGmail ||
      ((typeof Gmail === 'undefined' || !Gmail.Users || !Gmail.Users.Threads) &&
       (typeof GmailApp === 'undefined' || typeof GmailApp.search !== 'function'))) {
    output.incomplete = opts.skipGmail ? false : true;
    output.crmUnique = Object.keys(crmKeys).length;
    return output;
  }

  // Comprobantes de Tusclases recibidos (Argentina, Chile, Colombia, España).
  // Agrupación booleana explícita para evitar precedencia implícita de AND sobre OR en Gmail.
  try {
    var receiptQuery = 'newer_than:365d subject:"Mensaje desde tusclases" OR (newer_than:365d subject:"Mensaje desde tusclasesparticulares") OR (newer_than:365d subject:"Mensaje desde tusclases.co") OR (newer_than:365d subject:"Mensaje desde tusclases.com.ar") OR (newer_than:365d subject:"tusclases")';
    var receiptThreads = orqSearchGmail_(receiptQuery, 100);
    if (!Array.isArray(receiptThreads)) throw new Error('Búsqueda Gmail inválida');
    output.etapas.busqueda.hilosRecuperados = receiptThreads.length;
    if (receiptThreads.length === 100 || receiptThreads.incompleto) {
      output.incomplete = true;
      output.etapas.busqueda.busquedaIncompleta = true;
    }
    receiptThreads.forEach(function(raw) {
      var thread = orqHydrateGmailThread_(raw);
      thread.getMessages().forEach(function(m) {
        output.etapas.lectura.mensajesTotal++;
        var sub = String(m.getSubject() || '');
        if (!/Mensaje desde (?:tusclases|tusclasesparticulares)/i.test(sub)) return;
        output.etapas.lectura.mensajesAsuntoCoincidente++;

        var plain = typeof m.getPlainBody === 'function' ? String(m.getPlainBody() || '') : '';
        var html = typeof m.getBody === 'function' ? String(m.getBody() || '') : '';
        if (plain) output.etapas.decodificacion.conTextoPlano++;
        if (html && html !== plain) output.etapas.decodificacion.conHtml++;
        if (typeof m.isSnippetFallback === 'function' && m.isSnippetFallback()) {
          output.etapas.decodificacion.conSnippetFallback++;
        }

        var fullBody = plain + '\n' + html;
        if (!/se ha enviado correctamente|mensaje.*enviado.*correctamente/i.test(fullBody) &&
            !/se ha enviado correctamente|mensaje.*enviado.*correctamente/i.test(sub)) {
          return;
        }
        output.etapas.lectura.mensajesConfirmacionTexto++;
        output.receiptMessages++;

        if (/awstrack\.me|email\.tusclasesparticulares|r\.email\.tusclases|aws/i.test(fullBody)) {
          output.etapas.extraccion.conEnlacesTracking++;
        }

        var keys = orqTusclasesAdKeys_(fullBody);
        var bareIds = orqTusclasesIds_(fullBody);
        if (!keys.length && !bareIds.length) {
          output.receiptUnparsed++;
          output.etapas.extraccion.mensajesSinIdentificador++;
          output.incomplete = true;
        } else {
          output.etapas.extraccion.conClavesExtraidas++;
        }
        keys.forEach(function(k) {
          output.knownCanonical[k] = true;
          receiptKeys[k] = true;
          output.receiptMatches++;
          var dom = k.split(':')[0];
          var num = k.split(':')[1];
          output.known[num] = true;
          var country = orqDomainToCountry_(dom);
          if (country) {
            output.knownCanonical[country.toLowerCase() + ':' + num] = true;
            output.etapas.extraccion.anunciosPorPais[country] =
              (output.etapas.extraccion.anunciosPorPais[country] || 0) + 1;
          }
        });
        bareIds.forEach(function(num) {
          output.known[num] = true;
        });
      });
    });
    output.receiptsChecked = true;
  } catch(e) {
    output.incomplete = true;
  }

  // Búsqueda en Enviados ampliada
  try {
    var sentQuery = 'in:sent newer_than:365d (tusclases.com.ar OR tusclases.co OR tusclasesparticulares.cl OR superprof.com.ar)';
    var sent = orqSearchGmail_(sentQuery, 100);
    if (!Array.isArray(sent)) throw new Error('Búsqueda Gmail inválida');
    if (sent.length === 100 || sent.incompleto) output.incomplete = true;
    sent.forEach(function(raw) {
      var thread = orqHydrateGmailThread_(raw);
      thread.getMessages().forEach(function(m) {
        var plain = typeof m.getPlainBody === 'function' ? String(m.getPlainBody() || '') : '';
        var html = typeof m.getBody === 'function' ? String(m.getBody() || '') : '';
        var fullSent = plain + '\n' + html;
        orqTusclasesAdKeys_(fullSent).forEach(function(k) {
          output.possibleSentCanonical[k] = true;
          var dom = k.split(':')[0];
          var num = k.split(':')[1];
          output.possibleSent[num] = true;
          var country = orqDomainToCountry_(dom);
          if (country) output.possibleSentCanonical[country.toLowerCase() + ':' + num] = true;
        });
        orqTusclasesIds_(fullSent).forEach(function(id) {
          output.possibleSent[id] = true;
        });
      });
    });
    output.sentChecked = true;
  } catch(e) {
    output.incomplete = true;
  }

  output.crmUnique = Object.keys(crmKeys).length;
  output.receiptUnique = Object.keys(receiptKeys).length;
  output.etapas.extraccion.anunciosUnicos = output.receiptUnique;
  output.receiptNotInCrm = Object.keys(receiptKeys).filter(function(k) {
    return !crmKeys[k];
  }).length;
  return output;
}

/** Informe agregado y de solo lectura; no devuelve nombres, IDs, URLs ni cuerpos. */
function orqDiagnosticoContactosSoloLectura() {
  var ss = orqDb_();
  var h = orqContactHistory_(ss);
  var report = {
    modo: 'SOLO_LECTURA',
    contactosCRM: h.crmRows,
    contactosCRMConIdentificador: h.crmWithId,
    anunciosUnicosCRM: h.crmUnique,
    confirmacionesGmail: h.receiptMessages,
    anunciosUnicosConfirmaciones: h.receiptUnique,
    confirmacionesSinIdentificador: h.receiptUnparsed,
    anunciosConfirmadosNoRegistradosEnCRM: h.receiptNotInCrm,
    fuentesConsultadas: {
      contactados: h.crmChecked,
      gmailRecibidos: h.receiptsChecked,
      gmailEnviados: h.sentChecked
    },
    revisionIncompleta: h.incomplete,
    mensajeriaInternaVerificada: false,
    etapas: h.etapas || {},
    advertencia: 'Revisá las conversaciones internas antes de escribir. Este informe no envía mensajes ni edita datos.'
  };
  console.log('[DIAGNOSTICO CONTACTOS (SOLO LECTURA)]:', JSON.stringify(report, null, 2));
  return report;
}

/**
 * Función auxiliar sin parámetros para ejecutar e imprimir el diagnóstico de contactos
 * en modo SOLO LECTURA estricto desde el editor de Google Apps Script.
 * No realiza ninguna escritura en Google Sheets ni altera ninguna hoja.
 */
function orqEjecutarDiagnosticoContactos() {
  return orqDiagnosticoContactosSoloLectura();
}

function orqContactDecision_(item, history) {
  var itemUrl = String(item && (item.url || item) || '');
  var canonicalKeys = orqTusclasesAdKeys_(itemUrl);
  var bareIds = orqTusclasesIds_(itemUrl);

  // 1. Coincidencia exacta por clave canónica (dominio:id)
  if (canonicalKeys.some(function(k) {
    return !!history.knownCanonical[k];
  })) {
    return 'CONTACTADO_CONFIRMADO';
  }

  // 2. Coincidencia con registro legacy de ID desnudo (conservador):
  if (bareIds.some(function(id) { return !!history.legacyBareIds[id]; })) {
    var dom = orqTusclasesDomain_(itemUrl);
    if (dom.indexOf('cl') >= 0 || dom.indexOf('co') >= 0) {
      return 'CONTACTO_PENDIENTE_DE_VERIFICACION';
    }
    return 'CONTACTADO_CONFIRMADO';
  }

  // 3. Verificación de enviados posibles
  if (canonicalKeys.some(function(k) { return !!history.possibleSentCanonical[k]; }) ||
      bareIds.some(function(id) { return !!history.possibleSent[id]; })) {
    return 'VERIFICAR_ENVIADOS_Y_PLATAFORMA';
  }

  // 4. Si el buzón o la hoja estuvieron incompletos:
  return history.incomplete ? 'VERIFICACION_INCOMPLETA' : 'VERIFICAR_MENSAJERIA_INTERNA';
}

function orqIsContacted_(item, history) {
  return orqContactDecision_(item, history) === 'CONTACTADO_CONFIRMADO';
}

/**
 * Registra manualmente un anuncio como contactado con protección de LockService,
 * verificación de idempotencia y sin sobrescribir la columna 12 de OrqHallazgos.
 */
function orqRecordManualContact(data) {
  if (!data || (!data.canonicalKey && !data.url && !data.id)) {
    throw new Error('Identificador de anuncio o URL obligatorios.');
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, error: 'BLOQUEADO: otra operación está escribiendo en la planilla. Intentá de nuevo.' };
  }
  try {
    var ss = orqDb_();
    var sh = orqSheet_(ss, 'Contactados');
    var rawUrl = String(data.url || '');
    var canonicalKeys = orqTusclasesAdKeys_(rawUrl || data.canonicalKey);
    var targetKey = canonicalKeys.length ? canonicalKeys[0] : String(data.canonicalKey || data.id || '');
    var targetUrl = rawUrl;

    if (!targetUrl && targetKey.indexOf(':') > 0) {
      var parts = targetKey.split(':');
      targetUrl = 'https://www.' + parts[0] + '/alumnos/' + parts[1] + '.aspx';
    }

    // 1. Verificar si ya existe en Contactados (idempotencia)
    var rows = orqRows_(sh);
    for (var i = 0; i < rows.length; i++) {
      var rUrl = String(rows[i][2] || '');
      var rNote = String(rows[i][4] || '');
      var rKeys = orqTusclasesAdKeys_(rUrl + ' ' + rNote);
      if (rKeys.indexOf(targetKey) >= 0 || (targetUrl && rUrl === targetUrl)) {
        return { ok: true, yaRegistrado: true, canonicalKey: targetKey, mensaje: 'Ya estaba registrado en Contactados.' };
      }
    }

    // 2. Registrar en Contactados (Columna 12 de OrqHallazgos NO se sobrescribe)
    var today = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
    var nombre = String(data.nombre || 'Alumno ' + (data.fuente || 'Tusclases')).slice(0, 100);
    var materia = String(data.materia || 'Particular').slice(0, 100);
    var nota = 'Contacto manual registrado desde Panel [' + targetKey + ']';
    sh.appendRow([nombre, materia, targetUrl || targetKey, today, nota]);

    // 3. Si existe en Piloto_Demanda_20261101, actualizar estado a EXCLUIDO_CONTACTADO
    var shPiloto = ss.getSheetByName('Piloto_Demanda_20261101');
    if (shPiloto && shPiloto.getLastRow() >= 2) {
      var pRows = shPiloto.getRange(2, 1, shPiloto.getLastRow() - 1, 11).getValues();
      for (var p = 0; p < pRows.length; p++) {
        var pUrl = String(pRows[p][3] || '');
        var pKeys = orqTusclasesAdKeys_(pUrl);
        if (pKeys.indexOf(targetKey) >= 0 || (targetUrl && pUrl === targetUrl)) {
          shPiloto.getRange(p + 2, 8).setValue('EXCLUIDO_CONTACTADO');
          shPiloto.getRange(p + 2, 9).setValue('Confirmado vía panel (' + today + ')');
        }
      }
    }

    return {
      ok: true,
      yaRegistrado: false,
      canonicalKey: targetKey,
      fecha: today,
      mensaje: 'Contacto registrado exitosamente en Contactados.'
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Procedimiento de corrección para revertir un contacto marcado por error.
 */
function orqRevertManualContact(canonicalKeyOrUrl) {
  if (!canonicalKeyOrUrl) throw new Error('Identificador obligatorio para revertir.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, error: 'BLOQUEADO: otra operación en curso.' };
  }
  try {
    var ss = orqDb_();
    var sh = ss.getSheetByName('Contactados');
    if (!sh || sh.getLastRow() < 2) return { ok: false, error: 'Hoja Contactados no encontrada o vacía.' };
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    var canonicalKeys = orqTusclasesAdKeys_(canonicalKeyOrUrl);
    var targetKey = canonicalKeys.length ? canonicalKeys[0] : String(canonicalKeyOrUrl);
    var foundRow = -1;

    for (var i = rows.length - 1; i >= 0; i--) {
      var rUrl = String(rows[i][2] || '');
      var rNote = String(rows[i][4] || '');
      var rKeys = orqTusclasesAdKeys_(rUrl + ' ' + rNote);
      if (rKeys.indexOf(targetKey) >= 0 || rUrl === canonicalKeyOrUrl || rNote.indexOf(targetKey) >= 0) {
        foundRow = i + 2;
        break;
      }
    }

    if (foundRow > 0) {
      sh.deleteRow(foundRow);
      return { ok: true, revertido: true, canonicalKey: targetKey, mensaje: 'Registro de contacto revertido en Contactados.' };
    }
    return { ok: false, error: 'No se encontró el registro para revertir.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sincronización automática periódica e independiente de búsquedas de alumnos.
 * Idempotente, protegida con LockService y cuotas de búsqueda.
 */
function orqSyncContactReceipts(maxDays, dryRun) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, error: 'BLOQUEADO: otra sincronización en curso.' };
  }
  var res = {
    ok: true,
    modo: dryRun ? 'SOLO_LECTURA' : 'ESCRITURA',
    mensajesRevisados: 0,
    comprobantesIdentificados: 0,
    nuevosContactosIncorporados: 0,
    yaRegistrados: 0,
    sinIdentificador: 0,
    busquedaIncompleta: false,
    nextPageToken: null,
    errores: []
  };

  try {
    if (typeof Gmail === 'undefined' || !Gmail.Users || !Gmail.Users.Threads) {
      if (typeof Session !== 'undefined') {
        res.ok = false;
        res.error = 'Servicio Avanzado Gmail (Gmail API v1) no habilitado en Apps Script. Prohibido fallback a GmailApp bajo alcance gmail.readonly.';
        return res;
      }
      if (typeof GmailApp === 'undefined' || typeof GmailApp.search !== 'function') {
        res.ok = false;
        res.error = 'Servicio de Gmail no disponible en este entorno.';
        return res;
      }
    }

    var ss = orqDb_();
    var sh = orqSheet_(ss, 'Contactados');
    var days = Number(maxDays) || 30;
    days = Math.min(Math.max(days, 1), 365);

    var query = 'newer_than:' + days + 'd subject:"Mensaje desde tusclases" OR (newer_than:' + days + 'd subject:"Mensaje desde tusclasesparticulares") OR (newer_than:' + days + 'd subject:"Mensaje desde tusclases.co") OR (newer_than:' + days + 'd subject:"Mensaje desde tusclases.com.ar") OR (newer_than:' + days + 'd subject:"tusclases")';
    var threads = orqSearchGmail_(query, 50);
    if (threads && threads.incompleto) {
      res.busquedaIncompleta = true;
      res.nextPageToken = threads.nextPageToken || null;
    }

    var existingKeys = {};
    if (sh.getLastRow() >= 2) {
      var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      rows.forEach(function(r) {
        var rKeys = orqTusclasesAdKeys_(String(r[2] || '') + ' ' + String(r[4] || ''));
        rKeys.forEach(function(k) { existingKeys[k] = true; });
      });
    }

    var newRows = [];
    threads.forEach(function(thRaw) {
      var th = orqHydrateGmailThread_(thRaw);
      th.getMessages().forEach(function(m) {
        res.mensajesRevisados++;
        var sub = String(m.getSubject() || '');
        if (!/Mensaje desde (?:tusclases|tusclasesparticulares)/i.test(sub)) {
          return;
        }
        var plain = typeof m.getPlainBody === 'function' ? String(m.getPlainBody() || '') : '';
        var html = typeof m.getBody === 'function' ? String(m.getBody() || '') : '';
        var fullBody = plain + '\n' + html;
        if (!/se ha enviado correctamente|mensaje.*enviado.*correctamente/i.test(fullBody) &&
            !/se ha enviado correctamente|mensaje.*enviado.*correctamente/i.test(sub)) {
          return;
        }
        res.comprobantesIdentificados++;
        var keys = orqTusclasesAdKeys_(fullBody);
        if (!keys.length) {
          res.sinIdentificador++;
          return;
        }
        keys.forEach(function(k) {
          if (existingKeys[k]) {
            res.yaRegistrados++;
            return;
          }
          existingKeys[k] = true;
          var mDate = m.getDate();
          var dStr = mDate instanceof Date && !isNaN(mDate.getTime()) ?
            Utilities.formatDate(mDate, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') :
            Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');

          var domainParts = k.split(':');
          var domain = domainParts[0];
          var adId = domainParts[1];
          var fallbackUrl = 'https://www.' + domain + '/alumnos/' + adId + '.aspx';

          newRows.push([
            'Alumno Tusclases (' + orqDomainToCountry_(domain) + ')',
            'Particular',
            fallbackUrl,
            dStr,
            'Comprobante automático Gmail [' + k + ']'
          ]);
          res.nuevosContactosIncorporados++;
        });
      });
    });

    if (!dryRun && newRows.length > 0) {
      newRows.forEach(function(nr) {
        sh.appendRow(nr);
      });
    }

    return res;
  } catch(e) {
    res.ok = false;
    res.error = e.message;
    return res;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Función independiente para ejecución desatendida mediante Trigger programado (reloj).
 * No depende de interfaz web ni de la presencia del usuario.
 * Es idempotente, segura y solo opera en la planilla STAGING.
 * NO crea triggers por sí misma; debe ser vinculada a un trigger time-driven cuando se autorice.
 */
function orqTriggerSyncContactReceipts(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    console.warn('[TRIGGER SYNC] No se pudo obtener el bloqueo (otra operación en curso).');
    return { ok: false, error: 'BLOQUEADO' };
  }
  try {
    var p = PropertiesService.getScriptProperties();
    var sheetId = p.getProperty('SHEET_ID');
    if (sheetId !== ORQ_STAGING_ID) {
      console.warn('[TRIGGER SYNC] Abortado: SHEET_ID no coincide con STAGING.');
      return { ok: false, error: 'NO_STAGING' };
    }

    var res = orqSyncContactReceipts(30, false);
    console.log('[TRIGGER SYNC] Completado:', {
      ok: res.ok,
      mensajesRevisados: res.mensajesRevisados,
      comprobantesIdentificados: res.comprobantesIdentificados,
      nuevosContactosIncorporados: res.nuevosContactosIncorporados,
      yaRegistrados: res.yaRegistrados,
      sinIdentificador: res.sinIdentificador
    });
    return res;
  } catch (err) {
    console.error('[TRIGGER SYNC] Error en sincronización desatendida:', err.message);
    return { ok: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

var ORQ_INITIAL_CONTACTS_20261101 = [
  { country: 'Colombia', domain: 'tusclases.co', id: '2466833', canonicalKey: 'tusclases.co:2466833',
    url: 'https://www.tusclases.co/estudiantes/matematicas/solicitud-2466833.aspx', subject: 'Matemática' },
  { country: 'Chile', domain: 'tusclasesparticulares.cl', id: '2466158', canonicalKey: 'tusclasesparticulares.cl:2466158',
    url: 'https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2466158.aspx', subject: 'Matemática' },
  { country: 'Chile', domain: 'tusclasesparticulares.cl', id: '2466516', canonicalKey: 'tusclasesparticulares.cl:2466516',
    url: 'https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2466516.aspx', subject: 'Matemática' },
  { country: 'Chile', domain: 'tusclasesparticulares.cl', id: '2465382', canonicalKey: 'tusclasesparticulares.cl:2465382',
    url: 'https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2465382.aspx', subject: 'Matemática' }
];

/**
 * Consulta o siembra los 4 contactos confirmados por el usuario el 01/11/2026.
 * Por defecto es dryRun (SOLO_LECTURA) y no escribe nada.
 */
function orqSeedInitialContacts(ss, dryRun) {
  var sh = orqSheet_(ss, 'Contactados');
  var existingKeys = {};
  if (sh.getLastRow() >= 2) {
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    rows.forEach(function(r) {
      var rKeys = orqTusclasesAdKeys_(String(r[2] || '') + ' ' + String(r[4] || ''));
      rKeys.forEach(function(k) { existingKeys[k] = true; });
    });
  }

  var pending = [];
  var alreadyInCrm = [];
  ORQ_INITIAL_CONTACTS_20261101.forEach(function(c) {
    if (existingKeys[c.canonicalKey]) {
      alreadyInCrm.push(c.canonicalKey);
    } else {
      pending.push(c);
    }
  });

  var report = {
    total: ORQ_INITIAL_CONTACTS_20261101.length,
    yaEnCRM: alreadyInCrm.length,
    yaEnCRMDetalle: alreadyInCrm,
    aIncorporar: pending.length,
    aIncorporarDetalle: pending.map(function(p) { return p.canonicalKey; }),
    modo: dryRun !== false ? 'SOLO_LECTURA' : 'ESCRITURA'
  };

  if (dryRun === false && pending.length > 0) {
    pending.forEach(function(c) {
      sh.appendRow([
        'Alumno Tusclases (' + c.country + ')',
        c.subject,
        c.url,
        '2026-11-01',
        'Contacto manual confirmado por usuario (01/11/2026) [' + c.canonicalKey + ']'
      ]);
    });

    var shPiloto = ss.getSheetByName('Piloto_Demanda_20261101');
    if (shPiloto && shPiloto.getLastRow() >= 2) {
      var pRows = shPiloto.getRange(2, 1, shPiloto.getLastRow() - 1, 11).getValues();
      for (var p = 0; p < pRows.length; p++) {
        var pUrl = String(pRows[p][3] || '');
        var pKeys = orqTusclasesAdKeys_(pUrl);
        if (pKeys.some(function(k) { return pending.some(function(item) { return item.canonicalKey === k; }); })) {
          shPiloto.getRange(p + 2, 8).setValue('EXCLUIDO_CONTACTADO');
          shPiloto.getRange(p + 2, 9).setValue('Contacto manual confirmado (01/11/2026)');
        }
      }
    }
  }

  return report;
}

/**
 * Función auxiliar sin parámetros para ejecutar la previsualización de solo lectura
 * de los cuatro contactos confirmados desde el editor de Google Apps Script.
 * Modo SOLO LECTURA estricto: no escribe en Google Sheets ni altera ninguna hoja.
 */
function orqEjecutarPrevisualizacionContactosIniciales() {
  var res = orqSeedInitialContacts(orqDb_(), true);
  console.log('[PREVISUALIZACION CONTACTOS INICIALES (SOLO LECTURA)]:', JSON.stringify(res, null, 2));
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
  var queuedThisExecution = {};
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
        // Una misma alerta puede contener varios alumnos de distintas materias.
        // NO aplicar source.topics como búsqueda Gmail: perderíamos solicitudes.
        // Los comprobantes de contacto saliente se auditan aparte y no son leads.
        query += 'from:(tusclases.com.ar OR tusclasesparticulares.com OR noreply@tusclases.com.ar) -subject:"Mensaje desde tusclases.com.ar"';
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
      var threads = orqSearchGmail_(query, 15);
      if (!Array.isArray(threads)) {
        throw new Error('Servicio de Gmail no devolvió una lista de conversaciones; revisar versión y adaptadores.');
      }

      threads.forEach(function(rawThread) {
        var th = orqHydrateGmailThread_(rawThread);
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
            var id = orqGmailStableId_(it, m.getId());
            if (known[id] || queuedThisExecution[id]) { res.repetidos++; return; }
            queuedThisExecution[id] = true;

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

  // Control previo obligatorio: evitar gastar Gemini en alumnos ya contactados.
  // Las coincidencias exactas en Contactados/comprobantes se excluyen;
  // las demás se muestran solo como PENDIENTE DE VERIFICAR, jamás como libres.
  if (candidateItems.length) {
    var contactHistory = orqContactHistory_(ss);
    var pendingReview = [];
    candidateItems.forEach(function(it) {
      var decision = orqContactDecision_(it, contactHistory);
      if (decision === 'CONTACTADO_CONFIRMADO') {
        res.repetidos++;
        return;
      }
      it._contactCheck = decision;
      pendingReview.push(it);
    });
    candidateItems = pendingReview;
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
    try {
      var gemBatch = batch.map(function(it){ return { id: it._computedId, sourceLabel: 'Gmail', title: it.title, text: (it.text || '').slice(0, 500), url: it.url }; });
      byId = orqCallGeminiBatch_(gemBatch, model, gemKey, cfg);
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
    } catch(e) {
      throw orqAttachPartial_(orqSafeGeminiError_(e), res, candidateItems.slice(b),
        baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }

    var batchRows = [];
    var missingInBatch = [];
    batch.forEach(function(it) {
      if (known[it._computedId]) return;
      var r = byId[it._computedId] || null;
      var intention = false, candidate = false;

      if (r) {
        intention = !!(r.es_solicitud_clases === true);
        candidate = orqIsCommercialCandidate_(r);
        res.clasificados++;
        if (intention) res.solicitudes++;
        if (candidate) res.candidatos++;
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
        String(intention), r.destinatario, r.contactabilidad, candidate ? 'VERIFICAR_CONTACTO' : 'NO',
        orqSafeText_(r.materia), orqSafeText_(r.nivel), r.confianza,
        orqSafeText_((r.resumen || '') + (candidate ? ' [CONTROL CONTACTO: ' +
          (it._contactCheck || 'VERIFICACION_INCOMPLETA') + ']' : ''))
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
    var contactHistory = orqContactHistory_(ss, { skipGmail: true });
    orqRows_(ss.getSheetByName('OrqHallazgos')).forEach(function(r) {
      if (String(r[0]) === run.id &&
          (String(r[11]) === 'REVISAR' || String(r[11]) === 'VERIFICAR_CONTACTO')) {
        var cUrl = String(r[5] || '');
        var cDecision = contactHistory ? orqContactDecision_(cUrl, contactHistory) : 'SIN_AUDITORIA_HISTORICA';
        var isContacted = cDecision === 'CONTACTADO_CONFIRMADO';
        var keys = orqTusclasesAdKeys_(cUrl);
        var canonicalKey = keys.length ? keys[0] : '';
        candidates.push({
          estadoContacto: isContacted ? 'CONTACTADO' :
            (String(r[11]) === 'VERIFICAR_CONTACTO' ? 'PENDIENTE_VERIFICAR_EN_PLATAFORMA' : 'SIN_AUDITORIA_HISTORICA'),
          yaContactado: isContacted,
          canonicalKey: canonicalKey,
          plataforma: String(r[2] || ''),
          fuente: String(r[3] || ''),
          id: String(r[4] || ''),
          url: cUrl,
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
    orqSTAGING_ID: ORQ_STAGING_ID,
    orqTusclasesDomain_: orqTusclasesDomain_,
    orqDomainToCountry_: orqDomainToCountry_,
    orqTusclasesAdKeys_: orqTusclasesAdKeys_,
    orqTusclasesIds_: orqTusclasesIds_,
    orqContactHistory_: orqContactHistory_,
    orqContactDecision_: orqContactDecision_,
    orqIsContacted_: orqIsContacted_,
    orqDiagnosticoContactosSoloLectura: orqDiagnosticoContactosSoloLectura,
    orqEjecutarDiagnosticoContactos: orqEjecutarDiagnosticoContactos,
    orqRecordManualContact: orqRecordManualContact,
    orqRevertManualContact: orqRevertManualContact,
    orqSyncContactReceipts: orqSyncContactReceipts,
    orqTriggerSyncContactReceipts: orqTriggerSyncContactReceipts,
    orqSearchGmail_: orqSearchGmail_,
    orqGetGmailThreadById_: orqGetGmailThreadById_,
    orqWrapAdvancedThread_: orqWrapAdvancedThread_,
    orqWrapAdvancedMessage_: orqWrapAdvancedMessage_,
    orqExtractMessageBodies_: orqExtractMessageBodies_,
    orqDecodeBase64WebSafe_: orqDecodeBase64WebSafe_,
    orqSafeDecodeUriComponent_: orqSafeDecodeUriComponent_,
    orqSeedInitialContacts: orqSeedInitialContacts,
    orqEjecutarPrevisualizacionContactosIniciales: orqEjecutarPrevisualizacionContactosIniciales,
    ORQ_INITIAL_CONTACTS_20261101: ORQ_INITIAL_CONTACTS_20261101
  };
}
