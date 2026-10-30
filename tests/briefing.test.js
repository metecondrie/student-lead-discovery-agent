const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../gas/Briefing.js');
test('corrida sin oportunidades produce briefing con ceros y tiempo',()=>{
  const b=B.briefingNuevo('run-01','2026-10-30T12:00:00Z');
  B.briefingRegistrar(b,'fuente_consultada',{fuente:'youtube:video1',plataforma:'YouTube'});
  const r=B.briefingCerrar(b,'2026-10-30T12:01:30Z',[]);
  assert.equal(r.duracionSegundos,90);
  assert.equal(r.fuentesConsultadas,1);
  assert.equal(r.totales.oportunidades,0);
  assert.match(B.briefingTexto(r),/NO personas alcanzadas/);
});
test('dedup por ID evita doble contabilizacion detector/IA',()=>{
  const b=B.briefingNuevo('run-02','2026-10-30T12:00:00Z');
  const x={fuente:'YouTube v1',plataforma:'YouTube',clave:'post-1',materia:'Matematica'};
  B.briefingRegistrar(b,'leido',x);B.briefingRegistrar(b,'leido',x);
  B.briefingRegistrar(b,'evaluado',x);B.briefingRegistrar(b,'evaluado',x);
  B.briefingRegistrar(b,'oportunidad',x);B.briefingRegistrar(b,'oportunidad',x);
  assert.equal(b.totales.leidos,1);
  assert.equal(b.totales.evaluados,1);
  assert.equal(b.totales.oportunidades,1);
});
test('pais permanece desconocido salvo evidencia explicita',()=>{
  const b=B.briefingNuevo('run-03','2026-10-30T12:00:00Z');
  B.briefingRegistrar(b,'oportunidad',{fuente:'TikTok',plataforma:'TikTok',clave:'x',pais:'Peru'});
  B.briefingRegistrar(b,'oportunidad',{fuente:'Reddit',plataforma:'Reddit',clave:'y',pais:'Argentina',paisVerificado:true});
  const r=B.briefingCerrar(b,'2026-10-30T12:00:01Z',[]);
  assert.equal(r.dimensiones.Pais['No determinado'],1);
  assert.equal(r.dimensiones.Pais.Argentina,1);
  assert.equal(r.dimensiones.Pais.Peru,undefined);
});
test('fuentes y segmentos devuelven filas tabulares agregadas',()=>{
  const b=B.briefingNuevo('run-04','2026-10-30T12:00:00Z');
  B.briefingRegistrar(b,'fuente_consultada',{fuente:'f1',plataforma:'YouTube'});
  B.briefingRegistrar(b,'leido',{fuente:'f1',plataforma:'YouTube',clave:'c1'});
  B.briefingRegistrar(b,'oportunidad',{fuente:'f1',plataforma:'YouTube',clave:'c1',materia:'Fisica',nivel:'Universidad',contactabilidad:'Abierta'});
  const r=B.briefingCerrar(b,'2026-10-30T12:00:02Z',[]);
  assert.equal(B.briefingFilasFuente(r)[0][5],1);
  assert.ok(B.briefingFilasSegmentos(r).some(x=>x[1]==='Materia'&&x[2]==='Fisica'&&x[3]===1));
});
test('rechaza eventos desconocidos sin modificar totales',()=>{
  const b=B.briefingNuevo('run-05','2026-10-30T12:00:00Z');
  assert.throws(()=>B.briefingRegistrar(b,'spam',{fuente:'x'}));
  assert.equal(b.totales.leidos,0);
});
