/**
 * Piloto aislado: 1 video REAL de YouTube -> 5 comentarios -> Gemini -> Sheets -> Dashboard.
 * Únicamente ejecución manual. No toca Oportunidades, Fuentes, Config, _cola_ia ni _vistos.
 * No instala disparadores, no envía correos, no contacta a terceros.
 *
 * Requiere ScriptProperties: SHEET_ID (STAGING), YOUTUBE_API_KEY, GEMINI_API_KEY.
 * YouTube Data API v3 habilitada en el proyecto de la clave de YouTube.
 */
function pilotoYouTubeReal() {
  var start = new Date();
  var props = PropertiesService.getScriptProperties();
  var STAGING_ID = '1lBngu6x9YLSkUO_vzFZ09_uarJcgFxoyfqZma9Tr4_Q';
  var VIDEO_ID = 'mDrLSOpo9ZA'; // Mathematics with Juan: video real publicado 2026.
  var VIDEO_URL = 'https://www.youtube.com/watch?v=' + VIDEO_ID;
  var MAX_COMENTARIOS = 5;
  var MODEL = 'gemini-3.5-flash-lite';
  var id = 'PILOTO-YT-' + Utilities.formatDate(start, 'America/Argentina/Buenos_Aires', 'yyyyMMdd-HHmmss');
  if (props.getProperty('SHEET_ID') !== STAGING_ID) {
    throw new Error('Prueba cancelada: SHEET_ID no apunta a STAGING.');
  }

  var ss = SpreadsheetApp.openById(STAGING_ID);
  var cf = ss.getSheetByName('Config');
  if (!cf) throw new Error('No se encontró Config. Prueba cancelada.');
  var cfgRows = cf.getDataRange().getValues();
  var flag = '';
  for (var x = 1; x < cfgRows.length; x++) {
    if (String(cfgRows[x][0]) === 'SISTEMA_ACTIVO') flag = String(cfgRows[x][1]).toUpperCase().trim();
  }
  if (flag !== 'FALSE') throw new Error('SISTEMA_ACTIVO debe estar FALSE. Prueba cancelada.');

  var youtubeKey = String(props.getProperty('YOUTUBE_API_KEY') || '').trim();
  var geminiKey = String(props.getProperty('GEMINI_API_KEY') || '').trim();
  if (!youtubeKey) throw new Error('Falta YOUTUBE_API_KEY en Script Properties. No se hizo ninguna llamada.');
  if (!geminiKey) throw new Error('Falta GEMINI_API_KEY en Script Properties. No se hizo ninguna llamada.');

  // Una sola consulta a YouTube Data API (1 unidad de cuota, sin paginación).
  var apiUrl = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' +
    encodeURIComponent(VIDEO_ID) + '&maxResults=' + MAX_COMENTARIOS +
    '&order=time&textFormat=plainText&key=' + encodeURIComponent(youtubeKey);
  var ytResponse = UrlFetchApp.fetch(apiUrl, {muteHttpExceptions:true});
  var ytStatus = ytResponse.getResponseCode();
  if (ytStatus !== 200) {
    var ytError = '';
    try { ytError = JSON.parse(ytResponse.getContentText()).error.message; } catch(e) {}
    Logger.log('YouTube HTTP ' + ytStatus + ' | ' + String(ytError).slice(0,250));
    throw new Error('YouTube HTTP ' + ytStatus + ': ' + String(ytError).slice(0,130));
  }
  var youtubeData = JSON.parse(ytResponse.getContentText());
  var items = (youtubeData.items || []).map(function(thread) {
    var comment = thread.snippet && thread.snippet.topLevelComment;
    var sn = comment && comment.snippet;
    if (!comment || !sn) return null;
    return {
      id:String(comment.id), sourceLabel:'YouTube', title:'Comentario real en video de Álgebra',
      text:String(sn.textOriginal || sn.textDisplay || '').slice(0,650),
      publishedAt:String(sn.publishedAt || ''),
      url:VIDEO_URL + '&lc=' + encodeURIComponent(comment.id)
    };
  }).filter(function(x){return !!x && !!x.text;}).slice(0,MAX_COMENTARIOS);

  if (!items.length) {
    Logger.log('YouTube respondió HTTP 200, pero no devolvió comentarios. Video: '+VIDEO_URL);
    Logger.log('0 comentarios; no se llamó a Gemini ni se modificó ninguna planilla.');
    return {video:VIDEO_URL,leidos:0,clasificados:0,solicitudes:0,oportunidades:0};
  }

  // Una sola llamada a Gemini: exactamente los comentarios reales recibidos.
  var prompt = buildGeminiPrompt(items);
  var genUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    MODEL + ':generateContent';
  var genResponse = UrlFetchApp.fetch(genUrl, {
    method:'post',contentType:'application/json',
    headers:{'x-goog-api-key':geminiKey},
    payload:JSON.stringify({
      contents:[{parts:[{text:prompt}]}],
      generationConfig:{temperature:0.1,responseMimeType:'application/json',maxOutputTokens:3000}
    }),
    muteHttpExceptions:true
  });
  var genStatus = genResponse.getResponseCode();
  if (genStatus !== 200) {
    var genError = '';
    try { genError = JSON.parse(genResponse.getContentText()).error.message; } catch(e) {}
    Logger.log('Gemini HTTP ' + genStatus + ' | ' + String(genError).slice(0,250));
    throw new Error('Gemini HTTP ' + genStatus + '. No se escribió nada en Sheets.');
  }
  var genData = JSON.parse(genResponse.getContentText());
  var candidates = (genData.candidates || []);
  var responseText = ((candidates[0] || {}).content || {}).parts || [];
  var parsed = parseGeminiResponse(responseText.map(function(p){return p.text || '';}).join(''));
  if (!parsed) throw new Error('Gemini no devolvió JSON válido para el parser. No se escribió nada en Sheets.');
  var resultMap = {};
  parsed.forEach(function(r) {resultMap[r.id]=r;});

  var classified=0,requests=0,accepted=0;
  var rows = items.map(function(it) {
    var r = resultMap[it.id] || null;
    if (r) classified++;
    if (r && r.es_solicitud_clases) requests++;
    var qualified = !!(r && r.es_solicitud_clases &&
      r.destinatario === 'pedido_abierto' &&
      (r.contactabilidad === 'canal_publico_permitido' ||
       r.contactabilidad === 'contacto_ofrecido_voluntariamente') &&
      r.oportunidad_comercial_alejo === true && r.confianza >= 0.7);
    if (qualified) accepted++;
    return [
      start,id,'YouTube',VIDEO_ID,it.id,it.url,it.publishedAt,
      sanitizarPilotoYT_(it.text),r?String(r.es_solicitud_clases):'Sin clasificar',
      r?r.destinatario:'',r?r.contactabilidad:'',qualified?'CANDIDATO - revisión humana':'NO',
      r?r.confianza:'',r?sanitizarPilotoYT_(r.materia):'',r?sanitizarPilotoYT_(r.resumen):'',
      r?'Clasificado':'Sin respuesta',Math.round((new Date()-start)/100)/10
    ];
  });

  // Solo aquí, con las dos APIs exitosas, crear un registro aislado.
  var sh=ss.getSheetByName('PilotoYouTubeReal') || ss.insertSheet('PilotoYouTubeReal');
  if (sh.getLastRow()===0) {
    sh.getRange(1,1,1,17).setValues([[
      'Ejecutado','Corrida','Plataforma','Video ID','Comentario ID','URL comentario',
      'Publicado','Texto público (contactos ocultos)','Solicita clases','Destinatario',
      'Contactabilidad','Candidato potencial (no contactado)','Confianza',
      'Materia','Resumen','Estado','Duración hasta fila (segundos)'
    ]]);
    sh.setFrozenRows(1);
  }
  sh.getRange(sh.getLastRow()+1,1,rows.length,17).setValues(rows);
  var dash=ss.getSheetByName('Dashboard');
  if (dash) {
    dash.getRange('A118:B125').setValues([
      ['PILOTO YOUTUBE — RESULTADOS REALES / NO SON CONTACTOS', ''],
      ['Última corrida manual',id],
      ['Video',VIDEO_URL],
      ['Comentarios públicos leídos',items.length],
      ['Clasificados por Gemini',classified],
      ['Mensajes con intención de clases',requests],
      ['Candidatos potenciales (requieren revisión humana)',accepted],
      ['Observación','Piloto aislado: NO se agregaron a Oportunidades ni se contactó a nadie.']
    ]);
  }
  var result={video:VIDEO_URL,corrida:id,leidos:items.length,
    clasificados:classified,solicitudes:requests,oportunidades:accepted,
    segundos:Math.round((new Date()-start)/100)/10,
    hoja:ss.getUrl()+'#gid='+sh.getSheetId()};
  Logger.log(JSON.stringify(result));
  Logger.log('Piloto completado. 1 llamada YouTube + 1 llamada Gemini. 0 mensajes enviados.');
  return result;
}
function sanitizarPilotoYT_(text) {
  var clean = String(text || '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email oculto]')
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g,'[telefono oculto]').slice(0,650);
  return sanitizeForSheets(clean);
}
