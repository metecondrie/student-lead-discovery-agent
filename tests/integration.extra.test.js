const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../gas/Core.js');
const {makeEnv,ctxRef}=require('./gas-mock.js');
const now = new Date('2026-10-30T15:00:00Z');

function item(text, source='youtube', id='Q') {
 return {source,sourceKey:source,sourceLabel:'YouTube',kind:'tutoring',title:'Pedido abierto de Matemática',text,studentName:'',url:'https://www.youtube.com/watch?v=ABC12345678&lc='+id,msgId:id,publishedAt:now};
}
function makeGeminiEnv(reply, key='R1') {
 const feeds={generateContent:{candidates:[{content:{parts:[{text:JSON.stringify([{
   id:key,es_solicitud_clases:reply,materia:'Matemática',nivel:'CBC',urgencia:'alta',confianza:.96,resumen:reply?'Busca profesor':'Duda gratis'}])}]}}]}};
 const env=makeEnv({feeds,me:'demo@example.test',now}); ctxRef.env=env; env.setup(); env.setConfig_('SISTEMA_ACTIVO',true); env.setConfig_('GEMINI_ACTIVO',true); env.setGeminiApiKey('dummy-test-key');
 return env;
}

test('Seguro por defecto: el motor no corre hasta activación explícita',()=>{
 assert.equal(core.DEFAULT_CONFIG.SISTEMA_ACTIVO,false);
 const e=makeEnv({me:'demo@example.test'});ctxRef.env=e;e.setup();
 assert.equal(e.runCycle(),'inactivo');
 assert.equal(e.sent.length,0);
});
test('Gemini registra una solicitud aprobada de cola y conserva contactabilidad',()=>{
 const candidate=item('Busco un profesor de Matemática para preparar el CBC online','youtube','R1');
 const e=makeGeminiEnv(true,core.makeId(candidate));
 e.append_('_cola_ia',[[core.makeId(candidate),'YouTube','Pedido',JSON.stringify(candidate),new Date(),'Pendiente']]);
 const r=e.runCycle({noNotify:true});
 assert.equal(r.err.length,0);
 const ops=e.sheets.Oportunidades.data.slice(1);
 assert.equal(ops.length,1);
 assert.equal(ops[0][23],'Respuesta pública posible');
 assert.equal(ops[0][15],'Pendiente de aprobación');
 assert.match(e.sheets._cola_ia.data[1][5],/^Aprobado/);
 assert.equal(e.sent.length,0);
});
test('Gemini rechaza y no genera oportunidad ni notificación',()=>{
 const candidate=item('Busco un profesor de Matemática para preparar el CBC online','youtube','R1');
 const e=makeGeminiEnv(false,core.makeId(candidate));
 e.append_('_cola_ia',[[core.makeId(candidate),'YouTube','Pedido',JSON.stringify(candidate),new Date(),'Pendiente']]);
 const r=e.runCycle({noNotify:true});assert.equal(r.err.length,0);
 assert.equal(e.sheets.Oportunidades.data.length,1);
 assert.match(e.sheets._cola_ia.data[1][5],/^Rechazado/);
});
test('El comentario dirigido al creador no recibe propuesta comercial',()=>{
 const rec=core.evaluate(item('Hola profe, ¿vos das clases particulares de Matemática?', 'youtube','DIRECT'),core.DEFAULT_CONFIG,now,{},{});
 assert.equal(rec.contactability,'Dirigido al creador');
 assert.equal(rec.message,'');
 assert.notEqual(rec.status,'Pendiente de aprobación');
});
test('TikTok e Instagram exigen revisar permisos, sin DM automático',()=>{
 for(const p of ['instagram','tiktok']){
  const r=core.evaluate(item('Busco un profesor de Química particular online',p,p),core.DEFAULT_CONFIG,now,{},{});
  assert.equal(r.contactability,'Revisar canal y permisos');
  assert.equal(r.message,'');
 }
});
test('Equivalencia en USD solo con tipo de cambio vigente',()=>{
 const c={...core.DEFAULT_CONFIG,TARIFA:12000,USD_ARS_VENTA:1500,USD_FECHA_COTIZACION:'2026-10-30T12:00:00Z'};
 assert.match(core.usdReference(c,now),/USD 8,00/);
 assert.equal(core.usdReference({...c,USD_FECHA_COTIZACION:'2026-01-01T00:00:00Z'},now),'');
});
test('Perfiles docentes HTTPS válidos se incluyen; dominios impostores se rechazan',()=>{
 const c={...core.DEFAULT_CONFIG,PERFIL_TUSCLASES_URL:'https://www.tusclases.com.ar/profesores/alejo-ejemplo.htm',PERFIL_SUPERPROF_URL:'https://superprof.com.ar.evil.example/alejo'};
 const r=core.teachingProfileReferences(c);
 assert.match(r,/tusclases\.com\.ar/);
 assert.doesNotMatch(r,/evil\.example/);
});
test('No exporta claves ni enlaces de API en config por defecto',()=>{
 assert.equal(core.DEFAULT_CONFIG.GEMINI_MODEL,'gemini-3.5-flash-lite');
 assert.equal('GEMINI_API_KEY' in core.DEFAULT_CONFIG,false);
 assert.equal('YOUTUBE_API_KEY' in core.DEFAULT_CONFIG,false);
});

test('El rastreador de YouTube alimenta Gemini antes de dar de alta una oportunidad',()=>{
 const yt={items:[{id:'comment-A',snippet:{topLevelComment:{id:'comment-A',snippet:{videoId:'_6uyQISZvBc',authorDisplayName:'Alumno ficticio',textDisplay:'Busco un profesor de Álgebra online para preparar el final en la facultad.',publishedAt:'2026-10-29T14:00:00Z'}}}}]};
 const env=makeEnv({me:'demo@example.test',now,feeds:{
  commentThreads:yt,
  generateContent:(url,opts)=>{
   const prompt=JSON.parse(opts.payload).contents[0].parts[0].text;
   const id=prompt.match(/ID: ([^\n]+)/)?.[1];
   return {candidates:[{content:{parts:[{text:JSON.stringify([{id,es_solicitud_clases:true,materia:'Álgebra',nivel:'Universitario',urgencia:'media',confianza:0.95,resumen:'Solicitud abierta'}])}]}}]};
  }
 }});
 ctxRef.env=env;env.setup();env.setConfig_('SISTEMA_ACTIVO',true);env.setConfig_('GEMINI_ACTIVO',true);env.setConfig_('YOUTUBE_ACTIVO',true);
 env.setYouTubeApiKey('unit-test-key');env.setGeminiApiKey('unit-test-key');
 const res=env.runCycle({noNotify:true});
 assert.equal(res.err.length,0,res.err.join('; '));
 assert.equal(env.sheets._cola_ia.data.length,2);
 assert.match(env.sheets._cola_ia.data[1][5],/^Aprobado/);
 assert.equal(env.sheets.Oportunidades.data.length,2);
 assert.equal(env.sheets.Oportunidades.data[1][23],'Respuesta pública posible');
 assert.equal(env.sent.length,0);
});
test('Runtime impide autoenvío aunque la planilla lo active',()=>{
 const e=makeEnv({me:'demo@example.test',now});ctxRef.env=e;e.setup();
 e.setConfig_('SISTEMA_ACTIVO',true);e.setConfig_('MODO_B_ACTIVO',true);e.setConfig_('MODO_B_AUTOENVIO',true);
 assert.equal(e.loadConfig_().MODO_B_AUTOENVIO,false);
 assert.equal(e.sent.length,0);
});


// GitHub Issue #2: Clasificador de cuatro dimensiones para redes sociales (TikTok, Instagram, YouTube)
test('Issue #2: parseGeminiResponse valida las 4 dimensiones y fuerza oportunidad_comercial_alejo=false si es dirigido al creador', () => {
 const raw = JSON.stringify([
  {
   id: 'T5',
   es_solicitud_clases: true,
   destinatario: 'dirigido_al_creador',
   contactabilidad: 'canal_publico_permitido',
   oportunidad_comercial_alejo: true, // Modelo desobediente que marcó true a pesar de ser para el creador
   confianza: 0.97,
   materia: 'General',
   resumen: 'Consulta directa al autor del video'
  },
  {
   id: 'T6_ambiguo',
   es_solicitud_clases: true,
   destinatario: 'ambiguo',
   contactabilidad: 'no_verificada',
   oportunidad_comercial_alejo: true,
   confianza: 0.85,
   materia: 'Química',
   resumen: 'No se sabe si busca cualquier docente o le habla al autor'
  },
  {
   id: 'T7_abierto',
   es_solicitud_clases: true,
   destinatario: 'pedido_abierto',
   contactabilidad: 'canal_publico_permitido',
   oportunidad_comercial_alejo: true,
   confianza: 0.95,
   materia: 'Biofísica',
   resumen: 'Pedido abierto en comentarios'
  }
 ]);

 const parsed = core.parseGeminiResponse(raw);
 assert.equal(parsed.length, 3);

 // T5: Guardián de seguridad invalida la oportunidad comercial porque el destinatario es el creador
 assert.equal(parsed[0].id, 'T5');
 assert.equal(parsed[0].es_solicitud_clases, true);
 assert.equal(parsed[0].destinatario, 'dirigido_al_creador');
 assert.equal(parsed[0].oportunidad_comercial_alejo, false, 'Debe forzar false para dirigido al creador');

 // T6: Destinatario ambiguo invalida la oportunidad comercial directa
 assert.equal(parsed[1].id, 'T6_ambiguo');
 assert.equal(parsed[1].destinatario, 'ambiguo');
 assert.equal(parsed[1].oportunidad_comercial_alejo, false, 'Debe forzar false si es ambiguo');

 // T7: Pedido abierto legítimo
 assert.equal(parsed[2].id, 'T7_abierto');
 assert.equal(parsed[2].destinatario, 'pedido_abierto');
 assert.equal(parsed[2].oportunidad_comercial_alejo, true);
});

test('Issue #2: T5 TikTok («Profe, ¿vos das clases particulares? Me gustaría estudiar con vos») se rechaza y no ingresa a Oportunidades ni genera alertas', () => {
 const t5Candidate = {
  id: 'tiktok_t5',
  source: 'tiktok',
  sourceKey: 'tiktok',
  sourceLabel: 'TikTok',
  platform: 'TikTok',
  kind: 'tutoring',
  title: 'Comentario en video de TikTok',
  text: 'Profe, ¿vos das clases particulares? Me gustaría estudiar con vos',
  studentName: '@usuario_estudiante',
  url: 'https://www.tiktok.com/@profe_quimica/video/123456789',
  publishedAt: now
 };

 const feeds = {
  generateContent: {
   candidates: [{
    content: {
     parts: [{
      text: JSON.stringify([{
       id: 'tiktok_t5',
       es_solicitud_clases: true,
       destinatario: 'dirigido_al_creador',
       contactabilidad: 'no_verificada',
       oportunidad_comercial_alejo: false,
       confianza: 0.97,
       materia: 'Química',
       resumen: 'Consulta directa al autor del video de TikTok'
      }])
     }]
    }
   }]
  }
 };

 const env = makeEnv({ feeds, me: 'demo@example.test', now });
 ctxRef.env = env;
 env.setup();
 env.setConfig_('SISTEMA_ACTIVO', true);
 env.setConfig_('GEMINI_ACTIVO', true);
 env.setGeminiApiKey('dummy-test-key');

 // Encolar el comentario T5 en _cola_ia
 env.append_('_cola_ia', [
  ['tiktok_t5', 'TikTok', t5Candidate.title, JSON.stringify(t5Candidate), new Date(), 'Pendiente']
 ]);

 const res = env.runCycle({ noNotify: true });
 assert.equal(res.err.length, 0);

 // 1. La fila en _cola_ia debe registrarse como RECHAZADO por estar dirigido al creador
 const qaRows = env.sheets._cola_ia.data.slice(1);
 assert.equal(qaRows.length, 1);
 assert.match(qaRows[0][5], /^Rechazado: dirigido al creador/);

 // 2. Oportunidades NO debe contener esta fila (solo la cabecera)
 assert.equal(env.sheets.Oportunidades.data.length, 1, 'No debe insertarse en Oportunidades');

 // 3. No debe haberse emitido ningún correo ni notificación comercial
 assert.equal(env.sent.length, 0);
});

test('Issue #2: Solicitud con destinatario ambiguo queda en revisión manual en _cola_ia y no ingresa como oportunidad comercial', () => {
 const itemAmbiguo = {
  id: 'yt_ambiguo_1',
  source: 'youtube',
  sourceKey: 'youtube',
  sourceLabel: 'YouTube',
  platform: 'YouTube',
  kind: 'tutoring',
  title: 'Comentario en YouTube',
  text: '¿Alguien sabe si acá dan clases particulares para preparar el final?',
  url: 'https://youtube.com/watch?v=ABC&lc=c1',
  publishedAt: now
 };

 const feeds = {
  generateContent: {
   candidates: [{
    content: {
     parts: [{
      text: JSON.stringify([{
       id: 'yt_ambiguo_1',
       es_solicitud_clases: true,
       destinatario: 'ambiguo',
       contactabilidad: 'canal_publico_permitido',
       oportunidad_comercial_alejo: false,
       confianza: 0.88,
       materia: 'Álgebra',
       resumen: 'Destinatario no claro'
      }])
     }]
    }
   }]
  }
 };

 const env = makeEnv({ feeds, me: 'demo@example.test', now });
 ctxRef.env = env;
 env.setup();
 env.setConfig_('SISTEMA_ACTIVO', true);
 env.setConfig_('GEMINI_ACTIVO', true);
 env.setGeminiApiKey('dummy-test-key');

 env.append_('_cola_ia', [
  ['yt_ambiguo_1', 'YouTube', itemAmbiguo.title, JSON.stringify(itemAmbiguo), new Date(), 'Pendiente']
 ]);

 const res = env.runCycle({ noNotify: true });
 assert.equal(res.err.length, 0);

 const qaRows = env.sheets._cola_ia.data.slice(1);
 assert.equal(qaRows.length, 1);
 assert.match(qaRows[0][5], /^Revisión manual: destinatario ambiguo/);

 // No se da de alta en Oportunidades
 assert.equal(env.sheets.Oportunidades.data.length, 1);
});

test('Issue #2: Solicitud abierta con contacto voluntario en Instagram/TikTok se aprueba como oportunidad comercial para Alejo', () => {
 const itemContacto = {
  id: 'ig_solicitud_1',
  source: 'instagram',
  sourceKey: 'instagram',
  sourceLabel: 'Instagram',
  platform: 'Instagram',
  kind: 'tutoring',
  title: 'Comentario en Instagram',
  text: 'Busco profe particular de Química online urgente para la facu, dejenme mensaje a mi wsp 1155667788',
  url: 'https://instagram.com/p/123',
  publishedAt: now
 };

 const feeds = {
  generateContent: {
   candidates: [{
    content: {
     parts: [{
      text: JSON.stringify([{
       id: 'ig_solicitud_1',
       es_solicitud_clases: true,
       destinatario: 'pedido_abierto',
       contactabilidad: 'contacto_ofrecido_voluntariamente',
       oportunidad_comercial_alejo: true,
       confianza: 0.96,
       materia: 'Química',
       resumen: 'Búsqueda abierta con whatsapp voluntario'
      }])
     }]
    }
   }]
  }
 };

 const env = makeEnv({ feeds, me: 'demo@example.test', now });
 ctxRef.env = env;
 env.setup();
 env.setConfig_('SISTEMA_ACTIVO', true);
 env.setConfig_('GEMINI_ACTIVO', true);
 env.setGeminiApiKey('dummy-test-key');

 env.append_('_cola_ia', [
  ['ig_solicitud_1', 'Instagram', itemContacto.title, JSON.stringify(itemContacto), new Date(), 'Pendiente']
 ]);

 const res = env.runCycle({ noNotify: true });
 assert.equal(res.err.length, 0);

 const qaRows = env.sheets._cola_ia.data.slice(1);
 assert.equal(qaRows.length, 1);
 assert.match(qaRows[0][5], /^Aprobado: Química/);

 // Sí se da de alta en Oportunidades
 assert.equal(env.sheets.Oportunidades.data.length, 2);
 assert.equal(env.sheets.Oportunidades.data[1][6], 'Química');
});
