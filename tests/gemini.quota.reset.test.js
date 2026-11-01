const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function environment() {
  const props = { GEMINI_CALLS_DAY: '2026-10-31', GEMINI_CALLS_COUNT: '19' };
  const timezones = [];
  const ctx = {
    Utilities: {
      formatDate: (date, tz, pattern) => {
        timezones.push(tz);
        assert.equal(pattern, 'yyyy-MM-dd');
        // En el instante de la prueba, Los Ángeles sigue en el día anterior a Buenos Aires.
        return tz === 'America/Los_Angeles' ? '2026-10-31' : '2026-11-01';
      }
    },
    Date
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../gas/Main.js'), 'utf8'), ctx);
  const p = {
    getProperty: k => props[k] || null,
    setProperty: (k, v) => { props[k] = String(v); }
  };
  return { ctx, p, props, timezones };
}

test('Gemini cuenta solicitudes por fecha del Pacífico y no reinicia antes de tiempo', () => {
  const e = environment();
  let cap = e.ctx.checkGeminiQuota_(e.p, { GEMINI_MAX_DAILY_CALLS: 20 });
  assert.equal(cap.count, 19);
  assert.equal(cap.allowed, true);
  e.ctx.recordGeminiCall_(e.p);
  cap = e.ctx.checkGeminiQuota_(e.p, { GEMINI_MAX_DAILY_CALLS: 20 });
  assert.equal(cap.count, 20);
  assert.equal(cap.allowed, false);
  assert.equal(e.props.GEMINI_CALLS_DAY, '2026-10-31');
  assert.ok(e.timezones.every(tz => tz === 'America/Los_Angeles'));
});

test('Gemini reinicia el contador cuando cambia el día del Pacífico', () => {
  const e = environment();
  e.props.GEMINI_CALLS_DAY = '2026-10-30';
  e.props.GEMINI_CALLS_COUNT = '20';
  const cap = e.ctx.checkGeminiQuota_(e.p, { GEMINI_MAX_DAILY_CALLS: 20 });
  assert.equal(cap.count, 0);
  assert.equal(cap.allowed, true);
  e.ctx.recordGeminiCall_(e.p);
  assert.equal(e.props.GEMINI_CALLS_DAY, '2026-10-31');
  assert.equal(e.props.GEMINI_CALLS_COUNT, '1');
});
