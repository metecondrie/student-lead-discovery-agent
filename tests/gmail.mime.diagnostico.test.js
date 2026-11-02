'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const adapterSrc = fs.readFileSync(path.join(root, 'gas/Orquestador.js'), 'utf8');
const diagnosticSrc = fs.readFileSync(path.join(root, 'scratch/diagnostico-gmail-mime.js'), 'utf8');

function environment(threads) {
  const logs = [];
  const calls = [];
  // El Buffer pertenece al arnés; no se expone en el contexto de Apps Script.
  function decode(input, alphabet) {
    const allowed = alphabet === 'url' ? /^[A-Za-z0-9_-]*={0,2}$/ : /^[A-Za-z0-9+/]*={0,2}$/;
    if (input.length % 4 || !allowed.test(input)) throw new Error('base64 inválido');
    return Array.from(Buffer.from(input, alphabet === 'url' ? 'base64url' : 'base64'));
  }
  const ctx = vm.createContext({
    Gmail: { Users: { Threads: {
      list: (user, options) => {
        assert.equal(user, 'me');
        calls.push({ operation: 'list', options });
        return { threads: Object.keys(threads).map(id => ({ id })) };
      },
      get: (user, id, options) => {
        assert.equal(user, 'me');
        assert.equal(options.format, 'full');
        calls.push({ operation: 'get' });
        if (threads[id] instanceof Error) throw threads[id];
        return threads[id];
      }
    } } },
    Utilities: {
      // Emula un decodificador estricto para que la prueba no dependa del Buffer de Node.
      base64DecodeWebSafe: data => decode(data, 'url'),
      base64Decode: data => decode(data, 'standard'),
      newBlob: bytes => ({ getDataAsString: charset => {
        assert.equal(charset, 'UTF-8');
        return Buffer.from(bytes).toString('utf8');
      } })
    },
    Logger: { log: text => logs.push(String(text)) },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    SpreadsheetApp: { openById: () => { throw new Error('Sheets no debe consultarse'); } },
    GmailApp: { search: () => { throw new Error('GmailApp no debe consultarse'); } }
  });
  vm.runInContext(adapterSrc, ctx);
  vm.runInContext(diagnosticSrc, ctx);
  return { ctx, logs, calls };
}

function encoded(s) {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function matchingPayload(children, suffix = '') {
  return {
    mimeType: 'multipart/mixed',
    headers: [{ name: 'Subject', value: 'Mensaje desde tusclases: ' + suffix }],
    parts: children
  };
}

test('MIME en línea y anidado se decodifica sin Buffer de Node con fallback estándar', () => {
  let html = '<p>Confirmación con acento: Árbol</p>';
  while (encoded(html).length % 4 === 0) html += 'x';
  const data = encoded(html);
  const msg = {
    id: 'mensaje-sintetico', snippet: 'resumen',
    payload: matchingPayload([{ mimeType: 'multipart/alternative', parts: [
      { mimeType: 'text/html', body: { size: 1, data } }
    ] }])
  };
  const { ctx, calls } = environment({ uno: { id: 'uno', messages: [msg] } });
  assert.equal(vm.runInContext('typeof Buffer', ctx), 'undefined');
  const viaSearch = ctx.orqSearchGmail_('consulta sintética', 10)[0].getMessages()[0];
  const viaId = ctx.orqGetGmailThreadById_('uno').getMessages()[0];
  assert.equal(viaSearch.getBody(), html);
  assert.equal(viaId.getBody(), html);
  assert.equal(viaSearch.isSnippetFallback(), false);
  const diagnostic = ctx.orqDiagnosticoMimeGmailSoloLectura();
  assert.equal(diagnostic.maxProfundidad, 2);
  assert.equal(diagnostic.tipos.textoHtml.base64.webSafeSinModificar.error, 1);
  assert.equal(diagnostic.tipos.textoHtml.base64.estandarConPadding.ok, 1);
  assert.equal(diagnostic.tipos.textoHtml.base64.webSafeConPadding.ok, 1);
  assert.equal(diagnostic.tipos.textoHtml.base64.adaptadorActual.ok, 1);
  assert.equal(calls.filter(call => call.operation === 'get').length, 3);
});

test('Diagnóstico reproduce los conteos MIME observados sin revelar datos', () => {
  const secret = 'DATO-PRIVADO-NO-REGISTRAR-8472';
  const bytes = Array.from(Buffer.from('<p>' + secret + '</p>', 'utf8'));
  const threads = {};
  let n = 0;
  for (let i = 0; i < 17; i++) {
    const messages = [];
    for (let j = 0; j < (i < 3 ? 2 : 1); j++, n++) {
      const matching = n < 16;
      messages.push({
        id: secret + n, snippet: secret,
        payload: matching ? matchingPayload([
          { mimeType: 'text/html', filename: secret, body: { size: bytes.length, data: bytes } },
          { mimeType: secret, body: { data: encoded(secret) } }
        ], secret) : { mimeType: 'text/plain', headers: [{ name: 'Subject', value: secret }] }
      });
    }
    threads[secret + i] = { id: secret + i, messages };
  }
  const { ctx, logs } = environment(threads);
  const r = ctx.orqDiagnosticoMimeGmailSoloLectura();
  assert.equal(r.hilos, 17);
  assert.equal(r.mensajes, 20);
  assert.equal(r.mensajesConAsuntoCoincidente, 16);
  assert.equal(r.tipos.textoHtml.partes, 16);
  assert.equal(r.tipos.textoHtml.conAdjunto, 0);
  assert.equal(r.tipos.textoHtml.datosEnLinea, 16);
  assert.equal(r.tipos.textoHtml.datosNoStringDetalle.arreglo, 16);
  assert.equal(r.tipos.textoHtml.datosNoStringDetalle.textoUtf8.pareceHtml, 16);
  assert.equal(r.busquedaPuedeEstarIncompleta, false);
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], new RegExp(secret));
  assert.doesNotMatch(JSON.stringify(r), new RegExp(secret));
});

test('Diagnóstico cuenta fallos y formas inesperadas sin mostrar errores ni identificadores', () => {
  const secret = 'DATO-PRIVADO-NO-REGISTRAR-9123';
  const { ctx, logs } = environment({
    malo: new Error(secret),
    bueno: { messages: [
      { payload: matchingPayload([{ mimeType: 'text/html', body: { data: 123 } }]) },
      { payload: { mimeType: 'multipart/mixed', parts: secret,
        headers: [{ name: 'Subject', value: 'Mensaje desde tusclases: ' + secret }] } },
      { snippet: secret }
    ] }
  });
  const r = ctx.orqDiagnosticoMimeGmailSoloLectura();
  assert.equal(r.erroresLecturaHilo, 1);
  assert.equal(r.mensajesSinPayload, 1);
  assert.equal(r.partesNoArreglo, 1);
  assert.equal(r.tipos.textoHtml.datosNoString, 1);
  assert.doesNotMatch(logs.join(''), new RegExp(secret));
  assert.doesNotMatch(JSON.stringify(r), new RegExp(secret));
});

test('Diagnóstico marca la búsqueda como incompleta si falla una página', () => {
  const { ctx, logs } = environment({});
  ctx.Gmail.Users.Threads.list = () => { throw new Error('secreto de ejemplo'); };
  const r = ctx.orqDiagnosticoMimeGmailSoloLectura();
  assert.equal(r.erroresListado, 1);
  assert.equal(r.busquedaPuedeEstarIncompleta, true);
  assert.doesNotMatch(logs.join(''), /secreto/);
});

test('Diagnóstico clasifica bytes firmados sin revelar el HTML', () => {
  const secret = 'DATO-PRIVADO-NO-REGISTRAR-4321';
  const html = '<p>Confirmación ' + secret + '</p>';
  const bytes = Array.from(Buffer.from(html, 'utf8'), b => b > 127 ? b - 256 : b);
  const message = { payload: matchingPayload([{ mimeType: 'text/html', body: { size: bytes.length, data: bytes } }]) };
  const { ctx, logs } = environment({ uno: { id: 'uno', messages: [message] } });
  const result = ctx.orqDiagnosticoMimeGmailSoloLectura();
  const detail = result.tipos.textoHtml.datosNoStringDetalle;
  assert.equal(detail.arreglo, 1);
  assert.equal(detail.bytesIgualTamano, 1);
  assert.equal(detail.textoUtf8.ok, 1);
  assert.equal(detail.textoUtf8.pareceHtml, 1);
  assert.doesNotMatch(logs.join(''), new RegExp(secret));
});

test('MIME HTML en bytes: recuperar el cuerpo en lugar de usar el snippet', () => {
    const html = '<p>Confirmación: Árbol</p>';
    const bytes = Array.from(Buffer.from(html, 'utf8'), b => b > 127 ? b - 256 : b);
    const msg = { id: 'mensaje-sintetico', snippet: 'se ha enviado correctamente',
      payload: { mimeType: 'text/html', body: { size: bytes.length, data: bytes } } };
    const { ctx } = environment({ uno: { id: 'uno', messages: [msg] } });
    const wrapped = ctx.orqSearchGmail_('consulta sintética', 10)[0].getMessages()[0];
    assert.equal(wrapped.getBody(), html);
    assert.equal(wrapped.isSnippetFallback(), false);
});

test('Bytes en partes anidadas se convierten a UTF-8 sin decodificarlos dos veces', () => {
  const text = 'SGVsbG8=';
  const html = '<p>Árbol</p>';
  const bytes = value => Array.from(Buffer.from(value, 'utf8'), b => b > 127 ? b - 256 : b);
  const msg = { id: 'mensaje-sintetico', snippet: 'resumen', payload: matchingPayload([
    { mimeType: 'multipart/alternative', parts: [
      { mimeType: 'text/plain', body: { data: bytes(text) } },
      { mimeType: 'text/html', body: { data: bytes(html) } }
    ] }
  ]) };
  const { ctx } = environment({ uno: { id: 'uno', messages: [msg] } });
  const wrapped = ctx.orqGetGmailThreadById_('uno').getMessages()[0];
  assert.equal(wrapped.getPlainBody(), text);
  assert.equal(wrapped.getBody(), html);
  assert.equal(wrapped.isSnippetFallback(), false);
});

test('Una conversión de bytes fallida conserva el fallback conservador', () => {
  const msg = { id: 'mensaje-sintetico', snippet: 'resumen',
    payload: { mimeType: 'text/html', body: { data: [60, 112, 62] } } };
  const { ctx } = environment({ uno: { id: 'uno', messages: [msg] } });
  ctx.Utilities.newBlob = () => { throw new Error('conversión fallida'); };
  const wrapped = ctx.orqSearchGmail_('consulta sintética', 10)[0].getMessages()[0];
  assert.equal(wrapped.getBody(), 'resumen');
  assert.equal(wrapped.isSnippetFallback(), true);
});

test('Las 16 confirmaciones sintéticas con bytes atraviesan extracción y dejan de usar snippets', () => {
  const threads = {};
  let n = 0;
  for (let i = 0; i < 17; i++) {
    const messages = [];
    for (let j = 0; j < (i < 3 ? 2 : 1); j++, n++) {
      const matching = n < 16;
      const html = matching ? '<p>Tu mensaje se ha enviado correctamente.</p>' +
        '<a href="https://awstrack.me/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fsolicitud-' +
        (7654000 + n) + '.aspx/1/x">Ver</a>' : '<p>Otro aviso</p>';
      const bytes = Array.from(Buffer.from(html, 'utf8'), b => b > 127 ? b - 256 : b);
      messages.push({
        id: 'm-' + n, snippet: 'Tu mensaje se ha enviado correctamente.',
        payload: { mimeType: 'text/html',
          headers: [{ name: 'Subject', value: matching ? 'Mensaje desde tusclases: Prueba' : 'Otro' }],
          body: { size: bytes.length, data: bytes } }
      });
    }
    threads['t-' + i] = { id: 't-' + i, messages };
  }
  const { ctx } = environment(threads);
  const ss = { getSheetByName: name => name === 'Contactados' ? { getLastRow: () => 1 } : null };
  const history = ctx.orqContactHistory_(ss);
  assert.equal(history.etapas.busqueda.hilosRecuperados, 17);
  assert.equal(history.etapas.lectura.mensajesTotal, 20);
  assert.equal(history.etapas.lectura.mensajesConfirmacionTexto, 16);
  assert.equal(history.etapas.decodificacion.conHtml, 16);
  assert.equal(history.etapas.decodificacion.conSnippetFallback, 0);
  assert.equal(history.etapas.extraccion.conEnlacesTracking, 16);
  assert.equal(history.etapas.extraccion.conClavesExtraidas, 16);
  assert.equal(history.etapas.extraccion.mensajesSinIdentificador, 0);
  assert.equal(history.incomplete, false);
});
