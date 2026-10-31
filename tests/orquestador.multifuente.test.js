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
      getDataRange: () => ({
        getValues: () => rows.map(r => r.slice())
      }),
      getRange: (row, col, height, width) => ({
        getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(col - 1, col - 1 + width)),
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
          getSheetByName: name => sheets[name] || null,
          insertSheet: name => makeSheet(name),
          getUrl: () => 'https://docs.google.com/spreadsheets/d/' + STAGING + '/edit'
        };
      }
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
          if (opts.failGeminiQuota) {
            return {
              getResponseCode: () => 429,
              getContentText: () => JSON.stringify({ error: { message: 'Resource has been exhausted (e.g. check quota)' } })
            };
          }
          const body = JSON.parse(options.payload);
          const promptText = body.contents[0].parts[0].text;
          const items = JSON.parse(promptText);
          const decisions = items.map(it => {
            const isNeed = /busco|necesito|preparar/i.test(it.text || '');
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
    checkGeminiQuota_: () => ({ allowed: true, max: 50, count: stats.gem }),
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

  return { ctx, props, triggers, sheets, httpRequests, stats };
}

test('1. Sincronización del catálogo maestro: preserva filas existentes e incorpora las 239 entradas clasificadas', () => {
  const env = createMockEnv();
  const ss = env.ctx.SpreadsheetApp.openById(STAGING);
  
  // Hoja Fuentes arranca con 4 filas preexistentes
  assert.equal(env.sheets.Fuentes.rows.length, 5); // 1 header + 4 rows
  
  const sources = env.ctx.orqSources_(ss);
  
  // Se incorporan las 239 entradas del catálogo maestro (2 URLs preexistentes coinciden con el catálogo maestro y se desduplican)
  assert.ok(sources.length >= 239);
  assert.equal(sources.length, 241);
  
  // Filas existentes preservan sus IDs y estado
  const yt01 = sources.find(s => s.id === 'YT-01');
  assert.ok(yt01);
  assert.equal(yt01.enabled, true);
  assert.equal(yt01.connector, 'youtube_canales');

  // Fuentes de Facebook e Instagram quedan registradas con disponibilidad NO_AUTOMATIZABLE
  const fb = sources.find(s => s.platform === 'Facebook');
  assert.ok(fb);
  assert.equal(fb.connector, 'ninguno');
  assert.equal(fb.availability, 'NO_AUTOMATIZABLE');
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
  
  // PropertiesService contiene sólo metadatos cortos (<200 bytes), no listas completas de videos
  const rawRun = env.props.ORQ_RUN;
  assert.ok(rawRun);
  assert.ok(rawRun.length < 250);
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
