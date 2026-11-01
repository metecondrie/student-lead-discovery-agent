'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { analyze, run } = require('../tools/auditar-deploy-local.cjs');

const oldCode = [
  'function orqExecuteGmail_() {',
  "  run._gmailCache = run._gmailCache || {};",
  "  var threads = GmailApp.search(query, 0, 15);",
  "  shCola.getRange(1).setValues([['COMPLETADO', job.attempts + 1]]);",
  '}'
].join('\n');

const correctedCode = [
  'function orqExecuteGmail_() {',
  '  var threads = GmailApp.search(query, 0, 15);',
  "  var colaFinalState = isErrResult ? 'ERROR' : 'COMPLETADO';",
  '}',
  'function orqHydrateGmailThread_() {}',
  'function orqDiagnosticoSoloLectura() {}'
].join('\n');

test('auditoría offline: detecta caché de GmailThread y COMPLETADO incondicional del código antiguo', () => {
  const v = analyze(oldCode);
  assert.equal(v.cacheGmailThreadEnRun, true);
  assert.equal(v.escrituraCompletadoIncondicional, true);
  assert.equal(v.reconoceErroresAntesDeCompletar, false);
  assert.equal(v.validacionThread, false);
  assert.match(v.hashSha256, /^[0-9a-f]{64}$/);
});

test('auditoría offline: identifica protecciones nuevas sin llamar Gmail ni Apps Script', () => {
  const v = analyze(correctedCode);
  assert.equal(v.cacheGmailThreadEnRun, false);
  assert.equal(v.escrituraCompletadoIncondicional, false);
  assert.equal(v.reconoceErroresAntesDeCompletar, true);
  assert.equal(v.validacionThread, true);
  assert.equal(v.diagnosticoSoloLectura, true);
});

test('auditoría offline: lee una versión exportada desde getContent y solo informa patrones y hashes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staging-audit-'));
  try {
    const json = path.join(dir, 'version-2.json');
    const reference = path.join(dir, 'Orquestador.js');
    const sentinel = 'secreto-solo-en-archivo-local-no-publicar';
    const source = correctedCode + '\n// ' + sentinel;
    fs.writeFileSync(json, JSON.stringify({
      scriptId: 'ID-PRIVADO-LOCAL',
      files: [{name:'Orquestador',type:'SERVER_JS',source}]
    }));
    fs.writeFileSync(reference, source);
    const o = run(['--content-json', json, '--compare-file', reference]);
    assert.equal(o.coincideExactamenteConReferencia, true);
    assert.equal(o.clasificacionHeuristica, 'SIN_PATRONES_ANTIGUOS_DETECTADOS');
    assert.doesNotMatch(JSON.stringify(o), /secreto-solo-en-archivo|ID-PRIVADO-LOCAL/);

    fs.writeFileSync(reference, oldCode);
    const other = run(['--content-json', json, '--compare-file', reference]);
    assert.equal(other.coincideExactamenteConReferencia, false);
    assert.throws(() => run(['--file', reference, '--content-json', json]), /solo --file/);
  } finally {
    fs.rmSync(dir, {recursive:true,force:true});
  }
});
