/**
 * ORQUESTADOR v1 (Apps Script STAGING)
 * UI HTML web app: doGet() + google.script.run.
 * Cada clic lanza UNA corrida; hasta 10 videos de YouTube seleccionados en Fuentes.
 * Cada video se procesa en una invocacion y se continua con triggers temporales.
 * Sin correos, mensajes a terceros, ni modificaciones de Oportunidades/Config/Fuentes.
 * No usa fallback EDUCATIONAL_SOURCES ni activa runCycle().
 */
var ORQ_STAGING_ID='1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';
var ORQ_HEADERS={
  'OrqCorridas':['Run ID','Inicio','Fin','Estado','Fuentes totales','Fuentes completas','Comentarios leidos','Repetidos','Clasificados','Solicitudes','Candidatos','Errores','Llamadas YouTube','Llamadas Gemini','Duración segundos'],
  'OrqFuentes':['Run ID','Fecha','Fuente ID','Nombre','Video ID','Estado','Leidos','Repetidos','Clasificados','Solicitudes','Candidatos','Errores','YouTube API','Gemini API','Duracion s','Mensaje'],
  'OrqHallazgos':['Run ID','Detectado','Fuente','Video ID','Comentario ID','URL','Publicado','Texto público protegido','Busca clases','Destinatario','Contactabilidad','Candidato para revision','Materia','Nivel','Confianza','Resumen']
};
function doGet(){
  return HtmlService.createHtmlOutputFromFile('PanelOrquestador')
    .setTitle('Captación de alumnos | Centro de control');
}
function orqDb_(){
  if(PropertiesService.getScriptProperties().getProperty('SHEET_ID')!==ORQ_STAGING_ID)
    throw new Error('Seguridad: este panel solo puede operar en STAGING.');
  return SpreadsheetApp.openById(ORQ_STAGING_ID);
}
function orqRows_(sh){
  return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
}
function orqSheet_(ss,name){
  var sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.getRange(1,1,1,ORQ_HEADERS[name].length).setValues([ORQ_HEADERS[name]]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function orqSources_(ss){
  var sh=ss.getSheetByName('Fuentes');
  if(!sh)throw new Error('La hoja Fuentes no existe.');
  return orqRows_(sh).filter(function(r){
    return String(r[1]||'').toLowerCase().trim()==='youtube'&&/^[\w-]{11}$/.test(String(r[6]||'').trim());
  }).map(function(r){return {
    id:String(r[0]),name:String(r[2]||r[0]),subject:String(r[3]||''),
    videoId:String(r[6]).trim(),enabled:String(r[7]).toUpperCase()==='TRUE'||r[7]===true
  };});
}
function orqGetState_(){
  var raw=PropertiesService.getScriptProperties().getProperty('ORQ_ESTADO');
  if(!raw)return {estado:'SIN_CORRIDAS',id:'',cursor:0,queue:[],inicio:'',mensaje:'Todavia no se lanzaron busquedas desde este panel.'};
  try{return JSON.parse(raw);}catch(e){throw new Error('Estado corrupto: no ejecutar hasta reparar.');}
}
function orqSaveState_(s){
  PropertiesService.getScriptProperties().setProperty('ORQ_ESTADO',JSON.stringify(s));
}
function orqLoadConfig_(){
  var r=orqRows_(orqDb_().getSheetByName('Config')),cfg={};
  r.forEach(function(row){cfg[String(row[0])]=row[1];});
  if(String(cfg.SISTEMA_ACTIVO).toUpperCase()!=='FALSE')
    throw new Error('SISTEMA_ACTIVO debe ser FALSE en el entorno de pruebas.');
  return cfg;
}
function orqApiKey_(key){
  var value=String(PropertiesService.getScriptProperties().getProperty(key)||'').trim();
  if(!value)throw new Error('Falta la Script Property '+key+'.');
  return value;
}
function orqTotals_(ss,id){
  var result={fuentes:0,leidos:0,repetidos:0,clasificados:0,solicitudes:0,candidatos:0,errores:0,youtube:0,gemini:0,detalles:[]};
  orqRows_(orqSheet_(ss,'OrqFuentes')).forEach(function(r){
    if(String(r[0])!==id)return;
    result.fuentes++;
    result.leidos+=Number(r[6])||0;
    result.repetidos+=Number(r[7])||0;
    result.clasificados+=Number(r[8])||0;
    result.solicitudes+=Number(r[9])||0;
    result.candidatos+=Number(r[10])||0;
    result.errores+=Number(r[11])||0;
    result.youtube+=Number(r[12])||0;
    result.gemini+=Number(r[13])||0;
    result.detalles.push({fuente:String(r[3]),estado:String(r[5]),leidos:Number(r[6])||0,
      clasificados:Number(r[8])||0,candidatos:Number(r[10])||0,errores:Number(r[11])||0});
  });
  return result;
}
function orqUpdateRun_(ss,s){
  var sh=orqSheet_(ss,'OrqCorridas'),r=orqRows_(sh),idx=-1;
  for(var i=r.length-1;i>=0;i--)if(String(r[i][0])===s.id){idx=i+2;break;}
  if(idx<0)throw new Error('No se encontró la corrida actual.');
  var t=orqTotals_(ss,s.id),finished=['FINALIZADO','DETENIDO','ERROR'].indexOf(s.estado)>=0;
  var now=new Date(),secs=Math.round((now.getTime()-new Date(s.inicio).getTime())/100)/10;
  sh.getRange(idx,1,1,15).setValues([[
    s.id,new Date(s.inicio),finished?now:'',s.estado,s.queue.length,t.fuentes,
    t.leidos,t.repetidos,t.clasificados,t.solicitudes,t.candidatos,t.errores,
    t.youtube,t.gemini,secs
  ]]);
}
function orqRemoveTriggers_(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='orqTick')ScriptApp.deleteTrigger(t);
  });
}
function orqSchedule_(){
  orqRemoveTriggers_();
  ScriptApp.newTrigger('orqTick').timeBased().after(60000).create();
}
/** SOLO invocada por el boton del panel: no implica habilitar runCycle(). */
function orqStart(sourceIds,maxComments) {
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('Otra operación está en curso, intentá nuevamente.');
  try{
    var ss=orqDb_(),cfg=orqLoadConfig_(),current=orqGetState_();
    if(current.estado==='EJECUTANDO')throw new Error('Ya existe una búsqueda en marcha.');
    orqApiKey_('YOUTUBE_API_KEY');orqApiKey_('GEMINI_API_KEY');
    if(!Array.isArray(sourceIds))throw new Error('Seleccioná al menos una fuente.');
    var raw=sourceIds.filter(function(x){return typeof x==='string';});
    if(!raw.length||raw.length>10)throw new Error('Seleccioná entre 1 y 10 fuentes de YouTube.');
    var wanted={};raw.forEach(function(id){if(wanted[id])throw new Error('Fuente repetida.');wanted[id]=true;});
    var sources=orqSources_(ss),queue=sources.filter(function(x){return !!wanted[x.id];});
    if(queue.length!==raw.length)throw new Error('Hay fuentes seleccionadas sin video válido en Fuentes.');
    var count=Number(maxComments);
    if(!isFinite(count)||count<1||count>20||Math.floor(count)!==count)
      throw new Error('El máximo por video debe estar entre 1 y 20.');
    var id='ORQ-'+Utilities.formatDate(new Date(),'America/Argentina/Buenos_Aires','yyyyMMdd-HHmmss')+
      '-'+Utilities.getUuid().slice(0,6);
    var state={id:id,estado:'EJECUTANDO',inicio:new Date().toISOString(),cursor:0,
      queue:queue,maxComments:count,mensaje:'Inicio de la busqueda',errores:0};
    orqRemoveTriggers_();
    var corridas=orqSheet_(ss,'OrqCorridas');
    orqSheet_(ss,'OrqFuentes');orqSheet_(ss,'OrqHallazgos');
    corridas.getRange(corridas.getLastRow()+1,1,1,15).setValues([[
      id,new Date(state.inicio),'','EJECUTANDO',queue.length,0,0,0,0,0,0,0,0,0,0
    ]]);
    PropertiesService.getScriptProperties().setProperty('ORQ_SELECCION',JSON.stringify(raw));
    orqSaveState_(state);
  } finally{lock.releaseLock();}
  // Procesa el primer video ya mismo; los restantes se continuan sin intervención.
  orqTick();
  return orqStatus();
}
function orqStop(){
  orqDb_();
  var s=orqGetState_();
  if(s.estado==='EJECUTANDO'){
    PropertiesService.getScriptProperties().setProperty('ORQ_DETENER_ID',s.id);
    return {estado:'DETENCION_SOLICITADA',mensaje:'Se detendra al finalizar el paso actual.'};
  }
  return {estado:s.estado,mensaje:'No hay una corrida activa.'};
}
function orqReadApi_(url,options){
  var res=UrlFetchApp.fetch(url,options||{muteHttpExceptions:true});
  var body={};try{body=JSON.parse(res.getContentText());}catch(e){}
  var code=res.getResponseCode();
  if(code!==200)throw new Error('HTTP '+code+': '+String(body.error&&body.error.message||'Error externo').slice(0,150));
  return body;
}
function orqSafeText_(text){
  return sanitizeForSheets(String(text||'')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email oculto]')
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g,'[telefono oculto]').slice(0,580));
}
function orqSeen_(ss){
  var known={};
  orqRows_(orqSheet_(ss,'OrqHallazgos')).forEach(function(r){known[String(r[4])]=true;});
  return known;
}
function orqClassify_(batch,model,key){
  var url='https://generativelanguage.googleapis.com/v1beta/models/'+
    encodeURIComponent(model)+':generateContent';
  var json=orqReadApi_(url,{method:'post',contentType:'application/json',
    headers:{'x-goog-api-key':key},
    payload:JSON.stringify({contents:[{parts:[{text:buildGeminiPrompt(batch)}]}],
      generationConfig:{temperature:0.1,responseMimeType:'application/json',maxOutputTokens:8192}}),
    muteHttpExceptions:true});
  var parts=(((json.candidates||[])[0]||{}).content||{}).parts||[];
  var parsed=parseGeminiResponse(parts.map(function(p){return p.text||'';}).join(''));
  if(!Array.isArray(parsed))throw new Error('Gemini no devolvió una lista JSON valida.');
  var result={};parsed.forEach(function(x){result[x.id]=x;});return result;
}
function orqProcessVideo_(ss,s,source){
  var tick=Date.now(),cfg=orqLoadConfig_(),p=PropertiesService.getScriptProperties();
  var result={runId:s.id,sourceId:source.id,source:source.name,video:source.videoId,
    estado:'OK',leidos:0,repetidos:0,clasificados:0,solicitudes:0,candidatos:0,
    errores:0,youtube:0,gemini:0,mensaje:''};
  var details=[],key=orqApiKey_('YOUTUBE_API_KEY'),gkey=orqApiKey_('GEMINI_API_KEY');
  try{
    var yquota=checkYouTubeQuota_(p,{YOUTUBE_MAX_DAILY_QUOTA:Number(cfg.YOUTUBE_MAX_DAILY_QUOTA)||100});
    if(!yquota.allowed)throw new Error('Límite local de YouTube alcanzado');
    var url='https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId='+
      encodeURIComponent(source.videoId)+'&maxResults='+s.maxComments+
      '&order=time&textFormat=plainText&key='+encodeURIComponent(key);
    result.youtube++;
    // Cuenta incluso si la peticion falla para evitar agotar cuota por reintentos.
    recordYouTubeQuota_(p,1);
    var yt=orqReadApi_(url,{muteHttpExceptions:true});
    var comments=[],known=orqSeen_(ss);
    (yt.items||[]).forEach(function(thread){
      var c=thread.snippet&&thread.snippet.topLevelComment;
      var v=c&&c.snippet; if(!c||!v||!c.id)return;
      result.leidos++;
      if(known[c.id]){result.repetidos++;return;}
      comments.push({id:String(c.id),sourceLabel:'YouTube',title:'Comentario en '+source.name,
        text:String(v.textOriginal||v.textDisplay||'').slice(0,580),
        publishedAt:String(v.publishedAt||''),
        url:'https://www.youtube.com/watch?v='+source.videoId+'&lc='+encodeURIComponent(c.id)});
    });
    var model=String(cfg.GEMINI_MODEL||'gemini-3.5-flash-lite');
    for(var i=0;i<comments.length;i+=5){
      if(p.getProperty('ORQ_DETENER_ID')===s.id){result.estado='PARCIAL: detenido';break;}
      var gquota=checkGeminiQuota_(p,{GEMINI_MAX_DAILY_CALLS:Number(cfg.GEMINI_MAX_DAILY_CALLS)||20});
      if(!gquota.allowed){result.estado='PARCIAL: cuota Gemini';result.errores++;break;}
      var batch=comments.slice(i,i+5),byId={};
      result.gemini++;
      recordGeminiCall_(p);
      try{byId=orqClassify_(batch,model,gkey);}
      catch(e){result.errores++;result.estado='PARCIAL: error Gemini';result.mensaje=String(e.message).slice(0,140);}
      batch.forEach(function(x){
        var r=byId[x.id],intention=!!(r&&r.es_solicitud_clases===true);
        var candidate=!!(r&&intention&&r.destinatario==='pedido_abierto'&&
          r.oportunidad_comercial_alejo===true&&Number(r.confianza)>=.7&&
          ['canal_publico_permitido','contacto_ofrecido_voluntariamente'].indexOf(r.contactabilidad)>=0);
        if(r){result.clasificados++;if(intention)result.solicitudes++;if(candidate)result.candidatos++;}
        else result.errores++;
        details.push([s.id,new Date(),source.name,source.videoId,x.id,x.url,
          x.publishedAt,orqSafeText_(x.text),r?String(intention):'SIN_CLASIFICAR',
          r?r.destinatario:'',r?r.contactabilidad:'',candidate?'REVISAR':'NO',
          r?orqSafeText_(r.materia):'',r?orqSafeText_(r.nivel):'',
          r?r.confianza:'',r?orqSafeText_(r.resumen):'']);
      });
    }
  }catch(e){result.errores++;result.estado='ERROR';result.mensaje=String(e.message||e).slice(0,160);}
  // Incluso ante error externo, guardamos metricas de la fuente para diagnostico.
  var hallazgos=orqSheet_(ss,'OrqHallazgos');
  if(details.length)hallazgos.getRange(hallazgos.getLastRow()+1,1,details.length,16).setValues(details);
  var sh=orqSheet_(ss,'OrqFuentes');
  sh.getRange(sh.getLastRow()+1,1,1,16).setValues([[
    s.id,new Date(),source.id,source.name,source.videoId,result.estado,result.leidos,
    result.repetidos,result.clasificados,result.solicitudes,result.candidatos,
    result.errores,result.youtube,result.gemini,Math.round((Date.now()-tick)/100)/10,
    orqSafeText_(result.mensaje)]]);
  return result;
}
function orqTick(){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return;
  try{
    var ss=orqDb_(),p=PropertiesService.getScriptProperties(),s=orqGetState_();
    if(s.estado!=='EJECUTANDO'){orqRemoveTriggers_();return;}
    if(p.getProperty('ORQ_DETENER_ID')===s.id){
      s.estado='DETENIDO';s.mensaje='Detenido por el usuario.';orqSaveState_(s);
      orqUpdateRun_(ss,s);orqRemoveTriggers_();p.deleteProperty('ORQ_DETENER_ID');return;
    }
    if(s.cursor>=s.queue.length){
      s.estado='FINALIZADO';s.mensaje='Busqueda completada';orqSaveState_(s);
      orqUpdateRun_(ss,s);orqRemoveTriggers_();return;
    }
    var source=s.queue[s.cursor],rows=orqRows_(orqSheet_(ss,'OrqFuentes'));
    var already=rows.some(function(r){return String(r[0])===s.id&&String(r[2])===source.id;});
    var result;
    if(!already)result=orqProcessVideo_(ss,s,source);
    // El cursor se mueve DESPUES de persistir el resultado por fuente.
    s.cursor++;
    s.mensaje=result?'Última fuente: '+source.name+' — '+result.estado:'Fuente recuperada: '+source.name;
    if(s.cursor>=s.queue.length)s.estado='FINALIZADO';
    if(p.getProperty('ORQ_DETENER_ID')===s.id)s.estado='DETENIDO';
    orqSaveState_(s);
    orqUpdateRun_(ss,s);
    if(s.estado==='EJECUTANDO')orqSchedule_();else{
      orqRemoveTriggers_();p.deleteProperty('ORQ_DETENER_ID');
    }
  }catch(e){
    // No dejamos corridas congeladas silenciosamente ni creamos triggers infinitos.
    try{
      var x=orqGetState_();if(x.estado==='EJECUTANDO'){
        x.estado='ERROR';x.mensaje=String(e.message||e).slice(0,170);orqSaveState_(x);
        orqUpdateRun_(orqDb_(),x);
      }
    }catch(ignore){}
    orqRemoveTriggers_();Logger.log('orqTick: '+String(e.message||e));
    throw e;
  }finally{lock.releaseLock();}
}
function orqStatus(){
  var ss=orqDb_(),s=orqGetState_(),all=orqSources_(ss);
  var pref=[];try{pref=JSON.parse(PropertiesService.getScriptProperties().getProperty('ORQ_SELECCION')||'[]');}catch(e){}
  var selected=pref.length?pref:all.filter(function(x){return x.enabled;}).map(function(x){return x.id;});
  var totals=s.id?orqTotals_(ss,s.id):null;
  var daily={};
  if(ss.getSheetByName('OrqCorridas')){
    orqRows_(ss.getSheetByName('OrqCorridas')).forEach(function(r){
      var date=r[1] instanceof Date?r[1]:new Date(r[1]);
      if(isNaN(date.getTime()))return;
      var k=Utilities.formatDate(date,'America/Argentina/Buenos_Aires','yyyy-MM-dd');
      if(!daily[k])daily[k]={fecha:k,corridas:0,leidos:0,clasificados:0,candidatos:0,errores:0};
      daily[k].corridas++;daily[k].leidos+=Number(r[6])||0;
      daily[k].clasificados+=Number(r[8])||0;
      daily[k].candidatos+=Number(r[10])||0;
      daily[k].errores+=Number(r[11])||0;
    });
  }
  return {estado:s.estado,id:s.id||'',inicio:s.inicio||'',cursor:s.cursor||0,
    total:s.queue?s.queue.length:0,mensaje:s.mensaje||'',maxComments:s.maxComments||20,
    fuentes:all,seleccion:selected,metricas:totals,
    historial:Object.keys(daily).sort().reverse().slice(0,30).map(function(k){return daily[k];}),
    link:ss.getUrl(),version:'orquestador-v1'};
}
