'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('../tools/auditar-deploy-local.cjs');

test('puerta de seguridad: no reintroducir caché GmailThread serializada ni éxito incondicional', () => {
  const content = fs.readFileSync(path.join(__dirname, '../gas/Orquestador.js'), 'utf8');
  const check = analyze(content);
  assert.equal(check.cacheGmailThreadEnRun, false,
    'No se pueden serializar GmailThread en ORQ_RUN; provoca getMessages is not a function.');
  assert.equal(check.escrituraCompletadoIncondicional, false,
    'Un resultado ERROR_GMAIL o ERROR_RESOLUCION nunca debe marcarse COMPLETADO.');
  assert.equal(check.reconoceErroresAntesDeCompletar, true);
  assert.equal(check.validacionThread, true);
  assert.equal(check.diagnosticoSoloLectura, true);
});
