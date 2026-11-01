/**
 * Entrada manual de solicitudes reales verificadas, sin scraping.
 *
 * Lee únicamente Piloto_Demanda_20261101 de la planilla STAGING. Los datos
 * fueron incorporados manualmente desde avisos públicos y su procedencia
 * debe mantenerse verificable. Nunca consulta las URLs, escribe a Gmail ni
 * intenta contactar a estudiantes.
 *
 * Conector: solicitudes_verificadas (debe habilitarse explícitamente en Fuentes).
 * Previsualización: orqPreviewSolicitudesVerificadas() (solo lectura).
 */

var ORQ_MANUAL_TAB = 'Piloto_Demanda_20261101';
var ORQ_MANUAL_MAX_ROWS = 100;

function orqManualAdId_(value) {
  var url = String(value || '').trim();
  // Allowlist deliberada: NO seguir enlaces ni aceptar URLs arbitrarias.
  if (!/^https:\/\/(?:www\.)?(?:tusclases\.(?:com\.ar|com|co|pe|mx)|tusclasesparticulares\.(?:cl|com))\//i.test(url)) {
    return '';
  }
  var m = url.match(/[-/](\d{5,12})(?:\.aspx)?(?:[?#]|$)/i);
  return m ? m[1] : '';
}

function orqManualLoad_(ss) {
  var sh = ss.getSheetByName(ORQ_MANUAL_TAB);
  if (!sh) throw new Error('Falta la hoja de entrada manual: ' + ORQ_MANUAL_TAB);
  var headers = [
    'ID aviso', 'País', 'Fuente', 'URL pública', 'Materia',
    'Fecha visible', 'Modalidad en ficha', 'Estado piloto'
  ];
  if (sh.getLastColumn() < 11) {
    throw new Error('La hoja manual necesita 11 columnas, con cabeceras conocidas.');
  }
  var actual = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(actual[i] || '').trim() !== headers[i]) {
      throw new Error('Cabecera incompatible de entrada manual en columna ' + (i + 1));
    }
  }
  var total = Math.max(0, sh.getLastRow() - 1);
  if (total > ORQ_MANUAL_MAX_ROWS) {
    throw new Error('Demasiadas filas en el piloto manual: ' + total + ', máximo ' + ORQ_MANUAL_MAX_ROWS);
  }
  return total ? sh.getRange(2, 1, total, 11).getValues() : [];
}

function orqManualDate_(raw) {
  var value = raw instanceof Date && !isNaN(raw.getTime()) ?
    raw.toISOString().slice(0, 10) : String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  var d = new Date(value + 'T12:00:00Z');
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

function orqManualCandidates_(ss, now, cfg) {
  var rows = orqManualLoad_(ss);
  var stats = {
    examinados: rows.length,
    preseleccionados: 0,
    omitidosEstado: 0,
    sinFechaOAntiguos: 0,
    noOnline: 0,
    invalidos: 0,
    duplicadosEntrada: 0
  };
  var seen = {}, items = [];
  var ageDays = Number(cfg && cfg.MAX_ANTIGUEDAD_DIAS);
  if (!isFinite(ageDays) || ageDays < 1) ageDays = 10;
  ageDays = Math.min(ageDays, 90);

  rows.forEach(function(row) {
    var status = String(row[7] || '').trim().toUpperCase();
    // Solo solicitudes seleccionadas por revisión humana. El código jamás
    // transforma automáticamente VERIFICAR_FECHA o EXCLUIDO_CONTACTADO en lead.
    if (['PENDIENTE_ELEGIBILIDAD', 'APTO_PARA_CLASIFICAR'].indexOf(status) < 0) {
      stats.omitidosEstado++;
      return;
    }
    var url = String(row[3] || '').trim();
    var id = String(row[0] || '').trim();
    var extractedId = orqManualAdId_(url);
    if (!extractedId || extractedId !== id) {
      stats.invalidos++;
      return;
    }
    var published = orqManualDate_(row[5]);
    var diffDays = published ? Math.floor((new Date(now).getTime() - published.getTime()) / 86400000) : NaN;
    if (!isFinite(diffDays) || diffDays < -1 || diffDays > ageDays) {
      stats.sinFechaOAntiguos++;
      return;
    }
    var mode = String(row[6] || '');
    if (!/\bonline\b|virtual|a distancia/i.test(mode)) {
      stats.noOnline++;
      return;
    }
    var subject = String(row[4] || '').trim();
    if (!subject || subject.length > 170) {
      stats.invalidos++;
      return;
    }
    var key = 'GMAIL-TUSCLASES-' + id; // Mismo espacio de IDs que Gmail.
    if (seen[key]) {
      stats.duplicadosEntrada++;
      return;
    }
    seen[key] = true;
    var country = String(row[1] || '').trim().slice(0, 70);
    var text = 'Solicitud observada y resumida manualmente (no es cita textual): ' +
      'busco profesor para clases online de ' + subject +
      '. País: ' + country + '. Modalidad: ' + mode.slice(0, 80) +
      '. Elegibilidad del docente argentino y mensajería interna pendientes de verificar.';
    items.push({
      _computedId: key, url: url, publishedAt: published.toISOString(),
      title: 'Busco profesor particular de ' + subject,
      text: text, subject: subject, country: country,
      _manualStatus: status, _manualId: id
    });
    stats.preseleccionados++;
  });
  return { items: items, stats: stats };
}

/**
 * Previsualización genuina en STAGING. No llama Gemini, Gmail ni APIs externas.
 * No cambia las hojas ni las propiedades y no devuelve nombres de estudiantes.
 */
function orqPreviewSolicitudesVerificadas() {
  var ss = orqDb_(), cfg = orqLoadConfig_();
  var preview = orqManualCandidates_(ss, new Date(), cfg);
  return {
    modo: 'SOLO_LECTURA',
    fuente: ORQ_MANUAL_TAB,
    estado: 'SIN_EJECUTAR',
    ...preview.stats,
    contactoVerificado: false,
    elegibilidadVerificada: false,
    ids: preview.items.map(function(it) { return it._manualId; }),
    aviso: 'Solicitudes preseleccionadas, NO alumnos contactables. Comprobar CRM, comprobantes, mensajería interna y elegibilidad.'
  };
}

/**
 * Clasifica por Gemini sólo solicitudes previamente revisadas en la hoja.
 * Se integra en OrqCola/OrqFuentes/OrqHallazgos sin llamar a sitios externos.
 * Los hallazgos positivos SIEMPRE quedan con VERIFICAR_CONTACTO;
 * jamás se envían mensajes ni se atribuye consentimiento al alumno.
 */
function orqExecuteSolicitudesVerificadas_(ss, run, source, jobCursor) {
  var start = Date.now(), cfg = orqLoadConfig_();
  var p = PropertiesService.getScriptProperties();
  var res = {
    runId: run.id, fecha: new Date(), fuenteId: source.id,
    nombre: source.name, conector: 'solicitudes_verificadas',
    estado: 'OK', leidos: 0, repetidos: 0, clasificados: 0,
    solicitudes: 0, candidatos: 0, errores: 0,
    youtube: 0, gemini: 0, duracion: 0, mensaje: ''
  };
  var known = orqSeen_(ss);
  var selected = [];
  var baseOffset = 0;
  if (jobCursor && Array.isArray(jobCursor.pendingItems) && jobCursor.pendingItems.length) {
    res.leidos = Number(jobCursor.leidos) || 0;
    res.repetidos = Number(jobCursor.repetidos) || 0;
    res.clasificados = Number(jobCursor.clasificados) || 0;
    res.solicitudes = Number(jobCursor.solicitudes) || 0;
    res.candidatos = Number(jobCursor.candidatos) || 0;
    res.gemini = Number(jobCursor.gemini) || 0;
    baseOffset = Number(jobCursor.offset) || 0;
    selected = jobCursor.pendingItems.filter(function(it) {
      return it && it._computedId && !known[it._computedId] &&
        orqManualAdId_(it.url) === String(it._manualId || '');
    });
  } else {
    var prepared = orqManualCandidates_(ss, new Date(), cfg);
    res.leidos = prepared.stats.examinados;
    res.repetidos = prepared.stats.duplicadosEntrada;
    res.mensaje = 'Entrada manual: ' + prepared.stats.preseleccionados + ' preseleccionadas; ' +
      prepared.stats.omitidosEstado + ' omitidas por estado; ' +
      prepared.stats.sinFechaOAntiguos + ' sin fecha o antiguas; ' +
      prepared.stats.invalidos + ' URLs/IDs inválidos.';
    prepared.items.forEach(function(it) {
      if (known[it._computedId]) res.repetidos++;
      else selected.push(it);
    });
  }

  if (selected.length) {
    var history = orqContactHistory_(ss);
    var pending = [];
    selected.forEach(function(it) {
      if (orqContactDecision_(it, history) === 'CONTACTADO_CONFIRMADO') {
        res.repetidos++;
      } else {
        // No hay acceso a todos los mensajes internos de las plataformas.
        it._contactCheck = history.incomplete ? 'VERIFICACION_INCOMPLETA' : 'VERIFICAR_MENSAJERIA_INTERNA';
        pending.push(it);
      }
    });
    selected = pending;
  }

  var model = String(cfg.GEMINI_MODEL || 'gemini-3.5-flash-lite');
  for (var b = 0; b < selected.length; b += 5) {
    var gcap = typeof checkGeminiQuota_ === 'function' ?
      checkGeminiQuota_(p, { GEMINI_MAX_DAILY_CALLS: Number(cfg.GEMINI_MAX_DAILY_CALLS) || 20 }) : { allowed: true };
    if (!gcap.allowed || (gcap.max && gcap.count >= gcap.max)) {
      var quotaErr = new Error('PAUSADO_CUOTA [RPD]: sin llamadas Gemini disponibles.');
      quotaErr.isQuota = true;
      quotaErr.quotaType = 'RPD';
      throw orqAttachPartial_(quotaErr, res, selected.slice(b), baseOffset + b,
        jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }
    var batch = selected.slice(b, b + 5);
    var gemBatch = batch.map(function(it) {
      return { id: it._computedId, sourceLabel: 'Solicitudes verificadas manualmente',
        title: it.title, text: it.text.slice(0, 500), url: it.url, publishedAt: it.publishedAt };
    });
    var byId;
    try {
      byId = orqCallGeminiBatch_(gemBatch, model, orqApiKey_('GEMINI_API_KEY'), cfg);
      res.gemini++;
      if (typeof recordGeminiCall_ === 'function') recordGeminiCall_(p);
    } catch (e) {
      throw orqAttachPartial_(orqSafeGeminiError_(e), res, selected.slice(b),
        baseOffset + b, jobCursor && jobCursor.pauseCount, { prevCursor: jobCursor });
    }

    var batchRows = [], missing = [];
    batch.forEach(function(it) {
      if (known[it._computedId]) return;
      var r = byId[it._computedId];
      if (!r) {
        missing.push(it);
        return;
      }
      var intention = r.es_solicitud_clases === true;
      var matches = orqIsCommercialCandidate_(r);
      res.clasificados++;
      if (intention) res.solicitudes++;
      if (matches) res.candidatos++;
      var explanation = String(r.resumen || '').slice(0, 260) +
        ' [REVISIÓN: ELEGIBILIDAD/COBRO Y MENSAJERÍA INTERNA NO VERIFICADOS]' +
        ' [CRM: ' + (it._contactCheck || 'PENDIENTE') + ']';
      batchRows.push([
        run.id, new Date(), 'Solicitudes verificadas', source.name,
        it._computedId, it.url, it.publishedAt,
        orqSafeText_(it.text), String(intention),
        r.destinatario || 'ambiguo',
        // Un LLM no puede certificar permiso ni consentimiento de contacto.
        'no_verificada', matches ? 'VERIFICAR_CONTACTO' : 'NO',
        orqSafeText_(it.subject), orqSafeText_(r.nivel),
        Number(r.confianza) || 0, orqSafeText_(explanation)
      ]);
    });
    orqFlushHallazgos_(ss, batchRows, known);
    if (missing.length) {
      var remainder = missing.concat(selected.slice(b + 5));
      throw orqAttachPartial_(
        new Error('Respuesta incompleta de Gemini para solicitudes verificadas'),
        res, remainder, baseOffset + b + batchRows.length,
        jobCursor && jobCursor.pauseCount,
        { isIncomplete: true, missingIds: missing.map(function(it) { return it._computedId; }),
          madeBatchProgress: batchRows.length > 0, prevCursor: jobCursor }
      );
    }
  }
  orqUpdateSourceState_(ss, source.id, 'OPERATIVA');
  res.duracion = Math.round((Date.now() - start) / 100) / 10;
  orqRecordFuente_(ss, res);
  return res;
}
