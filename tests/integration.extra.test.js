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
