/**
 * Conector YouTube por CANAL, no por video preseleccionado.
 * Núcleo integrable al orquestador multifuente. No es un entry point ni crea triggers.
 * Requiere una clave de la API de YouTube, disponible únicamente en el servidor.
 * No contacta, publica ni escribe datos automáticamente.
 */

/** Categoriza la forma de identificar el canal sin adivinar IDs. */
function ytChannelLocator(source) {
  var s=source||{},raw=String(s.url||'').trim(),rid=String(s.channelId||'').trim(),
    seed=String(s.resourceId||s.videoId||'').trim();
  if(/^UC[\w-]{22}$/.test(rid))return {kind:'id',value:rid};
  var url;
  try {url=new URL(raw);}catch(e){
    // Apps Script soporta URL solo en ciertos entornos; usar patrón seguro alternativo.
  }
  var matched=raw.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/channel\/(UC[\w-]{22})(?:[/?#]|$)/i);
  if(matched)return {kind:'id',value:matched[1]};
  matched=raw.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/@([\w.\-]+)(?:[/?#]|$)/i);
  if(matched)return {kind:'handle',value:'@'+matched[1]};
  matched=raw.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/user\/([\w.\-]+)(?:[/?#]|$)/i);
  if(matched)return {kind:'username',value:matched[1]};
  if(/^[\w-]{11}$/.test(seed))return {kind:'video',value:seed};
  return {kind:'unresolved',value:raw};
}
function ytChannelQueryUrl(path,params,key) {
  var args=[];
  Object.keys(params).forEach(function(k){args.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));});
  args.push('key='+encodeURIComponent(key));
  return 'https://www.googleapis.com/youtube/v3/'+path+'?'+args.join('&');
}
function ytChannelReadJSON(fetchFn,url) {
  var response=fetchFn(url,{muteHttpExceptions:true}),status=response.getResponseCode(),data={};
  try{data=JSON.parse(response.getContentText());}catch(e){}
  if(status!==200)throw new Error('YouTube HTTP '+status+' | '+String(data.error&&data.error.message||'error').slice(0,120));
  return data;
}
/**
 * Obtener el channelId a partir de /channel, /@handle, /user o un video semilla.
 * No usa search.list y no prueba URLs arbitrarias.
 */
function ytChannelResolve(source,apiKey,fetchFn) {
  var loc=ytChannelLocator(source);
  if(loc.kind==='id')return {ok:true,channelId:loc.value,method:'url-channel-id',calls:0};
  if(loc.kind==='unresolved')return {ok:false,channelId:'',method:'unresolved',calls:0,
    error:'El enlace del canal no incluye un ID, handle o video semilla verificable.'};
  var method=loc.kind==='video'?'videos':'channels';
  var q=loc.kind==='video'?{part:'snippet',id:loc.value}:
    loc.kind==='handle'?{part:'id',forHandle:loc.value}:{part:'id',forUsername:loc.value};
  var json=ytChannelReadJSON(fetchFn,ytChannelQueryUrl(method,q,apiKey));
  var item=(json.items||[])[0]||{},id=loc.kind==='video'?
    String(item.snippet&&item.snippet.channelId||''):String(item.id||'');
  if(!/^UC[\w-]{22}$/.test(id))return {ok:false,channelId:'',method:loc.kind,calls:1,
    error:'No se encontró el canal mediante la API.'};
  return {ok:true,channelId:id,method:loc.kind,calls:1};
}
/**
 * Recupera hasta 100 hilos de comentarios recientes asociados a TODO el canal.
 * Aplica ventana de recencia al comentario, no a la fecha de publicación del video.
 * Devuelve nextPageToken para que el orquestador preserve paginación por canal.
 */
function ytChannelFetchRecent(channelId,apiKey,fetchFn,opts) {
  opts=opts||{};
  if(!/^UC[\w-]{22}$/.test(String(channelId||'')))throw new Error('channelId inválido.');
  var max=Math.max(1,Math.min(100,Math.floor(Number(opts.maxResults)||100)));
  var windowDays=Math.max(1,Math.min(90,Math.floor(Number(opts.maxAgeDays)||14)));
  var now=opts.now instanceof Date?opts.now:new Date();
  var since=now.getTime()-windowDays*86400000,params={
    part:'snippet',allThreadsRelatedToChannelId:channelId,maxResults:max,
    order:'time',textFormat:'plainText'
  };
  if(opts.pageToken)params.pageToken=String(opts.pageToken);
  var json=ytChannelReadJSON(fetchFn,ytChannelQueryUrl('commentThreads',params,apiKey));
  var results=[],old=0,missingDate=0,seen={};
  (json.items||[]).forEach(function(thread){
    var top=thread&&thread.snippet&&thread.snippet.topLevelComment,
      snip=top&&top.snippet;
    if(!top||!snip||!top.id||seen[top.id])return;
    seen[top.id]=true;
    var at=Date.parse(String(snip.publishedAt||''));
    if(!isFinite(at)){missingDate++;return;}
    if(at<since||at>now.getTime()+3600000){old++;return;}
    var videoId=String(snip.videoId||thread.snippet.videoId||'');
    var commentId=String(top.id),raw=String(snip.textOriginal||snip.textDisplay||'');
    results.push({
      id:commentId,channelId:channelId,videoId:videoId,sourceLabel:'YouTube',
      text:raw,publishedAt:new Date(at).toISOString(),
      url:/^[\w-]{11}$/.test(videoId)?
        'https://www.youtube.com/watch?v='+videoId+'&lc='+encodeURIComponent(commentId):
        'https://www.youtube.com/channel/'+channelId,
      title:'Comentario reciente en el canal '+channelId
    });
  });
  return {
    channelId:channelId,items:results,
    rawCount:(json.items||[]).length,skippedOld:old,skippedNoDate:missingDate,
    pageToken:String(json.nextPageToken||''),windowDays:windowDays,
    since:new Date(since).toISOString()
  };
}
if(typeof module!=='undefined')module.exports={
  ytChannelLocator:ytChannelLocator,ytChannelResolve:ytChannelResolve,
  ytChannelFetchRecent:ytChannelFetchRecent
};
