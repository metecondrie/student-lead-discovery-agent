/*
 * Diagnóstico independiente y acotado para Apps Script.
 * Preparado localmente: no ejecutar en Apps Script sin aprobación expresa.
 * Solo registra contadores y estados técnicos; no registra datos de mensajes,
 * encabezados, identificadores, enlaces, errores, tamaños ni contenido codificado.
 * No consulta Sheets, adjuntos, propiedades ni otros servicios del proyecto.
 */
function orqDiagnosticoMimeGmailSoloLectura() {
  function nuevoTipo() {
    return {
      partes: 0, datosEnLinea: 0, datosNoString: 0, conAdjunto: 0,
      sinDatosNiAdjunto: 0, conTamanoPositivo: 0,
      datosNoStringDetalle: {
        arreglo: 0, vistaBinaria: 0, blob: 0, cadenaObjeto: 0, otroObjeto: 0,
        numero: 0, booleano: 0, otros: 0, bytesIgualTamano: 0,
        textoUtf8: { ok: 0, vacio: 0, error: 0, pareceHtml: 0, pareceBase64: 0 },
        adaptadorActual: { ok: 0, vacio: 0, error: 0, noDisponible: 0 }
      },
      base64: {
        resto0: 0, resto1: 0, resto2: 0, resto3: 0,
        webSafeSinModificar: { ok: 0, vacio: 0, error: 0 },
        estandarConPadding: { ok: 0, vacio: 0, error: 0 },
        webSafeConPadding: { ok: 0, vacio: 0, error: 0 },
        adaptadorActual: { ok: 0, vacio: 0, error: 0, noDisponible: 0 }
      }
    };
  }

  var r = {
    servicioDisponible: false, hilos: 0, erroresLecturaHilo: 0,
    erroresListado: 0, busquedaPuedeEstarIncompleta: false,
    mensajes: 0, mensajesConPayload: 0, mensajesSinPayload: 0,
    mensajesSinLista: 0, mensajesConAsuntoCoincidente: 0,
    partes: 0, contenedores: 0, maxProfundidad: 0,
    partesNoArreglo: 0, ramasLimitadas: 0,
    tipos: { textoPlano: nuevoTipo(), textoHtml: nuevoTipo(), otros: nuevoTipo() }
  };

  function terminar() {
    Logger.log(JSON.stringify(r));
    return r;
  }

  function probarDecode(contadores, fn) {
    try {
      var texto = fn();
      if (texto) contadores.ok++;
      else contadores.vacio++;
    } catch (e) {
      contadores.error++;
    }
  }

  function medirBase64(data, tipo) {
    var clean = data.replace(/\s+/g, '');
    var estandar = clean.replace(/-/g, '+').replace(/_/g, '/');
    var webSafe = clean;
    tipo.base64['resto' + (clean.length % 4)]++;
    while (estandar.length % 4) estandar += '=';
    while (webSafe.length % 4) webSafe += '=';

    probarDecode(tipo.base64.webSafeSinModificar, function() {
      return Utilities.newBlob(Utilities.base64DecodeWebSafe(clean)).getDataAsString('UTF-8');
    });
    probarDecode(tipo.base64.estandarConPadding, function() {
      return Utilities.newBlob(Utilities.base64Decode(estandar)).getDataAsString('UTF-8');
    });
    probarDecode(tipo.base64.webSafeConPadding, function() {
      return Utilities.newBlob(Utilities.base64DecodeWebSafe(webSafe)).getDataAsString('UTF-8');
    });
    if (typeof orqDecodeBase64WebSafe_ === 'function') {
      probarDecode(tipo.base64.adaptadorActual, function() {
        return orqDecodeBase64WebSafe_(data);
      });
    } else {
      tipo.base64.adaptadorActual.noDisponible++;
    }
  }

  function medirDatoNoString(data, body, tipo) {
    var detalle = tipo.datosNoStringDetalle;
    var bytes = null;
    if (Array.isArray(data)) {
      detalle.arreglo++;
      bytes = data;
    } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(data)) {
      detalle.vistaBinaria++;
      bytes = Array.prototype.slice.call(data);
    } else if (data && typeof data.getBytes === 'function') {
      detalle.blob++;
      try { bytes = data.getBytes(); } catch (e) {}
    } else if (Object.prototype.toString.call(data) === '[object String]') {
      detalle.cadenaObjeto++;
    } else if (typeof data === 'object') {
      detalle.otroObjeto++;
    } else if (typeof data === 'number') {
      detalle.numero++;
    } else if (typeof data === 'boolean') {
      detalle.booleano++;
    } else {
      detalle.otros++;
    }
    if (bytes && typeof bytes.length === 'number') {
      if (typeof body.size === 'number' && bytes.length === body.size) detalle.bytesIgualTamano++;
      try {
        var texto = Utilities.newBlob(bytes).getDataAsString('UTF-8');
        if (texto) {
          detalle.textoUtf8.ok++;
          if (/<\/?[a-z][^>]*>/i.test(texto)) detalle.textoUtf8.pareceHtml++;
          if (/^[a-z0-9+\/_=-]+$/i.test(texto.replace(/\s+/g, ''))) detalle.textoUtf8.pareceBase64++;
        } else {
          detalle.textoUtf8.vacio++;
        }
      } catch (e) {
        detalle.textoUtf8.error++;
      }
    }
    if (typeof orqDecodeBase64WebSafe_ === 'function') {
      probarDecode(detalle.adaptadorActual, function() { return orqDecodeBase64WebSafe_(data); });
    } else {
      detalle.adaptadorActual.noDisponible++;
    }
  }

  function inspeccionar(part, profundidad) {
    if (!part || typeof part !== 'object') return;
    if (profundidad > 25) { r.ramasLimitadas++; return; }
    r.partes++;
    r.maxProfundidad = Math.max(r.maxProfundidad, profundidad);
    var mime = typeof part.mimeType === 'string' ? part.mimeType.toLowerCase() : '';
    var tipo = /^text\/plain\b/.test(mime) ? r.tipos.textoPlano :
      /^text\/html\b/.test(mime) ? r.tipos.textoHtml : r.tipos.otros;
    if (/^multipart\//.test(mime)) r.contenedores++;
    tipo.partes++;

    var body = part.body && typeof part.body === 'object' ? part.body : {};
    var data = body.data;
    var tieneDatos = data != null && (typeof data !== 'string' || data.length > 0);
    var tieneAdjunto = !!body.attachmentId;
    if (tieneDatos) tipo.datosEnLinea++;
    if (typeof data === 'string' && data.length > 0) {
      // Solo interesa probar los decodificadores de texto, no otros adjuntos.
      if (tipo !== r.tipos.otros) medirBase64(data, tipo);
    } else if (data != null && typeof data !== 'string') {
      tipo.datosNoString++;
      if (tipo !== r.tipos.otros) medirDatoNoString(data, body, tipo);
    }
    if (tieneAdjunto) tipo.conAdjunto++;
    if (!tieneDatos && !tieneAdjunto) tipo.sinDatosNiAdjunto++;
    if (typeof body.size === 'number' && body.size > 0) tipo.conTamanoPositivo++;

    if (Array.isArray(part.parts)) {
      part.parts.forEach(function(child) { inspeccionar(child, profundidad + 1); });
    } else if (part.parts != null) {
      r.partesNoArreglo++;
    }
  }

  function asuntoCoincide(payload) {
    var headers = payload && Array.isArray(payload.headers) ? payload.headers : [];
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h && typeof h.name === 'string' && h.name.toLowerCase() === 'subject') {
        return /Mensaje desde (?:tusclases|tusclasesparticulares)/i.test(String(h.value || ''));
      }
    }
    return false;
  }

  if (typeof Gmail === 'undefined' || !Gmail.Users || !Gmail.Users.Threads) return terminar();
  r.servicioDisponible = true;
  var query = 'newer_than:365d subject:"Mensaje desde tusclases" OR (newer_than:365d subject:"Mensaje desde tusclasesparticulares") OR (newer_than:365d subject:"Mensaje desde tusclases.co") OR (newer_than:365d subject:"Mensaje desde tusclases.com.ar") OR (newer_than:365d subject:"tusclases")';
  var token = null;
  var paginas = 0;
  try {
    do {
      var params = { q: query, maxResults: 100 - r.hilos };
      if (token) params.pageToken = token;
      var page = Gmail.Users.Threads.list('me', params);
      if (!page || typeof page !== 'object' || (page.threads != null && !Array.isArray(page.threads))) {
        r.erroresListado++;
        r.busquedaPuedeEstarIncompleta = true;
        break;
      }
      var items = page.threads || [];
      for (var i = 0; i < items.length && r.hilos < 100; i++) {
        if (!items[i] || !items[i].id) continue;
        r.hilos++;
        try {
          var thread = Gmail.Users.Threads.get('me', items[i].id, { format: 'full' });
          if (!thread || !Array.isArray(thread.messages)) { r.mensajesSinLista++; continue; }
          thread.messages.forEach(function(msg) {
            r.mensajes++;
            if (!msg || !msg.payload) { r.mensajesSinPayload++; return; }
            r.mensajesConPayload++;
            if (!asuntoCoincide(msg.payload)) return;
            r.mensajesConAsuntoCoincidente++;
            inspeccionar(msg.payload, 0);
          });
        } catch (e) {
          r.erroresLecturaHilo++;
        }
      }
      token = page.nextPageToken || null;
      paginas++;
    } while (token && r.hilos < 100 && paginas < 5);
    r.busquedaPuedeEstarIncompleta = r.busquedaPuedeEstarIncompleta || !!token || r.hilos >= 100;
  } catch (e) {
    r.erroresListado++;
    r.busquedaPuedeEstarIncompleta = true;
  }
  return terminar();
}
