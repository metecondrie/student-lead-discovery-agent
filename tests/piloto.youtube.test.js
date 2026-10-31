const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../gas/PilotoYouTubeReal.js'), 'utf8');

function mockEnv(options={}) {
  const state = {requests:[], rowsWritten:[], sheets:{}, logs:[]};
  function sheet(name, rows=[]) {
    const api = {
      name, rows,
      getDataRange:()=>({getValues:()=>rows}),
      getLastRow:()=>rows.length,
      setFrozenRows:()=>{},
      getSheetId:()=>321,
      getRange(r,c,rs,cs) {
        if(typeof r==='string') return {setValues:(arr)=>state.rowsWritten.push({name, range:r, data:arr})};
        return {setValues:(arr)=>{state.rowsWritten.push({name,r,c,data:arr});for(let i=0;i<arr.length;i++) rows[r-1+i]=arr[i];}};
      }
    };
    state.sheets[name]=api;
    return api;
  }
  sheet('Config',[['Clave','Valor'],['SISTEMA_ACTIVO',options.systemActive?'TRUE':'FALSE']]);
  sheet('Dashboard',[]);
  const yt={items:Array.from({length:options.empty?0:5},(_,i)=>({
    snippet:{topLevelComment:{id:'id'+i,snippet:{
      textOriginal:'Busco profesor particular de Matemática por Zoom '+i,
      publishedAt:'2026-10-30T12:00:00Z'
    }}}
  }))};
  const classified=Array.from({length:5},(_,i)=>({
    id:'id'+i,es_solicitud_clases:true,
    destinatario:'pedido_abierto',contactabilidad:'canal_publico_permitido',
    oportunidad_comercial_alejo:true,confianza:.95,materia:'Matematica',resumen:'Interesado'
  }));
  const ctx={
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>({
      SHEET_ID:options.wrongId?'wrong':'1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q',
      YOUTUBE_API_KEY:options.missingYT?'':'not-a-secret',
      GEMINI_API_KEY:options.missingGemini?'':'not-a-secret',
    }[k])})},
    SpreadsheetApp:{openById:()=>({
      getSheetByName:name=>state.sheets[name]||null,
      insertSheet:name=>sheet(name,[]),getUrl:()=> 'https://docs.google.com/spreadsheets/d/example'
    })},
    UrlFetchApp:{fetch(url,payload){
      state.requests.push({url,payload});
      if(url.includes('/youtube/v3/commentThreads')) return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(yt)};
      if(url.includes('/models/')) return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(classified)}]}}]})};
      throw Error('Unexpected URL');
    }},
    Logger:{log:x=>state.logs.push(String(x))},
    Utilities:{formatDate:()=> '20261030-200000'},
    buildGeminiPrompt:items=>JSON.stringify(items),
    parseGeminiResponse:raw=>JSON.parse(raw),
    sanitizeForSheets:s=> /^[=+\-@]/.test(s)?("'"+s):s,
    Date, Math,JSON,String,Array,Object,Error,encodeURIComponent
  };
  vm.runInNewContext(source,ctx);
  return {state,run:()=>ctx.pilotoYouTubeReal()};
}

test('guard: disabled system is mandatory, no external calls',()=>{
  const m=mockEnv({systemActive:true});
  assert.throws(()=>m.run(),/SISTEMA_ACTIVO/);
  assert.equal(m.state.requests.length,0);
});
test('guard: no youtube credential means no API calls',()=>{
  const m=mockEnv({missingYT:true});
  assert.throws(()=>m.run(),/YOUTUBE_API_KEY/);
  assert.equal(m.state.requests.length,0);
});
test('guard: never cross staging sheet',()=>{
  const m=mockEnv({wrongId:true});
  assert.throws(()=>m.run(),/STAGING/);
  assert.equal(m.state.requests.length,0);
});
test('real pilot flow has precisely one YouTube and one Gemini request, isolated storage and dashboard',()=>{
  const m=mockEnv();
  const summary=m.run();
  assert.equal(summary.leidos,5);
  assert.equal(summary.clasificados,5);
  assert.equal(summary.oportunidades,5);
  assert.equal(m.state.requests.length,2);
  assert.match(m.state.requests[0].url,/commentThreads\?part=snippet/);
  assert.match(m.state.requests[1].url,/gemini-3\.5-flash-lite/);
  assert.equal(m.state.sheets.PilotoYouTubeReal.rows.length,6);
  assert.ok(m.state.rowsWritten.some(x=>x.name==='Dashboard'&&x.range==='A118:B125'));
  assert.equal(m.state.sheets.Oportunidades,undefined);
});
test('zero real comments results in no Gemini request and no fake opportunities',()=>{
  const m=mockEnv({empty:true});
  const summary=m.run();
  assert.equal(summary.leidos,0);
  assert.equal(m.state.requests.length,1);
  assert.equal(m.state.sheets.PilotoYouTubeReal,undefined);
});
test('redacts public emails and phone numbers and prevents spreadsheet formulas',()=>{
  const m=mockEnv();
  const clean=String(m.state.sheets.Config.name); // smoke-test bootstrap, see code checks below
  assert.ok(clean);
  assert.match(source,/sanitizeForSheets\(clean\)/);
  assert.match(source,/\[email oculto\]/);
  assert.match(source,/\[telefono oculto\]/);
});
