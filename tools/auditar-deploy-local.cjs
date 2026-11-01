#!/usr/bin/env node
'use strict';

/**
 * Auditoría LOCAL de código Apps Script: sin red, sin OAuth ni escrituras.
 * NO sube código, credenciales, IDs, comentarios o datos personales.
 *
 * node tools/auditar-deploy-local.cjs --file <Orquestador.js> [--compare-file <archivo-github>]
 * node tools/auditar-deploy-local.cjs --content-json <respuesta-getContent.json> [--compare-file ...]
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

function analyze(source) {
  const code = String(source || '');
  return {
    hashSha256: crypto.createHash('sha256').update(code, 'utf8').digest('hex'),
    cacheGmailThreadEnRun: /run\._gmailCache\b/.test(code),
    consultaGmailApp: /GmailApp\.search\s*\(/.test(code),
    validacionThread: /function\s+orqHydrateGmailThread_\s*\(/.test(code),
    reconoceErroresAntesDeCompletar: /var\s+colaFinalState\s*=\s*isErrResult\s*\?\s*['"]ERROR['"]/.test(code),
    escrituraCompletadoIncondicional: /['"]COMPLETADO['"]\s*,\s*job\.attempts\s*\+\s*1/.test(code),
    diagnosticoSoloLectura: /function\s+orqDiagnosticoSoloLectura\s*\(/.test(code)
  };
}

function readVersion(args) {
  if (args['--file'] && args['--content-json']) {
    throw new Error('Elegí solo --file o --content-json.');
  }
  if (args['--file']) {
    return {kind: 'archivo-local', value: fs.readFileSync(args['--file'], 'utf8')};
  }
  if (args['--content-json']) {
    const x = JSON.parse(fs.readFileSync(args['--content-json'], 'utf8'));
    if (!x || !Array.isArray(x.files)) throw new Error('El JSON no contiene files[].');
    const f = x.files.find(x => /^(?:gas\/)?Orquestador(?:\.(?:js|gs))?$/i.test(String(x.name || '')));
    if (!f || typeof f.source !== 'string') throw new Error('No se encontró el archivo Orquestador en files[].');
    return {kind: 'api-getContent-local', value: f.source};
  }
  throw new Error('Falta --file o --content-json.');
}

function run(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!['--file', '--content-json', '--compare-file'].includes(argv[i]) || !argv[i + 1]) {
      throw new Error('Argumentos válidos: --file, --content-json y --compare-file seguidos de una ruta.');
    }
    args[argv[i]] = argv[++i];
  }
  const incoming = readVersion(args);
  const meta = analyze(incoming.value);
  let equalsReference = null;
  if (args['--compare-file']) {
    const reference = fs.readFileSync(args['--compare-file'], 'utf8');
    equalsReference = analyze(reference).hashSha256 === meta.hashSha256;
  }
  return {
    tipoEntrada: incoming.kind,
    hashSha256: meta.hashSha256,
    coincideExactamenteConReferencia: equalsReference,
    presencia: {
      cacheGmailThreadEnRun: meta.cacheGmailThreadEnRun,
      validaThreadDeGmail: meta.validacionThread,
      consultaGmailApp: meta.consultaGmailApp,
      distingueErrorDeCompletado: meta.reconoceErroresAntesDeCompletar,
      completadoIncondicionalAntiguo: meta.escrituraCompletadoIncondicional,
      diagnosticoSoloLectura: meta.diagnosticoSoloLectura
    },
    clasificacionHeuristica: meta.cacheGmailThreadEnRun ||
      meta.escrituraCompletadoIncondicional ? 'RIESGO_PATRONES_ANTIGUOS' :
      (!meta.reconoceErroresAntesDeCompletar || !meta.consultaGmailApp) ? 'VERSION_NO_RECONOCIDA_O_INCOMPLETA' :
        'SIN_PATRONES_ANTIGUOS_DETECTADOS',
    advertencia: 'Inspección estática de patrones, NO certifica código desplegado ni funcionamiento real.'
  };
}

if (require.main === module) {
  try {
    const result = run(process.argv.slice(2));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    process.stderr.write('ERROR: ' + String(err.message || err).replace(/[\r\n]+/g, ' ').slice(0, 200) + '\n');
    process.exitCode = 1;
  }
}

module.exports = { analyze, readVersion, run };
