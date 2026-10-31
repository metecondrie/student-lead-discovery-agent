const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../gas/Orquestador.js'),'utf8');
const ytSrc=fs.readFileSync(path.join(__dirname,'../gas/YouTubeCanales.js'),'utf8');
const catSrc=fs.readFileSync(path.join(__dirname,'../gas/Catalogo.js'),'utf8');
const STAGING='1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';

function environment(options={}) {
 const props={
  SHEET_ID:options.wrongSheet?'wrong':STAGING,
  YOUTUBE_API_KEY:options.noYT?'':'yt-secret',
  GEMINI_API_KEY:options.noGem?'':'gem-secret'
 };
 const triggers=[],sheets={},requests=[],stats={yt:0,gem:0};
 function sheet(name,rows){
  rows=rows||[]; const o={name,rows,getLastRow:()=>rows.length,getLastColumn:()=>Math.max(2,...rows.map(r=>r.length)),
   setFrozenRows:()=>{},getDataRange:()=>({getValues:()=>rows}),
   getRange(row,col,height,width){return {getValues:()=>rows.slice(row-1,row-1+height).map(r=>r.slice(col-1,col-1+width)),
    setValues:vals=>{vals.forEach((r,i)=>{rows[row-1+i]=r.slice();});}};}};
  sheets[name]=o;return o;
 }
 sheet('Config',[['Clave','Valor'],
  ['SISTEMA_ACTIVO',options.active?'TRUE':'FALSE'],
  ['GEMINI_MODEL','gemini-3.5-flash-lite'],
  ['GEMINI_MAX_DAILY_CALLS',options.quota||20],
  ['YOUTUBE_MAX_DAILY_QUOTA',100]]);

 const act = options.allInactive ? 'FALSE' : 'TRUE';
 sheet('Fuentes',[['ID Fuente','Plataforma','Canal','Tema','Nivel','URL','ID Recurso','Activo'],
  ['id-a','YouTube','Filadd UBA','Matemática','Universitario','https://www.youtube.com/channel/UC6PoYEu79xbbUGSM0s38Esg','Z5DyEohToDs',act],
  ['id-b','YouTube','Quimiayudas','Química','Universitario','https://www.youtube.com/channel/UC295-Kn_54h_7vX_4M6pWtw','4FdLXk1Jv3E',act],
  ['id-fb','Facebook','Grupo','Matemática','Universitario','https://facebook.com/groups/cbc','','FALSE']]);

 let uid=1;
 const ctx={
  PropertiesService:{getScriptProperties:()=>({
    getProperty:k=>props[k]||'',setProperty:(k,v)=>{props[k]=String(v);},
    deleteProperty:k=>{delete props[k];}
  })},
  SpreadsheetApp:{openById:()=>({getSheetByName:k=>sheets[k]||null,insertSheet:k=>sheet(k),
     getUrl:()=> 'https://docs.google.com/spreadsheets/d/'+STAGING+'/edit'})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  ScriptApp:{getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>{
    const i=triggers.indexOf(t);if(i>=0)triggers.splice(i,1);
   },newTrigger:name=>({timeBased:()=>({after:()=>({create:()=>{
    const t={getHandlerFunction:()=>name};triggers.push(t);return t;
   }})})})},
  Utilities:{formatDate:()=> '20261030-213000',getUuid:()=>String(uid++)},
  UrlFetchApp:{fetch(url,opts){
    requests.push({url,opts});
    if(url.includes('youtube/v3/videos?') || url.includes('youtube/v3/channels?')){
      const isB = url.includes('4FdLXk1Jv3E') || url.includes('Quimiayudas') || url.includes('UC295-Kn_54h_7vX_4M6pWtw');
      const cid = isB ? 'UC295-Kn_54h_7vX_4M6pWtw' : 'UC6PoYEu79xbbUGSM0s38Esg';
      return {
        getResponseCode:()=>200,
        getContentText:()=>JSON.stringify({items:[{id:cid,snippet:{channelId:cid}}]})
      };
    }
    if(url.includes('youtube/v3/commentThreads')){
      if(options.failYT && url.includes('UC6PoYEu79xbbUGSM0s38Esg')){
        return {getResponseCode:()=>403,getContentText:()=>JSON.stringify({error:{message:'Not allowed'}})};
      }
      const isB = url.includes('UC295-Kn_54h_7vX_4M6pWtw');
      const id = isB ? 'c2' : 'c1';
      const comment = isB ? 'Busco profesor de química online' : 'Busco profesor de matemática para CBC online';
      return {
        getResponseCode:()=>200,
        getContentText:()=>JSON.stringify({
          items:[{
            snippet:{
              videoId:'mDrLSOpo9ZA',
              topLevelComment:{id,snippet:{textOriginal:comment,publishedAt:'2026-10-30T20:00:00Z'}}
            }
          }]
        })
      };
    }
    if(url.includes('generateContent')){
      const p=JSON.parse(opts.payload);const batch=JSON.parse(p.contents[0].parts[0].text);
      const result=batch.map(i=>({
        id:i.id,
        es_solicitud_clases:true,
        destinatario:'pedido_abierto',
        contactabilidad:'canal_publico_permitido',
        oportunidad_comercial_alejo:true,
        confianza:0.95,
        materia:'Matemática',
        nivel:'CBC',
        resumen:'Sin observaciones'
      }));
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]})};
    }
    throw Error('unexpected URL: ' + url);
  }},
  HtmlService:{createHtmlOutputFromFile:()=>({setTitle:()=>true})},
  Logger:{log:()=>{}},
  buildGeminiPrompt:items=>JSON.stringify(items),
  parseGeminiResponse:raw=>JSON.parse(raw),
  sanitizeForSheets:x=>typeof x==='string'&&/^[=+-@]/.test(x)?"'"+x:x,
  checkYouTubeQuota_:()=>({allowed:stats.yt<100,max:100,used:stats.yt}),
  recordYouTubeQuota_:()=>{stats.yt++;},
  checkGeminiQuota_:(_,cfg)=>({allowed:stats.gem<(cfg.GEMINI_MAX_DAILY_CALLS||20),max:cfg.GEMINI_MAX_DAILY_CALLS||20,count:stats.gem}),
  recordGeminiCall_:()=>{stats.gem++;},
  Date,Math,String,Number,Array,JSON,Object,Error,RegExp,encodeURIComponent,isFinite
 };
 vm.runInNewContext(catSrc,ctx);
 vm.runInNewContext(ytSrc,ctx);
 vm.runInNewContext(src,ctx);
 return {ctx,props,triggers,sheets,requests,stats};
}

test('sin fuentes seleccionadas no sale a buscar ni instala triggers',()=>{
 const e=environment();assert.throws(()=>e.ctx.orqStart([],5),/Seleccioná/);
 assert.equal(e.requests.length,0);assert.equal(e.triggers.length,0);
});

test('no usa fallback: Fuentes FALSE no se consultan si no se eligen explicitamente',()=>{
 const e=environment({allInactive:true});
 assert.ok(e.ctx.orqStatus().fuentes.length >= 2);
 assert.deepEqual(Array.from(e.ctx.orqStatus().seleccion),[]);
 assert.equal(e.requests.length,0);
});

test('impide proyecto incorrecto, modo activo, y fuentes no autorizadas',()=>{
 for(const config of [{wrongSheet:true},{active:true},{noYT:true},{noGem:true}]) {
   const e=environment(config);
   assert.throws(()=>e.ctx.orqStart(['id-a'],5));
   assert.equal(e.requests.length,0);
 }
 const e=environment();assert.throws(()=>e.ctx.orqStart(['id-fb'],5),/sin video|conector/);
 assert.equal(e.requests.length,0);
});

test('un clic inicia, procesa primera fuente, continua otra via trigger y finaliza',()=>{
 const e=environment();
 let result=e.ctx.orqStart(['id-a','id-b'],5);
 assert.equal(result.estado,'EJECUTANDO');assert.equal(result.cursor,1);
 assert.equal(e.triggers.length,1);
 assert.equal(result.metricas.leidos,1);
 assert.equal(result.metricas.candidatos,1);
 assert.equal(result.candidatos.length,1);
 e.ctx.orqTick();
 result=e.ctx.orqStatus();
 assert.equal(result.estado,'FINALIZADO');assert.equal(result.cursor,2);
 assert.equal(result.metricas.leidos,2);assert.equal(result.metricas.clasificados,2);
 assert.equal(result.metricas.candidatos,2);
 assert.equal(result.historial[0].corridas,1);
 assert.equal(e.sheets.OrqCorridas.rows.length,2);
 assert.equal(e.sheets.OrqFuentes.rows.length,3);
 assert.equal(e.sheets.OrqHallazgos.rows.length,3);
 assert.equal(e.triggers.length,0);
 assert.ok(e.requests.length >= 3);
 assert.ok(!e.sheets.Oportunidades);
});

test('detener entre fuentes evita nuevas llamadas',()=>{
 const e=environment();e.ctx.orqStart(['id-a','id-b'],5);
 const before=e.requests.length;
 assert.equal(e.ctx.orqStop().estado,'DETENCION_SOLICITADA');
 e.ctx.orqTick();
 assert.equal(e.ctx.orqStatus().estado,'DETENIDO');
 assert.equal(e.requests.length,before);
});

test('error de una fuente queda visible pero no bloquea fuentes posteriores',()=>{
 const e=environment({failYT:true});e.ctx.orqStart(['id-a','id-b'],5);
 assert.equal(e.ctx.orqStatus().metricas.errores,1);
 e.ctx.orqTick();
 const last=e.ctx.orqStatus();
 assert.equal(last.estado,'FINALIZADO');
 assert.equal(last.metricas.clasificados,1);
 assert.equal(last.metricas.errores,1);
});

test('previene corrida que excede cuota local de Gemini antes de llamadas',()=>{
 const e=environment({quota:2});
 assert.throws(()=>e.ctx.orqStart(['id-a','id-b'],20),/requiere hasta/);
 assert.equal(e.requests.length,0);
});

test('no duplica candidatos ya vistos al repetir una busqueda',()=>{
 const e=environment();
 e.ctx.orqStart(['id-a'],5);const first=e.ctx.orqStatus();
 assert.equal(first.metricas.candidatos,1);
 e.ctx.orqStart(['id-a'],5);
 const next=e.ctx.orqStatus();
 assert.equal(next.metricas.leidos,1);
 assert.equal(next.metricas.repetidos,1);
 assert.equal(next.metricas.clasificados,0);
});
