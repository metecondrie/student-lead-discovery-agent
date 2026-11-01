const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const orqSrc = fs.readFileSync(path.join(__dirname, '../gas/Orquestador.js'), 'utf8');
const ytSrc = fs.readFileSync(path.join(__dirname, '../gas/YouTubeCanales.js'), 'utf8');
const catSrc = fs.readFileSync(path.join(__dirname, '../gas/Catalogo.js'), 'utf8');

const STAGING = '1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';

function createMockEnv(opts = {}) {
  const props = {
    SHEET_ID: opts.wrongSheet ? 'other-sheet' : STAGING,
    YOUTUBE_API_KEY: opts.noYT ? '' : 'test-yt-key-123',
    GEMINI_API_KEY: opts.noGem ? '' : 'test-gem-key-456'
  };

  const triggers = [];
  const sheets = {};
  const httpRequests = [];
  const stats = { yt: 0, gem: 0 };

  function makeSheet(name, initialRows = []) {
    let rows = initialRows.map(r => r.slice());
    const s = {
      name: name,
      rows: rows,
      getLastRow: () => rows.length,
      getLastColumn: () => (rows.length > 0 ? rows[0].length : 0),
      setFrozenRows: () => {},
      clearContents: () => { rows.length = 0; },
      copyTo: (targetSs) => {
        const copyName = name + '_copy_' + uid++;
        const copy = makeSheet(copyName, rows);
        return {
          setName: (newName) => {
            delete sheets[copyName];
            copy.name = newName;
            sheets[newName] = copy;
            return copy;
          }
        };
      },
      getDataRange: () => ({
        getValues: () => rows.map(r => r.slice())
      }),
      getRange: (row, col, height, width) => ({
        getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(col - 1, col - 1 + width)),
        setValue: (val) => {
          const targetRow = row - 1;
          while (rows.length <= targetRow) rows.push([]);
          rows[targetRow][col - 1] = val;
        },
        setValues: (values) => {
          values.forEach((r, i) => {
            const targetRow = row - 1 + i;
            while (rows.length <= targetRow) rows.push([]);
            for (let j = 0; j < r.length; j++) {
              rows[targetRow][col - 1 + j] = r[j];
            }
          });
        }
      })
    };
    sheets[name] = s;
    return s;
  }

  // Pre-populate Config
  makeSheet('Config', [
    ['Clave', 'Valor'],
    ['SISTEMA_ACTIVO', opts.active ? 'TRUE' : 'FALSE'],
    ['GEMINI_MODEL', 'gemini-3.5-flash-lite'],
    ['GEMINI_MAX_DAILY_CALLS', 50],
    ['YOUTUBE_MAX_DAILY_QUOTA', 100]
  ]);

  // Pre-populate Fuentes with 4 operational sources (2 YouTube, 1 RSS, 1 Non-automatable)
  makeSheet('Fuentes', [
    ['ID Fuente', 'Plataforma', 'Canal / Creador', 'Temas / Materias', 'Nivel / Universidad', 'URL Canal / Recurso', 'ID Recurso', 'Activo', 'Tipo Acceso', 'Prioridad', 'Disponibilidad', 'Conector', 'Notas'],
    ['YT-01', 'YouTube', 'Filadd UBA', 'Matemática', 'CBC', 'https://www.youtube.com/channel/UC6PoYEu79xbbUGSM0s38Esg', 'Z5DyEohToDs', true, 'api_oficial', 'P1', 'DISPONIBLE', 'youtube_canales', 'Canal verificado'],
    ['YT-02', 'YouTube', 'Academia Filadd', 'Física', 'Ingreso', 'https://www.youtube.com/@filadd', 't4kBBDBOj6s', true, 'api_oficial', 'P1', 'DISPONIBLE', 'youtube_canales', 'Canal verificado'],
    ['RSS-01', 'Foros', 'UTNianos RSS', 'Química', 'UTN', 'https://www.utnianos.com.ar/foro/syndication.php', '', true, 'rss_publico', 'P2', 'DISPONIBLE', 'rss_foros', 'Feed activo'],
    ['FB-01', 'Facebook', 'Grupo CBC', 'Matemática', 'CBC', 'https://facebook.com/groups/cbc', '', false, 'no_automatizable', 'P2', 'NO_AUTOMATIZABLE', 'ninguno', 'Restricción ToS']
  ]);

  let uid = 100;

  const mockXmlRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>UTNianos Foros</title>
    <link>https://www.utnianos.com.ar/foro/</link>
    <item>
      <title>Busco profesor particular de Química para final de diciembre</title>
      <link>https://www.utnianos.com.ar/foro/tema-1234.html</link>
      <pubDate>Fri, 30 Oct 2026 15:00:00 GMT</pubDate>
      <description>Hola a todos, necesito preparar el final de Química General urgente, busco clases online particulares.</description>
    </item>
    <item>
      <title>Apuntes de Álgebra y Geometría Analítica</title>
      <link>https://www.utnianos.com.ar/foro/tema-5678.html</link>
      <pubDate>Thu, 29 Oct 2026 10:00:00 GMT</pubDate>
      <description>Dejo acá el PDF del resumen del parcial.</description>
    </item>
  </channel>
</rss>`;

  const mockGmailThreads = [
    {
      getId: () => 'th-gmail-01',
      getMessages: () => [
        {
          getId: () => 'msg-01',
          getFrom: () => 'contacto@tusclases.com.ar',
          getSubject: () => 'Nueva solicitud de alumno: Valentina busca clases de Análisis Matemático',
          getDate: () => new Date('2026-10-30T16:00:00Z'),
          getPlainBody: () => 'Valentina te ha contactado para clases online de Análisis Matemático CBC. Responder en: https://www.tusclases.com.ar/inbox/2466634.aspx',
          getBody: () => '<p>Valentina te ha contactado</p>'
        }
      ]
    }
  ];

  const ctx = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => props[k] || '',
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: k => { delete props[k]; }
      })
    },
    SpreadsheetApp: {
      openById: id => {
        if (id !== STAGING) throw new Error('Acceso no permitido');
        return {
          getId: () => id,
          getName: () => 'Planilla STAGING Mock',
          getSheetByName: name => sheets[name] || null,
          insertSheet: name => makeSheet(name),
          getUrl: () => 'https://docs.google.com/spreadsheets/d/' + STAGING + '/edit'
        };
      },
      getActiveSpreadsheet: () => ({
        getId: () => STAGING,
        getName: () => 'Planilla STAGING Mock',
        getSheetByName: name => sheets[name] || null,
        insertSheet: name => makeSheet(name),
        getUrl: () => 'https://docs.google.com/spreadsheets/d/' + STAGING + '/edit'
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: t => {
        const idx = triggers.indexOf(t);
        if (idx >= 0) triggers.splice(idx, 1);
      },
      newTrigger: name => ({
        timeBased: () => ({
          after: ms => ({
            create: () => {
              const trg = { getHandlerFunction: () => name, ms };
              triggers.push(trg);
              return trg;
            }
          })
        })
      })
    },
    Utilities: {
      formatDate: (d, tz, f) => '20261030-220000',
      getUuid: () => String(uid++),
      computeDigest: (alg, val) => Buffer.from(val || '').slice(0, 16)
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        httpRequests.push({ url, options });

        // YouTube Channels API
        if (url.includes('/channels?') || url.includes('/videos?')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ items: [{ id: 'UC6PoYEu79xbbUGSM0s38Esg', snippet: { channelId: 'UC6PoYEu79xbbUGSM0s38Esg' } }] })
          };
        }

        // YouTube CommentThreads API
        if (url.includes('/commentThreads?')) {
          if (opts.failYouTube && url.includes('UC6PoYEu79xbbUGSM0s38Esg')) {
            return {
              getResponseCode: () => 503,
              getContentText: () => JSON.stringify({ error: { message: 'YouTube Service Unavailable' } })
            };
          }
          if (Array.isArray(opts.customYtComments)) {
            return {
              getResponseCode: () => 200,
              getContentText: () => JSON.stringify({ items: opts.customYtComments })
            };
          }
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              items: [
                {
                  snippet: {
                    videoId: 'mDrLSOpo9ZA',
                    topLevelComment: {
                      id: 'yt-comm-01',
                      snippet: {
                        publishedAt: '2026-10-30T18:00:00Z',
                        textOriginal: 'Hola profe, busco profesor particular online para preparar el final de Álgebra del CBC.'
                      }
                    }
                  }
                },
                {
                  snippet: {
                    videoId: 'mDrLSOpo9ZA',
                    topLevelComment: {
                      id: 'yt-comm-02',
                      snippet: {
                        publishedAt: '2026-10-29T14:00:00Z',
                        textOriginal: 'Excelente explicación, muchas gracias.'
                      }
                    }
                  }
                }
              ]
            })
          };
        }

        // Gemini API
        if (url.includes(':generateContent')) {
          if (typeof opts.onGeminiCall === 'function') {
            const customRes = opts.onGeminiCall(url, options);
            if (customRes) return customRes;
          }
          if (opts.failGeminiQuota) {
            return {
              getResponseCode: () => 429,
              getContentText: () => JSON.stringify({ error: { message: opts.gemini429Message || 'Resource has been exhausted (e.g. check quota)' } })
            };
          }
          if (opts.failGeminiServer) {
            return {
              getResponseCode: () => 500,
              getContentText: () => JSON.stringify({ error: { message: 'Internal Server Error' } })
            };
          }
          const body = JSON.parse(options.payload);
          const promptText = body.contents[0].parts[0].text;
          const items = JSON.parse(promptText);
          const decisions = items.map(it => {
            const isNeed = /busc[oa]|necesit[oa]|preparar/i.test(it.text || '');
            return {
              id: it.id,
              es_solicitud_clases: isNeed,
              destinatario: isNeed ? 'pedido_abierto' : 'dirigido_al_creador',
              contactabilidad: 'canal_publico_permitido',
              oportunidad_comercial_alejo: isNeed,
              confianza: 0.95,
              materia: 'Matemática',
              nivel: 'CBC',
              resumen: 'Consulta sobre clases particulares online'
            };
          });
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              candidates: [{ content: { parts: [{ text: JSON.stringify(decisions) }] } }]
            })
          };
        }

        // RSS Feed (UTNianos)
        if (url.includes('syndication.php') || url.includes('/rss')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => mockXmlRss
          };
        }

        throw new Error('URL inesperada en mock: ' + url);
      }
    },
    GmailApp: {
      search: (q, start, max) => mockGmailThreads
    },
    HtmlService: {
      createHtmlOutputFromFile: () => ({
        setTitle: () => ({ setXFrameOptionsMode: () => {} })
      }),
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
    },
    Logger: { log: () => {} },
    sanitizeForSheets: s => (typeof s === 'string' && /^[=+\-@]/.test(s) ? "'" + s : s),
    buildGeminiPrompt: items => JSON.stringify(items),
    parseGeminiResponse: raw => JSON.parse(raw),
    checkYouTubeQuota_: () => ({ allowed: true, max: 100, used: stats.yt }),
    recordYouTubeQuota_: (p, n = 1) => { stats.yt += n; },
    checkGeminiQuota_: (_, cfg) => { const max = Number(cfg && cfg.GEMINI_MAX_DAILY_CALLS) || 50; return { allowed: stats.gem < max, max: max, count: stats.gem }; },
    recordGeminiCall_: () => { stats.gem++; },
    parseRss: (xml, k, label) => [
      {
        id: 'rss-item-1',
        title: 'Busco profesor particular de Química para final de diciembre',
        link: 'https://www.utnianos.com.ar/foro/tema-1234.html',
        url: 'https://www.utnianos.com.ar/foro/tema-1234.html',
        date: new Date('2026-10-30T15:00:00Z'),
        text: 'Hola a todos, necesito preparar el final de Química General urgente, busco clases online particulares.'
      }
    ],
    extractFromEmail: (em, cfg) => ({
      items: [
        {
          id: 'lead-gmail-01',
          url: 'https://www.tusclases.com.ar/inbox/2466634.aspx',
          subject: 'Análisis Matemático',
          level: 'CBC',
          text: 'Valentina busca clases online de Análisis Matemático CBC.',
          title: 'Valentina (Tusclases)'
        }
      ]
    }),
    Date, Math, String, Number, Array, JSON, Object, Error, RegExp, isFinite, encodeURIComponent
  };

  // Run Catalogo and YouTubeCanales in context
  vm.runInNewContext(catSrc, ctx);
  vm.runInNewContext(ytSrc, ctx);
  vm.runInNewContext(orqSrc, ctx);

  return { ctx, props, triggers, sheets, httpRequests, stats, opts };
}

test('1. Sincronización del catálogo maestro: lectura pura sin efectos laterales y migración segura con respaldo', () => {
  const env = createMockEnv();
  const ss = env.ctx.SpreadsheetApp.openById(STAGING);
  
  // 1a) Hoja Fuentes arranca con 4 filas preexistentes
  assert.equal(env.sheets.Fuentes.rows.length, 5); // 1 header + 4 rows
  
  // 1b) orqSources_ y orqStatus son de LECTURA PURA: no mutan, no limpian ni migran Fuentes al consultar
  const initialSources = env.ctx.orqSources_(ss);
  assert.equal(initialSources.length, 4);
  assert.equal(env.sheets.Fuentes.rows.length, 5);
  env.ctx.orqStatus();
  assert.equal(env.sheets.Fuentes.rows.length, 5); // Polling cada 10s no escribe nada
  
  // 1c) Migración segura sin argumentos: crea respaldo automático y actualiza a 15 columnas
  const migRes = env.ctx.migrarCatalogoFuentesSeguro();
  assert.equal(migRes.ok, true);
  assert.ok(migRes.backupHoja);
  assert.ok(env.sheets[migRes.backupHoja]); // Hoja de respaldo creada intacta
  assert.equal(env.sheets[migRes.backupHoja].rows.length, 5); // Respaldo conserva las 4 filas originales
  assert.equal(migRes.columnas, 15);
  assert.equal(migRes.total, 241); // 4 existentes + 237 nuevas desduplicadas
  
  // 1d) Fuentes migradas tienen 15 columnas y preservan datos existentes
  const sources = env.ctx.orqSources_(ss);
  assert.equal(sources.length, 241);
  
  const yt01 = sources.find(s => s.id === 'YT-01');
  assert.ok(yt01);
  assert.equal(yt01.enabled, true);
  assert.equal(yt01.connector, 'youtube_canales');

  const fb = sources.find(s => s.platform === 'Facebook');
  assert.ok(fb);
  assert.equal(fb.connector, 'ninguno');
  assert.equal(fb.availability, 'NO_AUTOMATIZABLE');

  // 1e) Consultas posteriores de orqStatus no alteran la hoja Fuentes
  env.ctx.orqStatus();
  assert.equal(env.sheets.Fuentes.rows.length, 242);
});

test('8. Modalidad distribuida: orqStart(\'ALL_ENABLED\', 15) encola >20 fuentes activas con cuotas bajas y retoma progresivamente', () => {
  const env = createMockEnv();
  
  // Crear 25 fuentes operativas activas en Fuentes
  for (let i = 1; i <= 22; i++) {
    env.sheets.Fuentes.rows.push([
      'DIST-' + i, 'YouTube', 'Canal ' + i, 'Matemática', 'CBC',
      'https://www.youtube.com/channel/UCTest_' + i, 'res_' + i, true,
      'api_oficial', 'P1', 'DISPONIBLE', 'youtube_canales', 'Canal activo ' + i
    ]);
  }
  
  // Establecer cuota diaria baja (2 llamadas diarias)
  const qRow = env.sheets.Config.rows.find(r => r[0] === 'GEMINI_MAX_DAILY_CALLS');
  if (qRow) qRow[1] = 2;
  env.props.GEMINI_MAX_DAILY_CALLS = '2';
  env.stats.gem = 0;
  
  // Iniciar la corrida: NO debe bloquearse con error teórico
  const st = env.ctx.orqStart('ALL_ENABLED', 15);
  assert.equal(st.estado, 'EJECUTANDO');
  assert.ok(st.total >= 20); // Más de 20 fuentes encoladas
  assert.ok(env.sheets.OrqCola.rows.length > 20); // Cola persistente con todos los trabajos
  
  // Ejecutar paso 1: consume cuota
  env.ctx.orqTick();
  // Al agotarse la cuota real, orqTick pausa limpiamente como PAUSADO_CUOTA
  env.stats.gem = 2; // Simular cuota alcanzada
  env.ctx.orqTick();
  
  const pausedSt = env.ctx.orqStatus();
  assert.equal(pausedSt.estado, 'PAUSADO_CUOTA');
  assert.ok(env.triggers.length > 0); // Programó trigger de reanudación
  
  // Simular restablecimiento de cuota y reanudación manual/autónoma
  env.stats.gem = 0;
  const resumeRes = env.ctx.orqResume();
  assert.equal(resumeRes.estado, 'EJECUTANDO');
});

test('2. Un único botón «Buscar alumnos»: genera cola persistente en OrqCola con fuentes operativas', () => {
  const env = createMockEnv();
  
  // Inicia corrida con todas las fuentes operativas habilitadas
  const status = env.ctx.orqStart('ALL_ENABLED', 10);
  
  assert.equal(status.estado, 'EJECUTANDO');
  assert.ok(status.id.startsWith('ORQ-'));
  
  // Verifica que la cola persistente en OrqCola fue creada con trabajos
  const shCola = env.sheets.OrqCola;
  assert.ok(shCola);
  assert.ok(shCola.rows.length > 1); // Encabezado + trabajos
  
  // PropertiesService contiene sólo metadatos cortos (<250 bytes), no listas completas de videos
  const rawRun = env.props.ORQ_RUN;
  assert.ok(rawRun);
  assert.ok(rawRun.length < 300);
  const parsedRun = JSON.parse(rawRun);
  assert.equal(parsedRun.estado, 'EJECUTANDO');
  assert.equal(parsedRun.cursor, 1); // Primer paso ejecutado
  
  // Un trigger temporal orqTick fue programado para continuar autónomamente
  assert.equal(env.triggers.length, 1);
  assert.equal(env.triggers[0].getHandlerFunction(), 'orqTick');
});

test('3. Corrida multifuente real: procesa YouTube Canales, Foros RSS y Gmail Alertas en la misma corrida', () => {
  const env = createMockEnv();
  
  // Selecciona explícitamente 1 canal de YouTube, 1 foro RSS y 1 fuente de Gmail
  env.sheets.Fuentes.rows.push([
    'GM-01', 'Gmail', 'Tusclases Alertas', 'Matemática', 'CBC', 'https://www.tusclases.com.ar', '', true, 'gmail_autorizado', 'P0', 'DISPONIBLE', 'gmail_alertas', 'Alertas Gmail'
  ]);
  
  // Inicia la corrida
  env.ctx.orqStart(['YT-01', 'RSS-01', 'GM-01'], 10);
  
  // Paso 1 procesado (YT-01). Simula trigger 1 para continuar con RSS-01
  env.ctx.orqTick();
  
  // Simula trigger 2 para continuar con GM-01
  env.ctx.orqTick();
  
  const finalStatus = env.ctx.orqStatus();
  
  // La corrida finalizó de forma autónoma
  assert.equal(finalStatus.estado, 'FINALIZADO');
  assert.equal(finalStatus.total, 3);
  assert.equal(finalStatus.cursor, 3);
  
  // Se registraron candidatos de múltiples plataformas en OrqHallazgos
  const hallazgos = env.sheets.OrqHallazgos.rows.slice(1);
  assert.ok(hallazgos.length >= 2);
  
  const ytCandidates = hallazgos.filter(r => r[2] === 'YouTube');
  const rssCandidates = hallazgos.filter(r => r[2] === 'Foros');
  const gmailCandidates = hallazgos.filter(r => r[2] === 'Gmail');
  
  assert.ok(ytCandidates.length > 0);
  assert.ok(rssCandidates.length > 0);
  assert.ok(gmailCandidates.length > 0);
  
  // Enlaces directos verificados: YouTube incluye &lc= permalink, RSS incluye link del thread
  assert.ok(ytCandidates[0][5].includes('&lc='));
  assert.ok(rssCandidates[0][5].includes('utnianos.com.ar'));
  
  // Triggers limpiados al terminar
  assert.equal(env.triggers.length, 0);
});

test('4. YouTube Canales: busca a nivel canal, filtra por fecha reciente del comentario y no por video', () => {
  const env = createMockEnv();
  env.ctx.orqStart(['YT-01'], 10);
  
  // Comprueba llamadas a YouTube
  const ytCalls = env.httpRequests.filter(r => r.url.includes('/youtube/v3/'));
  assert.ok(ytCalls.length >= 1);
  
  // Consulta a commentThreads usa allThreadsRelatedToChannelId
  const threadCall = ytCalls.find(r => r.url.includes('allThreadsRelatedToChannelId'));
  assert.ok(threadCall);
  assert.ok(!threadCall.url.includes('videoId='));
});

test('5. Aislamiento de errores: fallo en YouTube no bloquea el procesamiento del Foro RSS ni de Gmail', () => {
  const env = createMockEnv({ failYouTube: true });
  
  env.ctx.orqStart(['YT-01', 'RSS-01'], 10);
  
  // Paso 1: YouTube falla con HTTP 503
  let current = env.ctx.orqStatus();
  assert.equal(current.metricas.errores, 1);
  
  // Paso 2: Trigger continúa con el Foro RSS
  env.ctx.orqTick();
  
  const finalStatus = env.ctx.orqStatus();
  assert.equal(finalStatus.estado, 'FINALIZADO');
  assert.equal(finalStatus.metricas.errores, 1);
  assert.equal(finalStatus.metricas.candidatos, 1); // Candidato de RSS encontrado exitosamente
});

test('6. Botón Detener: pausa la ejecución segura y cancela llamadas posteriores', () => {
  const env = createMockEnv();
  env.ctx.orqStart(['YT-01', 'YT-02'], 10);
  
  // Solicitar detención
  const stopRes = env.ctx.orqStop();
  assert.equal(stopRes.estado, 'DETENCION_SOLICITADA');
  
  // El siguiente tick detecta la detención y finaliza
  env.ctx.orqTick();
  
  const finalStatus = env.ctx.orqStatus();
  assert.equal(finalStatus.estado, 'DETENIDO');
  assert.equal(env.triggers.length, 0);
});

test('7. Salvaguardas: aborta si no es STAGING, si SISTEMA_ACTIVO es TRUE o faltan claves', () => {
  for (const cfg of [{ wrongSheet: true }, { active: true }, { noYT: true }, { noGem: true }]) {
    const env = createMockEnv(cfg);
    assert.throws(() => env.ctx.orqStart(['YT-01'], 10));
    assert.equal(env.httpRequests.length, 0);
  }
});


test('9. Migración se limita a STAGING y preserva encabezados con tildes', () => {
  const wrong = createMockEnv({ wrongSheet: true });
  const countBefore = wrong.sheets.Fuentes.rows.length;
  assert.throws(() => wrong.ctx.migrarCatalogoFuentesSeguro(), /STAGING|Seguridad/);
  assert.equal(wrong.sheets.Fuentes.rows.length, countBefore);
  assert.ok(!Object.keys(wrong.sheets).some(k => k.startsWith('Fuentes_Backup_')));

  const env = createMockEnv();
  env.sheets.Fuentes.rows[0].push('Última revisión');
  env.sheets.Fuentes.rows.slice(1).forEach(r => r[13] = '2026-10-10');
  const result = env.ctx.migrarCatalogoFuentesSeguro();
  assert.equal(result.ok, true);
  const first = env.sheets.Fuentes.rows.find(r => r[0] === 'YT-01');
  assert.equal(first[13], '2026-10-10');
  assert.equal(env.sheets.Fuentes.rows[0][13], 'Ultima revision');
  assert.ok(result.backupHoja);
  const backup = env.sheets[result.backupHoja];
  assert.equal(backup.rows[0][13], 'Última revisión');
});


test('regresión: dos fuentes Gmail consecutivas no reutilizan objetos GmailThread serializados', () => {
  const env = createMockEnv();
  for (const id of ['GM-01', 'GM-02']) {
    env.sheets.Fuentes.rows.push([
      id, 'Tusclases', 'Alertas Tusclases ' + id, 'Matemática', 'CBC',
      'https://www.tusclases.com.ar', '', true, 'gmail_autorizado', 'P0',
      'DISPONIBLE', 'gmail_alertas', 'Alertas Gmail'
    ]);
  }
  env.ctx.orqStart(['GM-01', 'GM-02'], 10);
  env.ctx.orqTick();
  const sources = env.sheets.OrqFuentes.rows.slice(1);
  assert.equal(sources.length, 2);
  assert.ok(sources.every(row => row[5] !== 'ERROR_GMAIL'));
  assert.ok(sources.every(row => row[5] === 'OK'));
  assert.equal(JSON.parse(env.props.ORQ_RUN)._gmailCache, undefined);
  assert.equal(env.ctx.orqStatus().estado, 'FINALIZADO');
});

test('regresión: cuota vencida no dispara reintentos infinitos ni progreso ficticio', () => {
  const env = createMockEnv();
  env.ctx.orqStart(['YT-01', 'YT-02'], 10);
  env.stats.gem = 50; // Sin llamadas disponibles.
  env.ctx.orqTick();  // Intenta el segundo job y queda pausado.
  let status = env.ctx.orqStatus();
  assert.equal(status.estado, 'PAUSADO_CUOTA');
  assert.equal(status.cursor, 1); // Segundo trabajo NO procesado.
  assert.equal(status.metricas.fuentes, 1);
  assert.equal(status.metricas.errores, 0); // La cuota no equivale a error de fuente.
  const logCount = env.sheets.OrqFuentes.rows.length;
  const attempts = env.sheets.OrqCola.rows[2][6];
  // Simular que transcurrió el intervalo, pero Gemini sigue sin capacidad.
  const run = JSON.parse(env.props.ORQ_RUN);
  run.proximaReanudacion = new Date(Date.now() - 60000).toISOString();
  env.props.ORQ_RUN = JSON.stringify(run);
  env.ctx.orqTick();
  status = env.ctx.orqStatus();
  assert.equal(status.estado, 'PAUSADO_CUOTA');
  assert.equal(env.sheets.OrqFuentes.rows.length, logCount);
  assert.equal(env.sheets.OrqCola.rows[2][6], attempts);
  assert.equal(status.cursor, 1);
  assert.equal(status.metricas.fuentes, 1);
  assert.ok(env.triggers.length > 0);
  // La cuota sí se restablece: continúa la misma corrida.
  env.stats.gem = 0;
  env.ctx.orqTick();
  assert.equal(env.ctx.orqStatus().estado, 'FINALIZADO');
  assert.equal(env.ctx.orqStatus().cursor, 2);
});


test('regresión F-01: RSS clasificado Alta por reglas se conserva para revisión cuando falla Gemini (error 500 no-cuota)', () => {
  const env = createMockEnv({ failGeminiServer: true });
  env.ctx.evaluate = () => ({
    compatible: 'Alta', status: 'Pendiente de aprobación',
    score: 85, subject: 'Química', reasons: 'Solicitud abierta'
  });
  env.ctx.orqStart(['RSS-01'], 10);
  const st = env.ctx.orqStatus();
  assert.equal(st.metricas.candidatos, 1);
  const rows = env.sheets.OrqHallazgos.rows.slice(1);
  assert.ok(rows.some(r => r[11] === 'REVISAR' && r[2] === 'Foros'));
});

test('regresión F-01: Gmail clasificado Media por reglas se conserva para revisión cuando falla Gemini (error 500 no-cuota)', () => {
  const env = createMockEnv({ failGeminiServer: true });
  env.sheets.Fuentes.rows.push([
    'GM-ALT', 'Tusclases', 'Avisos particulares', 'Matemática', 'CBC',
    'https://www.tusclases.com.ar', '', true, 'gmail_autorizado', 'P0',
    'DISPONIBLE', 'gmail_alertas', 'Alertas Gmail'
  ]);
  env.ctx.evaluate = () => ({
    compatible: 'Media', status: 'Pendiente de aprobación',
    score: 65, subject: 'Matemática', reasons: 'Solicitud reciente'
  });
  env.ctx.orqStart(['GM-ALT'], 10);
  const st = env.ctx.orqStatus();
  assert.equal(st.metricas.candidatos, 1);
  const rows = env.sheets.OrqHallazgos.rows.slice(1);
  assert.ok(rows.some(r => r[11] === 'REVISAR' && r[2] === 'Gmail'));
});

test('control RPM: espacia las solicitudes Gemini sucesivas sin modificar el cupo diario', () => {
  const env = createMockEnv();
  const p = env.ctx.PropertiesService.getScriptProperties();
  const before = Date.now();
  env.props.ORQ_GEMINI_LAST_CALL_MS = String(before);
  let sleptMs = 0;
  env.ctx.Utilities.sleep = (ms) => { sleptMs = ms; };
  env.ctx.orqPaceGemini_(p);
  assert.ok(sleptMs > 0 && sleptMs <= 7000, 'espaciado de hasta 7 segundos');
  assert.ok(Number(env.props.ORQ_GEMINI_LAST_CALL_MS) >= before);
  assert.equal(env.stats.gem, 0, 'la espera no contabiliza llamadas adicionales');

  sleptMs = 0;
  env.props.ORQ_GEMINI_LAST_CALL_MS = String(Date.now() - 10000);
  env.ctx.orqPaceGemini_(p);
  assert.equal(sleptMs, 0, 'sin espera cuando ya transcurrió el intervalo');
});

test('regresión punto 1: HTTP 429 en Gemini no marca el trabajo como COMPLETADO ni deja publicaciones SIN_CLASIFICAR (YouTube, RSS y Gmail)', () => {
  const env = createMockEnv({ failGeminiQuota: true, gemini429Message: 'Quota exceeded for metric: requests per day (RPD)' });
  env.sheets.Fuentes.rows.push([
    'GM-429', 'Tusclases', 'Alertas Tusclases 429', 'Matemática', 'CBC',
    'https://www.tusclases.com.ar', '', true, 'gmail_autorizado', 'P0',
    'DISPONIBLE', 'gmail_alertas', 'Alertas Gmail'
  ]);
  // Incluso con evaluate() definido en el contexto (como cuando Core.js está cargado), HTTP 429 debe pausar y NO degradar ni completar
  env.ctx.evaluate = () => ({
    compatible: 'Alta', status: 'Pendiente de aprobación',
    score: 85, subject: 'Química', reasons: 'Solicitud abierta'
  });

  env.ctx.orqStart(['YT-01', 'RSS-01', 'GM-429'], 10);

  // 1) YT-01 recibe 429 -> queda PAUSADO_CUOTA, nunca COMPLETADO ni SIN_CLASIFICAR
  let st = env.ctx.orqStatus();
  assert.equal(st.estado, 'PAUSADO_CUOTA');
  assert.equal(st.completados, 0);
  assert.equal(st.pausados, 1);
  assert.equal(st.pendientes, 2);
  assert.equal(st.cursor, 0);
  assert.equal(env.sheets.OrqCola.rows[1][5], 'PAUSADO_CUOTA');
  assert.equal(env.sheets.OrqHallazgos.rows.slice(1).length, 0);

  // Recupera YT-01
  env.opts.failGeminiQuota = false;
  env.ctx.orqTick();
  assert.equal(env.ctx.orqStatus().completados, 1);

  // 2) RSS-01 recibe 429 (incluso con evaluate definido) -> queda PAUSADO_CUOTA, no degrada ni completa
  env.opts.failGeminiQuota = true;
  env.ctx.orqTick();
  st = env.ctx.orqStatus();
  assert.equal(st.estado, 'PAUSADO_CUOTA');
  assert.equal(st.completados, 1);
  assert.equal(st.pausados, 1);
  assert.equal(env.sheets.OrqCola.rows[2][5], 'PAUSADO_CUOTA');

  // Recupera RSS-01
  env.opts.failGeminiQuota = false;
  env.ctx.orqTick();
  assert.equal(env.ctx.orqStatus().completados, 2);

  // 3) GM-429 recibe 429 -> queda PAUSADO_CUOTA, nunca ERROR_GMAIL ni COMPLETADO
  env.opts.failGeminiQuota = true;
  env.ctx.orqTick();
  st = env.ctx.orqStatus();
  assert.equal(st.estado, 'PAUSADO_CUOTA');
  assert.equal(st.completados, 2);
  assert.equal(st.pausados, 1);
  assert.equal(env.sheets.OrqCola.rows[3][5], 'PAUSADO_CUOTA');

  // Recupera GM-429 y finaliza corrida
  env.opts.failGeminiQuota = false;
  env.ctx.orqTick();

  st = env.ctx.orqStatus();
  assert.equal(st.estado, 'FINALIZADO');
  assert.equal(st.completados, 3);
  assert.equal(st.pausados, 0);
  assert.equal(st.cursor, 3);

  const finalHallazgos = env.sheets.OrqHallazgos.rows.slice(1);
  assert.ok(finalHallazgos.length >= 4);
  assert.ok(!finalHallazgos.some(r => r[8] === 'SIN_CLASIFICAR'));
  assert.equal(st.metricas.candidatos, 3);
});

test('regresión punto 2: progreso parcial por lotes conserva los lotes ya clasificados y continúa desde el siguiente sin repetir llamadas ni duplicar registros', () => {
  // Crear 8 comentarios recientes en el canal (Lote 1 = 5 comentarios, Lote 2 = 3 comentarios)
  const eightComments = [];
  for (let i = 1; i <= 8; i++) {
    eightComments.push({
      snippet: {
        videoId: 'mDrLSOpo9ZA',
        topLevelComment: {
          id: 'yt-batch-comm-' + i,
          snippet: {
            publishedAt: '2026-10-30T18:00:00Z',
            textOriginal: (i === 2 || i === 7) ?
              ('Hola, busco profesor particular online para preparar final de Matemática #' + i) :
              ('Muy buen video explicativo #' + i)
          }
        }
      }
    });
  }

  let geminiCalls = 0;
  const processedBatchIds = [];
  const env = createMockEnv({
    customYtComments: eightComments,
    onGeminiCall: (url, options) => {
      geminiCalls++;
      // El primer lote (5 items) tiene éxito; el segundo lote recibe HTTP 429 RPD
      if (geminiCalls === 2) {
        return {
          getResponseCode: () => 429,
          getContentText: () => JSON.stringify({ error: { message: 'Quota exceeded for quota metric: requests per day (RPD)' } })
        };
      }
      const body = JSON.parse(options.payload);
      const items = JSON.parse(body.contents[0].parts[0].text);
      items.forEach(it => processedBatchIds.push(it.id));
      return null; // Usar respuesta exitosa por defecto
    }
  });

  // Iniciar con máx 10 comentarios: procesa Lote 1 (5 items) y pausa en Lote 2 (3 items)
  let st = env.ctx.orqStart(['YT-01'], 10);
  assert.equal(st.estado, 'PAUSADO_CUOTA');
  assert.equal(st.completados, 0);
  assert.equal(st.pausados, 1);

  // Verificar que los 5 items del Lote 1 se conservaron en OrqHallazgos (incluyendo el candidato #2)
  const hallazgosMid = env.sheets.OrqHallazgos.rows.slice(1);
  assert.equal(hallazgosMid.length, 5);
  assert.equal(st.metricas.clasificados, 5);
  assert.equal(st.metricas.candidatos, 1);
  assert.ok(!hallazgosMid.some(r => r[8] === 'SIN_CLASIFICAR'));

  // Verificar que el cursor en OrqCola guardó los 3 items restantes del Lote 2
  const savedCursor = JSON.parse(env.sheets.OrqCola.rows[1][7]);
  assert.equal(savedCursor.offset, 5);
  assert.equal(savedCursor.pendingItems.length, 3);

  // Reanudar corrida: debe procesar ÚNICAMENTE los 3 items del Lote 2 sin repetir Lote 1 ni llamadas a YouTube
  const ytCallsBeforeResume = env.httpRequests.filter(r => r.url.includes('/youtube/v3/')).length;
  env.ctx.orqTick();

  st = env.ctx.orqStatus();
  assert.equal(st.estado, 'FINALIZADO');
  assert.equal(st.completados, 1);
  assert.equal(st.pausados, 0);
  assert.equal(st.cursor, 1);

  // No se repitieron llamadas a YouTube ni a Gemini para el Lote 1
  const ytCallsAfterResume = env.httpRequests.filter(r => r.url.includes('/youtube/v3/')).length;
  assert.equal(ytCallsAfterResume, ytCallsBeforeResume);
  assert.equal(processedBatchIds.length, 8);
  assert.equal(new Set(processedBatchIds).size, 8, 'ningún comentario fue enviado dos veces a Gemini');

  // OrqHallazgos tiene exactamente 8 registros únicos (y ambos candidatos #2 y #7 detectados)
  const hallazgosFinal = env.sheets.OrqHallazgos.rows.slice(1);
  assert.equal(hallazgosFinal.length, 8);
  assert.equal(new Set(hallazgosFinal.map(r => r[4])).size, 8, 'sin registros duplicados en OrqHallazgos');
  assert.equal(st.metricas.clasificados, 8);
  assert.equal(st.metricas.candidatos, 2);
  assert.equal(st.metricas.gemini, 2);

  // OrqFuentes tiene una única fila actualizada para YT-01 con estado OK
  assert.equal(env.sheets.OrqFuentes.rows.slice(1).length, 1);
  assert.equal(env.sheets.OrqFuentes.rows[1][5], 'OK');
});

test('regresión punto 3: estados coherentes (ERROR_GMAIL y ERROR_RESOLUCION no se cuentan como completados)', () => {
  const env = createMockEnv();
  // Agregar fuente YouTube con URL no resoluble (provoca ERROR_RESOLUCION) y fuente Gmail que fallará (provoca ERROR_GMAIL)
  env.sheets.Fuentes.rows.push(
    ['YT-BAD', 'YouTube', 'Canal Inválido', 'Física', 'CBC', 'https://www.youtube.com/watch?v=invalid', '', true, 'api_oficial', 'P1', 'DISPONIBLE', 'youtube_canales', 'URL sin canal'],
    ['GM-BAD', 'Gmail', 'Gmail Roto', 'Química', 'CBC', 'https://www.tusclases.com.ar', '', true, 'gmail_autorizado', 'P0', 'DISPONIBLE', 'gmail_alertas', 'Fallo Gmail']
  );

  // Hacer que GmailApp.search lance excepción para provocar ERROR_GMAIL
  env.ctx.GmailApp.search = () => { throw new Error('Servicio Gmail temporalmente no disponible'); };

  // Iniciar con RSS-01 (OK), YT-BAD (ERROR_RESOLUCION) y GM-BAD (ERROR_GMAIL)
  env.ctx.orqStart(['RSS-01', 'YT-BAD', 'GM-BAD'], 10);
  // Paso 1: RSS-01 terminó con OK
  let st = env.ctx.orqStatus();
  assert.equal(st.completados, 1);
  assert.equal(st.fallidos, 0);
  assert.equal(st.pendientes, 2);
  assert.equal(st.cursor, 1);
  assert.equal(st.metricas.fuentes, 1);
  assert.equal(env.sheets.OrqCola.rows[1][5], 'COMPLETADO');

  // Paso 2: YT-BAD termina con ERROR_RESOLUCION (no incrementa completados ni cursor)
  env.ctx.orqTick();
  st = env.ctx.orqStatus();
  assert.equal(st.completados, 1);
  assert.equal(st.fallidos, 1);
  assert.equal(st.pendientes, 1);
  assert.equal(st.cursor, 1);
  assert.equal(st.metricas.fuentes, 1);
  assert.equal(env.sheets.OrqCola.rows[2][5], 'ERROR');
  assert.equal(env.sheets.OrqFuentes.rows[2][5], 'ERROR_RESOLUCION');

  // Paso 3: GM-BAD termina con ERROR_GMAIL (no incrementa completados ni cursor)
  env.ctx.orqTick();
  st = env.ctx.orqStatus();
  assert.equal(st.estado, 'FINALIZADO');
  assert.equal(st.completados, 1);
  assert.equal(st.fallidos, 2);
  assert.equal(st.pendientes, 0);
  assert.equal(st.pausados, 0);
  assert.equal(st.cursor, 1);
  assert.equal(st.metricas.fuentes, 1);
  assert.equal(st.metricas.errores, 2);
  assert.equal(env.sheets.OrqCola.rows[3][5], 'ERROR');
  assert.equal(env.sheets.OrqFuentes.rows[3][5], 'ERROR_GMAIL');
  // En OrqCorridas, 'Fuentes completas' (col 6, idx 5) es 1 de 3
  assert.equal(env.sheets.OrqCorridas.rows[1][5], 1);
});

test('regresión punto 4: distinción de cuotas RPM, TPM y RPD, reintento controlado en 429 transitorio y tope contra ciclos infinitos', () => {
  // 4a) Reintento controlado exitoso ante HTTP 429 transitorio por RPM
  let callAttempts = 0;
  const sleeps = [];
  const env = createMockEnv({
    onGeminiCall: () => {
      callAttempts++;
      if (callAttempts === 1) {
        return {
          getResponseCode: () => 429,
          getContentText: () => JSON.stringify({ error: { message: 'Rate limit reached for requests per minute (RPM)' } })
        };
      }
      return null; // Éxito en el segundo intento
    }
  });
  env.ctx.Utilities.sleep = (ms) => { sleeps.push(ms); };

  const st = env.ctx.orqStart(['YT-01'], 10);
  assert.equal(st.estado, 'FINALIZADO');
  assert.equal(callAttempts, 2, 'reintentó una vez tras el 429 RPM y tuvo éxito');
  assert.ok(sleeps.some(ms => ms >= 7000), 'aplicó espera controlada antes de reintentar');
  assert.equal(st.completados, 1);
  assert.equal(st.metricas.candidatos, 1);

  // 4b) Clasificación explícita de cuotas RPD, TPM y RPM
  assert.equal(env.ctx.orqClassifyQuotaError_(429, 'Quota exceeded: requests per day', null).type, 'RPD');
  assert.equal(env.ctx.orqClassifyQuotaError_(429, 'Quota exceeded: requests per day', null).retryableInTick, false);
  assert.equal(env.ctx.orqClassifyQuotaError_(429, 'Resource exhausted: input tokens per minute (TPM)', null).type, 'TPM');
  assert.equal(env.ctx.orqClassifyQuotaError_(429, 'Resource exhausted: input tokens per minute (TPM)', null).retryableInTick, true);
  assert.equal(env.ctx.orqClassifyQuotaError_(429, 'Too many requests per minute (RPM)', null).type, 'RPM');
  assert.equal(env.ctx.orqClassifyQuotaError_(429, 'Too many requests per minute (RPM)', null).retryableInTick, true);

  // 4c) Prevención de ciclos infinitos cuando una fuente recibe 429 permanentemente sin avanzar cursor
  const envLoop = createMockEnv({
    failGeminiQuota: true,
    gemini429Message: 'Quota exceeded for metric: requests per day (RPD)'
  });
  envLoop.sheets.Config.rows.push(['ORQ_MAX_QUOTA_RETRIES', 2]);
  envLoop.ctx.orqStart(['YT-01'], 10); // Pausa #1
  assert.equal(envLoop.ctx.orqStatus().estado, 'PAUSADO_CUOTA');

  envLoop.ctx.orqTick(); // Pausa #2 sin avance
  assert.equal(envLoop.ctx.orqStatus().estado, 'PAUSADO_CUOTA');

  envLoop.ctx.orqTick(); // Supera ORQ_MAX_QUOTA_RETRIES (2) -> corta el ciclo y marca ERROR
  const finalLoopSt = envLoop.ctx.orqStatus();
  assert.equal(finalLoopSt.estado, 'FINALIZADO');
  assert.equal(finalLoopSt.fallidos, 1);
  assert.equal(finalLoopSt.pausados, 0);
  assert.equal(envLoop.sheets.OrqCola.rows[1][5], 'ERROR');
  assert.ok(String(envLoop.sheets.OrqCola.rows[1][8]).includes('ERROR_CUOTA_AGOTADA_REITERADA'));
  assert.equal(envLoop.triggers.length, 0, 'elimina triggers para impedir ejecución infinita');
});
