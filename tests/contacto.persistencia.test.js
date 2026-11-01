'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const orqSrc = fs.readFileSync(path.join(__dirname, '../gas/Orquestador.js'), 'utf8');
const STAGING = '1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';

function createMockEnv(opts = {}) {
  const props = {
    SHEET_ID: STAGING,
    GEMINI_API_KEY: 'test-gem-key',
    YOUTUBE_API_KEY: 'test-yt-key'
  };
  const sheets = {};
  let lockAcquired = opts.lockFail ? false : true;

  function makeSheet(name, initialRows = []) {
    let rows = initialRows.map(r => r.slice());
    const s = {
      name: name,
      rows: rows,
      getLastRow: () => rows.length,
      getLastColumn: () => (rows.length > 0 ? rows[0].length : 0),
      setFrozenRows: () => {},
      appendRow: (row) => { rows.push(row.slice()); },
      deleteRow: (rowIdx) => {
        if (rowIdx >= 1 && rowIdx <= rows.length) {
          rows.splice(rowIdx - 1, 1);
        }
      },
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

  // Pre-crear Contactados con su fila de encabezados estándar
  makeSheet('Contactados', [
    ['Nombre', 'Materia', 'URL', 'Fecha', 'Nota']
  ]);

  const ss = {
    getId: () => STAGING,
    getUrl: () => 'https://docs.google.com/spreadsheets/d/' + STAGING + '/edit',
    getSheetByName: name => sheets[name] || null,
    insertSheet: (name) => {
      if (sheets[name]) return sheets[name];
      return makeSheet(name);
    }
  };

  const ctx = {
    STAGING,
    process: process,
    Buffer: Buffer,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => props[k] || '',
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: k => { delete props[k]; }
      })
    },
    SpreadsheetApp: {
      openById: id => ss,
      getActiveSpreadsheet: () => ss
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: (timeout) => lockAcquired,
        releaseLock: () => {}
      })
    },
    GmailApp: {
      search: (q) => []
    },
    Buffer: Buffer,
    Utilities: {
      formatDate: (date, tz, fmt) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toISOString().slice(0, 10);
      },
      base64DecodeWebSafe: (data) => Buffer.from(data, 'base64url'),
      newBlob: (bytes) => ({
        getDataAsString: (enc) => Buffer.from(bytes).toString('utf8')
      })
    },
    console: console
  };

  vm.createContext(ctx);
  vm.runInContext(orqSrc, ctx);

  return { ctx, ss, sheets, setLock: (val) => { lockAcquired = val; } };
}

test('1. Discriminación por país y portal: evita colisión de identificadores entre Chile, Colombia y Argentina', () => {
  const env = createMockEnv();
  const sh = env.sheets.Contactados;
  // Contacto previo en Chile ID 2466158
  sh.rows.push([
    'Alumno Chile',
    'Matemática',
    'https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2466158.aspx',
    '2026-11-01',
    'tusclasesparticulares.cl:2466158'
  ]);

  const history = env.ctx.orqContactHistory_(env.ss);

  // Mismo número 2466158 en Argentina NO debe estar marcado como contactado
  const itemArgentina = { url: 'https://www.tusclases.com.ar/estudiante-matematica/solicitud-2466158.aspx' };
  const decisionArg = env.ctx.orqContactDecision_(itemArgentina, history);
  assert.notEqual(decisionArg, 'CONTACTADO_CONFIRMADO', 'No debe confundir Chile con Argentina');

  // Mismo número 2466158 en Colombia NO debe estar marcado como contactado
  const itemColombia = { url: 'https://www.tusclases.co/estudiantes/matematicas/solicitud-2466158.aspx' };
  const decisionCol = env.ctx.orqContactDecision_(itemColombia, history);
  assert.notEqual(decisionCol, 'CONTACTADO_CONFIRMADO', 'No debe confundir Chile con Colombia');

  // El anuncio original en Chile SÍ debe estar confirmado
  const itemChile = { url: 'https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2466158.aspx' };
  const decisionCl = env.ctx.orqContactDecision_(itemChile, history);
  assert.equal(decisionCl, 'CONTACTADO_CONFIRMADO', 'Chile debe coincidir exactamente con su dominio');
});

test('2. Compatibilidad conservadora con registros legacy sin dominio', () => {
  const env = createMockEnv();
  const sh = env.sheets.Contactados;
  // Registro antiguo que solo tiene ID en la nota sin dominio
  sh.rows.push(['Alumno Antiguo', 'Química', '', '2026-10-01', 'aviso 12345']);

  const history = env.ctx.orqContactHistory_(env.ss);

  // Si se busca el mismo ID en Chile, se marca conservadoramente como CONTACTO_PENDIENTE_DE_VERIFICACION
  const chileLegacy = { url: 'https://www.tusclasesparticulares.cl/solicitud-12345.aspx' };
  assert.equal(env.ctx.orqContactDecision_(chileLegacy, history), 'CONTACTO_PENDIENTE_DE_VERIFICACION');
});

test('3. Botón «Ya contacté»: registro idempotente sin duplicados en Contactados', () => {
  const env = createMockEnv();

  const contactData = {
    canonicalKey: 'tusclasesparticulares.cl:2466516',
    url: 'https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2466516.aspx',
    materia: 'Matemática',
    fuente: 'Tusclases Chile'
  };

  // Primer registro
  const res1 = env.ctx.orqRecordManualContact(contactData);
  assert.equal(res1.ok, true);
  assert.equal(res1.yaRegistrado, false);
  assert.equal(env.sheets.Contactados.rows.length, 2); // Encabezado + 1 fila

  // Segundo registro idéntico (repetición de clic)
  const res2 = env.ctx.orqRecordManualContact(contactData);
  assert.equal(res2.ok, true);
  assert.equal(res2.yaRegistrado, true);
  assert.equal(env.sheets.Contactados.rows.length, 2, 'No debe duplicar fila al repetir');
});

test('4. No sobrescribe la columna 12 de OrqHallazgos (Candidato para revision)', () => {
  const env = createMockEnv();
  const shHallazgos = env.ss.insertSheet('OrqHallazgos');
  shHallazgos.rows.push(['RUN_ID', 'Fecha', 'Plataforma', 'Fuente', 'ID', 'URL', 'Pub', 'Texto', 'Col8', 'Col9', 'Col10', 'Candidato para revision', 'Materia', 'Nivel', 'Conf', 'Resumen']);
  shHallazgos.rows.push([
    'RUN-001', '2026-11-01', 'Tusclases', 'Tusclases Chile', '2466516',
    'https://www.tusclasesparticulares.cl/solicitud-2466516.aspx',
    '2026-11-01', 'Busco profe cálculo', '', '', '',
    'VERIFICAR_CONTACTO', // Columna 12 intacta
    'Matemática', 'Universidad', 0.95, 'Elegible'
  ]);

  // Se marca como contactado manualmente
  env.ctx.orqRecordManualContact({
    canonicalKey: 'tusclasesparticulares.cl:2466516',
    url: 'https://www.tusclasesparticulares.cl/solicitud-2466516.aspx'
  });

  // La columna 12 de OrqHallazgos permanece VERIFICAR_CONTACTO
  assert.equal(shHallazgos.rows[1][11], 'VERIFICAR_CONTACTO', 'Columna 12 no debe ser sobrescrita');

  // Pero orqStatus reconoce comercialmente que ya está contactado
  const props = env.ctx.PropertiesService.getScriptProperties();
  props.setProperty('ORQ_RUN', JSON.stringify({ id: 'RUN-001' }));
  const status = env.ctx.orqStatus();
  assert.equal(status.candidatos.length, 1);
  assert.equal(status.candidatos[0].yaContactado, true);
  assert.equal(status.candidatos[0].estadoContacto, 'CONTACTADO');
});

test('5. Reversión de contacto con orqRevertManualContact', () => {
  const env = createMockEnv();
  const target = 'tusclases.co:2466833';

  env.ctx.orqRecordManualContact({
    canonicalKey: target,
    url: 'https://www.tusclases.co/solicitud-2466833.aspx'
  });
  assert.equal(env.sheets.Contactados.rows.length, 2);

  const revertRes = env.ctx.orqRevertManualContact(target);
  assert.equal(revertRes.ok, true);
  assert.equal(revertRes.revertido, true);
  assert.equal(env.sheets.Contactados.rows.length, 1, 'Fila eliminada de Contactados');
});

test('6. Sincronización automática de comprobantes Gmail: idempotencia y extracción de país', () => {
  const env = createMockEnv();

  const mockReceipt = (sub, body) => ({
    getId: () => 'th-mock-' + Math.random(),
    getMessages: () => [{
      getSubject: () => sub,
      getPlainBody: () => body,
      getDate: () => new Date('2026-11-01T12:00:00Z')
    }]
  });

  env.ctx.GmailApp.search = () => [
    mockReceipt(
      'Mensaje desde tusclasesparticulares.cl: Alumno contactado',
      'Tu mensaje se ha enviado correctamente. https://www.tusclasesparticulares.cl/estudiantes/matematicas/solicitud-2466158.aspx'
    ),
    mockReceipt(
      'Mensaje desde tusclases.co: Alumno contactado',
      'Tu mensaje se ha enviado correctamente. https://www.tusclases.co/estudiantes/fisica/solicitud-2466833.aspx'
    )
  ];

  // Primera sincronización
  const sync1 = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(sync1.ok, true);
  assert.equal(sync1.nuevosContactosIncorporados, 2);
  assert.equal(sync1.yaRegistrados, 0);
  assert.equal(env.sheets.Contactados.rows.length, 3); // Encabezado + 2 filas

  // Segunda sincronización idéntica (debe ser 100% idempotente)
  const sync2 = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(sync2.ok, true);
  assert.equal(sync2.nuevosContactosIncorporados, 0);
  assert.equal(sync2.yaRegistrados, 2);
  assert.equal(env.sheets.Contactados.rows.length, 3, 'No debe agregar filas duplicadas');
});

test('7. Bloqueo de concurrencia con LockService maneja contención limpiamente', () => {
  const env = createMockEnv({ lockFail: true });

  const res = env.ctx.orqRecordManualContact({ canonicalKey: 'tusclases.co:2466833' });
  assert.equal(res.ok, false);
  assert.match(res.error, /BLOQUEADO/);

  const resSync = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(resSync.ok, false);
  assert.match(resSync.error, /BLOQUEADO/);
});

test('8. Persistencia tras reinicio de memoria RAM', () => {
  const env = createMockEnv();
  const sh = env.sheets.Contactados;
  sh.rows.push(['Alumno Persistente', 'Física', 'https://www.tusclases.co/solicitud-998877.aspx', '2026-11-01', 'tusclases.co:998877']);

  // Creamos un segundo entorno (simulando nueva ejecución de Apps Script / reinicio de RAM)
  const env2 = createMockEnv();
  env2.sheets.Contactados = sh; // Misma planilla persistida

  const freshHistory = env2.ctx.orqContactHistory_(env2.ss);
  assert.equal(freshHistory.crmRows, 1);
  assert.equal(freshHistory.knownCanonical['tusclases.co:998877'], true);
  assert.equal(env2.ctx.orqContactDecision_({ url: 'https://www.tusclases.co/solicitud-998877.aspx' }, freshHistory), 'CONTACTADO_CONFIRMADO');
});

test('9. Historial inicial de los 4 contactos del 01/11/2026: dryRun e incorporación segura', () => {
  const env = createMockEnv();

  // 1. Dry run: sólo lectura (con wrapper sin parámetros para el editor)
  const preview = env.ctx.orqEjecutarPrevisualizacionContactosIniciales();
  assert.equal(preview.modo, 'SOLO_LECTURA');
  assert.equal(preview.total, 4);
  assert.equal(preview.aIncorporar, 4);
  assert.equal(preview.yaEnCRM, 0);
  assert.equal(env.sheets.Contactados.rows.length, 1, 'No debe escribir en dryRun');

  // 2. Ejecución autorizada
  const applied = env.ctx.orqSeedInitialContacts(env.ss, false);
  assert.equal(applied.modo, 'ESCRITURA');
  assert.equal(applied.aIncorporar, 4);
  assert.equal(env.sheets.Contactados.rows.length, 5, 'Debe haber 4 filas nuevas + encabezado');

  // 3. Verificación posterior en dryRun
  const checkAfter = env.ctx.orqSeedInitialContacts(env.ss, true);
  assert.equal(checkAfter.yaEnCRM, 4);
  assert.equal(checkAfter.aIncorporar, 0, 'Todos los 4 ya figuran en Contactados');
});


test('10. Evidencia real de Gmail (01/11/2026): 5 comprobantes recibidos (2 Colombia idénticos, 3 Chile) generan exactamente 4 claves únicas', () => {
  const env = createMockEnv();

  const mockReceipt = (sub, body) => ({
    getId: () => 'th-real-' + Math.random(),
    getMessages: () => [{
      getSubject: () => sub,
      getPlainBody: () => body,
      getDate: () => new Date('2026-11-01T15:30:00Z')
    }]
  });

  // Los 5 correos reales confirmados por el usuario
  const threads = [
    // Colombia 1
    mockReceipt(
      'Mensaje desde tusclases.co: Juan te ha enviado un mensaje',
      'Tu mensaje al anunciante de: Matemáticas se ha enviado correctamente. ' +
      'https://r.email.tusclases.co/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fmatematicas%2Fsolicitud-2466833.aspx/1/0100018-hash-abc/xYz'
    ),
    // Colombia 2 (duplicado del mismo anuncio)
    mockReceipt(
      'Mensaje desde tusclases.co: Recordatorio de mensaje enviado',
      'Tu mensaje al anunciante de: Matemáticas se ha enviado correctamente. ' +
      'https://awstrack.me/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fmatematicas%2Fsolicitud-2466833.aspx/2/0100018-hash-def/uvw'
    ),
    // Chile 1 (prefijo exacto sin .cl en asunto)
    mockReceipt(
      'Mensaje desde tusclasesparticulares: Contacto realizado con éxito',
      'Tu mensaje al anunciante de: Álgebra Lineal se ha enviado correctamente. ' +
      'https://email.tusclasesparticulares.cl/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Festudiantes%2Fmatematicas%2Fsolicitud-2466158.aspx/1/0100018-hash-111/aaa'
    ),
    // Chile 2 (prefijo exacto sin .cl en asunto)
    mockReceipt(
      'Mensaje desde tusclasesparticulares: Consulta enviada al anunciante',
      'Tu mensaje al anunciante de: Cálculo Diferencial se ha enviado correctamente. ' +
      'https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Festudiantes%2Fmatematicas%2Fsolicitud-2466516.aspx/1/0100018-hash-222/bbb'
    ),
    // Chile 3 (prefijo exacto sin .cl en asunto)
    mockReceipt(
      'Mensaje desde tusclasesparticulares: Mensaje entregado',
      'Tu mensaje al anunciante de: Física Clásica se ha enviado correctamente. ' +
      'https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Festudiantes%2Fmatematicas%2Fsolicitud-2465382.aspx/1/0100018-hash-333/ccc'
    )
  ];

  env.ctx.GmailApp.search = () => threads;

  // Ejecución de la sincronización
  const syncRes = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(syncRes.ok, true);
  assert.equal(syncRes.mensajesRevisados, 5, 'Debe revisar los 5 mensajes');
  assert.equal(syncRes.comprobantesIdentificados, 5, 'Todos los 5 son comprobantes válidos');
  assert.equal(syncRes.nuevosContactosIncorporados, 4, 'Exactamente 4 claves únicas incorporadas');
  assert.equal(syncRes.yaRegistrados, 1, 'El segundo comprobante colombiano se deduplica');
  assert.equal(env.sheets.Contactados.rows.length, 5, 'Encabezado + 4 filas únicas en Contactados');

  // Segunda pasada: 100% idempotente
  const syncRes2 = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(syncRes2.ok, true);
  assert.equal(syncRes2.nuevosContactosIncorporados, 0);
  assert.equal(syncRes2.yaRegistrados, 5);
  assert.equal(env.sheets.Contactados.rows.length, 5, 'No agrega duplicados en segunda corrida');

  // Verificación de exclusión en el historial
  const history = env.ctx.orqContactHistory_(env.ss);
  assert.equal(history.knownCanonical['tusclases.co:2466833'], true);
  assert.equal(history.knownCanonical['tusclasesparticulares.cl:2466158'], true);
  assert.equal(history.knownCanonical['tusclasesparticulares.cl:2466516'], true);
  assert.equal(history.knownCanonical['tusclasesparticulares.cl:2465382'], true);

  // Cada uno de los 4 anuncios es clasificado como CONTACTADO_CONFIRMADO
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclases.co/solicitud-2466833.aspx' }, history), 'CONTACTADO_CONFIRMADO');
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclasesparticulares.cl/solicitud-2466158.aspx' }, history), 'CONTACTADO_CONFIRMADO');
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclasesparticulares.cl/solicitud-2466516.aspx' }, history), 'CONTACTADO_CONFIRMADO');
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclasesparticulares.cl/solicitud-2465382.aspx' }, history), 'CONTACTADO_CONFIRMADO');

  // En el estado del orquestador, un candidato para cualquiera de los 4 se marca yaContactado: true
  const shHallazgos = env.ss.insertSheet('OrqHallazgos');
  shHallazgos.rows.push(['RUN_ID', 'Fecha', 'Plataforma', 'Fuente', 'ID', 'URL', 'Pub', 'Texto', 'Col8', 'Col9', 'Col10', 'Candidato para revision', 'Materia', 'Nivel', 'Conf', 'Resumen']);
  shHallazgos.rows.push([
    'RUN-TEST-01', '2026-11-01', 'Tusclases', 'Tusclases Colombia', '2466833',
    'https://www.tusclases.co/estudiantes/matematicas/solicitud-2466833.aspx',
    '2026-11-01', 'Matemáticas online', '', '', '', 'VERIFICAR_CONTACTO', 'Matemática', 'Secundaria', 0.9, ''
  ]);
  env.ctx.PropertiesService.getScriptProperties().setProperty('ORQ_RUN', JSON.stringify({ id: 'RUN-TEST-01' }));

  const status = env.ctx.orqStatus();
  assert.equal(status.candidatos[0].yaContactado, true);
  assert.equal(status.candidatos[0].estadoContacto, 'CONTACTADO');
});

test('11. Trigger periódico desatendido: orqTriggerSyncContactReceipts opera con seguridad', () => {
  const env = createMockEnv();

  env.ctx.GmailApp.search = () => [{
    getId: () => 'th-trigger-01',
    getMessages: () => [{
      getSubject: () => 'Mensaje desde tusclasesparticulares: Contacto',
      getPlainBody: () => 'Tu mensaje al anunciante de: Química se ha enviado correctamente. https://www.tusclasesparticulares.cl/solicitud-2466158.aspx',
      getDate: () => new Date('2026-11-01T10:00:00Z')
    }]
  }];

  // Ejecución exitosa cuando SHEET_ID es STAGING
  const res = env.ctx.orqTriggerSyncContactReceipts();
  assert.equal(res.ok, true);
  assert.equal(res.nuevosContactosIncorporados, 1);
  assert.equal(env.sheets.Contactados.rows.length, 2);

  // Segunda ejecución desatendida es idempotente
  const res2 = env.ctx.orqTriggerSyncContactReceipts();
  assert.equal(res2.ok, true);
  assert.equal(res2.nuevosContactosIncorporados, 0);
  assert.equal(res2.yaRegistrados, 1);

  // Aborta de forma segura si SHEET_ID no coincide con STAGING
  env.ctx.PropertiesService.getScriptProperties().setProperty('SHEET_ID', 'other-production-sheet');
  const resAborted = env.ctx.orqTriggerSyncContactReceipts();
  assert.equal(resAborted.ok, false);
  assert.equal(resAborted.error, 'NO_STAGING');
});

test('12. Servicio Avanzado Gmail (Gmail API v1 / gmail.readonly): decodifica Base64URL, partes MIME y expone interfaz estándar', () => {
  const env = createMockEnv();

  const plainText = 'Tu mensaje al anunciante de: Álgebra se ha enviado correctamente. https://www.tusclasesparticulares.cl/solicitud-2466158.aspx';
  const htmlText = '<p>Tu mensaje al anunciante de: Álgebra se ha enviado correctamente. <a href="https://www.tusclasesparticulares.cl/solicitud-2466158.aspx">Ver</a></p>';

  const plainB64 = Buffer.from(plainText, 'utf8').toString('base64url');
  const htmlB64 = Buffer.from(htmlText, 'utf8').toString('base64url');

  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: (userId, params) => {
          assert.equal(userId, 'me');
          assert.ok(params.q);
          return {
            threads: [{ id: 'th-adv-1' }],
            resultSizeEstimate: 1
          };
        },
        get: (userId, threadId, params) => {
          assert.equal(userId, 'me');
          assert.equal(threadId, 'th-adv-1');
          assert.equal(params.format, 'full');
          return {
            id: 'th-adv-1',
            messages: [{
              id: 'msg-adv-1',
              threadId: 'th-adv-1',
              internalDate: '1730475000000',
              payload: {
                mimeType: 'multipart/alternative',
                headers: [
                  { name: 'Subject', value: 'Mensaje desde tusclasesparticulares: Consulta Álgebra' },
                  { name: 'From', value: 'avisos@tusclasesparticulares.cl' }
                ],
                parts: [
                  {
                    mimeType: 'text/plain',
                    body: { data: plainB64 }
                  },
                  {
                    mimeType: 'text/html',
                    body: { data: htmlB64 }
                  }
                ]
              }
            }]
          };
        }
      }
    }
  };

  const results = env.ctx.orqSearchGmail_('subject:Mensaje', 10);
  assert.equal(results.length, 1);
  const th = results[0];
  assert.equal(th.getId(), 'th-adv-1');
  const msgs = th.getMessages();
  assert.equal(msgs.length, 1);
  const msg = msgs[0];
  assert.equal(msg.getId(), 'msg-adv-1');
  assert.equal(msg.getThreadId(), 'th-adv-1');
  assert.equal(msg.getSubject(), 'Mensaje desde tusclasesparticulares: Consulta Álgebra');
  assert.equal(msg.getFrom(), 'avisos@tusclasesparticulares.cl');
  assert.equal(msg.getPlainBody(), plainText);
  assert.equal(msg.getBody(), htmlText);
  assert.equal(msg.getDate().getTime(), 1730475000000);
});

test('13. Servicio Avanzado Gmail: respuesta vacía o sin hilos devuelve array vacío sin error', () => {
  const env = createMockEnv();

  // Caso A: Objeto vacío sin clave threads
  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: () => ({})
      }
    }
  };
  const resEmpty = env.ctx.orqSearchGmail_('subject:Inexistente', 10);
  assert.equal(resEmpty.length, 0);

  // Caso B: Array vacío en threads
  env.ctx.Gmail.Users.Threads.list = () => ({ threads: [], resultSizeEstimate: 0 });
  const resEmptyList = env.ctx.orqSearchGmail_('subject:Inexistente', 10);
  assert.equal(resEmptyList.length, 0);
});

test('14. Servicio Avanzado Gmail: error de permisos (403 / insufficient permissions) o fallo de API es propagado de forma segura', () => {
  const env = createMockEnv();

  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: () => {
          const err = new Error('Request had insufficient authentication scopes.');
          err.code = 403;
          throw err;
        }
      }
    }
  };

  // orqSyncContactReceipts captura errores de Gmail y devuelve ok: false sin romper la ejecución
  const syncRes = env.ctx.orqSyncContactReceipts(10, false);
  assert.equal(syncRes.ok, false);
  assert.match(syncRes.error, /insufficient authentication scopes/);
});

test('15. Sincronización completa con Servicio Avanzado Gmail: reconoce los 5 comprobantes del 01/11/2026 y tracking awstrack.me', () => {
  const env = createMockEnv();

  const mockMsgResource = (id, sub, body) => ({
    id: id,
    threadId: id,
    internalDate: '1730476800000',
    payload: {
      mimeType: 'text/plain',
      headers: [
        { name: 'Subject', value: sub },
        { name: 'From', value: 'no-reply@tusclases.com' }
      ],
      body: {
        data: Buffer.from(body, 'utf8').toString('base64url')
      }
    }
  });

  const rawThreads = {
    'th-col-1': {
      id: 'th-col-1',
      messages: [mockMsgResource(
        'm-col-1',
        'Mensaje desde tusclases.co: Juan te ha enviado un mensaje',
        'Tu mensaje al anunciante de: Matemáticas se ha enviado correctamente. https://r.email.tusclases.co/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fmatematicas%2Fsolicitud-2466833.aspx/1/0100018-hash-abc/xYz'
      )]
    },
    'th-col-2': {
      id: 'th-col-2',
      messages: [mockMsgResource(
        'm-col-2',
        'Mensaje desde tusclases.co: Recordatorio de mensaje enviado',
        'Tu mensaje al anunciante de: Matemáticas se ha enviado correctamente. https://awstrack.me/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fmatematicas%2Fsolicitud-2466833.aspx/2/0100018-hash-def/uvw'
      )]
    },
    'th-cl-1': {
      id: 'th-cl-1',
      messages: [mockMsgResource(
        'm-cl-1',
        'Mensaje desde tusclasesparticulares: Contacto realizado con éxito',
        'Tu mensaje al anunciante de: Álgebra Lineal se ha enviado correctamente. https://email.tusclasesparticulares.cl/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Festudiantes%2Fmatematicas%2Fsolicitud-2466158.aspx/1/0100018-hash-111/aaa'
      )]
    },
    'th-cl-2': {
      id: 'th-cl-2',
      messages: [mockMsgResource(
        'm-cl-2',
        'Mensaje desde tusclasesparticulares: Consulta enviada al anunciante',
        'Tu mensaje al anunciante de: Cálculo Diferencial se ha enviado correctamente. https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Festudiantes%2Fmatematicas%2Fsolicitud-2466516.aspx/1/0100018-hash-222/bbb'
      )]
    },
    'th-cl-3': {
      id: 'th-cl-3',
      messages: [mockMsgResource(
        'm-cl-3',
        'Mensaje desde tusclasesparticulares: Mensaje entregado',
        'Tu mensaje al anunciante de: Física Clásica se ha enviado correctamente. https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Festudiantes%2Fmatematicas%2Fsolicitud-2465382.aspx/1/0100018-hash-333/ccc'
      )]
    }
  };

  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: () => ({
          threads: Object.keys(rawThreads).map(id => ({ id: id })),
          resultSizeEstimate: 5
        }),
        get: (userId, id) => rawThreads[id] || null
      }
    }
  };

  const syncRes = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(syncRes.ok, true);
  assert.equal(syncRes.mensajesRevisados, 5);
  assert.equal(syncRes.comprobantesIdentificados, 5);
  assert.equal(syncRes.nuevosContactosIncorporados, 4, 'Deduplica los 2 recibos de Colombia');
  assert.equal(syncRes.yaRegistrados, 1);
  assert.equal(env.sheets.Contactados.rows.length, 5);

  const history = env.ctx.orqContactHistory_(env.ss);
  assert.equal(history.knownCanonical['tusclases.co:2466833'], true);
  assert.equal(history.knownCanonical['tusclasesparticulares.cl:2466158'], true);
  assert.equal(history.knownCanonical['tusclasesparticulares.cl:2466516'], true);
  assert.equal(history.knownCanonical['tusclasesparticulares.cl:2465382'], true);
});

test('16. Protección de alcance: no permite fallback a GmailApp si se ejecuta en Apps Script sin servicio avanzado', () => {
  // Simulamos el entorno real de Google Apps Script donde Session existe y está activo
  const sandbox = vm.createContext({
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => k === 'SHEET_ID' ? STAGING : ''
      })
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => ({ getLastRow: () => 0 })
      })
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
    },
    // GmailApp existe en Apps Script, pero el servicio avanzado Gmail NO está habilitado
    GmailApp: {
      search: () => { throw new Error('GmailApp.search no debería invocarse con gmail.readonly'); }
    },
    console: console
  });

  vm.runInContext(orqSrc, sandbox);

  // orqSearchGmail_ debe rechazar categóricamente el fallback a GmailApp
  assert.throws(() => {
    sandbox.orqSearchGmail_('subject:test', 10);
  }, /Servicio Avanzado Gmail \(Gmail API v1\) no habilitado en el proyecto Apps Script/);

  // orqSyncContactReceipts debe abortar de forma segura (fail-closed)
  const syncRes = sandbox.orqSyncContactReceipts(10, false);
  assert.equal(syncRes.ok, false);
  assert.match(syncRes.error, /Prohibido fallback a GmailApp bajo alcance gmail\.readonly/);
});

test('17. Paginación y nextPageToken: orqSearchGmail_ recorre páginas y declara búsqueda incompleta si hay más resultados', () => {
  const env = createMockEnv();

  const mockThreadResource = (id) => ({
    id: id,
    messages: [{
      id: 'msg-' + id,
      threadId: id,
      internalDate: '1730476800000',
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'Subject', value: 'Mensaje desde tusclases.co: ' + id },
          { name: 'From', value: 'no-reply@tusclases.co' }
        ],
        body: {
          data: Buffer.from('Tu mensaje al anunciante de: Álgebra se ha enviado correctamente. https://www.tusclases.co/solicitud-' + id + '.aspx', 'utf8').toString('base64url')
        }
      }
    }]
  });

  const allThreads = {
    '101': mockThreadResource('101'),
    '102': mockThreadResource('102'),
    '103': mockThreadResource('103'),
    '104': mockThreadResource('104')
  };

  const pageCalls = [];
  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: (userId, params) => {
          pageCalls.push(params);
          if (params.q && params.q.indexOf('newer_than:30d') >= 0) {
            // Llamada desde orqSyncContactReceipts: simulamos lote completo de 50 hilos con más páginas
            const items = [];
            for (let i = 1; i <= 50; i++) {
              items.push({ id: String(2400000 + i) });
            }
            return {
              threads: items,
              nextPageToken: 'token_mas_comprobantes',
              resultSizeEstimate: 100
            };
          }
          if (!params.pageToken) {
            // Página 1: entrega 2 hilos y un token para página 2
            return {
              threads: [{ id: '101' }, { id: '102' }],
              nextPageToken: 'token_pag_2',
              resultSizeEstimate: 4
            };
          } else if (params.pageToken === 'token_pag_2') {
            // Página 2: entrega 2 hilos y un token para página 3
            return {
              threads: [{ id: '103' }, { id: '104' }],
              nextPageToken: 'token_pag_3',
              resultSizeEstimate: 4
            };
          }
          return { threads: [], resultSizeEstimate: 0 };
        },
        get: (userId, id) => allThreads[id] || mockThreadResource(id)
      }
    }
  };

  // Caso A: Búsqueda con límite de 3 hilos -> debe pedir pág 1 y pág 2, detenerse en 3 y marcar incompleto: true
  const resultsPartial = env.ctx.orqSearchGmail_('subject:Mensaje', 3);
  assert.equal(resultsPartial.length, 3, 'Debe haber recuperado exactamente 3 hilos');
  assert.equal(resultsPartial.incompleto, true, 'Debe declarar que la búsqueda quedó incompleta');
  assert.equal(resultsPartial.nextPageToken, 'token_pag_3');
  assert.equal(pageCalls.length, 2, 'Debe haber llamado a 2 páginas');

  // Caso B: Sincronización en orqSyncContactReceipts detecta y propaga la búsqueda incompleta
  pageCalls.length = 0;
  const syncRes = env.ctx.orqSyncContactReceipts(30, false);
  assert.equal(syncRes.ok, true);
  assert.equal(syncRes.busquedaIncompleta, true, 'Debe alertar que existen más comprobantes pendientes en Gmail');
  assert.equal(syncRes.nextPageToken, 'token_mas_comprobantes');
  assert.equal(syncRes.nuevosContactosIncorporados, 50);
});

test('18. Diagnóstico de contactos: orqEjecutarDiagnosticoContactos imprime informe agregado sin escribir en sheets', () => {
  const env = createMockEnv();

  // Mock de 2 comprobantes en Gmail para 2 anuncios distintos
  const mockReceipt = (id, adId) => ({
    id: 'th-' + id,
    messages: [{
      id: 'msg-' + id,
      threadId: 'th-' + id,
      internalDate: '1730476800000',
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'Subject', value: 'Mensaje desde tusclases.co: Consulta' },
          { name: 'From', value: 'no-reply@tusclases.co' }
        ],
        body: {
          data: Buffer.from('Tu mensaje al anunciante de: Química se ha enviado correctamente. https://www.tusclases.co/solicitud-' + adId + '.aspx', 'utf8').toString('base64url')
        }
      }
    }]
  });

  const threads = {
    'th-1': mockReceipt('1', '2466833'),
    'th-2': mockReceipt('2', '2466834')
  };

  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: () => ({
          threads: [{ id: 'th-1' }, { id: 'th-2' }],
          resultSizeEstimate: 2
        }),
        get: (userId, id) => threads[id] || null
      }
    }
  };

  // Interceptar console.log para verificar que se imprime el JSON
  const logged = [];
  const originalLog = env.ctx.console.log;
  env.ctx.console.log = (...args) => {
    logged.push(args.join(' '));
    originalLog.apply(env.ctx.console, args);
  };

  const initialRowCount = env.sheets.Contactados.rows.length;
  const diag = env.ctx.orqEjecutarDiagnosticoContactos();

  // 1. Modo estricto SOLO_LECTURA y no escribe en hojas
  assert.equal(diag.modo, 'SOLO_LECTURA');
  assert.equal(env.sheets.Contactados.rows.length, initialRowCount, 'No debe escribir filas en Contactados');

  // 2. Comprobación de campos requeridos
  assert.equal(typeof diag.confirmacionesGmail, 'number', 'Debe informar cantidad de comprobantes');
  assert.equal(diag.confirmacionesGmail, 2);
  assert.equal(typeof diag.anunciosUnicosConfirmaciones, 'number', 'Debe informar anuncios únicos');
  assert.equal(diag.anunciosUnicosConfirmaciones, 2);
  assert.equal(typeof diag.anunciosConfirmadosNoRegistradosEnCRM, 'number', 'Debe informar comprobantes faltantes en CRM');
  assert.equal(diag.anunciosConfirmadosNoRegistradosEnCRM, 2);
  assert.ok(diag.fuentesConsultadas, 'Debe informar fuentes consultadas');
  assert.equal(diag.fuentesConsultadas.contactados, true);
  assert.equal(diag.fuentesConsultadas.gmailRecibidos, true);
  assert.equal(typeof diag.revisionIncompleta, 'boolean', 'Debe informar si la revisión quedó incompleta');
  assert.equal(diag.revisionIncompleta, false);

  // 3. Verificación de log por consola
  assert.ok(logged.some(msg => msg.includes('[DIAGNOSTICO CONTACTOS (SOLO LECTURA)]')));
  assert.ok(logged.some(msg => msg.includes('"confirmacionesGmail": 2')));

  env.ctx.console.log = originalLog;
});

test('19. orqSafeDecodeUriComponent_: decodifica enlaces con redirección sin fallar ante width="100%" ni % no escapados', () => {
  const env = createMockEnv();
  const safeDecode = env.ctx.orqSafeDecodeUriComponent_;

  // Caso 1: String HTML con width="100%" y style con %
  const html = '<table width="100%" style="font-size: 90%;"><tr><td>Hola</td></tr></table>';
  const out1 = safeDecode(html);
  assert.equal(out1, html, 'No debe alterar ni arrojar URIError en un string con % sin codificar');

  // Caso 2: URL percent-encoded con %3A%2F%2F
  const encUrl = 'https%3A%2F%2Fwww.tusclasesparticulares.cl%2Favisos%2F2466158.aspx';
  const out2 = safeDecode(encUrl);
  assert.equal(out2, 'https://www.tusclasesparticulares.cl/avisos/2466158.aspx');

  // Caso 3: HTML mixto que contiene width="100%" Y un enlace de tracking awstrack.me percent-encoded
  const mixedHtml = '<table width="100%"><tr><td><a href="https://awstrack.me/L0/https%3A%2F%2Fwww.tusclases.co%2Fsolicitud%2F2466833.aspx/1/xxx">Link</a></td></tr></table>';
  const outKeys = env.ctx.orqTusclasesAdKeys_(mixedHtml);
  assert.deepEqual(Array.from(outKeys), ['tusclases.co:2466833']);
});

test('20. Reproducción exacta de STAGING: 5 comprobantes reales del 01/11/2026 (HTML con 100% y tracking) producen 4 claves únicas y 0 sin identificador', () => {
  const env = createMockEnv();

  // Simular las 10 filas existentes en STAGING (todas de Argentina)
  for (let i = 1; i <= 10; i++) {
    env.sheets.Contactados.rows.push([
      'Alumno Argentina ' + i, 'Matemática',
      'https://www.tusclases.com.ar/alumnos/ar-' + (2400000 + i) + '.aspx',
      '2026-10-20', 'CRM previo'
    ]);
  }

  // Helper para construir el recurso de mensaje compatible con Gmail.Users.Threads.get(..., format: 'full')
  const makeFullMessageResource = (msgId, threadId, sub, plainText, htmlText) => {
    const plainB64 = Buffer.from(plainText, 'utf8').toString('base64url');
    const htmlB64 = Buffer.from(htmlText, 'utf8').toString('base64url');
    return {
      id: msgId,
      threadId: threadId,
      internalDate: '1730476800000',
      payload: {
        mimeType: 'multipart/alternative',
        headers: [
          { name: 'Subject', value: sub },
          { name: 'From', value: 'avisos@tusclases.com' }
        ],
        parts: [
          {
            mimeType: 'text/plain; charset=UTF-8',
            body: { data: plainB64 }
          },
          {
            mimeType: 'text/html; charset=UTF-8',
            body: { data: htmlB64 }
          }
        ]
      }
    };
  };

  // Los 5 correos recibidos el 01/11/2026 correspondientes a 4 anuncios
  const mockThreads = {
    // 1. Colombia 2466833 (primer comprobante)
    'th-col-2466833-a': {
      id: 'th-col-2466833-a',
      messages: [makeFullMessageResource(
        'm-col-a', 'th-col-2466833-a',
        'Mensaje desde tusclases.co: Consulta recibida de Química',
        'Tu mensaje al anunciante de: Química se ha enviado correctamente.',
        '<table width="100%"><tr><td>Tu mensaje al anunciante de: Química se ha enviado correctamente.</td>' +
        '<td><a href="https://r.email.tusclases.co/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fquimica%2Fsolicitud-2466833.aspx/1/hash/aaa">Ver</a></td></tr></table>'
      )]
    },
    // 2. Colombia 2466833 (segundo comprobante, duplicado)
    'th-col-2466833-b': {
      id: 'th-col-2466833-b',
      messages: [makeFullMessageResource(
        'm-col-b', 'th-col-2466833-b',
        'Mensaje desde tusclases.co: Confirmación de envío de Química',
        'Tu mensaje al anunciante de: Química se ha enviado correctamente.',
        '<div style="width: 100%;"><p>Tu mensaje se ha enviado correctamente.</p>' +
        '<a href="https://awstrack.me/L0/https%3A%2F%2Fwww.tusclases.co%2Festudiantes%2Fquimica%2Fsolicitud-2466833.aspx/2/hash/bbb">Ver</a></div>'
      )]
    },
    // 3. Chile 2466158 (asunto exacto Mensaje desde tusclasesparticulares:)
    'th-cl-2466158': {
      id: 'th-cl-2466158',
      messages: [makeFullMessageResource(
        'm-cl-1', 'th-cl-2466158',
        'Mensaje desde tusclasesparticulares: Consulta Álgebra',
        'Tu mensaje al anunciante de: Álgebra se ha enviado correctamente.',
        '<table width="100%"><tr><td>Tu mensaje al anunciante de: Álgebra se ha enviado correctamente.</td>' +
        '<td><a href="https://email.tusclasesparticulares.cl/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Favisos%2Falgebra-2466158.aspx/1/hash/ccc">Ver</a></td></tr></table>'
      )]
    },
    // 4. Chile 2466516 (asunto exacto Mensaje desde tusclasesparticulares:)
    'th-cl-2466516': {
      id: 'th-cl-2466516',
      messages: [makeFullMessageResource(
        'm-cl-2', 'th-cl-2466516',
        'Mensaje desde tusclasesparticulares: Consulta Cálculo',
        'Tu mensaje al anunciante de: Cálculo se ha enviado correctamente.',
        '<table width="100%"><tr><td>Tu mensaje al anunciante de: Cálculo se ha enviado correctamente.</td>' +
        '<td><a href="https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Fprofesores%2Fcalculo-2466516.aspx/1/hash/ddd">Ver</a></td></tr></table>'
      )]
    },
    // 5. Chile 2465382 (asunto exacto Mensaje desde tusclasesparticulares:)
    'th-cl-2465382': {
      id: 'th-cl-2465382',
      messages: [makeFullMessageResource(
        'm-cl-3', 'th-cl-2465382',
        'Mensaje desde tusclasesparticulares: Consulta Física',
        'Tu mensaje al anunciante de: Física se ha enviado correctamente.',
        '<table width="100%"><tr><td>Tu mensaje al anunciante de: Física se ha enviado correctamente.</td>' +
        '<td><a href="https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Falumnos%2Ffisica-2465382.aspx/1/hash/eee">Ver</a></td></tr></table>'
      )]
    }
  };

  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: (userId, params) => ({
          threads: Object.keys(mockThreads).map(id => ({ id: id })),
          resultSizeEstimate: 5
        }),
        get: (userId, id) => mockThreads[id] || null
      }
    }
  };

  const report = env.ctx.orqEjecutarDiagnosticoContactos();

  // Verificaciones exactas
  assert.equal(report.modo, 'SOLO_LECTURA');
  assert.equal(report.contactosCRM, 10, 'Conserva los 10 contactos CRM previos');
  assert.equal(report.confirmacionesGmail, 5, 'Debe reconocer los 5 comprobantes de Gmail recibidos');
  assert.equal(report.anunciosUnicosConfirmaciones, 4, 'Debe mapear a exactamente 4 anuncios únicos');
  assert.equal(report.confirmacionesSinIdentificador, 0, 'No debe quedar ningún comprobante sin identificador extraído');
  assert.equal(report.anunciosConfirmadosNoRegistradosEnCRM, 4, 'Los 4 anuncios confirmados de 01/11 aún no están en CRM');
  assert.equal(report.revisionIncompleta, false, 'La revisión no debe quedar incompleta');
  assert.equal(report.fuentesConsultadas.contactados, true);
  assert.equal(report.fuentesConsultadas.gmailRecibidos, true);

  // Verificación de clasificación para cada uno de los 4 anuncios
  const hist = env.ctx.orqContactHistory_(env.ss);
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclases.co/solicitud/2466833.aspx' }, hist), 'CONTACTADO_CONFIRMADO');
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclasesparticulares.cl/avisos/2466158.aspx' }, hist), 'CONTACTADO_CONFIRMADO');
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclasesparticulares.cl/profesores/2466516.aspx' }, hist), 'CONTACTADO_CONFIRMADO');
  assert.equal(env.ctx.orqContactDecision_({ url: 'https://www.tusclasesparticulares.cl/alumnos/2465382.aspx' }, hist), 'CONTACTADO_CONFIRMADO');
});

test('21. Diagnóstico escalonado (etapas): detalla búsqueda, lectura, decodificación y extracción de forma agregada sin datos privados', () => {
  const env = createMockEnv();

  const makeFullMessage = (id, sub, htmlBody) => ({
    id: 'msg-' + id,
    threadId: 'th-' + id,
    internalDate: '1730476800000',
    payload: {
      mimeType: 'text/html',
      headers: [
        { name: 'Subject', value: sub },
        { name: 'From', value: 'notificaciones@tusclases.com' }
      ],
      body: {
        data: Buffer.from(htmlBody, 'utf8').toString('base64url')
      }
    }
  });

  const threads = {
    'th-1': {
      id: 'th-1',
      messages: [makeFullMessage('1', 'Mensaje desde tusclasesparticulares: Física', '<table width="100%"><tr><td>Tu mensaje se ha enviado correctamente.</td><td><a href="https://awstrack.me/L0/https%3A%2F%2Fwww.tusclasesparticulares.cl%2Favisos%2F2466158.aspx/1">Ver</a></td></tr></table>')]
    },
    'th-2': {
      id: 'th-2',
      messages: [makeFullMessage('2', 'Mensaje desde tusclases.co: Química', '<table width="100%"><tr><td>Tu mensaje se ha enviado correctamente.</td><td><a href="https://r.email.tusclases.co/L0/https%3A%2F%2Fwww.tusclases.co%2Fsolicitud%2F2466833.aspx/1">Ver</a></td></tr></table>')]
    }
  };

  env.ctx.Gmail = {
    Users: {
      Threads: {
        list: () => ({ threads: [{ id: 'th-1' }, { id: 'th-2' }], resultSizeEstimate: 2 }),
        get: (userId, id) => threads[id] || null
      }
    }
  };

  const report = env.ctx.orqEjecutarDiagnosticoContactos();
  assert.ok(report.etapas, 'El informe debe incluir la clave etapas');
  assert.equal(report.etapas.busqueda.hilosRecuperados, 2);
  assert.equal(report.etapas.busqueda.busquedaIncompleta, false);
  assert.equal(report.etapas.lectura.mensajesTotal, 2);
  assert.equal(report.etapas.lectura.mensajesAsuntoCoincidente, 2);
  assert.equal(report.etapas.lectura.mensajesConfirmacionTexto, 2);
  assert.equal(report.etapas.decodificacion.conHtml, 2);
  assert.equal(report.etapas.extraccion.conEnlacesTracking, 2);
  assert.equal(report.etapas.extraccion.conClavesExtraidas, 2);
  assert.equal(report.etapas.extraccion.anunciosUnicos, 2);
  assert.equal(report.etapas.extraccion.mensajesSinIdentificador, 0);
  assert.equal(report.etapas.extraccion.anunciosPorPais.CL, 1);
  assert.equal(report.etapas.extraccion.anunciosPorPais.CO, 1);

  // Privacidad estricta: asegurar que no se fugan emails ni URLs ni IDs de estudiantes en el objeto
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /2466158|2466833|notificaciones@|@tusclases/i);
});
