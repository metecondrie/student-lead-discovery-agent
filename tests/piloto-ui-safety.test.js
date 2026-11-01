'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const panel = fs.readFileSync(path.join(__dirname, '../gas/PanelOrquestador.html'), 'utf8');

test('interfaz: no ejecuta ALL_ENABLED por defecto ni sin confirmación explícita', () => {
  const check = panel.match(/<input[^>]*id="runAllEnabled"[^>]*>/);
  assert.ok(check, 'modo exhaustivo existe pero es opcional');
  assert.doesNotMatch(check[0], /\bchecked\b/);
  assert.match(panel, /const sourceMode = exhaustive \? 'ALL_ENABLED' : pilotIds\.slice\(\)/);
  assert.match(panel, /if \(!exhaustive && !sourceMode\.length\)/);
  assert.match(panel, /if \(!window\.confirm\(question\)\) return/);
});

test('interfaz: piloto de cuatro fuentes requiere previsualización de solo lectura', () => {
  assert.match(panel, /function handlePreparePilot\(\)/);
  assert.match(panel, /\.orqPreviewPilotoComercial\(\)/);
  assert.match(panel, /piloto de cuatro fuentes/i);
  assert.match(panel, /No se ejecutó ninguna búsqueda/);
  assert.match(panel, /Prepará primero el piloto/);
});

test('interfaz: muestra estado de contacto pendiente antes de permitir mensajes manuales', () => {
  assert.match(panel, /Contacto previo/);
  assert.match(panel, /PENDIENTE_VERIFICAR_EN_PLATAFORMA/);
  assert.match(panel, /verificá los mensajes internos/i);
});


test('interfaz: la vista de anuncios manuales nunca activa una corrida ni hace scraping', () => {
  assert.match(panel, /id="btnManualPreview"/);
  assert.match(panel, /function handlePreviewManual\(\)/);
  assert.match(panel, /\.orqPreviewSolicitudesVerificadas\(\)/);
  assert.match(panel, /pilotIds = \[\];[\s\S]*?\.orqPreviewSolicitudesVerificadas\(\)/);
  assert.match(panel, /No se verificó permiso de contacto ni elegibilidad internacional/);
  assert.match(panel, /No se ejecutó la búsqueda/);
});
