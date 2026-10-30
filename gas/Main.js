/**
 * Main.js — Integración con Google (Sheets, Gmail, triggers). Requiere Core.js.
 * Funciones públicas: setup(), instalar(), detener(), runCycle(), probarSinEnviar(), estado().
 */

var SH = { OP: 'Oportunidades', CT: 'Contactados', CF: 'Config', IN: 'Ingresos', CQ: 'Consultas', EX: 'Ejecuciones', LG: 'Log', VS: '_vistos', FN: 'Fuentes', QA: '_cola_ia' };
var OP_COLS = ['ID', 'Fuente', 'URL', 'Enlace Gmail', 'Tipo', 'Alumno / Título', 'Materia', 'Nivel', 'Necesidad', 'Publicado', 'Detectado',
  'Modalidad', 'Compatibilidad', 'Prioridad', 'Motivo', 'Estado', 'Mensaje propuesto/enviado', 'Último contacto', 'Respuestas', 'Reserva',
  'Clases realizadas', 'Importe cobrado', 'Clave dedup', 'Contactabilidad', 'Vía de contacto', 'Acción de contacto'];
var C = {}; OP_COLS.forEach(function (h, i) { C[h] = i; });
var HEADERS = {
  Contactados: ['Nombre', 'Materia', 'URL', 'Fecha', 'Nota'],
  Ingresos: ['Fecha', 'ID oportunidad', 'Alumno', 'Clases', 'Importe ARS', 'Nota'],
  Consultas: ['Fecha', 'Thread', 'De', 'Asunto', 'Materia', 'Acción', 'Respuesta'],
  Ejecuciones: ['Inicio', 'Fin', 'Estado', 'Emails', 'Items', 'Nuevas', 'Descartadas', 'Respuestas', 'Modo B', 'Errores'],
  Log: ['Fecha', 'Nivel', 'Evento', 'Detalle'],
  _vistos: ['Clave', 'Fecha'],
  Fuentes: ['ID Fuente', 'Plataforma', 'Canal / Creador', 'Temas / Materias', 'Nivel / Universidad', 'URL Canal / Recurso', 'ID Recurso', 'Activo', 'Última revisión', 'Notas'],
  _cola_ia: ['ID', 'Fuente', 'Titulo', 'Texto', 'Fecha', 'Estado']
};
var CONFIG_DESC = {
  SISTEMA_ACTIVO: 'Interruptor general (TRUE/FALSE). FALSE detiene todo.',
  NOMBRE: 'Firma de los mensajes', ANIO_INICIO: 'Año en que empezaste a dar clases', TARIFA: 'ARS por hora',
  MOSTRAR_PERFILES_DOCENTES: 'Incluir referencias a perfiles docentes si sus enlaces están configurados (borrador sujeto a normas de plataforma)',
  PERFIL_TUSCLASES_URL: 'URL pública y directa de tu perfil docente de Tusclases, no la página principal',
  PERFIL_SUPERPROF_URL: 'URL pública y directa de tu perfil docente de Superprof, no la página principal',
  MOSTRAR_EQUIVALENTE_USD: 'Agregar equivalencia USD orientativa en mensajes cuando la cotización esté vigente',
  USD_AUTO_ACTUALIZAR: 'Consultar cotización oficial vendedor aproximadamente 1 vez por día (DolarApi; sin clave)',
  USD_ARS_VENTA: 'Cotización USD/ARS de referencia para mensaje; calculada automáticamente al ejecutar',
  USD_FECHA_COTIZACION: 'Fecha ISO de la cotización en caché; solo se usa si tiene hasta 96 h',
  HORARIOS: 'Texto con tu disponibilidad (se usa en mensajes)', EMAIL_NOTIF: 'Email de avisos (vacío = tu cuenta)',
  MAX_ANTIGUEDAD_DIAS: 'Descartar solicitudes más viejas', LOOKBACK_DIAS: 'Ventana de búsqueda en Gmail',
  UMBRAL_ALTA: 'Puntaje para aviso inmediato', UMBRAL_MIN: 'Puntaje mínimo para preparar mensaje',
  FEEDS_ACTIVOS: 'Consultar APIs públicas de empleo y feeds 1 vez/día',
  FEED_GETONBRD_ACTIVO: 'GetOnBoard (desactivado por defecto; búsquedas laborales)',
  FEED_GETONBRD_QUERIES: 'Búsquedas GetOnBoard (coma)',
  FEED_REMOTIVE_ACTIVO: 'Remotive (desactivado por defecto; en inglés)', FEED_REMOTIVE_QUERIES: 'Búsquedas Remotive (coma)',
  FEED_UTNIANOS_ACTIVO: 'Consultar feed RSS público de UTNianos (1 vez/día; alumnos particulares)', FEED_UTNIANOS_URL: 'URL del feed de UTNianos (https://www.utnianos.com.ar/foro/syndication.php)',
  YOUTUBE_ACTIVO: 'Descubrir alumnos en comentarios públicos de YouTube (TRUE/FALSE; clave en Script Properties)',
  YOUTUBE_MAX_COMMENTS_PER_VIDEO: 'Cantidad máxima de comentarios recientes por video (máx 100)',
  YOUTUBE_MAX_DAILY_QUOTA: 'Límite máximo diario de llamadas a YouTube Data API v3 (por defecto 100)',
  GEMINI_ACTIVO: 'Clasificador de intención con Gemini Flash-Lite (TRUE/FALSE; clave en Script Properties)',
  GEMINI_MODEL: 'Modelo de Gemini (por defecto gemini-3.5-flash-lite, tier gratuito)',
  GEMINI_MAX_DAILY_CALLS: 'Máximo diario de llamadas por lotes a Gemini (por defecto 20 = hasta 100 items)',
  GEMINI_BATCH_SIZE: 'Cantidad de items evaluados por lote en cada llamada (por defecto 5)',
  MODO_B_ACTIVO: 'Detectar consultas directas en Gmail y preparar BORRADOR (desactivado por defecto)',
  MODO_B_ETIQUETA_ENTRADA: 'Etiqueta de entrada en Gmail requerida para Modo B (ej. Captacion_Inbound)',
  MODO_B_REMITENTES_AUTORIZADOS: 'Lista de remitentes autorizados para Modo B separados por coma',
  MODO_B_AUTOENVIO: 'TRUE = enviar automáticamente (requiere fecha de autorización)', MODO_B_AUTORIZADO_HASTA: 'AAAA-MM-DD. Vencida = sin envío',
  MODO_B_MAX_DIARIO: 'Máximo de respuestas automáticas por día', MODO_C_ACTIVO: 'Bloqueado: sin canal autorizado para contacto saliente',
  RESUMEN_HORA: 'Hora del resumen diario (solo si hay novedades)', OBJETIVO_MENSUAL: 'Meta de ingresos ARS',
  PESOS: 'JSON de ponderaciones de la puntuación', TEXTO_IGNORAR: 'Regex opcional de texto a ignorar en emails'
};

/* ---------------- Infraestructura ---------------- */
function props_() { return PropertiesService.getScriptProperties(); }
function ss_() {
  var id = props_().getProperty('SHEET_ID');
  if (!id) throw new Error('Falta ejecutar setup()');
  return SpreadsheetApp.openById(id);
}
function sheet_(name) { return ss_().getSheetByName(name); }
function rows_(name) {
  var sh = sheet_(name), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
}
function append_(name, rows) {
  if (!rows.length) return;
  var cleanRows = rows.map(function (row) {
    return row.map(function (cell) {
      return sanitizeForSheets(cell);
    });
  });
  var sh = sheet_(name);
  sh.getRange(sh.getLastRow() + 1, 1, cleanRows.length, cleanRows[0].length).setValues(cleanRows);
}
function log_(level, event, detail) {
  try { append_(SH.LG, [[new Date(), level, event, String(detail || '').slice(0, 2000)]]); } catch (e) { Logger.log(level + ' ' + event + ' ' + detail); }
}
function myEmail_() { return Session.getEffectiveUser().getEmail(); }
function notify_(subject, body) {
  // Envíos estrictamente limitados a la cuenta propietaria autenticada
  MailApp.sendEmail(myEmail_(), '[Captación] ' + subject, body);
}

function loadConfig_() {
  var cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  rows_(SH.CF).forEach(function (r) {
    var k = String(r[0]).trim(), v = r[1];
    if (!(k in cfg)) return;
    var d = DEFAULT_CONFIG[k];
    if (typeof d === 'boolean') cfg[k] = (v === true || String(v).toUpperCase() === 'TRUE');
    else if (typeof d === 'number') cfg[k] = (v === '' || v === null || isNaN(Number(v))) ? d : Number(v);
    else if (typeof d === 'object') { try { cfg[k] = JSON.parse(v); } catch (e) { } }
    else cfg[k] = (v instanceof Date) ? v.toISOString().slice(0, 10) : String(v);
  });
  cfg.MODO_C_ACTIVO = false; // sin canal autorizado: siempre bloqueado
  cfg.MODO_B_AUTOENVIO = false; // este proyecto nunca responde a terceros automáticamente
  return cfg;
}

/* ---------------- Instalación ---------------- */
function setYouTubeApiKey(key) {
  if (!key) throw new Error('La clave no puede estar vacía');
  props_().setProperty('YOUTUBE_API_KEY', String(key).trim());
  log_('INFO', 'seguridad', 'YouTube API Key guardada de forma segura en Script Properties');
  return 'OK: YouTube API Key configurada';
}

function setGeminiApiKey(key) {
  if (!key) throw new Error('La clave no puede estar vacía');
  props_().setProperty('GEMINI_API_KEY', String(key).trim());
  log_('INFO', 'seguridad', 'Gemini API Key guardada de forma segura en Script Properties');
  return 'OK: Gemini API Key configurada';
}

function setup() {
  var p = props_(), id = p.getProperty('SHEET_ID'), ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = SpreadsheetApp.create('Captación de alumnos — ' + DEFAULT_CONFIG.NOMBRE); p.setProperty('SHEET_ID', ss.getId()); }
  } else {
    ss = SpreadsheetApp.create('Captación de alumnos — ' + DEFAULT_CONFIG.NOMBRE);
    p.setProperty('SHEET_ID', ss.getId());
  }
  var defs = {}; defs[SH.OP] = OP_COLS;
  for (var k in HEADERS) defs[k] = HEADERS[k];
  defs[SH.CF] = ['Clave', 'Valor', 'Descripción'];
  [SH.OP, SH.CT, SH.CF, SH.IN, SH.CQ, SH.EX, SH.LG, SH.VS, SH.FN, SH.QA].forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, defs[name].length).setValues([defs[name]]);
      sh.setFrozenRows(1);
    }
    if (name === SH.OP && sh.getLastRow() > 0) {
      // Migración aditiva: nunca desplazar los encabezados/columnas preexistentes.
      var currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      ['Contactabilidad', 'Vía de contacto', 'Acción de contacto'].forEach(function (col) {
        if (currentHeaders.indexOf(col) < 0) {
          sh.getRange(1, currentHeaders.length + 1).setValue(col);
          currentHeaders.push(col);
        }
      });
    }
    if (name === SH.VS || name === SH.QA) sh.hideSheet();
  });

  // Poblar hoja Fuentes con fuentes educativas verificadas si está vacía
  var fnRows = rows_(SH.FN);
  if (!fnRows.length && typeof EDUCATIONAL_SOURCES !== 'undefined' && Array.isArray(EDUCATIONAL_SOURCES)) {
    var defaultFnRows = EDUCATIONAL_SOURCES.map(function (s) {
      return [s.id, s.platform, s.creator, s.topics, s.level, s.channelUrl, s.resourceId, s.active ? 'TRUE' : 'FALSE', '', s.notes];
    });
    append_(SH.FN, defaultFnRows);
  }

  // Poblar Config preservando valores existentes
  var existing = {};
  var existingRows = rows_(SH.CF);
  existingRows.forEach(function (r) { existing[r[0]] = 1; });
  var add = [];
  Object.keys(DEFAULT_CONFIG).forEach(function (k) {
    if (existing[k]) return;
    var v = DEFAULT_CONFIG[k];
    add.push([k, typeof v === 'object' ? JSON.stringify(v) : v, CONFIG_DESC[k] || '']);
  });
  if (add.length) append_(SH.CF, add);

  // Migrar claves sensibles si existían en Config hacia Script Properties
  existingRows.forEach(function (r) {
    var k = String(r[0]).trim();
    if ((k === 'YOUTUBE_API_KEY' || k === 'GEMINI_API_KEY') && r[1]) {
      p.setProperty(k, String(r[1]).trim());
      // No conservar credenciales en una celda accesible a editores de Sheets.
      var sheetConfig = ss.getSheetByName(SH.CF);
      var idx = existingRows.indexOf(r);
      sheetConfig.getRange(idx + 2, 2, 1, 1).setValues([['']]);
    }
  });

  var def = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  log_('INFO', 'setup', ss.getUrl());
  return ss.getUrl();
}

function instalar() {
  setup();
  detenerTriggers_();
  ScriptApp.newTrigger('runCycle').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('onEditOp').forSpreadsheet(props_().getProperty('SHEET_ID')).onEdit().create();
  // La activación del motor requiere cambio explícito posterior en Config; instalar sólo triggers.
  setConfig_('SISTEMA_ACTIVO', false);
  log_('INFO', 'instalar', 'Triggers creados: runCycle cada 1 h + onEdit');
  return 'OK: ' + ss_().getUrl();
}
function detener() { detenerTriggers_(); try { setConfig_('SISTEMA_ACTIVO', false); log_('INFO', 'detener', 'Triggers eliminados'); } catch (e) { } return 'Detenido'; }
function detenerTriggers_() { ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); }); }
function setConfig_(key, val) {
  var sh = sheet_(SH.CF), r = rows_(SH.CF);
  for (var i = 0; i < r.length; i++) if (r[i][0] === key) { sh.getRange(i + 2, 2, 1, 1).setValues([[val]]); return; }
  append_(SH.CF, [[key, val, CONFIG_DESC[key] || '']]);
}
function estado() {
  var p = props_();
  var s = { triggers: ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }), ultimaEjecucion: p.getProperty('LAST_RUN_END'),
    ultimoEstado: p.getProperty('LAST_RUN_STATUS'), activo: loadConfig_().SISTEMA_ACTIVO, hoja: ss_().getUrl() };
  Logger.log(JSON.stringify(s, null, 2)); return s;
}

/* ---------------- Ciclo principal ---------------- */
/** Obtiene cotización de referencia una vez al día, sin bloquear el resto del bot si falla.
 * Fuente abierta: DolarApi, mercado oficial vendedor. No equivale a tasa final de cobro.
 * En simulación no hace llamadas ni escribe propiedades.
 */
function hydrateUsdRate_(cfg, now, isSim) {
  var p = props_(), latest = String(p.getProperty('FX_USD_ARS_VENTA') || '');
  var date = String(p.getProperty('FX_USD_FECHA') || '');
  if (cfg.USD_AUTO_ACTUALIZAR && !isSim && p.getProperty('FX_LAST_ATTEMPT_DAY') !== dayKey_(now)) {
    p.setProperty('FX_LAST_ATTEMPT_DAY', dayKey_(now));
    try {
      var response = UrlFetchApp.fetch('https://dolarapi.com/v1/dolares/oficial', {muteHttpExceptions:true});
      if (response.getResponseCode() !== 200) throw new Error('HTTP ' + response.getResponseCode());
      var q = JSON.parse(response.getContentText());
      var rate = Number(q.venta), changed = new Date(q.fechaActualizacion || '');
      if (!Number.isFinite(rate) || rate < 100 || rate > 100000 || isNaN(changed.getTime())) throw new Error('Respuesta incompleta');
      if (changed.getTime() > now.getTime() + 3600000) throw new Error('Fecha futura');
      latest = String(rate); date = changed.toISOString();
      p.setProperty('FX_USD_ARS_VENTA', latest); p.setProperty('FX_USD_FECHA', date);
    } catch (err) {
      log_('WARN', 'cotizacion_usd', 'No se actualizó la referencia: ' + err.message);
    }
  }
  // No reemplazar una cotización configurada explícitamente por otra vacía.
  if (Number(latest) > 0 && date) { cfg.USD_ARS_VENTA = Number(latest); cfg.USD_FECHA_COTIZACION = date; }
  return cfg;
}

function runCycle(opts) {
  opts = (opts && typeof opts === 'object' && !opts.triggerUid && !opts.authMode) ? opts : {};
  var isSim = !!(opts.simulacion || opts.dryRun);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 'ocupado';
  var p = props_(), start = new Date(), st = { emails: 0, items: 0, nuevas: 0, desc: 0, resp: 0, modoB: 0, err: [], isSim: isSim };
  try {
    var cfg = loadConfig_();
    if (!cfg.SISTEMA_ACTIVO && !isSim) { p.setProperty('LAST_RUN_STATUS', 'inactivo'); return 'inactivo'; }
    if (!isSim && p.getProperty('RUN_STATE') === 'running') log_('WARN', 'recuperación', 'La ejecución anterior no terminó (' + p.getProperty('RUN_START') + '); se reprocesa de forma idempotente.');
    if (!isSim) { p.setProperty('RUN_STATE', 'running'); p.setProperty('RUN_START', start.toISOString()); }
    var deadline = start.getTime() + 4.5 * 60 * 1000;
    cfg = hydrateUsdRate_(cfg, start, isSim);
    var ctx = buildContext_();
    var alerts = [];

    // 1) Alertas de plataformas en Gmail (Modo A)
    try { ingestGmail_(cfg, ctx, st, alerts, deadline, isSim); } catch (e) { st.err.push('gmail: ' + e.message); }
    // 2) Feeds externos (programación y registro separados: docencia vs empleo)
    if (cfg.FEEDS_ACTIVOS && Date.now() < deadline) {
      // 2a) Fuentes docentes prioritarias (UTNianos)
      if (cfg.FEED_UTNIANOS_ACTIVO && (isSim || p.getProperty('LAST_FEED_TUTORING_DAY') !== dayKey_(start))) {
        try {
          ingestTutoringFeeds_(cfg, ctx, st, alerts, isSim);
          if (!isSim) {
            p.setProperty('LAST_FEED_TUTORING_DAY', dayKey_(start));
            p.setProperty('LAST_FEED_DAY', dayKey_(start)); // retrocompatibilidad
          }
        } catch (e) { st.err.push('feeds: ' + e.message); }
      }
      // 2b) Fuentes docentes proactivas: comentarios públicos de YouTube (1 vez/día; aislado)
      if (cfg.YOUTUBE_ACTIVO && (isSim || p.getProperty('LAST_YOUTUBE_DAY') !== dayKey_(start)) && Date.now() < deadline) {
        var prevYtErr = st.err.length;
        try {
          ingestYouTubeComments_(cfg, ctx, st, alerts, isSim);
          if (!isSim && st.err.length === prevYtErr) p.setProperty('LAST_YOUTUBE_DAY', dayKey_(start));
        } catch (e) { st.err.push('youtube: ' + e.message); }
      }
      // 2c) Fuentes laborales secundarias (GetOnBoard, Remotive) - desactivadas por defecto
      var anyJobActive = (cfg.FEED_GETONBRD_ACTIVO || cfg.FEED_REMOTIVE_ACTIVO);
      if (anyJobActive && (isSim || p.getProperty('LAST_FEED_JOBS_DAY') !== dayKey_(start)) && Date.now() < deadline) {
        var prevJobErr = st.err.length;
        try {
          ingestJobFeeds_(cfg, ctx, st, alerts, isSim);
          if (!isSim && st.err.length === prevJobErr) p.setProperty('LAST_FEED_JOBS_DAY', dayKey_(start));
        } catch (e) { st.err.push('feeds: ' + e.message); }
      }
    }
    flush_(ctx, isSim);
    // 2d) Clasificador Gemini Flash-Lite: procesar cola pendiente por lotes
    if (cfg.GEMINI_ACTIVO && Date.now() < deadline) {
      try { processGeminiQueue_(cfg, ctx, st, alerts, isSim); flush_(ctx, isSim); } catch (e) { st.err.push('gemini: ' + e.message); }
    }
    // 3) Consultas directas (Modo B)
    if (cfg.MODO_B_ACTIVO && Date.now() < deadline) {
      try { modeB_(cfg, st, alerts, isSim); } catch (e) { st.err.push('modoB: ' + e.message); }
    }
    // 4) Ingresos -> columnas de oportunidades
    if (!isSim) {
      try { syncIngresos_(); } catch (e) { st.err.push('ingresos: ' + e.message); }
    }

    if (alerts.length && !opts.noNotify && !isSim) notify_(alerts.length + ' novedad(es) importante(s)', alerts.join('\n\n---\n\n') + '\n\nHoja: ' + ss_().getUrl());
    if (st.err.length) { log_('ERROR', 'ciclo', st.err.join(' | ')); if (!opts.noNotify && !isSim) maybeNotifyError_(st.err); }
    if (!opts.noNotify && !isSim) maybeDigest_(cfg, start);
    if (!isSim) {
      p.setProperty('RUN_STATE', 'done'); p.setProperty('LAST_RUN_END', new Date().toISOString());
      p.setProperty('LAST_RUN_STATUS', st.err.length ? 'con errores' : 'ok');
    }
    return st;
  } catch (e) {
    log_('ERROR', 'ciclo fatal', e.stack || e.message); st.err.push(e.message);
    if (!isSim) p.setProperty('LAST_RUN_STATUS', 'fatal: ' + e.message);
    if (!opts.noNotify && !isSim) maybeNotifyError_(st.err);
    return st;
  } finally {
    if (!isSim) {
      try { append_(SH.EX, [[start, new Date(), st.err.length ? 'ERROR' : 'OK', st.emails, st.items, st.nuevas, st.desc, st.resp, st.modoB, st.err.join(' | ').slice(0, 500)]]); } catch (e) { }
    }
    lock.releaseLock();
  }
}
function probarSinEnviar() { return runCycle({ simulacion: true }); }
/** Diagnóstico: muestra cómo se interpretan los últimos emails de plataformas (no modifica nada). Ver resultado en hoja Log. */
function diagnosticoEmails() {
  var cfg = loadConfig_(), out = [];
  GmailApp.search(sourceQuery_(cfg).replace(/newer_than:\d+d/, 'newer_than:60d'), 0, 15).forEach(function (th) {
    var ms = th.getMessages(), m = ms[ms.length - 1];
    var r = extractFromEmail({ id: m.getId(), threadId: th.getId(), from: m.getFrom(), subject: m.getSubject(), date: m.getDate(), plain: m.getPlainBody(), html: m.getBody() }, cfg);
    var ev = r.items.map(function (it) { var e = evaluate(it, cfg, new Date(), {}, {}); return [e.studentName || '-', e.subject || '-', e.level || '-', e.modality, e.score, e.status, e.url ? 'url ok' : 'sin url'].join(' | '); });
    out.push([new Date(), 'DIAG', m.getFrom() + ' :: ' + m.getSubject(), (r.ignored || '') + ' ' + ev.join(' || ')]);
  });
  append_(SH.LG, out.length ? out : [[new Date(), 'DIAG', 'sin emails de plataformas en 60 días', '']]);
  return out.length;
}
function dayKey_(d) { return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd'); }

function buildContext_() {
  var ctx = {
    index: { ids: {}, keys: {} },
    contacted: {},
    seen: {},
    byUrl: {},
    byId: {},
    byThread: {},
    byName: {},
    newRows: [],
    newSeen: [],
    updates: [],
    ops: rows_(SH.OP)
  };
  ctx.ops.forEach(function (r, i) {
    var id = r[C['ID']];
    ctx.index.ids[id] = 1;
    ctx.byId[id] = i;
    if (r[C['Clave dedup']]) ctx.index.keys[r[C['Clave dedup']]] = 1;
    var u = canonicalUrl(r[C['URL']]);
    if (u && !isGenericDashboardUrl(u)) ctx.byUrl[u] = i;
    if (r[C['Enlace Gmail']]) {
      var tm = String(r[C['Enlace Gmail']]).match(/#all\/([a-f0-9]+)/i);
      if (tm) {
        if (!ctx.byThread[tm[1]]) ctx.byThread[tm[1]] = [];
        ctx.byThread[tm[1]].push(i);
      }
    }
    if (r[C['Tipo']] === 'tutoring' && r[C['Alumno / Título']]) {
      var nk = norm(r[C['Alumno / Título']]);
      if (!ctx.byName[nk]) ctx.byName[nk] = [];
      ctx.byName[nk].push(i);
    }
  });
  rows_(SH.CT).forEach(function (r) { contactKeys(r[0], r[1], r[2]).forEach(function (k) { ctx.contacted[k] = 1; }); });
  rows_(SH.VS).forEach(function (r) { ctx.seen[r[0]] = 1; });
  return ctx;
}
function markSeen_(ctx, key, isSim) {
  if (isSim) return; // En simulación nunca se consume estado ni se marcan vistos
  if (!ctx.seen[key]) { ctx.seen[key] = 1; ctx.newSeen.push([key, new Date()]); }
}

function toRow_(r) {
  var row = new Array(OP_COLS.length).fill('');
  row[C['ID']] = r.id; row[C['Fuente']] = r.source; row[C['URL']] = r.url; row[C['Enlace Gmail']] = r.gmailLink; row[C['Tipo']] = r.kind;
  row[C['Alumno / Título']] = r.kind === 'tutoring' ? (r.studentName || r.title.slice(0, 120)) : r.title.slice(0, 120);
  row[C['Materia']] = r.subject; row[C['Nivel']] = r.level; row[C['Necesidad']] = r.need;
  row[C['Publicado']] = r.publishedAt ? new Date(r.publishedAt) : ''; row[C['Detectado']] = r.detectedAt; row[C['Modalidad']] = r.modality;
  row[C['Compatibilidad']] = r.compatible; row[C['Prioridad']] = r.score; row[C['Motivo']] = r.reasons; row[C['Estado']] = r.status;
  row[C['Mensaje propuesto/enviado']] = r.message; row[C['Clave dedup']] = r.dedupKey;
  row[C['Contactabilidad']] = r.contactability || '';
  row[C['Vía de contacto']] = r.contactChannel || '';
  row[C['Acción de contacto']] = r.contactAction || '';
  return row;
}

/** Procesa un item extraído: respuesta de alumno ya registrado, o nueva oportunidad. */
function handleItem_(it, cfg, ctx, st, alerts, now, isSim) {
  st.items++;
  var nk = it.studentName ? norm(it.studentName) : '';
  var nt = norm(it.title + ' ' + it.text.slice(0, 300));
  var isReply = /respond|respuesta|te ha escrito|nuevo mensaje|te escribi/.test(nt);

  // Identificación precisa del alumno o conversación:
  // 1) Priorizar identificación unívoca por URL canónica o ID de solicitud (no por hilo)
  var cu = canonicalUrl(it.url);
  var matchedIdx = -1;
  if (cu && !isGenericDashboardUrl(cu) && ctx.byUrl[cu] !== undefined) {
    matchedIdx = ctx.byUrl[cu];
  } else {
    var tempId = makeId(it);
    if (ctx.byId && ctx.byId[tempId] !== undefined) {
      matchedIdx = ctx.byId[tempId];
    }
  }

  // 2) Si es una respuesta entrante y no coincidió por URL/ID directo, intentar asociar por hilo o nombre
  if (isReply && matchedIdx < 0) {
    // Si el hilo de Gmail corresponde unívocamente a una sola oportunidad previa:
    if (it.threadId && ctx.byThread[it.threadId] && ctx.byThread[it.threadId].length === 1) {
      matchedIdx = ctx.byThread[it.threadId][0];
    }

    // Si aún no coincide por hilo único, asociar por nombre comprobando ausencia de conflicto de URLs
    if (matchedIdx < 0 && it.kind === 'tutoring' && nk && ctx.byName[nk]) {
      var candidates = ctx.byName[nk];
      var compatibleCandidates = candidates.filter(function (idx) {
        var candUrl = canonicalUrl(ctx.ops[idx][C['URL']]);
        if (cu && candUrl && cu !== candUrl && !isGenericDashboardUrl(candUrl) && !isGenericDashboardUrl(cu)) {
          return false; // Tienen URLs distintas: no fusionar
        }
        return true;
      });
      if (compatibleCandidates.length === 1) {
        matchedIdx = compatibleCandidates[0];
      } else if (compatibleCandidates.length > 1) {
        alerts.push('REVISIÓN MANUAL: Respuesta recibida para "' + it.studentName + '", pero existen múltiples registros con ese nombre o identificadores distintos.');
        return;
      }
    }
  }

  if (matchedIdx >= 0) {
    var row = ctx.ops[matchedIdx], status = row[C['Estado']];
    if (isReply) {
      var note = dayKey_(now) + ': ' + it.title.slice(0, 150);
      var newStatus = (status === 'Contactado' || status === 'Pendiente de aprobación') ? 'Respondió' : status;
      if (!isSim) {
        ctx.updates.push({ row: matchedIdx + 2, status: newStatus, resp: (row[C['Respuestas']] ? row[C['Respuestas']] + '\n' : '') + note });
        row[C['Estado']] = newStatus;
      }
      st.resp++;
      alerts.push('RESPUESTA de ' + (it.studentName || row[C['Alumno / Título']]) + ' (' + it.sourceLabel + '): ' + it.title + '\n' + (it.url || it.gmailLink));
      return;
    } else {
      // Anuncio repetido o nueva notificación de un alumno ya registrado (mismo URL o ID)
      st.desc++;
      return;
    }
  }

  // Registro de nueva oportunidad independiente
  var rec = evaluate(it, cfg, now, ctx.index, ctx.contacted);
  var proactiveGemini = cfg.GEMINI_ACTIVO && it.kind === 'tutoring' &&
    (it.source === 'youtube' || it.source === 'utnianos' || it.source === 'google_alerts' ||
     /buscar\/alumnos\.aspx/i.test(it.url || ''));
  if (proactiveGemini && rec.status !== 'Descartado' && rec.status !== 'Evaluado' && !isSim) {
    queueGeminiItem_(it, false);
    markSeen_(ctx, 'op:' + rec.id, false);
    return; // Sin alerta ni fila en Oportunidades hasta obtener veredicto de Gemini.
  }
  markSeen_(ctx, 'op:' + rec.id, isSim);

  // Exclusión estricta de descartes para fuentes proactivas (UTNianos, YouTube, feeds, alertas, búsqueda de alumnos)
  var isProactiveSource = (
    it.source === 'youtube' || it.sourceKey === 'youtube' ||
    it.source === 'utnianos' || it.sourceKey === 'utnianos' ||
    it.source === 'google_alerts' || it.sourceKey === 'google_alerts' ||
    /feed|rss|alert|bulletin|boletin/i.test(it.sourceKey || '') ||
    /buscar\/alumnos\.aspx/i.test(it.url || '')
  );

  if (rec.status === 'Descartado') {
    st.desc++;
    // Las publicaciones irrelevantes o descartadas de fuentes proactivas NUNCA terminan en Oportunidades
    if (rec.kind === 'job' || isProactiveSource || /^DESCARTE: (duplicado|ya contactado)/.test(rec.reasons)) {
      return;
    }
  }

  if (ctx.index.ids[rec.id]) { st.desc++; return; }
  ctx.index.ids[rec.id] = 1; ctx.index.keys[rec.dedupKey] = 1;
  ctx.byId[rec.id] = ctx.ops.length;
  if (cu && !isGenericDashboardUrl(cu)) ctx.byUrl[cu] = ctx.ops.length;
  if (it.threadId) {
    if (!ctx.byThread[it.threadId]) ctx.byThread[it.threadId] = [];
    ctx.byThread[it.threadId].push(ctx.ops.length);
  }
  var row = toRow_(rec);
  ctx.newRows.push(row);
  if (rec.status !== 'Descartado') st.nuevas++;
  if (rec.kind === 'tutoring' && rec.studentName) { var k = norm(rec.studentName); (ctx.byName[k] = ctx.byName[k] || []).push(ctx.ops.length); }
  ctx.ops.push(row);
  if (rec.compatible === 'Alta' && rec.status === 'Pendiente de aprobación') alerts.push('OPORTUNIDAD ALTA [' + rec.score + '] ' + (rec.studentName || rec.title) + ' — ' + (rec.subject || '') + ' ' + rec.level +
    '\nContacto: ' + (rec.url || rec.gmailLink) + (rec.gmailLink && rec.url ? '\nEmail: ' + rec.gmailLink : '') + '\nMotivo: ' + rec.reasons + '\n\nMensaje sugerido:\n' + rec.message);
}

function sourceQuery_(cfg) {
  var froms = SOURCES.map(function (s) { return s.gmail; }).join(' OR ');
  return 'from:(' + froms + ') newer_than:' + cfg.LOOKBACK_DIAS + 'd';
}
function ingestGmail_(cfg, ctx, st, alerts, deadline, isSim) {
  var threads = withRetry_(function () { return GmailApp.search(sourceQuery_(cfg), 0, 100); });
  var now = new Date();
  for (var t = 0; t < threads.length && Date.now() < deadline; t++) {
    var msgs = threads[t].getMessages();
    for (var m = 0; m < msgs.length; m++) {
      var msg = msgs[m], key = 'msg:' + msg.getId();
      if (ctx.seen[key]) continue;
      st.emails++;
      try {
        var res = extractFromEmail({ id: msg.getId(), threadId: threads[t].getId(), from: msg.getFrom(), subject: msg.getSubject(),
          date: msg.getDate(), plain: msg.getPlainBody(), html: msg.getBody() }, cfg);
        res.items.forEach(function (it) { handleItem_(it, cfg, ctx, st, alerts, now, isSim); });
        if (res.ignored && res.ignored !== 'remitente no reconocido') log_('DEBUG', 'email ignorado', res.ignored + ' — ' + msg.getSubject());
        markSeen_(ctx, key, isSim);
      } catch (e) { st.err.push('msg ' + msg.getId() + ': ' + e.message); }
    }
  }
}
function ingestTutoringFeeds_(cfg, ctx, st, alerts, isSim) {
  var now = new Date();
  if (cfg.FEED_UTNIANOS_ACTIVO && cfg.FEED_UTNIANOS_URL) {
    var xml = fetchXml_(cfg.FEED_UTNIANOS_URL);
    if (xml) {
      var items = parseRss(xml, 'utnianos', 'UTNianos');
      items.forEach(function (it) {
        var id = 'op:' + makeId(it);
        if (ctx.seen[id]) return;
        handleItem_(it, cfg, ctx, st, alerts, now, isSim);
      });
    }
  }
}

function checkYouTubeQuota_(p, cfg) {
  var today = dayKey_(new Date());
  var day = p.getProperty('YT_QUOTA_DAY');
  var used = (day === today) ? Number(p.getProperty('YT_QUOTA_USED') || 0) : 0;
  var maxQuota = Number(cfg.YOUTUBE_MAX_DAILY_QUOTA || 100);
  return { allowed: used < maxQuota, used: used, max: maxQuota, today: today };
}

function recordYouTubeQuota_(p, count) {
  var today = dayKey_(new Date());
  var day = p.getProperty('YT_QUOTA_DAY');
  var used = (day === today) ? Number(p.getProperty('YT_QUOTA_USED') || 0) : 0;
  p.setProperty('YT_QUOTA_DAY', today);
  p.setProperty('YT_QUOTA_USED', String(used + count));
}

function checkGeminiQuota_(p, cfg) {
  var today = dayKey_(new Date());
  var day = p.getProperty('GEMINI_CALLS_DAY');
  var count = (day === today) ? Number(p.getProperty('GEMINI_CALLS_COUNT') || 0) : 0;
  var maxCalls = Number(cfg.GEMINI_MAX_DAILY_CALLS || 20);
  return { allowed: count < maxCalls, count: count, max: maxCalls, today: today };
}

function recordGeminiCall_(p) {
  var today = dayKey_(new Date());
  var day = p.getProperty('GEMINI_CALLS_DAY');
  var count = (day === today) ? Number(p.getProperty('GEMINI_CALLS_COUNT') || 0) : 0;
  p.setProperty('GEMINI_CALLS_DAY', today);
  p.setProperty('GEMINI_CALLS_COUNT', String(count + 1));
}

function callGeminiBatch_(items, apiKey, model) {
  if (!items || !items.length || !apiKey) return null;
  model = model || 'gemini-3.5-flash-lite';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
  var prompt = buildGeminiPrompt(items);
  var payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };
  var res = withRetry_(function () {
    return UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  });
  if (res.getResponseCode() !== 200) {
    log_('WARN', 'gemini_api', 'HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
    return null;
  }
  var json = JSON.parse(res.getContentText());
  var rawText = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text) || '';
  return parseGeminiResponse(rawText);
}

function queueGeminiItem_(it, isSim) {
  if (isSim) return;
  // Guardar ítem completo y serializable en columna Texto para poder procesarlo luego.
  var safe = Object.assign({}, it);
  if (safe.publishedAt instanceof Date) safe.publishedAt = safe.publishedAt.toISOString();
  var row = [makeId(it), it.sourceLabel || it.source || '', it.title || '', JSON.stringify(safe), new Date(), 'Pendiente'];
  append_(SH.QA, [row]);
}

function processGeminiQueue_(cfg, ctx, st, alerts, isSim) {
  if (!cfg.GEMINI_ACTIVO) return;
  var p = props_();
  var apiKey = String(p.getProperty('GEMINI_API_KEY') || '').trim();
  if (!apiKey) {
    log_('WARN', 'gemini', 'GEMINI_ACTIVO es TRUE pero falta GEMINI_API_KEY en Script Properties. Usar setGeminiApiKey().');
    return;
  }
  var quota = checkGeminiQuota_(p, cfg);
  if (!quota.allowed) {
    log_('WARN', 'gemini_quota', 'Límite diario de llamadas a Gemini alcanzado (' + quota.count + '/' + quota.max + '). Se omite hasta mañana.');
    return;
  }

  var qaRows = rows_(SH.QA);
  if (!qaRows.length) return;

  var batchSize = Number(cfg.GEMINI_BATCH_SIZE || 5);
  var pending = [];
  var pendingIndices = [];
  for (var i = 0; i < qaRows.length && pending.length < batchSize; i++) {
    if (qaRows[i][5] === 'Pendiente') {
      var savedText = String(qaRows[i][3] || '');
      var savedItem = null;
      try { savedItem = JSON.parse(savedText); } catch (e) { }
      pending.push({
        id: qaRows[i][0],
        sourceLabel: qaRows[i][1],
        title: qaRows[i][2],
        text: savedItem ? String(savedItem.text || '') : savedText,
        savedItem: savedItem
      });
      pendingIndices.push(i + 2); // fila en hoja
    }
  }

  if (!pending.length) return;

  if (isSim) {
    log_('SIMULACION', 'gemini_batch', 'Simulando procesamiento por lotes de ' + pending.length + ' items en cola.');
    return;
  }

  var results = callGeminiBatch_(pending, apiKey, cfg.GEMINI_MODEL);
  recordGeminiCall_(p);

  if (results && Array.isArray(results)) {
    var resMap = {};
    results.forEach(function (r) { resMap[r.id] = r; });
    var sh = sheet_(SH.QA);
    pendingIndices.forEach(function (rowIdx, idx) {
      var item = pending[idx];
      var r = resMap[item.id];
      var statusText = r ? (r.es_solicitud_clases ? 'Aprobado: ' + r.materia : 'Rechazado: ' + r.resumen) : 'Sin respuesta';
      // Solo alta confianza y solicitud abierta/contactable habilitan registro.
      if (r && r.es_solicitud_clases === true && r.confianza >= 0.7 && item.savedItem) {
        var it = item.savedItem;
        if (it.publishedAt) it.publishedAt = new Date(it.publishedAt);
        // Evitar un segundo paso por la cola sin desactivar el filtrado para otras fuentes.
        var approvedCfg = Object.assign({}, cfg, { GEMINI_ACTIVO: false });
        handleItem_(it, approvedCfg, ctx, st, alerts, new Date(), false);
        statusText = 'Aprobado: ' + r.materia;
      } else if (r && r.es_solicitud_clases && item.savedItem) {
        statusText = 'Revisión manual: confianza baja';
      }
      sh.getRange(rowIdx, 6, 1, 1).setValues([[sanitizeForSheets(statusText)]]);
    });
  }
}

function ingestYouTubeComments_(cfg, ctx, st, alerts, isSim) {
  if (!cfg.YOUTUBE_ACTIVO) return;
  var p = props_();
  var apiKey = String(p.getProperty('YOUTUBE_API_KEY') || '').trim();
  if (!apiKey) {
    log_('WARN', 'youtube', 'YOUTUBE_ACTIVO es TRUE pero falta YOUTUBE_API_KEY en Script Properties. Usar setYouTubeApiKey().');
    return;
  }

  var quota = checkYouTubeQuota_(p, cfg);
  if (!quota.allowed) {
    log_('WARN', 'youtube_quota', 'Límite diario de cuota YouTube alcanzado (' + quota.used + '/' + quota.max + '). Se omite hasta mañana.');
    return;
  }

  var now = new Date();
  var maxComments = Number(cfg.YOUTUBE_MAX_COMMENTS_PER_VIDEO || 50);
  if (maxComments < 1 || maxComments > 100) maxComments = 50;

  var targetSources = [];
  try {
    var fnRows = rows_(SH.FN);
    if (fnRows && fnRows.length) {
      fnRows.forEach(function (r) {
        var plat = String(r[1] || '').trim().toLowerCase();
        var act = r[7];
        var isAct = (act === true || String(act).toUpperCase() === 'TRUE');
        var resId = String(r[6] || '').trim();
        if (plat === 'youtube' && isAct && resId) {
          targetSources.push({
            id: r[0],
            platform: r[1],
            creator: r[2],
            topics: r[3],
            level: r[4],
            channelUrl: r[5],
            resourceId: resId,
            notes: r[9]
          });
        }
      });
    }
  } catch (e) {
    log_('WARN', 'youtube_fuentes', 'No se pudo leer hoja Fuentes: ' + e.message);
  }

  if (!targetSources.length && typeof EDUCATIONAL_SOURCES !== 'undefined') {
    targetSources = EDUCATIONAL_SOURCES.filter(function (s) { return s.active && s.resourceId; });
  }

  targetSources.forEach(function (src) {
    var pageToken = '';
    var pageCount = 0;
    var MAX_PAGES = 2; // Paginación controlada: máximo 2 páginas por video

    while (pageCount < MAX_PAGES) {
      var qCheck = checkYouTubeQuota_(p, cfg);
      if (!qCheck.allowed) break;

      try {
        var url = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' +
          encodeURIComponent(src.resourceId) + '&maxResults=' + maxComments +
          '&order=time&textFormat=plainText&key=' + encodeURIComponent(apiKey);
        if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);

        var json = fetchJson_(url);
        if (!isSim) recordYouTubeQuota_(p, 1);
        pageCount++;

        if (json && json.items && json.items.length) {
          var items = parseYouTubeComments(json, {
            videoId: src.resourceId,
            videoTitle: src.notes || src.topics,
            channelTitle: src.creator,
            subject: src.topics,
            level: src.level
          });
          items.forEach(function (it) {
            var id = 'op:' + makeId(it);
            if (ctx.seen[id]) return;
            handleItem_(it, cfg, ctx, st, alerts, now, isSim);
          });

          if (json.nextPageToken && pageCount < MAX_PAGES) {
            pageToken = json.nextPageToken;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (err) {
        st.err.push('youtube_' + src.resourceId + ': ' + err.message);
        log_('WARN', 'youtube_fetch', 'Error consultando video ' + src.resourceId + ': ' + err.message);
        break;
      }
    }
  });
}

function ingestJobFeeds_(cfg, ctx, st, alerts, isSim) {
  var now = new Date();
  if (cfg.FEED_GETONBRD_ACTIVO) {
    try {
      var itemsGob = [];
      String(cfg.FEED_GETONBRD_QUERIES || '').split(',').map(function (q) { return q.trim(); }).filter(String).forEach(function (q) {
        var json = fetchJson_('https://www.getonbrd.com/api/v0/search/jobs?per_page=30&query=' + encodeURIComponent(q));
        if (json) itemsGob = itemsGob.concat(parseGetOnBoard(json));
      });
      itemsGob.forEach(function (it) {
        var id = 'op:' + makeId(it);
        if (ctx.seen[id]) return;
        handleItem_(it, cfg, ctx, st, alerts, now, isSim);
      });
    } catch (e) {
      st.err.push('feeds_getonbrd: ' + e.message);
    }
  }

  if (cfg.FEED_REMOTIVE_ACTIVO) {
    try {
      var itemsRem = [];
      String(cfg.FEED_REMOTIVE_QUERIES || '').split(',').slice(0, 2).map(function (q) { return q.trim(); }).filter(String).forEach(function (q) {
        var json = fetchJson_('https://remotive.com/api/remote-jobs?limit=30&search=' + encodeURIComponent(q));
        if (json) itemsRem = itemsRem.concat(parseRemotive(json));
      });
      itemsRem.forEach(function (it) {
        var id = 'op:' + makeId(it);
        if (ctx.seen[id]) return;
        handleItem_(it, cfg, ctx, st, alerts, now, isSim);
      });
    } catch (e) {
      st.err.push('feeds_remotive: ' + e.message);
    }
  }
}

function ingestFeeds_(cfg, ctx, st, alerts, isSim) {
  ingestTutoringFeeds_(cfg, ctx, st, alerts, isSim);
  ingestJobFeeds_(cfg, ctx, st, alerts, isSim);
}
function fetchJson_(url) {
  return withRetry_(function () {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { Accept: 'application/json' } });
    var code = r.getResponseCode();
    if (code === 429 || code >= 500) throw new Error('HTTP ' + code);
    if (code !== 200) { log_('WARN', 'feed', url + ' HTTP ' + code); return null; }
    return JSON.parse(r.getContentText());
  });
}
function fetchXml_(url) {
  return withRetry_(function () {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
    var code = r.getResponseCode();
    if (code === 429 || code >= 500) throw new Error('HTTP ' + code);
    if (code !== 200) { log_('WARN', 'feed', url + ' HTTP ' + code); return null; }
    return r.getContentText();
  });
}
function withRetry_(fn) {
  var last;
  for (var i = 0; i < 3; i++) { try { return fn(); } catch (e) { last = e; Utilities.sleep(1000 * Math.pow(3, i)); } }
  throw last;
}
function flush_(ctx, isSim) {
  if (isSim) {
    log_('SIMULACION', 'ciclo simulado', 'Detectadas ' + ctx.newRows.length + ' oportunidades y ' + ctx.updates.length + ' actualizaciones. Sin cambios en hojas ni Gmail.');
    ctx.newRows = []; ctx.updates = []; ctx.newSeen = [];
    return;
  }
  append_(SH.OP, ctx.newRows);
  var sh = sheet_(SH.OP);
  ctx.updates.forEach(function (u) {
    sh.getRange(u.row, C['Estado'] + 1, 1, 1).setValues([[sanitizeForSheets(u.status)]]);
    sh.getRange(u.row, C['Respuestas'] + 1, 1, 1).setValues([[sanitizeForSheets(u.resp)]]);
  });
  append_(SH.VS, ctx.newSeen); // se marca como visto DESPUÉS de guardar: un fallo previo solo provoca reproceso idempotente
  ctx.newRows = []; ctx.updates = []; ctx.newSeen = [];
}

/* ---------------- Modo B: consultas directas por Gmail ---------------- */
function modeB_(cfg, st, alerts, isSim) {
  if (!cfg.MODO_B_ACTIVO) return;

  var inputLabel = String(cfg.MODO_B_ETIQUETA_ENTRADA || '').trim();
  var authSenders = String(cfg.MODO_B_REMITENTES_AUTORIZADOS || '').trim();
  if (!inputLabel && !authSenders) {
    log_('WARN', 'modoB', 'Modo B activo pero no tiene MODO_B_ETIQUETA_ENTRADA ni MODO_B_REMITENTES_AUTORIZADOS configurados. Se omite para evitar escaneo indiscriminado.');
    return;
  }

  var LBL = 'Captacion_Consulta';
  var label = null;
  if (!isSim) {
    label = GmailApp.getUserLabelByName(LBL) || GmailApp.createLabel(LBL);
  }

  var p = props_(), today = dayKey_(new Date());
  var sentToday = p.getProperty('MODOB_DAY') === today ? Number(p.getProperty('MODOB_COUNT') || 0) : 0;
  var me = myEmail_().toLowerCase();

  var q = '';
  if (inputLabel) {
    q = 'label:' + inputLabel + ' -label:' + LBL + ' -from:me';
  } else {
    var sendersList = authSenders.split(',').map(function (s) { return s.trim(); }).filter(Boolean).join(' OR ');
    q = 'from:(' + sendersList + ') -label:' + LBL + ' -from:me';
  }

  var threads = GmailApp.search(q, 0, 30);
  threads.forEach(function (th) {
    // Si ya posee la etiqueta, saltear para evitar reproceso
    var existingLabels = th.getLabels ? th.getLabels().map(function (l) { return l.getName ? l.getName() : l.n; }) : [];
    if (existingLabels.indexOf(LBL) >= 0) return;

    var msgs = th.getMessages(), last = msgs[msgs.length - 1];
    if (msgs.some(function (m) { return String(m.getFrom()).toLowerCase().indexOf(me) >= 0; })) return; // ya respondí: no entrar en cadenas
    var hdr = function (n) { try { return last.getHeader(n) || ''; } catch (e) { return ''; } };
    var a = analyzeInbound({ from: last.getFrom(), subject: last.getSubject(), plain: last.getPlainBody(), fromMe: false,
      headers: { autoSubmitted: hdr('Auto-Submitted'), listUnsubscribe: hdr('List-Unsubscribe'), precedence: hdr('Precedence') } }, cfg);
    if (!a.isInquiry) return;

    if (isSim) {
      st.modoB++;
      log_('SIMULACION', 'modoB simulado', 'Detectada consulta directa de ' + last.getFrom() + ' (' + last.getSubject() + '). Sin borrador, respuesta ni etiqueta.');
      alerts.push('SIMULACION CONSULTA DIRECTA de ' + last.getFrom() + ' — ' + last.getSubject() + '\n(Sin borradores ni respuestas enviadas)');
      return;
    }

    var gate = autoSendAllowed(cfg, sentToday, new Date()), action;
    if (gate.ok) { last.reply(a.reply); sentToday++; action = 'ENVIADA (autorizado)'; }
    else { last.createDraftReply(a.reply); action = 'BORRADOR (' + gate.why + ')'; }
    if (label) th.addLabel(label);
    append_(SH.CQ, [[new Date(), th.getId(), last.getFrom(), last.getSubject(), a.subject, action, a.reply]]);
    st.modoB++;
    alerts.push('CONSULTA DIRECTA de ' + last.getFrom() + ' — ' + last.getSubject() + '\nAcción: ' + action + '\nhttps://mail.google.com/mail/u/0/#inbox/' + th.getId());
  });
  if (!isSim) {
    p.setProperty('MODOB_DAY', today); p.setProperty('MODOB_COUNT', String(sentToday));
  }
}

/* ---------------- Seguimiento manual (trigger onEdit) ---------------- */
function onEditOp(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== SH.OP || e.range.getColumn() !== C['Estado'] + 1 || e.range.getRow() < 2) return;
    var v = String(e.value || ''), r = e.range.getRow();
    if (v === 'Contactado') {
      sh.getRange(r, C['Último contacto'] + 1).setValue(new Date());
      var row = sh.getRange(r, 1, 1, OP_COLS.length).getValues()[0];
      if (row[C['Tipo']] === 'tutoring') append_(SH.CT, [[row[C['Alumno / Título']], row[C['Materia']], row[C['URL']], new Date(), row[C['ID']]]]);
    }
    if (v === 'Reserva acordada' || v === 'Cobrado') log_('INFO', 'estado', 'Fila ' + r + ' -> ' + v);
  } catch (err) { log_('ERROR', 'onEdit', err.message); }
}

function syncIngresos_() {
  var ing = rows_(SH.IN); if (!ing.length) return;
  var agg = {}; ing.forEach(function (r) { var id = r[1]; if (!id) return; agg[id] = agg[id] || { c: 0, a: 0 }; agg[id].c += Number(r[3]) || 0; agg[id].a += Number(r[4]) || 0; });
  var sh = sheet_(SH.OP), ops = rows_(SH.OP);
  ops.forEach(function (r, i) {
    var g = agg[r[C['ID']]]; if (!g) return;
    if (r[C['Clases realizadas']] !== g.c || r[C['Importe cobrado']] !== g.a) sh.getRange(i + 2, C['Clases realizadas'] + 1, 1, 2).setValues([[g.c, g.a]]);
    if (g.a > 0 && ['Cobrado', 'Cerrado sin contratación'].indexOf(r[C['Estado']]) < 0) sh.getRange(i + 2, C['Estado'] + 1, 1, 1).setValues([['Cobrado']]);
  });
}

/* ---------------- Notificaciones ---------------- */
function maybeNotifyError_(errs) {
  var p = props_(), last = Number(p.getProperty('LAST_ERR_MAIL') || 0);
  if (Date.now() - last < 12 * 3600 * 1000) return; // máx. 1 aviso de error cada 12 h
  p.setProperty('LAST_ERR_MAIL', String(Date.now()));
  try { notify_('Error en la automatización', errs.join('\n')); } catch (e) { }
}
function maybeDigest_(cfg, now) {
  var p = props_(), hour = Number(Utilities.formatDate(now, 'America/Argentina/Buenos_Aires', 'H')), today = dayKey_(now);
  if (hour < cfg.RESUMEN_HORA || p.getProperty('LAST_DIGEST_DAY') === today) return;
  var since = new Date(p.getProperty('LAST_DIGEST_AT') || 0), month = today.slice(0, 7);
  var ops = rows_(SH.OP), st = { nuevas: 0, altas: 0, pendientes: 0, contactados: 0, respuestas: 0, reservas: 0, cobrosNuevos: 0, ingresosMes: 0, top: [] };
  ops.forEach(function (r) {
    var det = r[C['Detectado']] ? new Date(r[C['Detectado']]) : null, s = r[C['Estado']];
    if (det && det > since && s !== 'Descartado') { st.nuevas++; if (r[C['Compatibilidad']] === 'Alta') st.altas++; }
    if (s === 'Pendiente de aprobación') { st.pendientes++; st.top.push({ score: r[C['Prioridad']], label: r[C['Alumno / Título']] + ' (' + r[C['Materia']] + ')', link: r[C['URL']] || r[C['Enlace Gmail']] }); }
    var lc = r[C['Último contacto']] ? new Date(r[C['Último contacto']]) : null;
    if (lc && lc > since) st.contactados++;
    if (s === 'Respondió' && String(r[C['Respuestas']]).indexOf(today) >= 0) st.respuestas++;
    if (s === 'Reserva acordada') st.reservas++;
  });
  rows_(SH.IN).forEach(function (r) {
    var d = r[0] ? new Date(r[0]) : null; if (!d) return;
    if (dayKey_(d).slice(0, 7) === month) st.ingresosMes += Number(r[4]) || 0;
    if (d > since) st.cobrosNuevos++;
  });
  st.top = st.top.sort(function (a, b) { return b.score - a.score; }).slice(0, 5);
  var body = buildDigest(st, cfg);
  p.setProperty('LAST_DIGEST_DAY', today);
  if (!body) return; // sin novedades: no se envía nada
  p.setProperty('LAST_DIGEST_AT', now.toISOString());
  notify_('Resumen diario', body + '\n\nHoja: ' + ss_().getUrl());
}
