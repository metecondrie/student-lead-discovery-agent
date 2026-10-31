const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../gas/PilotoYouTubeAmpliado.js'),'utf8');
const STAGING='1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';
function env(config={}) {
 const calls=[],sheets={},writes=[];
 function makeSheet(name,rows=[]) {
   const s={rows,name,getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows}),setFrozenRows:()=>{},
    getSheetId:()=>456,
    getRange(a,b,c,d){return {setValues(values){
      writes.push({sheet:name,range:typeof a==='string'?a:null,values});
      if(typeof a==='number')values.forEach((row,i)=>{rows[a+i-1]=row;});
    }};}};
   sheets[name]=s;return s;
 }
 makeSheet('Config',[['Clave','Valor'],['SISTEMA_ACTIVO',config.active?'TRUE':'FALSE']]);
 makeSheet('Dashboard',[]);
 const ytIDs=['Z5DyEohToDs','t4kBBDBOj6s','4FdLXk1Jv3E'];
 const yt = Object.fromEntries(ytIDs.map((id,i)=>[id,{items:[{snippet:{topLevelComment:{
   id:'comment'+i,snippet:{textOriginal:i===0?'Busco profesor online para preparar CBC':'Gracias por el video',
   publishedAt:'2026-10-29T12:00:00Z'}}}}]}]));
 const ctx={
   PropertiesService:{getScriptProperties:()=>({getProperty:name=>({
     SHEET_ID:config.badSheet?'other':STAGING,YOUTUBE_API_KEY:config.noYT?'':'key',GEMINI_API_KEY:config.noGem?'':'key'
   })[name]})},
   SpreadsheetApp:{openById:()=>({getSheetByName:name=>sheets[name]||null,insertSheet:name=>makeSheet(name),
    getUrl:()=> 'https://docs.google.com/spreadsheets/d/'+STAGING+'/edit'})},
   UrlFetchApp:{fetch(url,options){
     calls.push({url,options});
     if(url.includes('/youtube/v3/commentThreads')){
       const id=decodeURIComponent(new URL(url).searchParams.get('videoId'));
       if(config.failVideo===id) return {getResponseCode:()=>403,getContentText:()=>JSON.stringify({error:{message:'disabled'}})};
       return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(yt[id])};
     }
     if(url.includes('generateContent')){
       const payload=JSON.parse(options.payload);
       const items=JSON.parse(payload.contents[0].parts[0].text);
       const decisions=items.map(it=>({
         id:it.id,es_solicitud_clases:it.text.startsWith('Busco'),destinatario:it.text.startsWith('Busco')?'pedido_abierto':'dirigido_al_creador',
         contactabilidad:'canal_publico_permitido',oportunidad_comercial_alejo:it.text.startsWith('Busco'),
         confianza:.98,materia:'Matemática',nivel:'CBC',resumen:'Evaluación'
       }));
       return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(decisions)}]}}]})};
     }
     throw Error('Unexpected URL');
   }},
   Logger:{log:()=>{}},Utilities:{formatDate:()=> '20261030-200000'},
   sanitizeForSheets:v=>/^[=+\-@]/.test(v)?"'"+v:v,
   buildGeminiPrompt:items=>JSON.stringify(items),
   parseGeminiResponse:JSON.parse, Date,Math,JSON,String,Array,Object,Error,encodeURIComponent,isFinite
 };
 vm.runInNewContext(src,ctx);
 return {run:()=>ctx.pilotoYouTubeAmpliado(),sheets,calls,writes};
}
test('requiere STAGING y sistema desactivado antes de consultar APIs',()=>{
 for(const cfg of [{badSheet:true},{active:true},{noYT:true},{noGem:true}]) {
  const e=env(cfg);
  assert.throws(()=>e.run());
  assert.equal(e.calls.length,0);
 }
});
test('tres videos: solicitudes reales clasificadas, guardadas solo en piloto y dashboard',()=>{
 const e=env(),r=e.run();
 assert.equal(r.total.leidos,3);
 assert.equal(r.total.clasificados,3);
 assert.equal(r.total.solicitudes,1);
 assert.equal(r.total.candidatos,1);
 assert.equal(e.calls.filter(c=>c.url.includes('/youtube/v3/')).length,3);
 assert.equal(e.calls.filter(c=>c.url.includes('generateContent')).length,3);
 assert.equal(e.sheets.PilotoYouTubeAmpliado.rows.length,4);
 assert.equal(e.sheets.PilotoResumenVideos.rows.length,4);
 assert.ok(e.writes.some(w=>w.sheet==='Dashboard'&&w.range==='A127:B138'));
 assert.equal(e.sheets.Oportunidades,undefined);
});
test('video inaccesible queda registrado y no impide analizar otros',()=>{
 const e=env({failVideo:'t4kBBDBOj6s'}),r=e.run();
 assert.equal(r.total.leidos,2);
 assert.equal(r.total.errores,1);
 assert.equal(r.videos[1].estado.startsWith('ERROR_YOUTUBE'),true);
 assert.equal(r.total.clasificados,2);
});
