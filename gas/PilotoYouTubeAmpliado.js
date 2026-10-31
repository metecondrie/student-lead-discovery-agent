/**
 * PILOTO 2 — Tres videos REALES de YouTube, 20 comentarios max. por video.
 * Ejecutar manualmente SOLO en STAGING. No instala triggers, no contacta personas,
 * no escribe Oportunidades, Config, Fuentes, _cola_ia ni _vistos.
 * Una llamada YouTube por video; una llamada Gemini por lote de hasta 10 comentarios.
 * Los videos están en el catálogo pero se indican explícitamente aquí: esta prueba
 * NO usa ni activa el fallback inseguro de ingestYouTubeComments_().
 */
function pilotoYouTubeAmpliado() {
  var begun=new Date(),started=Date.now();
  var STAGING='1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';
  var videos=[
    {id:'Z5DyEohToDs',fuente:'Filadd UBA',tema:'CBC / UBA XXI: Matemática, Física, Química'},
    {id:'t4kBBDBOj6s',fuente:'Academia Filadd',tema:'Ingreso universitario: Matemática'},
    {id:'4FdLXk1Jv3E',fuente:'Quimiayudas',tema:'Química General y exámenes'}
  ];
  var MAX=20,BATCH=10,MAX_MS=210000,MODEL='gemini-3.5-flash-lite';
  var p=PropertiesService.getScriptProperties();
  if(p.getProperty('SHEET_ID')!==STAGING) throw new Error('STAGING incorrecto; cancelado');
  var ss=SpreadsheetApp.openById(STAGING);
  var config=ss.getSheetByName('Config');
  if(!config) throw new Error('Falta Config; cancelado');
  var vals=config.getDataRange().getValues(),active=null;
  for(var z=1;z<vals.length;z++) if(String(vals[z][0])==='SISTEMA_ACTIVO') active=String(vals[z][1]).trim().toUpperCase();
  if(active!=='FALSE') throw new Error('SISTEMA_ACTIVO debe estar FALSE; cancelado');
  var ytKey=String(p.getProperty('YOUTUBE_API_KEY')||'').trim();
  var gemKey=String(p.getProperty('GEMINI_API_KEY')||'').trim();
  if(!ytKey||!gemKey) throw new Error('Falta YOUTUBE_API_KEY o GEMINI_API_KEY; ninguna llamada realizada');
  var runId='PILOTO2-'+Utilities.formatDate(begun,'America/Argentina/Buenos_Aires','yyyyMMdd-HHmmss');
  var sums=[],details=[],seen={},apiYT=0,apiGem=0;
  function sanitize(v) {
    var s=String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email oculto]')
      .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g,'[telefono oculto]').slice(0,600);
    return sanitizeForSheets(s);
  }
  function fetchJSON(url,options) {
    var response=UrlFetchApp.fetch(url,options||{muteHttpExceptions:true});
    var status=response.getResponseCode();
    var body={};
    try {body=JSON.parse(response.getContentText());}catch(e){body={};}
    if(status!==200) return {ok:false,status:status,error:String(body.error&&body.error.message||'HTTP '+status).slice(0,180)};
    return {ok:true,status:status,body:body};
  }
  videos.forEach(function(v) {
    var sr={video:v.id,fuente:v.fuente,leidos:0,clasificados:0,solicitudes:0,candidatos:0,errores:0,estado:'',duracion:0};
    var tick=Date.now(),url='https://www.youtube.com/watch?v='+v.id,comments=[];
    if(Date.now()-started>MAX_MS) {sr.estado='OMITIDO: límite de tiempo';sr.errores++;sums.push(sr);return;}
    var ytUrl='https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId='+
      encodeURIComponent(v.id)+'&maxResults='+MAX+'&order=time&textFormat=plainText&key='+encodeURIComponent(ytKey);
    apiYT++;
    var y;
    try {y=fetchJSON(ytUrl,{muteHttpExceptions:true});}catch(e){y={ok:false,error:'Error de conexión',status:0};}
    if(!y.ok) {
      sr.estado='ERROR_YOUTUBE '+y.status+': '+y.error;sr.errores++;sr.duracion=(Date.now()-tick)/1000;
      sums.push(sr);Logger.log(v.fuente+' | '+sr.estado);return;
    }
    (y.body.items||[]).forEach(function(thread) {
      var c=thread.snippet&&thread.snippet.topLevelComment, s=c&&c.snippet;
      if(!c||!s||!c.id||seen[c.id])return;
      seen[c.id]=true;
      comments.push({id:String(c.id),sourceLabel:'YouTube',
        title:'Comentario en '+v.fuente+' | '+v.tema,
        text:String(s.textOriginal||s.textDisplay||'').slice(0,600),
        publishedAt:String(s.publishedAt||''),
        url:url+'&lc='+encodeURIComponent(c.id)});
    });
    sr.leidos=comments.length;
    if(!comments.length) {sr.estado='SIN_COMENTARIOS';sr.duracion=(Date.now()-tick)/1000;sums.push(sr);return;}
    for(var off=0;off<comments.length;off+=BATCH) {
      if(Date.now()-started>MAX_MS){sr.estado='PARCIAL: límite de tiempo';sr.errores++;break;}
      var batch=comments.slice(off,off+BATCH),genUrl='https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent';
      var opts={method:'post',contentType:'application/json',headers:{'x-goog-api-key':gemKey},
        payload:JSON.stringify({contents:[{parts:[{text:buildGeminiPrompt(batch)}]}],
          generationConfig:{temperature:0.1,responseMimeType:'application/json',maxOutputTokens:8192}}),
        muteHttpExceptions:true};
      apiGem++;
      var g;
      try {g=fetchJSON(genUrl,opts);}catch(e){g={ok:false,error:'Error de conexión',status:0};}
      var parsed=[];
      if(g.ok) {
        try {var parts=(((g.body.candidates||[])[0]||{}).content||{}).parts||[];
          parsed=parseGeminiResponse(parts.map(function(x){return x.text||'';}).join(''))||[];
        }catch(e){parsed=[];}
      }
      var byId={};parsed.forEach(function(r){byId[r.id]=r;});
      batch.forEach(function(it) {
        var r=byId[it.id]||null;
        if(r)sr.clasificados++;
        if(r&&r.es_solicitud_clases===true)sr.solicitudes++;
        var ok=!!(r&&r.es_solicitud_clases===true&&r.oportunidad_comercial_alejo===true&&
          r.destinatario==='pedido_abierto'&&r.confianza>=.7&&
          (r.contactabilidad==='canal_publico_permitido'||r.contactabilidad==='contacto_ofrecido_voluntariamente'));
        if(ok)sr.candidatos++;
        var estado=!g.ok?'ERROR_GEMINI '+g.status:(r?'CLASIFICADO':'SIN_CLASIFICACION');
        if(estado!=='CLASIFICADO')sr.errores++;
        details.push([begun,runId,v.fuente,v.id,it.id,it.url,it.publishedAt,sanitize(it.text),
          r?String(r.es_solicitud_clases):'',r?r.destinatario:'',r?r.contactabilidad:'',
          ok?'CANDIDATO_PARA_REVISION':'NO',r?sanitize(r.materia):'',r?sanitize(r.nivel):'',
          r?r.confianza:'',estado,r?sanitize(r.resumen):'']);
      });
      if(!g.ok&&g.status===429){sr.estado='PARCIAL: cuota Gemini';break;}
    }
    if(!sr.estado)sr.estado=sr.errores?'PARCIAL: clasificación':'OK';
    sr.duracion=Math.round((Date.now()-tick)/100)/10;
    sums.push(sr);
    Logger.log(v.fuente+' | leídos='+sr.leidos+' clasificados='+sr.clasificados+
      ' solicitudes='+sr.solicitudes+' candidatos='+sr.candidatos+' estado='+sr.estado);
  });
  // Persistencia solo en tablas de PILOTO, nunca en tablas del sistema operativo.
  var sh=ss.getSheetByName('PilotoYouTubeAmpliado')||ss.insertSheet('PilotoYouTubeAmpliado');
  if(sh.getLastRow()===0){sh.getRange(1,1,1,17).setValues([[
    'Fecha corrida','Run ID','Fuente','Video ID','Comentario ID','URL comentario','Publicado',
    'Texto público anonimizado','Solicita clases','Destinatario','Contactabilidad',
    'Candidato para revisión','Materia','Nivel','Confianza','Estado','Resumen']]);sh.setFrozenRows(1);}
  if(details.length)sh.getRange(sh.getLastRow()+1,1,details.length,17).setValues(details);
  var sumSheet=ss.getSheetByName('PilotoResumenVideos')||ss.insertSheet('PilotoResumenVideos');
  if(sumSheet.getLastRow()===0){sumSheet.getRange(1,1,1,11).setValues([[
    'Run ID','Fecha','Fuente','Video ID','Comentarios leídos','Clasificados Gemini',
    'Intención de clases','Candidatos para revisión','Errores','Estado','Duración segundos']]);sumSheet.setFrozenRows(1);}
  sumSheet.getRange(sumSheet.getLastRow()+1,1,sums.length,11).setValues(sums.map(function(s){return [
    runId,begun,s.fuente,s.video,s.leidos,s.clasificados,s.solicitudes,
    s.candidatos,s.errores,s.estado,s.duracion];}));
  var total=sums.reduce(function(t,s){t.leidos+=s.leidos;t.clasificados+=s.clasificados;
    t.solicitudes+=s.solicitudes;t.candidatos+=s.candidatos;t.errores+=s.errores;return t;},
    {leidos:0,clasificados:0,solicitudes:0,candidatos:0,errores:0});
  var dashboard=ss.getSheetByName('Dashboard');
  if(dashboard)dashboard.getRange('A127:B138').setValues([
    ['PILOTO 2 — YOUTUBE REAL (3 VIDEOS)',runId],
    ['Videos intentados',videos.length],['Comentarios leídos',total.leidos],
    ['Clasificados por Gemini',total.clasificados],['Con intención de clases',total.solicitudes],
    ['Candidatos para revisión humana',total.candidatos],
    ['Errores',total.errores],['Llamadas YouTube',apiYT],['Llamadas Gemini',apiGem],
    ['Duración total (segundos)',Math.round((Date.now()-started)/100)/10],
    ['Detalle de videos','Ver pestaña PilotoResumenVideos'],
    ['Nota','No se enviaron mensajes ni se crearon oportunidades comerciales']
  ]);
  Logger.log(JSON.stringify({runId:runId,videos:sums,total:total,llamadasYouTube:apiYT,
    llamadasGemini:apiGem,duracionSegundos:Math.round((Date.now()-started)/100)/10,
    detalle:ss.getUrl()+'#gid='+sh.getSheetId()}));
  return {runId:runId,videos:sums,total:total};
}
