const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../gas/YouTubeCanales.js'),'utf8');
const ctx={module:{exports:{}},Date,JSON,String,Math,Object,Number,RegExp,Error,isFinite,encodeURIComponent,URL};
vm.runInNewContext(src,ctx);const api=ctx.module.exports;
const ID='UC6PoYEu79xbbUGSM0s38Esg';
function fetchMock(url,out) {
  out.push(url);
  if(url.includes('/channels?'))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({items:[{id:ID}]})};
  if(url.includes('/videos?'))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({items:[{snippet:{channelId:ID}}]})};
  if(url.includes('commentThreads?'))return {
    getResponseCode:()=>200,getContentText:()=>JSON.stringify({nextPageToken:'page2',items:[
      {snippet:{videoId:'abcdEFG1234',topLevelComment:{id:'fresh-1',snippet:{publishedAt:'2026-10-30T11:00:00Z',textOriginal:'Necesito profe de química online'}}}},
      {snippet:{videoId:'abcdeFG5678',topLevelComment:{id:'fresh-2',snippet:{publishedAt:'2026-10-27T11:00:00Z',textOriginal:'Gracias por la clase'}}}},
      {snippet:{videoId:'abcdefgh912',topLevelComment:{id:'old-1',snippet:{publishedAt:'2023-10-30T11:00:00Z',textOriginal:'Busco profesor'}}}},
    ]})};
  throw Error('Unexpected '+url);
}
test('URL /channel/ y @handle se interpretan como fuentes tipo canal',()=>{
 assert.equal(api.ytChannelLocator({url:'https://www.youtube.com/channel/'+ID}).kind,'id');
 assert.equal(api.ytChannelLocator({url:'https://www.youtube.com/@filadd'}).kind,'handle');
 assert.equal(api.ytChannelLocator({url:'https://www.youtube.com/c/FiladdUBA',resourceId:'Z5DyEohToDs'}).kind,'video');
 assert.equal(api.ytChannelLocator({url:'https://www.youtube.com/c/FiladdUBA'}).kind,'unresolved');
});
test('canal con ID directo no gasta API para resolver',()=>{
 const calls=[],resolved=api.ytChannelResolve({url:'https://www.youtube.com/channel/'+ID},'key',url=>fetchMock(url,calls));
 assert.equal(resolved.channelId,ID);assert.equal(resolved.calls,0);assert.equal(calls.length,0);
});
test('handle o video semilla resuelven canal sin hardcodear video para monitoreo',()=>{
 for(const source of [{url:'https://www.youtube.com/@filadd'},{url:'https://www.youtube.com/c/filadd',resourceId:'t4kBBDBOj6s'}]){
  const urls=[];let a=api.ytChannelResolve(source,'key',url=>fetchMock(url,urls));
  assert.equal(a.ok,true);assert.equal(a.channelId,ID);assert.equal(urls.length,1);
  assert.equal(urls[0].includes('search?'),false);
 }
});
test('consulta comentarios recientes de TODO el canal y filtra por fecha del comentario',()=>{
 const calls=[],value=api.ytChannelFetchRecent(ID,'secret',url=>fetchMock(url,calls),
  {maxAgeDays:7,now:new Date('2026-10-31T00:00:00Z'),maxResults:30});
 assert.equal(value.rawCount,3);assert.equal(value.items.length,2);assert.equal(value.skippedOld,1);
 assert.equal(value.pageToken,'page2');
 assert.equal(value.items[0].id,'fresh-1');
 assert.equal(value.items[1].videoId,'abcdeFG5678');
 assert.ok(value.items[0].url.includes('&lc=fresh-1'));
 assert.ok(calls[0].includes('allThreadsRelatedToChannelId='+ID));
 assert.equal(calls[0].includes('videoId='),false);
});
test('rechaza canal inválido y fuentes sin identificador',()=>{
 const calls=[];assert.throws(()=>api.ytChannelFetchRecent('notUC','key',url=>fetchMock(url,calls)),/inválido/);
 const result=api.ytChannelResolve({url:'https://www.youtube.com/c/canalantiguo'},'key',url=>fetchMock(url,calls));
 assert.equal(result.ok,false);assert.equal(calls.length,0);
});
