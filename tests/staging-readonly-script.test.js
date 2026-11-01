'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../tools/verificar-staging-solo-lectura.ps1'), 'utf8');
const withoutComments = src.split('\n').filter(s => !/^\s*#/.test(s)).join('\n');

test('auditoría de STAGING: solo se clonará el proyecto a carpeta temporal', () => {
  assert.match(src, /function Read-Clone\(/);
  assert.match(src, /\& clasp \@claspArgs/);
  assert.match(src, /-claspArgs \@\('clone', \$ScriptId\)/);
  assert.match(src, /-claspArgs \@\('clone', \$ScriptId, \[string\]\$VersionNumber\)/);
  assert.match(src, /GetTempPath\(\)/);
  assert.match(src, /Remove-Item -LiteralPath \$tempRoot -Recurse/);
  assert.doesNotMatch(withoutComments, /\&\s*clasp\s+(?:push|deploy|redeploy|version|create-version|run|run-function|create-deployment)/i);
  assert.doesNotMatch(withoutComments, /(?:Invoke-RestMethod|Invoke-WebRequest|Start-Process|Set-Content|Out-File).*script\.google\.com/i);
});

test('auditoría de STAGING: requiere consentimiento y comparación de version inmutable', () => {
  assert.match(src, /\[Parameter\(Mandatory = \$true\)\]/);
  assert.match(src, /\[int\]\$VersionNumber = 0/);
  assert.match(src, /clasp clone/i);
  assert.match(src, /--compare-file \$reference/);
  assert.match(src, /Version inmutable NO comprobada/);
  assert.match(src, /No se modifico el proyecto remoto/);
});
