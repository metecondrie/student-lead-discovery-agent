/**
 * Briefing.js - Estadisticas agregadas de una corrida (sin API ni efectos).
 * No infiere personas alcanzadas ni ubicacion geografica.
 * Integrar en Main.js despues de validar en STAGING.
 */
function briefingNuevo(runId, startedAt) {
  return {
    id: String(runId),
    inicio: new Date(startedAt).toISOString(),
    fuentes: {},
    dimensiones: {},
    clavesVistas: {},
    totales: {leidos:0, evaluados:0, duplicados:0, descartados:0,
      pendientesIA:0, aprobadosIA:0, oportunidades:0, altas:0,
      contactados:0, respuestas:0, avisos:0, llamadasIA:0,
      llamadasYouTube:0, errores:0}
  };
}
function briefingFuente_(b, fuente, plataforma) {
  var id = String(fuente || 'Fuente desconocida').slice(0,160);
  if (!b.fuentes[id]) {
    b.fuentes[id] = {id:id, plataforma:String(plataforma || 'Desconocida').slice(0,80),
      consultada:false, recursos:0, duracionMs:0,
      leidos:0, evaluados:0, duplicados:0, descartados:0, pendientesIA:0,
      aprobadosIA:0, oportunidades:0, altas:0, llamadasIA:0,
      llamadasYouTube:0, errores:0};
  }
  return b.fuentes[id];
}
function briefingDimension_(b, dimension, valor) {
  var d = String(dimension || '').slice(0,50);
  var v = String(valor || 'Sin especificar').trim().slice(0,120) || 'Sin especificar';
  if (!b.dimensiones[d]) b.dimensiones[d] = {};
  b.dimensiones[d][v] = (b.dimensiones[d][v] || 0) + 1;
}
/**
 * evento: 'fuente_consultada', 'recurso', 'leido', 'evaluado',
 * 'duplicado', 'descartado', 'pendiente_ia', 'aprobado_ia',
 * 'oportunidad', 'alta', 'contactado', 'respuesta', 'aviso',
 * 'llamada_ia', 'llamada_youtube', 'error'.
 * detalle.clave = ID canonico; NO incluir textos, emails o nombres.
 * detalle.paisVerificado debe ser true para registrar pais.
 */
function briefingRegistrar(b, evento, detalle) {
  detalle = detalle || {};
  var source = briefingFuente_(b, detalle.fuente, detalle.plataforma);
  if (evento === 'fuente_consultada') { source.consultada = true; return; }
  if (evento === 'recurso') { source.recursos++; return; }
  if (evento === 'duracion') {
    var ms = Number(detalle.ms);
    if (isFinite(ms) && ms >= 0) source.duracionMs += ms;
    return;
  }
  var mapping = {leido:'leidos',evaluado:'evaluados',duplicado:'duplicados',
    descartado:'descartados',pendiente_ia:'pendientesIA',aprobado_ia:'aprobadosIA',
    oportunidad:'oportunidades',alta:'altas',contactado:'contactados',
    respuesta:'respuestas',aviso:'avisos',llamada_ia:'llamadasIA',
    llamada_youtube:'llamadasYouTube',error:'errores'};
  var key = mapping[evento];
  if (!key) throw new Error('Evento de briefing desconocido: ' + evento);
  // Evita doble conteo al pasar del detector a la cola de Gemini.
  if (detalle.clave && (evento === 'leido' || evento === 'evaluado' || evento === 'oportunidad')) {
    var k = evento + ':' + String(detalle.clave);
    if (b.clavesVistas[k]) return;
    b.clavesVistas[k] = true;
  }
  b.totales[key]++;
  if (Object.prototype.hasOwnProperty.call(source,key)) source[key]++;
  if (evento === 'oportunidad') {
    briefingDimension_(b,'Plataforma',source.plataforma);
    briefingDimension_(b,'Materia',detalle.materia);
    briefingDimension_(b,'Nivel',detalle.nivel);
    briefingDimension_(b,'Contactabilidad',detalle.contactabilidad);
    briefingDimension_(b,'Pais',detalle.paisVerificado === true ? detalle.pais : 'No determinado');
  }
  if (evento === 'descartado') briefingDimension_(b,'Motivo descarte',detalle.motivo);
}
function briefingCerrar(b, finishedAt, errores) {
  var fin = new Date(finishedAt);
  var ms = Math.max(0, fin.getTime() - new Date(b.inicio).getTime());
  return {
    id:b.id, inicio:b.inicio, fin:fin.toISOString(),
    duracionSegundos:Math.round(ms/1000*10)/10,
    fuentesConsultadas:Object.keys(b.fuentes).filter(function(k){return b.fuentes[k].consultada;}).length,
    totales:b.totales, fuentes:b.fuentes, dimensiones:b.dimensiones,
    errores:Array.isArray(errores)?errores.length:0
  };
}
function briefingTexto(r) {
  var t = r.totales;
  var n = Object.keys(r.fuentes).length;
  return 'Corrida '+r.id+' | '+r.duracionSegundos+' s\n' +
    'Fuentes efectivamente consultadas: '+r.fuentesConsultadas+' (con registros: '+n+')\n' +
    'Publicaciones leidas: '+t.leidos+' (NO personas alcanzadas)\n' +
    'Evaluadas: '+t.evaluados+' | Duplicadas: '+t.duplicados+
    ' | Descartadas: '+t.descartados+' | Pendientes IA: '+t.pendientesIA+'\n' +
    'Oportunidades nuevas: '+t.oportunidades+' | Prioridad alta: '+t.altas+'\n' +
    'Llamadas IA: '+t.llamadasIA+' | YouTube API: '+t.llamadasYouTube+'\n' +
    'Errores: '+r.errores+' | Geografia solo si fue informada explicitamente.';
}
function briefingFilasFuente(r) {
  return Object.keys(r.fuentes).sort().map(function(k){
    var f = r.fuentes[k];
    return [r.id,f.id,f.plataforma,f.consultada?'TRUE':'FALSE',f.recursos,f.leidos,f.evaluados,
      f.duplicados,f.descartados,f.pendientesIA,f.aprobadosIA,f.oportunidades,f.altas,
      f.llamadasIA,f.llamadasYouTube,f.errores,f.duracionMs];
  });
}
function briefingFilasSegmentos(r) {
  var out=[];
  Object.keys(r.dimensiones).sort().forEach(function(d){
    Object.keys(r.dimensiones[d]).sort().forEach(function(v){
      out.push([r.id,d,v,r.dimensiones[d][v]]);
    });
  });
  return out;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {briefingNuevo:briefingNuevo,briefingRegistrar:briefingRegistrar,
    briefingCerrar:briefingCerrar,briefingTexto:briefingTexto,
    briefingFilasFuente:briefingFilasFuente,briefingFilasSegmentos:briefingFilasSegmentos};
}
