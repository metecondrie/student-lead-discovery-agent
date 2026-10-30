// Simulador mínimo de servicios de Apps Script para pruebas locales (sin red, sin envíos reales).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeSheet(name) {
  const sh = {
    name, data: [], hidden: false,
    getName: () => name,
    getLastRow() { return this.data.length; },
    getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); },
    setFrozenRows() { }, hideSheet() { this.hidden = true; },
    deleteRows(start, count) { this.data.splice(start - 1, count); },
    getRange(r, c, nr = 1, nc = 1) {
      return {
        getSheet: () => sh, getRow: () => r, getColumn: () => c,
        getValues: () => {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) row.push((sh.data[r - 1 + i] || [])[c - 1 + j] ?? '');
            out.push(row);
          }
          return out;
        },
        setValues(v) {
          v.forEach((row, i) => {
            sh.data[r - 1 + i] = sh.data[r - 1 + i] || [];
            row.forEach((x, j) => { sh.data[r - 1 + i][c - 1 + j] = x; });
          });
          return this;
        },
        setValue(x) { return this.setValues([[x]]); }
      };
    }
  };
  return sh;
}

function makeEnv({ threads = [], inbox = [], feeds = {}, me = 'demo@example.test', now } = {}) {
  const sheets = {};
  const ss = {
    getId: () => 'SS1', getUrl: () => 'https://docs.google.com/spreadsheets/d/SS1',
    getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet(n)),
    getSheets: () => Object.values(sheets), deleteSheet(s) { delete sheets[s.name]; }
  };
  const store = {};
  const sent = [], replies = [], drafts = [], triggers = [], fetched = [], labels = {};
  const ctx = {
    console, Logger: { log() { } }, sheets, sent, replies, drafts, triggers, fetched, store, labels,
    SpreadsheetApp: { create: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() { } }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => me }) },
    MailApp: { sendEmail: (to, subject, body) => sent.push({ to, subject, body }) },
    Utilities: { sleep() { }, formatDate: (d, tz, f) => { const s = new Date(d.getTime() - 3 * 3600e3).toISOString(); return f === 'H' ? String(Number(s.slice(11, 13))) : s.slice(0, 10); } },
    UrlFetchApp: {
      fetch(url, opts) {
        fetched.push(url);
        const key = Object.keys(feeds).find(k => url.includes(k));
        let body = key ? feeds[key] : { data: [] };
        if (typeof body === 'function') body = body(url, opts);
        if (body === 'ERR') throw new Error('red caída');
        return {
          getResponseCode: () => 200,
          getContentText: () => typeof body === 'string' ? body : JSON.stringify(body)
        };
      }
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(), deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1),
      newTrigger(fn) { const t = { fn, getHandlerFunction: () => fn }; const b = { timeBased: () => b, everyHours: () => b, forSpreadsheet: () => b, onEdit: () => b, create: () => { triggers.push(t); return t; } }; return b; }
    },
    GmailApp: {
      search(q) {
        if (q.startsWith('in:inbox') || q.includes('label:') || (q.includes('from:') && !q.includes('tusclases'))) {
          var posLabelMatch = q.match(/(?:^|\s)label:([^\s\-]+)/);
          var negLabelMatch = q.match(/-label:([^\s]+)/);
          var posLabel = posLabelMatch ? posLabelMatch[1].replace(/["']/g, '') : null;
          var negLabel = negLabelMatch ? negLabelMatch[1].replace(/["']/g, '') : null;
          var fromMatch = q.match(/from:\(([^)]+)\)/);
          var allowedFrom = fromMatch ? fromMatch[1].split(' OR ').map(s => s.trim().toLowerCase()) : null;

          return inbox.filter(function (t) {
            if (negLabel && t.labels.indexOf(negLabel) >= 0) return false;
            if (posLabel && t.labels.indexOf(posLabel) < 0) return false;
            if (allowedFrom && allowedFrom.length) {
              var msgs = t.getMessages();
              var lastFrom = msgs.length ? msgs[msgs.length - 1].getFrom().toLowerCase() : '';
              var matchedFrom = allowedFrom.some(f => lastFrom.includes(f));
              if (!matchedFrom) return false;
            }
            return true;
          });
        }
        return threads;
      },
      getUserLabelByName: n => labels[n] || null, createLabel: n => (labels[n] = { n, getName: () => n })
    }
  };
  ctx.Date = now ? class extends Date { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return new Date(now).getTime(); } } : Date;
  vm.createContext(ctx);
  for (const f of ['Catalogo.js', 'Core.js', 'Main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'gas', f), 'utf8'), ctx, { filename: f });
  return ctx;
}

let seq = 0;
function msg({ from, subject, html = '', plain, date = new Date(), headers = {} }) {
  const id = 'm' + (++seq);
  return { getId: () => id, getFrom: () => from, getSubject: () => subject, getDate: () => date, getBody: () => html,
    getPlainBody: () => plain ?? html.replace(/<[^>]+>/g, ' '), getHeader: n => headers[n] || '',
    reply(t) { ctxRef.env.replies.push({ id, t }); }, createDraftReply(t) { ctxRef.env.drafts.push({ id, t }); } };
}
const ctxRef = { env: null };
function thread(msgs, id) {
  const tid = id || 't' + (++seq);
  return {
    getId: () => tid,
    getMessages: () => msgs,
    labels: [],
    addLabel(l) { const name = typeof l === 'string' ? l : (l.n || l.getName()); if (!this.labels.includes(name)) this.labels.push(name); },
    getLabels() { return this.labels.map(name => ({ getName: () => name, n: name })); }
  };
}

module.exports = { makeEnv, msg, thread, ctxRef };
