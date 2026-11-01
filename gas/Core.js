/**
 * Core.js — Lógica pura (sin APIs de Google). Se usa en Apps Script y en Node (tests).
 * Extracción, clasificación, puntuación, deduplicación y redacción de mensajes.
 * Todo texto externo se trata como dato NO confiable: nunca se ejecuta ni se interpreta como instrucción.
 */

var ESTADOS = ['Detectado', 'Evaluado', 'Descartado', 'Pendiente de aprobación', 'Contactado', 'Respondió',
  'Reserva acordada', 'Clase realizada', 'Cobrado', 'Cerrado sin contratación'];

var DEFAULT_CONFIG = {
  SISTEMA_ACTIVO: false,
  NOMBRE: 'Alejo',
  ANIO_INICIO: 2010,
  TARIFA: 12000,
  MOSTRAR_PERFILES_DOCENTES: true,
  PERFIL_TUSCLASES_URL: '',
  PERFIL_SUPERPROF_URL: '',
  MOSTRAR_EQUIVALENTE_USD: true,
  USD_AUTO_ACTUALIZAR: true,
  USD_ARS_VENTA: 0,
  USD_FECHA_COTIZACION: '',
  HORARIOS: 'de lunes a viernes de 9 a 21 h y sábados por la mañana',
  EMAIL_NOTIF: '',
  MAX_ANTIGUEDAD_DIAS: 10,
  LOOKBACK_DIAS: 14,
  UMBRAL_ALTA: 70,
  UMBRAL_MIN: 35,
  FEEDS_ACTIVOS: true,
  FEED_GETONBRD_ACTIVO: false,
  FEED_GETONBRD_QUERIES: 'data entry, carga de datos, atencion al cliente, soporte, excel, administrativo, analista de datos',
  FEED_REMOTIVE_ACTIVO: false,
  FEED_REMOTIVE_QUERIES: 'data entry, customer support',
  FEED_UTNIANOS_ACTIVO: true,
  FEED_UTNIANOS_URL: 'https://www.utnianos.com.ar/foro/syndication.php',
  YOUTUBE_ACTIVO: false,
  YOUTUBE_MAX_COMMENTS_PER_VIDEO: 50,
  YOUTUBE_MAX_DAILY_QUOTA: 100,
  GEMINI_ACTIVO: false,
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_MAX_DAILY_CALLS: 20,
  GEMINI_BATCH_SIZE: 5,
  MODO_B_ACTIVO: false,
  MODO_B_ETIQUETA_ENTRADA: 'Captacion_Inbound',
  MODO_B_REMITENTES_AUTORIZADOS: '',
  MODO_B_AUTOENVIO: false,
  MODO_B_AUTORIZADO_HASTA: '',
  MODO_B_MAX_DIARIO: 5,
  MODO_C_ACTIVO: false,
  RESUMEN_HORA: 20,
  OBJETIVO_MENSUAL: 400000,
  PESOS: { compat: 35, recencia: 15, urgencia: 10, recurrencia: 10, online: 10, claridad: 10, contacto: 5, cobro: 5 },
  TEXTO_IGNORAR: ''
};

/* ---------- Fuentes por email (alertas que llegan a TU Gmail) ---------- */
var SOURCES = [
  { key: 'tusclases', label: 'Tusclases', kind: 'tutoring', from: /tusclases/i, gmail: 'tusclases', link: /tusclases\.com/i },
  { key: 'superprof', label: 'Superprof', kind: 'tutoring', from: /superprof/i, gmail: 'superprof', link: /superprof\./i },
  { key: 'google_alerts', label: 'Google Alerts', kind: 'mixed', from: /googlealerts-noreply@google\.com/i, gmail: 'googlealerts-noreply@google.com', multi: true, item: /google\.com\/url\?|^https?:\/\/(?!(www\.)?google\.)/i },
  { key: 'linkedin', label: 'LinkedIn (alertas)', kind: 'job', from: /linkedin\.com/i, gmail: 'jobalerts-noreply@linkedin.com', multi: true, item: /linkedin\.com\/(comm\/)?jobs\/view\//i },
  { key: 'computrabajo', label: 'Computrabajo', kind: 'job', from: /computrabajo/i, gmail: 'computrabajo', multi: true, item: /computrabajo\.com[^"\s]*\/(ofertas-de-trabajo|oferta)/i },
  { key: 'bumeran', label: 'Bumeran', kind: 'job', from: /bumeran/i, gmail: 'bumeran', multi: true, item: /bumeran\.com\.ar\/empleos\//i },
  { key: 'indeed', label: 'Indeed', kind: 'job', from: /indeed/i, gmail: 'indeed', multi: true, item: /indeed\.com\/(rc\/clk|viewjob|pagead|m\/viewjob)/i },
  { key: 'workana', label: 'Workana', kind: 'job', from: /workana/i, gmail: 'workana', multi: true, item: /workana\.com\/job\//i }
];

/* ---------- Catálogo central de fuentes educativas verificadas (YouTube / Redes) ---------- */
var EDUCATIONAL_SOURCES = [
  {
    id: 'CAT-0178',
    platform: 'YouTube',
    creator: 'Mathematics with Juan',
    topics: 'Álgebra, Matemática',
    level: 'Secundaria / Universitario',
    channelUrl: 'https://www.youtube.com/watch?v=_6uyQISZvBc',
    resourceId: '_6uyQISZvBc',
    videoTitle: 'Álgebra desde cero',
    active: true,
    lastChecked: '',
    notes: 'P2 - Comentarios | Video concreto verificado'
  },
  {
    id: 'CAT-0036',
    platform: 'YouTube',
    creator: 'Filadd UBA (@FiladdUBA)',
    topics: 'Matemática, Física, Química',
    level: 'CBC / UBA XXI',
    channelUrl: 'https://www.youtube.com/c/FiladdUBA',
    resourceId: 'Z5DyEohToDs',
    videoTitle: 'Clases de repaso CBC / UBA XXI',
    active: true,
    lastChecked: '',
    notes: 'P1 - Piloto | Canal verificado CBC'
  },
  {
    id: 'CAT-0034',
    platform: 'YouTube',
    creator: 'Academia Filadd (@AcademiaFiladd)',
    topics: 'Matemática',
    level: 'Ingreso UNC / Universidades',
    channelUrl: 'https://www.youtube.com/channel/UC6PoYEu79xbbUGSM0s38Esg',
    resourceId: 't4kBBDBOj6s',
    videoTitle: 'Preparación de examen de Matemática',
    active: true,
    lastChecked: '',
    notes: 'P1 - Piloto | Canal verificado'
  },
  {
    id: 'CAT-0167',
    platform: 'YouTube',
    creator: 'Quimiayudas (@Quimiayudas)',
    topics: 'Química',
    level: 'Secundaria / Universidad',
    channelUrl: 'https://www.youtube.com/user/Quimiayudas',
    resourceId: '4FdLXk1Jv3E',
    videoTitle: 'Química General y Ejercicios de Examen',
    active: true,
    lastChecked: '',
    notes: 'P2 - Comentarios | Canal verificado'
  },
  {
    id: 'CAT-0142',
    platform: 'YouTube',
    creator: 'Grupo Ciencias San Marcos',
    topics: 'Matemática, Química, Biología',
    level: 'Ingreso Universitario',
    channelUrl: 'https://www.youtube.com/@GrupoCienciasSanMarcos',
    resourceId: 'N8diErkJ_k4',
    videoTitle: 'Seminario de Ciencias e Ingreso',
    active: true,
    lastChecked: '',
    notes: 'P2 - Comentarios | Canal verificado'
  },
  {
    id: 'CAT-0165',
    platform: 'YouTube',
    creator: 'Puntaje Nacional Colombia',
    topics: 'Matemática, Física, Química, Biología',
    level: 'Secundaria / Exámenes',
    channelUrl: 'https://www.youtube.com/c/PuntajeNacionalColombia',
    resourceId: 'epPONh43eYs',
    videoTitle: 'Clases en vivo de Ciencias',
    active: true,
    lastChecked: '',
    notes: 'P2 - Comentarios | Canal verificado'
  },
  {
    id: 'CAT-0137',
    platform: 'YouTube',
    creator: 'Biología desde cero (@biologiadesdecero)',
    topics: 'Biología',
    level: 'Secundaria / Universidad',
    channelUrl: 'https://www.youtube.com/@biologiadesdecero',
    resourceId: 'gw49nIvyhLE',
    videoTitle: 'Conceptos de Biología Celular',
    active: true,
    lastChecked: '',
    notes: 'P2 - Comentarios | Canal verificado'
  },
  {
    id: 'CAT-0158',
    platform: 'YouTube',
    creator: 'Preu Cpech (@PreuCpechCanalOficial)',
    topics: 'Matemática, Física, Química',
    level: 'Admisión / Exámenes',
    channelUrl: 'https://www.youtube.com/@PreuCpechCanalOficial',
    resourceId: '3vV6PTTe6mM',
    videoTitle: 'Resolución de Ensayos de Ciencias',
    active: true,
    lastChecked: '',
    notes: 'P2 - Comentarios | Canal verificado'
  }
];

/* ---------- Catálogo de materias / trabajos ---------- */
var SUBJECTS = [
  { key: 'fisicoquimica', label: 'Fisicoquímica', kind: 'tutoring', w: 1.0, re: /fisicoquimic|termodinamic/ },
  { key: 'quimica', label: 'Química', kind: 'tutoring', w: 1.0, re: /quimic/ },
  { key: 'biofisica', label: 'Biofísica', kind: 'tutoring', w: 1.0, re: /biofisic/ },
  { key: 'fisica', label: 'Física', kind: 'tutoring', w: 1.0, re: /\bfisica/ },
  { key: 'analisis', label: 'Análisis Matemático', kind: 'tutoring', w: 1.0, re: /analisis matematic|analisis (i|ii|1|2)\b|\bam ?(i|1|ii|2)\b|calculo (i|1|diferencial|integral)/ },
  { key: 'algebra', label: 'Álgebra', kind: 'tutoring', w: 1.0, re: /algebra/ },
  { key: 'matematica', label: 'Matemática', kind: 'tutoring', w: 1.0, re: /matematic|\bmate\b|trigonometr|derivada|integrales|ecuaciones/ },
  { key: 'biologia', label: 'Biología', kind: 'tutoring', w: 0.8, re: /biolog|anatomia|fisiologia|biologia celular|genetica/ },
  { key: 'datos', label: 'Limpieza/validación de datos', kind: 'job', w: 0.75, re: /limpieza de datos|validacion de datos|calidad de datos|data quality|analista de datos|data analyst/ },
  { key: 'data_entry', label: 'Data Entry', kind: 'job', w: 0.7, re: /data entry|carga de datos|digitalizacion|ingreso de datos/ },
  { key: 'excel', label: 'Excel / Google Sheets', kind: 'job', w: 0.7, re: /excel|google sheets|planillas? de calculo/ },
  { key: 'redaccion', label: 'Redacción técnica', kind: 'job', w: 0.65, re: /redaccion tecnica|redactor tecnico|technical writ/ },
  { key: 'admin', label: 'Soporte administrativo', kind: 'job', w: 0.65, re: /asistente administrativ|soporte administrativ|asistente virtual|back ?office|administrativo remoto/ },
  { key: 'chat', label: 'Atención al cliente / chat', kind: 'job', w: 0.6, re: /atencion (al cliente|por chat)|soporte (por chat|al cliente)|customer (support|service)|chat support/ }
];
var NOT_TAUGHT = /\b(ingles|frances|portugues|aleman|italiano|piano|guitarra|canto|musica|dibujo|pintura|historia|geografia|lengua y literatura|literatura|contabilidad|derecho|programacion avanzada|java|react|devops|cloud engineer|enfermeria|odontolog)\b/;
var JOB_EXCLUDE = /developer|desarrollador|programador|ingenier|engineer|\betl\b|devops|arquitect|corredor|vendedor|ventas|comercial|telemarketer|senior|\bsr\b|lead|manager|gerente|jefe|director|abogad|contador|medic|enfermer|chofer|repartidor/;

/* ---------- Filtros semánticos para comentarios educativos (YouTube / Redes) ---------- */
// Exige intención explícita de contratación de clases o búsqueda de profesor particular
var YT_INTENT_RX = /(?:busco|buscan|necesito|necesitan|preciso|precisan|queria saber si das|das|das clases|alguien da|alguien para|alguien que me prepare|contratar|recomiendan|recomienden)\s+(?:profe|profesor|profesora|tutor|tutora|clases?\s+particulares?|clases?\s+online|apoyo)|(?:profesor|profe|clases?)\s+particular(?:es)?|(?:preparar|preparacion)\s+(?:un\s+|el\s+)?(?:final|parcial|recuperatorio|ingreso)\s+(?:con\s+(?:un|algun)?\s*(?:profe|alguien|tutor)|particular)|(?:necesito|busco)\s+(?:ayuda\s+con\s+)?(?:clases?|profe|profesor)|cuanto\s+(?:cobras|sale|cobran|estan)\s+(?:las\s+clases|la\s+clase|la\s+hora)|das\s+clases/i;
// Identifica consultas técnicas puntuales del video o elogios sin solicitud comercial
var YT_FREE_EXCLUDE_RX = /(?:en el minuto\s+\d{1,2}:\d{2}|\b\d{1,2}:\d{2}\b|hace\s+un\s+video|hagan\s+un\s+video|podes\s+hacer\s+un\s+video|puedes\s+hacer\s+un\s+video|gracias\s+profe|sos\s+un\s+genio|sos\s+un\s+crack|buen\s+video|excelente\s+video|me\s+salvaste|aprobe)/i;

var RX = {
  online: /online|on-line|virtual|videollamada|zoom|google meet|\bmeet\b|skype|a distancia|remot|desde casa|home ?office|teletrabajo/,
  presencial: /presencial|a domicilio|en mi casa|en mi domicilio|en persona|cara a cara|on-?site|in office|hibrido/,
  english: /ingles (avanzado|fluido|oral|c1|c2|bilingue)|fluent english|advanced english|english (fluency|c1|c2|required)|bilingue|native english|excellent english|full english/,
  fraud: /pago (de|por) (inscripcion|alta|registro|capacitacion|material)|abonar (una |la )?(inscripcion|matricula)|costo de (inscripcion|alta)|deposito previo|adelanto de dinero|western union|gift ?card|tarjeta de regalo|bitcoin|usdt|cripto|ganancias (diarias|garantizadas)|multinivel|piramidal|reenvio de (dinero|paquetes)/,
  urgent: /urgente|urgencia|lo antes posible|cuanto antes|manana|esta semana|la semana que viene|proxima semana|en (pocos|unos) dias/,
  exam: /parcial|final|examen|recuperatorio|integrador|coloquio|evaluacion|prueba/,
  recurring: /todo el (ano|cuatrimestre)|cuatrimestr|semanal|por semana|veces a la semana|varias clases|seguimiento|apoyo (escolar|continuo|regular)|acompanamiento|todo el ciclo|regular/,
  parent: /mi hij[oa]|mi sobrin[oa]|para (mi|su) hij|soy (la mama|el papa|madre|padre)/,
  request: /alumn|solicitud|mensaje|consulta|interesad|quiere|busca|contact|clase|respond|respuesta|escrib/,
  noRequest: /factura|premium|pago recibido|suscripcion|newsletter|valoraci|contrasena|password|verifica|bienvenid|renova|oferta especial|descuento|tu mensaje al anunciante|se ha enviado correctamente|datos de tu aviso/,
  outgoing: /tu mensaje (al anunciante|ha sido enviado)|se ha enviado correctamente|mensaje enviado al anunciante/,
  adConfirmation: /datos de tu aviso|tu aviso (ha sido|fue|ya est[aá]|est[aá])|tu anuncio (ha sido|fue|ya est[aá]|est[aá])|aviso publicado|has publicado un aviso|genial.*tu aviso|ya est[aá] en l[ií]nea|tu anuncio est[aá] en l[ií]nea/i,
  hybrid: /hibrid|hybrid|\b\d+\s*dias?\s*(y\s*)?presencial|presencial\s*(\w+\s*)?\d+\s*dias?|remot[oa]\s*\w+\s*dias?\s*y\s*presencial|presencial\s*y\s*remot[oa]|remot[oa]\s*y\s*presencial|oficina\s*y\s*remot[oa]|esquema mixto|modalidad mixta|semipresencial/i,
  optionalRemote: /(?:100\s*%\s*remot[oa]|full\s*remot[oa]|completamente\s*remot[oa]|totalmente\s*remot[oa]|remot[oa]\s*o\s*hibrid[oa]|hibrid[oa]\s*o\s*remot[oa]|remot[oa]\s*o\s*presencial|presencial\s*o\s*remot[oa]|a\s*eleccion(?:\s*del\s*(?:candidato|colaborador|empleado))?|opcion\s*(?:de\s*)?(?:trabajo\s*)?remot[oa])/i,
  mandatoryHybrid: /(?:excluyente|obligatori[oa]|mandatori[oa]|requisit[oa]|condicion)\s*[^.\n]*(?:hibrid[oa]|presencial|en\s*oficina)|(?:hibrid[oa]|presencial)\s*(?:excluyente|obligatori[oa])|\b\d+\s*dias?\s*(?:en\s*oficina|presencial|en\s*sede)|\bpresencial\s*\d+\s*dias?|al\s*menos\s*\d+\s*dias?\s*presencial/i,
  teacherOffer: /(?:doy|ofrezco|brindo|se dictan|dictamos|inicio de|inscripcion abierta a)\s+clases|profesor(?:a)?\s+(?:particular\s+)?dicta|clases\s+a\s+cargo\s+de\s+profesor/i,
  formalJobOffer: /convocatoria docente|concurso docente|se busca docente titular|cargo docente|docente suplente/i,
  foreignResidence: /(exclusivo|solo|unicamente|excluyente)\s*(para\s*)?residentes?\s*(de|en)?\s*(chile|colombia|mexico|peru|uruguay|espana|estados unidos|usa|eeuu|venezuela|ecuador|bolivia|paraguay|santiago|bogota|lima|cdmx|madrid|barcelona)|residir\s*(en|excluyente\s*en)\s*(chile|colombia|mexico|peru|uruguay|espana|estados unidos|usa|eeuu|santiago|bogota|lima|cdmx|madrid|barcelona)|vivir\s*en\s*(chile|colombia|mexico|peru|uruguay|espana|estados unidos|usa|eeuu|santiago|bogota|lima|cdmx|madrid|barcelona)|residencia\s*en\s*(chile|colombia|mexico|peru|uruguay|espana|estados unidos|usa|eeuu|santiago|bogota|lima|cdmx|madrid|barcelona)|(ubicacion|localidad|pais):\s*(chile|colombia|mexico|peru|uruguay|espana|usa)/,
  footer: /(darse de baja|darte de baja|si no deseas|si no quieres|unsubscribe|cancelar suscripcion|©|\(c\) 20\d\d|este (correo|email|mensaje) (ha sido|fue) enviado)/
};

var LEVELS = [
  { key: 'cbc', label: 'CBC (UBA)', re: /\bcbc\b|ciclo basico comun/ },
  { key: 'ubaxxi', label: 'UBA XXI', re: /uba ?xxi|uba ?21/ },
  { key: 'ingreso', label: 'Ingreso universitario', re: /curso de ingreso|ingreso (a|universitario|a la facultad)|examen de ingreso|admision/ },
  { key: 'universitario', label: 'Universitario', re: /universi|facultad|carrera|catedra|\bunlp\b|\butn\b|\buba\b|ingenieria|medicina|bioquimica|farmacia|veterinaria/ },
  { key: 'terciario', label: 'Terciario', re: /terciari|profesorado|instituto/ },
  { key: 'secundario', label: 'Secundario', re: /secundari|colegio|liceo|escuela tecnica|polimodal|bachiller|[1-6] ?(°|º|ro|do|to|er)? ?ano\b|quinto ano|cuarto ano|sexto ano/ },
  { key: 'primario', label: 'Primario', re: /primari/ }
];

/* ---------- Utilidades ---------- */
function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function stripHtml(html) {
  return String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n').trim();
}
function hashStr(s) { // FNV-1a 2x32 bits -> 16 hex
  var h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995, i, c;
  s = String(s);
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= c; h2 = Math.imul(h2, 2246822519) >>> 0; h2 ^= h2 >>> 13;
  }
  return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
}
function hashInt(s) { return parseInt(hashStr(s).slice(0, 7), 16); }
function fmtMoney(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function cutFooter(text) {
  var lines = String(text || '').split('\n'), out = [];
  for (var i = 0; i < lines.length; i++) { if (RX.footer.test(norm(lines[i]))) break; out.push(lines[i]); }
  return out.join('\n');
}
function canonicalUrl(u) {
  if (!u) return '';
  u = String(u).trim();
  // Desenvolver URLs de seguimiento de Amazon SES (awstrack.me o subdominios de correo con /L0/)
  var sesMatch = u.match(/(?:awstrack\.me|[a-z0-9.-]*\b(?:mail|track|trk)[a-z0-9.-]*)\/L0\/([^\s"'<>]+)/i) || u.match(/\/L0\/(https?[:%][^\s"'<>]+)/i);
  if (sesMatch) {
    var rawInner = sesMatch[1];
    var parts = rawInner.split('/');
    if (/^https?:%2F%2F/i.test(parts[0])) {
      try { u = decodeURIComponent(parts[0]); } catch (e) { try { u = decodeURIComponent(rawInner); } catch (e2) {} }
    } else {
      var urlCandidate = rawInner;
      try { urlCandidate = decodeURIComponent(rawInner); } catch (e) {}
      var mUrl = urlCandidate.match(/^(https?:\/\/[^\/]+(?:\/[^\/]+)*?)(?:\/\d+\/[a-zA-Z0-9._-]+)?$/i);
      if (mUrl) u = mUrl[1];
    }
  }
  // Manejo de parámetros de redirección verificables (Google y redireccionadores conocidos)
  var m = u.match(/[?&](?:url|q|dest|target|redirect_to|link)=(https?[^&]+)/i);
  if (m && (/google\.[a-z.]+/i.test(u) || /redirect|clk|track/i.test(u))) {
    try { u = decodeURIComponent(m[1]); } catch (e) { }
  }
  u = u.replace(/#.*$/, '');

  // Normalización canónica de anuncios de Tusclases a formato estándar: https://www.tusclases.com.ar/alumnos/<id>.aspx
  var tcAdMatch = u.match(/tusclases\.com(?:\.ar)?\/(?:alumnos|avisos|solicitudes|aviso-alumno)?\/.*?(\d{5,})\.aspx/i) ||
                  u.match(/tusclases\.com(?:\.ar)?\/.*?[?&]id=(\d{5,})/i);
  if (tcAdMatch) {
    return 'https://www.tusclases.com.ar/alumnos/' + tcAdMatch[1] + '.aspx';
  }

  var qIdx = u.indexOf('?');
  var base = qIdx >= 0 ? u.slice(0, qIdx) : u;
  var qs = qIdx >= 0 ? u.slice(qIdx + 1) : '';

  // Normalizar base: protocolo y host en minúsculas; path preserva mayúsculas/minúsculas sensibles
  var protoMatch = base.match(/^(https?:\/\/)([^\/]+)(.*)$/i);
  if (protoMatch) {
    base = protoMatch[1].toLowerCase() + protoMatch[2].toLowerCase() + protoMatch[3].replace(/\/+$/, '');
  } else {
    base = base.replace(/\/+$/, '');
  }
  if (!qs) return base;

  // Filtrar ÚNICAMENTE parámetros de tracking/marketing conocidos; conservar identificadores funcionales
  var TRACKING_PARAMS = /^(utm_[a-z_]+|fbclid|gclid|gclsrc|dclid|ref|source|campaign|_ga|_gl|mc_eid|yclid|zanpid|msclkid|trk|trackingcode|tracking_id|mid)$/i;
  var pairs = qs.split('&').filter(Boolean);
  var kept = [];
  for (var i = 0; i < pairs.length; i++) {
    var k = pairs[i].split('=')[0];
    if (TRACKING_PARAMS.test(k)) continue;
    kept.push(pairs[i]);
  }
  if (!kept.length) return base;
  kept.sort();
  return base + '?' + kept.join('&');
}
function isGenericDashboardUrl(u) {
  if (!u) return false;
  var clean = String(u).trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (/\/(tupantalla(\/mensajes)?|panel|dashboard|inbox|mensajes|mi-cuenta|perfil|avisos|my-account)$/i.test(clean)) return true;
  if (/buscar\/alumnos\.aspx$/i.test(clean) && !/[?&]id=/i.test(u)) return true;
  return false;
}
function sanitizeForSheets(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v;
  var s = String(v);
  if (!s) return '';
  // Si comienza con =, +, -, @, tab o retorno de carro
  if (/^[=+\-@\t\r]/.test(s)) {
    // Si es un valor numérico legítimo (ej. -500, +12.5, -0.75, 12000), preservar como numérico
    if (/^[+\-]?\d+(\.\d+)?$/.test(s.trim())) {
      return Number(s.trim());
    }
    // Neutralizar anteponiendo apóstrofe (') para que Sheets lo interprete como texto literal
    return "'" + s;
  }
  return s;
}

var NON_NAMES_RX = /^(un|una|nuevo|nueva|alumno|alumna|hola|tusclases|superprof|el|la|tu|tienes|alguien|usuario|estudiante|profesor|profesora|profe|docente|tutor|tutora|clase|clases|aviso|solicitud|consulta|mensaje|ayuda|urgente|particular|particulares|online|presencial|matematica|matematicas|fisica|quimica|fisicoquimica|biologia|biofisica|bioquimica|algebra|analisis|calculo|geometria|trigonometria|estadistica|ingles|lengua|historia|geografia|cbc|ubaxxi|uba|utn|unlp|secundario|primario|universitario|terciario|colegio|escuela|facultad|instituto|examen|parcial|final|recuperatorio|ingreso|apoyo|repaso)$/i;

function cleanName(n) {
  n = String(n || '').replace(/<[^>]*>?/g, ' ').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]/g, '').trim().split(/\s+/).slice(0, 2).join(' ');
  if (!n || n.length < 2 || n.length > 30) return '';
  var first = norm(n.split(' ')[0]);
  var full = norm(n);
  if (NON_NAMES_RX.test(first) || NON_NAMES_RX.test(full)) return '';
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function firstName(n) { return cleanName(n).split(' ')[0] || ''; }

/* ---------- Detección ---------- */
function detectSubjects(t) {
  var n = norm(t), out = [];
  SUBJECTS.forEach(function (s) { if (s.re.test(n)) out.push(s); });
  // si aparece fisicoquímica, "química" suelta es redundante
  if (out.some(function (s) { return s.key === 'fisicoquimica'; })) out = out.filter(function (s) { return s.key !== 'quimica' || /\bquimica (general|inorganica|organica)/.test(n); });
  if (out.some(function (s) { return s.key === 'analisis' || s.key === 'algebra'; })) out = out.filter(function (s) { return s.key !== 'matematica'; });
  return out;
}
function detectLevel(t) {
  var n = norm(t);
  for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].re.test(n)) return LEVELS[i];
  return null;
}
function detectModality(t) {
  var n = norm(t), on = RX.online.test(n), pre = RX.presencial.test(n);
  if (on && pre) return 'ambas'; if (on) return 'online'; if (pre) return 'presencial'; return 'sin dato';
}
function detectNeed(t) {
  var n = norm(t);
  if (/recuperatorio/.test(n)) return 'recuperatorio';
  if (/\bfinal(es)?\b/.test(n) && !/a final(es)? de/.test(n)) return 'final';
  if (/parcial/.test(n)) return 'parcial';
  if (/ingreso|admision/.test(n)) return 'ingreso';
  if (/examen|prueba|evaluacion|integrador/.test(n)) return 'examen';
  if (RX.recurring.test(n)) return 'apoyo regular';
  return '';
}
function extractName(subject, body) {
  var pats = [
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ][a-záéíóúñ]*\.?)?) (?:te ha enviado|te envió|te envio|te ha escrito|te escribió|te escribio|quiere|está interesad|esta interesad|te contactó|te contacto|te ha contactado|busca|necesita|solicita|te respondió|te respondio|te ha respondido|ha respondido|te ha dejado|te dejó|te dejo)/,
    /(?:[Ss]olicitud|[Mm]ensaje|[Cc]onsulta|[Rr]espuesta) de ([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ]\.?)?)/,
    /(?:[Aa]lumno|[Aa]lumna|[Nn]ombre|[Ee]studiante|[Ii]nteresad[oa])\s*:\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ][a-záéíóúñ]*)?)/
  ];
  var srcs = [subject || '', String(body || '').slice(0, 1500)];
  for (var s = 0; s < srcs.length; s++) for (var p = 0; p < pats.length; p++) {
    var m = srcs[s].match(pats[p]); if (m) { var c = cleanName(m[1]); if (c) return c; }
  }
  return '';
}
function extractLinks(html) {
  var out = [], re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, m;
  while ((m = re.exec(String(html || '')))) out.push({ url: m[1].replace(/&amp;/g, '&'), text: stripHtml(m[2]).replace(/\s+/g, ' ').trim() });
  return out;
}
function findSource(from) {
  for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i].from.test(from || '')) return SOURCES[i];
  return null;
}
function ageDays(d, now) { if (!d) return null; return (now.getTime() - new Date(d).getTime()) / 86400000; }

/* ---------- Extracción desde email ---------- */
/** email: {id, threadId, from, subject, date, plain, html}. Devuelve {items:[...], ignored:'motivo'|null} */
function extractFromEmail(email, cfg) {
  cfg = cfg || DEFAULT_CONFIG;
  var src = findSource(email.from);
  if (!src) return { items: [], ignored: 'remitente no reconocido' };
  var plain = cutFooter(email.plain || stripHtml(email.html));
  if (cfg.TEXTO_IGNORAR) { try { plain = plain.replace(new RegExp(cfg.TEXTO_IGNORAR, 'gi'), ' '); } catch (e) { } }
  var gmailLink = email.threadId ? 'https://mail.google.com/mail/u/0/#all/' + email.threadId : '';

  if (src.key === 'google_alerts') {
    var items = [], seen = {};
    extractLinks(email.html).forEach(function (l) {
      if (!src.item.test(l.url) || l.text.length < 5 || /ver (todos|mas)|see all|unsubscribe|baja|crear alerta/i.test(l.text)) return;
      var cu = canonicalUrl(l.url);
      if (!cu || /google\.[a-z.]+\/alerts/i.test(cu)) return;
      if (seen[cu]) return;
      seen[cu] = 1;

      var snippet = '';
      if (plain) {
        var lines = plain.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].indexOf(l.text) >= 0) {
            if (i + 1 < lines.length) {
              snippet = lines[i + 1];
            }
            break;
          }
        }
      }
      var fullText = l.text + (snippet ? '\n' + snippet : '');

      items.push({
        source: src.key,
        sourceLabel: src.label,
        kind: 'tutoring',
        url: cu,
        gmailLink: gmailLink,
        title: l.text.slice(0, 200),
        text: fullText,
        studentName: extractName(l.text, snippet),
        publishedAt: null,
        threadId: email.threadId || '',
        msgId: email.id || ''
      });
    });
    return { items: items, ignored: items.length ? null : 'alerta sin enlaces reconocibles' };
  }

  if (!src.multi) {
    var ns = norm(email.subject), nb = norm(plain.slice(0, 1500));
    if (RX.outgoing && (RX.outgoing.test(ns) || RX.outgoing.test(nb))) return { items: [], ignored: 'confirmación de contacto saliente' };
    if (RX.adConfirmation && (RX.adConfirmation.test(ns) || (RX.adConfirmation.test(nb) && !/interesad|solicitud|respond/i.test(ns)))) return { items: [], ignored: 'confirmación de publicación de aviso' };
    if (RX.noRequest.test(ns) || !(RX.request.test(ns) || RX.request.test(nb))) return { items: [], ignored: 'no es solicitud de alumno' };
    var links = extractLinks(email.html).filter(function (l) { return src.link.test(l.url) && !/baja|unsubscribe|preferenc|ayuda|help|faq|legal|privac|condicion/i.test(l.url + ' ' + l.text); });

    var isBulletin = /alerta.*alumnos?|nuevos alumnos|alumnos buscando/i.test(email.subject + ' ' + plain);
    var studentReqLinks = links.filter(function (l) {
      return /(?:buscar\/alumnos\.aspx\?.*id=|\/alumnos\/\d+|\/solicitudes?\/|\/aviso-alumno\/|\/mensajes\/\d+|\d{5,}\.aspx)/i.test(l.url);
    });

    if (isBulletin && studentReqLinks.length > 1) {
      var tcItems = [], tcSeen = {};
      studentReqLinks.forEach(function (l) {
        var cu = canonicalUrl(l.url);
        if (tcSeen[cu]) return;
        tcSeen[cu] = 1;
        tcItems.push({
          source: src.key, sourceLabel: src.label, kind: 'tutoring', url: l.url, gmailLink: gmailLink,
          title: l.text.length > 5 ? l.text : (email.subject || ''),
          text: (email.subject || '') + '\n' + l.text + '\n' + plain.slice(0, 1500),
          studentName: extractName(l.text, plain), publishedAt: email.date, threadId: email.threadId || '', msgId: email.id || ''
        });
      });
      if (tcItems.length) return { items: tcItems, ignored: null };
    }

    var best = links.filter(function (l) { return /mensaj|alumn|solicitud|contact|respond|conversa|inbox|ver|pantalla|aviso|buscar\/alumnos/i.test(l.url + ' ' + l.text); })[0] || links[0];
    return { items: [{ source: src.key, sourceLabel: src.label, kind: 'tutoring', url: best ? best.url : '', gmailLink: gmailLink,
      title: email.subject || '', text: (email.subject || '') + '\n' + plain.slice(0, 3000), studentName: extractName(email.subject, plain),
      publishedAt: email.date, threadId: email.threadId || '', msgId: email.id || '' }], ignored: null };
  }
  var items = [], seen = {};
  extractLinks(email.html).forEach(function (l) {
    if (!src.item.test(l.url) || l.text.length < 8 || /ver (todos|mas)|see all|unsubscribe|baja/i.test(l.text)) return;
    var cu = canonicalUrl(l.url); if (seen[cu]) return; seen[cu] = 1;
    items.push({ source: src.key, sourceLabel: src.label, kind: src.kind === 'mixed' ? '' : src.kind, url: l.url, gmailLink: gmailLink,
      title: l.text.slice(0, 200), text: l.text, studentName: '', publishedAt: email.date, threadId: email.threadId || '', msgId: email.id || '' });
  });
  return { items: items, ignored: items.length ? null : 'alerta sin enlaces reconocibles' };
}

/* ---------- Feeds (APIs públicas) ---------- */
function parseGetOnBoard(json) {
  var data = (json && json.data) || [];
  return data.map(function (j) {
    var a = j.attributes || {};
    var desc = stripHtml([a.description, a.functions, a.desirable].join(' ')).slice(0, 4000);
    return { source: 'getonbrd', sourceLabel: 'GetOnBoard', kind: 'job', url: (j.links && j.links.public_url) || '', gmailLink: '',
      title: a.title || '', text: (a.title || '') + '\n' + desc + (a.remote ? '\nremoto' : ''), studentName: '', remote: a.remote === true && a.remote_modality !== 'hybrid',
      publishedAt: a.published_at ? new Date(a.published_at * 1000) : null, lang: a.lang || '', company: '' };
  });
}
function parseRemotive(json) {
  return ((json && json.jobs) || []).map(function (j) {
    return { source: 'remotive', sourceLabel: 'Remotive', kind: 'job', url: j.url || '', gmailLink: '', title: j.title || '',
      text: (j.title || '') + '\n' + stripHtml(j.description).slice(0, 4000) + '\nremoto ' + (j.candidate_required_location || ''),
      studentName: '', publishedAt: j.publication_date ? new Date(j.publication_date) : null, lang: 'en', company: j.company_name || '' };
  });
}

function extractXmlTag(xml, tag) {
  var re = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  var m = xml.match(re);
  if (!m) return '';
  var val = m[1].trim();
  var cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  return cdata ? cdata[1] : val;
}

function parseRss(xmlText, srcKey, srcLabel) {
  srcKey = srcKey || 'rss';
  srcLabel = srcLabel || 'RSS Feed';
  if (!xmlText) return [];
  var items = [];

  // Detectar si contiene <item> (RSS 2.0) o <entry> (Atom)
  var isAtom = /<entry\b/i.test(xmlText);
  var entryRe = isAtom ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi : /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  var m;

  while ((m = entryRe.exec(xmlText)) !== null) {
    var rawItem = m[1];
    var title = extractXmlTag(rawItem, 'title');

    // Link: en Atom suele ser <link href="..."/> o <link rel="alternate" href="..."/>
    var link = '';
    if (isAtom) {
      var linkHrefMatch = rawItem.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
      link = linkHrefMatch ? linkHrefMatch[1] : extractXmlTag(rawItem, 'link');
    } else {
      link = extractXmlTag(rawItem, 'link');
    }

    // Fecha: pubDate, dc:date, published, o updated
    var pubDateStr = extractXmlTag(rawItem, 'pubDate') ||
                     extractXmlTag(rawItem, 'dc:date') ||
                     extractXmlTag(rawItem, 'published') ||
                     extractXmlTag(rawItem, 'updated');

    // Descripción / Contenido
    var desc = extractXmlTag(rawItem, 'description') ||
               extractXmlTag(rawItem, 'content:encoded') ||
               extractXmlTag(rawItem, 'content') ||
               extractXmlTag(rawItem, 'summary');

    // Autor
    var author = extractXmlTag(rawItem, 'dc:creator') ||
                 extractXmlTag(rawItem, 'author');
    if (isAtom && !author) {
      var authorNameMatch = rawItem.match(/<author\b[^>]*>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i);
      if (authorNameMatch) author = authorNameMatch[1];
    }

    var cleanTitle = stripHtml(title).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    var cleanDesc = stripHtml(desc).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').slice(0, 3000).trim();
    var cleanLink = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    var cleanAuthor = author ? author.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';

    var pubDate = null;
    if (pubDateStr) {
      var rawDate = pubDateStr.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      var d = new Date(rawDate);
      if (!isNaN(d.getTime())) pubDate = d;
    }

    var fullText = (cleanTitle ? cleanTitle + '\n' : '') + cleanDesc;

    items.push({
      source: srcKey,
      sourceLabel: srcLabel,
      kind: 'tutoring',
      url: cleanLink,
      gmailLink: '',
      title: cleanTitle,
      text: fullText,
      studentName: cleanAuthor || extractName(cleanTitle, cleanDesc),
      publishedAt: pubDate,
      date: pubDate, // Expone ambas propiedades para evitar date bugs
      threadId: '',
      msgId: ''
    });
  }
  return items;
}

function parseYouTubeComments(json, videoCtx) {
  videoCtx = videoCtx || {};
  if (!json || !Array.isArray(json.items)) return [];
  var items = [];
  var videoId = videoCtx.videoId || '';
  var videoTitle = videoCtx.videoTitle || '';
  var channelTitle = videoCtx.channelTitle || 'YouTube';

  json.items.forEach(function (item) {
    if (!item) return;
    var top = item.snippet && item.snippet.topLevelComment;
    var snip = top && top.snippet ? top.snippet : (item.snippet || {});
    var commentId = (top && top.id) || item.id || '';
    var commentVideoId = snip.videoId || videoId;
    var rawText = snip.textDisplay || snip.textOriginal || '';
    var cleanText = stripHtml(rawText).trim();
    if (!cleanText) return;

    var author = snip.authorDisplayName ? String(snip.authorDisplayName).replace(/^@/, '').trim() : '';
    var pubDate = snip.publishedAt ? new Date(snip.publishedAt) : null;
    if (pubDate && isNaN(pubDate.getTime())) pubDate = null;

    var permalink = (commentVideoId && commentId)
      ? ('https://www.youtube.com/watch?v=' + commentVideoId + '&lc=' + commentId)
      : (commentVideoId ? ('https://www.youtube.com/watch?v=' + commentVideoId) : '');

    var fullText = cleanText;
    if (videoCtx.subject) fullText += '\n[Materia video: ' + videoCtx.subject + ']';
    if (videoCtx.level) fullText += '\n[Nivel video: ' + videoCtx.level + ']';

    items.push({
      source: 'youtube',
      sourceLabel: 'YouTube (' + channelTitle + ')',
      sourceKey: 'youtube',
      kind: 'tutoring',
      url: permalink,
      gmailLink: '',
      title: 'Comentario en ' + (videoTitle || commentVideoId),
      text: fullText,
      studentName: author,
      publishedAt: pubDate,
      threadId: '',
      msgId: commentId
    });
  });

  return items;
}

function isLocationIncompatible(loc) {
  var l = norm(loc);
  if (!l || /worldwide|anywhere|any|latam|latin|america|south america|argentina|remot/i.test(l)) return false;
  return true;
}

/* ---------- Claves ---------- */
function makeId(it) {
  var day = it.publishedAt ? new Date(it.publishedAt).toISOString().slice(0, 10) : '';
  var cu = canonicalUrl(it.url);
  var base = (cu && !isGenericDashboardUrl(cu)) ? (it.source + '|' + cu) : (it.source + '|' + norm(it.studentName) + '|' + norm(it.title).slice(0, 80) + '|' + day + '|' + (it.msgId || ''));
  return 'OP-' + hashStr(base).slice(0, 12);
}
function dedupKey(it, subj) {
  var cu = canonicalUrl(it.url);
  if (cu && !isGenericDashboardUrl(cu)) return 'u:' + cu;
  if (it.kind === 'tutoring' && it.studentName) {
    var clean = cleanName(it.studentName);
    var isFull = clean.indexOf(' ') > 0;
    return isFull ? ('fn:' + norm(clean) + '|' + (subj ? subj.key : '')) : ('n:' + norm(clean) + '|' + (subj ? subj.key : '') + '|' + (it.msgId || ''));
  }
  return 't:' + norm(it.title).slice(0, 80) + '|' + norm(it.company || '');
}
function contactKeys(name, materia, url) {
  var keys = [], s = detectSubjects(materia || '')[0];
  var cu = canonicalUrl(url);
  if (cu && !isGenericDashboardUrl(cu)) keys.push('u:' + cu);
  var clean = cleanName(name) || name;
  if (clean) {
    var isFull = clean.indexOf(' ') > 0;
    if (isFull) {
      keys.push('fn:' + norm(clean) + '|' + (s ? s.key : ''));
    }
  }
  return keys;
}

/* ---------- Evaluación y puntuación ---------- */
/** index: {ids:{}, keys:{}}; contacted: {key:true}. Devuelve registro completo. */
/**
 * Contactabilidad multifuente. Un enlace a una publicación NO equivale a un medio
 * privado para escribir al autor. Ninguna vía habilita envíos automáticos.
 * El resultado es una recomendación de revisión, no una autorización de contacto.
 */
function assessContactability(it, directInquiry) {
  var platform = norm((it.sourceKey || it.source || it.sourceLabel || '') + ' ' + (it.platform || ''));
  var text = norm(it.text || '');
  var url = String(it.url || '');
  var social = /youtube|tiktok|instagram|facebook|reddit|telegram|discord|twitter|\bx\b|foro|utnianos/.test(platform);
  var addressedToCreator = /(?:^|\n|[.!?]\s*)(?:hola[,! ]*)?(?:profe|profesor|profesora|maestro|maestra)[,! ]+(?:vos|tu|usted|das|dictas|cobras|haces|ensenas|podrias)/.test(text) ||
    /(?:\b(?:vos|tu|usted)\s+)?(?:das|dictas|cobras)\s+clases\s+particulares/.test(text) ||
    /(?:cuanto|que)\s+cobras\s+(?:por\s+)?(?:la\s+)?clase/.test(text) ||
    /(?:estudiar|aprender|tener clases|tomar clases)\s+(?:con\s+vos|con\s+usted|contigo)/.test(text) ||
    /(?:me\s+gustar[ií]a|quisiera|quiero)\s+(?:estudiar|aprender|tener clases|tomar clases)\s+con\s+(?:vos|usted)/.test(text);
  var openRequest = /(?:\bbusco\s+(?:un[a]?\s+)?(?:profe|profesor|profesora|docente|tutor)|\bnecesito\s+(?:un[a]?\s+)?(?:profe|profesor|profesora|docente|tutor)|\balguien\s+(?:conoce|recomienda|da|que\s+de)|\bconocen\s+(?:un[a]?\s+)?(?:profe|profesor)|\brecomiendan\s+(?:un[a]?\s+)?(?:profe|profesor)|\balgun\s+(?:profe|profesor)\b)/.test(text);
  if (directInquiry) return { label: 'Contacto en plataforma', via: 'Responder a consulta entrante en plataforma', action: 'Revisar mensaje recibido y responder manualmente', notify: true, reachable: true };
  if (!url) return { label: 'Sin vía de contacto', via: '', action: 'Sin enlace verificable; no enviar oferta', notify: false, reachable: false };
  if (social) {
    if (addressedToCreator) return { label: 'Dirigido al creador', via: 'Comentario público', action: 'No intervenir comercialmente en la consulta dirigida a otro docente', notify: false, reachable: false };
    if (!openRequest) return { label: 'Sin solicitud abierta', via: 'Publicación o comentario público', action: 'No contactar; no expresó búsqueda abierta de docente', notify: false, reachable: false };
    if (/youtube|utnianos|foro/.test(platform)) return { label: 'Respuesta pública posible', via: 'Respuesta pública al comentario/hilo', action: 'Verificar normas, pertinencia y que admita respuestas; intervención manual', notify: true, reachable: true };
    return { label: 'Revisar canal y permisos', via: 'Respuesta pública sin verificar', action: 'Comprobar acceso y normas del grupo/plataforma; no enviar DM automático', notify: false, reachable: false };
  }
  if (/tusclases|superprof|classgap/.test(platform) || /tusclases\.com|superprof\.|classgap\./.test(url)) {
    return { label: 'Contacto en plataforma', via: 'Anuncio o mensajería del portal', action: 'Comprobar vigencia y contactar manualmente dentro de la plataforma', notify: true, reachable: true };
  }
  return { label: 'Revisar canal y permisos', via: 'Enlace a publicación, no a contacto directo', action: 'Comprobar si admite propuestas antes de escribir', notify: false, reachable: false };
}

/** Convierte una tarifa ARS a referencia USD; no fija el medio de pago ni tipo efectivo. */
function usdReference(cfg, now) {
  cfg = cfg || DEFAULT_CONFIG;
  if (!cfg.MOSTRAR_EQUIVALENTE_USD) return '';
  var rate = Number(cfg.USD_ARS_VENTA), date = new Date(cfg.USD_FECHA_COTIZACION || '');
  var time = new Date(now || new Date()).getTime();
  if (!Number.isFinite(rate) || rate < 100 || rate > 100000 || isNaN(date.getTime())) return '';
  var hours = (time - date.getTime()) / 3600000;
  if (hours < -1 || hours > 96) return ''; // permite feriados y fines de semana, sin cotización vencida
  var amount = Number(cfg.TARIFA) / rate;
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return ' (aprox. USD ' + amount.toFixed(2).replace('.', ',') + ' al dólar oficial vendedor de referencia; sujeto a cotización y medio de pago)';
}

function evaluate(it, cfg, now, index, contacted) {
  cfg = cfg || DEFAULT_CONFIG; index = index || {}; index.ids = index.ids || {}; index.keys = index.keys || {}; contacted = contacted || {};
  var W = cfg.PESOS || DEFAULT_CONFIG.PESOS, n = norm(it.text), reasons = [], discard = '';
  var mainText = it.text ? String(it.text).split('\n[Materia video:')[0] : '';
  var subs = detectSubjects(it.kind === 'job' ? it.title : (mainText || it.text));
  if (!subs.length && !NOT_TAUGHT.test(norm(mainText))) subs = detectSubjects(it.kind === 'job' ? it.title : it.text);
  if (!it.kind) { if (!subs.length && !NOT_TAUGHT.test(norm(mainText))) subs = detectSubjects(it.text); it.kind = subs.length && subs[0].kind === 'job' ? 'job' : 'tutoring'; }
  var mine = subs.filter(function (s) { return s.kind === it.kind; });
  var subj = mine.sort(function (a, b) { return b.w - a.w; })[0] || null;
  var level = detectLevel(it.text), modality = detectModality(it.text), need = detectNeed(it.text);
  var age = ageDays(it.publishedAt, now);
  var minor = it.kind === 'tutoring' && (RX.parent.test(n) || (level && (level.key === 'secundario' || level.key === 'primario')));
  var rec = { id: makeId(it), source: it.sourceLabel || it.source, sourceKey: it.source, kind: it.kind, url: it.url || '',
    gmailLink: it.gmailLink || '', threadId: it.threadId || '', title: it.title || '', studentName: it.studentName || '',
    subject: subj ? subj.label : '', subjectKey: subj ? subj.key : '', level: level ? level.label : '', levelKey: level ? level.key : '',
    need: need, publishedAt: it.publishedAt || '', detectedAt: now, modality: modality, minor: !!minor, parent: RX.parent.test(n),
    compatible: '', score: 0, reasons: '', status: 'Evaluado', message: '', dedupKey: '', contactability: '', contactChannel: '', contactAction: '' };
  rec.dedupKey = dedupKey(it, subj);

  // Diferenciación de origen: Inbound perfil docente vs Descubrimiento proactivo
  var isYouTube = (it.source === 'youtube' || it.sourceKey === 'youtube');
  var isProactiveDiscovery = (
    isYouTube ||
    it.source === 'google_alerts' || it.sourceKey === 'google_alerts' ||
    it.source === 'utnianos' || it.sourceKey === 'utnianos' ||
    /feed|rss|alert|bulletin|boletin/i.test(it.sourceKey || '') ||
    /buscar\/alumnos\.aspx/i.test(it.url || '')
  );
  var isDirectInquiry = !isProactiveDiscovery && it.kind === 'tutoring' && (
    it.sourceKey === 'inbound' ||
    /interesad|solicitud de clase|te ha enviado una solicitud|consulta entrante|mensaje de/i.test(it.title + ' ' + (it.text || '').slice(0, 300))
  );

  var reach = assessContactability(it, isDirectInquiry);
  rec.contactability = reach.label; rec.contactChannel = reach.via; rec.contactAction = reach.action;
  reasons.push('[Contactabilidad: ' + reach.label + ']');

  if (isDirectInquiry) {
    reasons.push('[Origen: Inbound perfil docente]');
  } else if (isYouTube) {
    reasons.push('[Origen: Descubrimiento proactivo (YouTube)]');
  } else if (isProactiveDiscovery) {
    reasons.push('[Origen: Descubrimiento proactivo]');
  }

  // Exclusiones duras
  var isContacted = false;
  var cu = canonicalUrl(rec.url);
  if (cu && !isGenericDashboardUrl(cu) && contacted['u:' + cu]) {
    isContacted = true;
  } else if (contacted[rec.dedupKey]) {
    isContacted = true;
  } else if (rec.studentName && cleanName(rec.studentName).indexOf(' ') > 0) {
    var fnKey = 'fn:' + norm(cleanName(rec.studentName)) + '|' + (subj ? subj.key : '');
    if (contacted[fnKey]) isContacted = true;
  }

  var isHybrid = RX.hybrid && RX.hybrid.test(n);
  var isOptionalRemote = RX.optionalRemote && RX.optionalRemote.test(n);
  var isMandatoryHybrid = (RX.mandatoryHybrid && RX.mandatoryHybrid.test(n)) || (isHybrid && !isOptionalRemote);
  var isForeignRes = (RX.foreignResidence && RX.foreignResidence.test(n)) || (it.candidate_required_location && isLocationIncompatible(it.candidate_required_location));

  if (index.ids[rec.id]) discard = 'duplicado (mismo ID)';
  else if (index.keys[rec.dedupKey]) discard = 'duplicado (misma solicitud ya registrada)';
  else if (isContacted) discard = 'ya contactado previamente';
  else if (RX.fraud.test(n)) discard = 'señales de fraude';
  else if (isYouTube && !YT_INTENT_RX.test(n) && !reach.reachable) discard = 'comentario educativo sin intención de contratación (consulta gratuita o agradecimiento)';
  else if (isYouTube && YT_FREE_EXCLUDE_RX.test(n) && !YT_INTENT_RX.test(n)) discard = 'consulta técnica puntual del video o agradecimiento (gratuita)';
  else if (isProactiveDiscovery && it.kind === 'tutoring' && RX.teacherOffer.test(n)) discard = 'aviso de otro docente (ofrece clases)';
  else if (isProactiveDiscovery && it.kind === 'tutoring' && RX.formalJobOffer.test(n)) discard = 'oferta institucional/concurso docente';
  else if (isProactiveDiscovery && it.kind === 'tutoring' && !subj) discard = 'materia fuera de perfil o no identificada';
  else if (isProactiveDiscovery && it.kind === 'tutoring' && !isYouTube && !/(?:busco|buscan|necesito|necesitan|preciso|precisan|alguien|recomiendan|recomienden|ayuda|profe|profesor|profesora|tutor|rendir|preparar|examen|parcial|final|recuperatorio|ingreso|clase)/i.test(n)) discard = 'sin evidencia de búsqueda de profesor';
  else if (it.kind === 'job' && isMandatoryHybrid) discard = 'modalidad híbrida (exige presencialidad obligatoria)';
  else if (it.kind === 'job' && isForeignRes) discard = 'incompatible con residencia en Argentina (requiere residencia en otro país)';
  else if (modality === 'presencial' && !isOptionalRemote) discard = 'exige presencialidad';
  else if (age !== null && age > cfg.MAX_ANTIGUEDAD_DIAS) discard = 'antigua (' + Math.floor(age) + ' días)';
  else if (it.kind === 'job' && (RX.english.test(n) || it.lang === 'en')) discard = 'requiere inglés avanzado / publicación en inglés';
  else if (it.kind === 'job' && JOB_EXCLUDE.test(norm(it.title))) discard = 'rol fuera de perfil';
  else if (it.kind === 'job' && it.remote === false && !isOptionalRemote) discard = 'no es remoto';
  else if (!subj && NOT_TAUGHT.test(n)) discard = 'materia/rol fuera de perfil';
  else if (!subj && it.kind === 'job') discard = 'rol no compatible';

  if (!discard && it.kind === 'job' && isHybrid && isOptionalRemote) {
    modality = 'online';
    rec.modality = 'online';
    reasons.push('modalidad con opción 100% online confirmada');
  } else if (!discard && it.kind === 'job' && modality === 'sin dato') {
    reasons.push('pendiente de comprobar modalidad online/remota');
  }

  // Puntuación interpretable
  var pts = {};
  pts.compat = subj ? Math.round(W.compat * subj.w) : (it.kind === 'tutoring' ? Math.round(W.compat * 0.4) : 0);
  reasons.push('compat ' + pts.compat + (subj ? ' (' + subj.label + ')' : ' (materia no identificada)'));
  pts.recencia = age === null ? Math.round(W.recencia * 0.2) : age <= 1 ? W.recencia : age <= 3 ? Math.round(W.recencia * 0.66) : age <= 7 ? Math.round(W.recencia * 0.33) : 0;
  reasons.push('recencia ' + pts.recencia + (age === null ? ' (fecha no verificada)' : ' (' + age.toFixed(1) + ' d)'));
  pts.urgencia = RX.urgent.test(n) ? W.urgencia : isDirectInquiry ? W.urgencia : RX.exam.test(n) ? Math.round(W.urgencia * 0.6) : 0;
  if (pts.urgencia) reasons.push('urgencia ' + pts.urgencia + (isDirectInquiry && !RX.urgent.test(n) ? ' (consulta directa a tu aviso)' : ''));
  pts.recurrencia = RX.recurring.test(n) ? W.recurrencia : (level && /cbc|ubaxxi|ingreso/.test(level.key) ? Math.round(W.recurrencia * 0.5) : 0);
  if (pts.recurrencia) reasons.push('recurrencia ' + pts.recurrencia);
  var onlineMod = (isDirectInquiry && modality === 'sin dato') ? 'aviso online' : (isYouTube && modality === 'sin dato') ? 'online (canal digital)' : modality;
  pts.online = (modality === 'online' || (isDirectInquiry && modality === 'sin dato') || (isYouTube && modality === 'sin dato')) ? W.online : modality === 'ambas' ? Math.round(W.online * 0.7) : Math.round(W.online * 0.4);
  reasons.push('modalidad ' + pts.online + ' (' + onlineMod + ')');
  var clar = (subj ? 1 : 0) + (level ? 1 : 0) + (need ? 1 : 0);
  pts.claridad = Math.round(W.claridad * clar / 3); reasons.push('claridad ' + pts.claridad);
  if (isDirectInquiry && (it.text || '').length < 350) reasons.push('revisar mensaje en plataforma');
  pts.contacto = reach.reachable ? W.contacto : 0;
  pts.cobro = it.kind === 'tutoring' ? W.cobro : Math.round(W.cobro * 0.2);
  var total = 0; for (var k in pts) total += pts[k];
  rec.score = Math.max(0, Math.min(100, total));
  if (discard) {
    rec.status = 'Descartado';
    rec.compatible = 'No';
    rec.reasons = sanitizeForSheets('DESCARTE: ' + discard + ' | ' + reasons.join('; '));
    rec.title = sanitizeForSheets(rec.title);
    rec.studentName = sanitizeForSheets(rec.studentName);
    rec.subject = sanitizeForSheets(rec.subject);
    return rec;
  }
  rec.compatible = rec.score >= cfg.UMBRAL_ALTA ? 'Alta' : rec.score >= cfg.UMBRAL_MIN ? 'Media' : 'Baja';
  if (!subj || (it.kind === 'job' && modality === 'sin dato')) rec.compatible = 'Revisar';
  rec.reasons = sanitizeForSheets(reasons.join('; '));
  rec.title = sanitizeForSheets(rec.title);
  rec.studentName = sanitizeForSheets(rec.studentName);
  rec.subject = sanitizeForSheets(rec.subject);
  if (rec.compatible === 'Baja' || (it.kind === 'job' && modality === 'sin dato')) {
    rec.status = 'Evaluado';
    return rec;
  }
  if (it.kind === 'tutoring' && !reach.reachable) {
    rec.status = 'Evaluado';
    rec.compatible = 'Revisar';
    return rec;
  }
  rec.message = sanitizeForSheets(it.kind === 'job' ? composeJobMessage(rec, cfg) : composeMessage(rec, cfg));
  rec.status = 'Pendiente de aprobación';
  return rec;
}

/* ---------- Redacción ---------- */
function pick(arr, seed, salt) { return arr[(hashInt(seed + '#' + salt)) % arr.length]; }
var LEVEL_TXT = { cbc: ' del CBC', ubaxxi: ' de UBA XXI', ingreso: ' para el ingreso', universitario: ' de la facultad', terciario: ' del terciario', secundario: ' del secundario', primario: ' de primaria' };

/** Enlaces de acreditación profesional (sólo URLs HTTPS específicas y configuradas). */
function validTeachingProfileUrl(raw, domain) {
  var url = String(raw || '').trim();
  if (!/^https:\/\//i.test(url) || /[\s<>\\]/.test(url)) return '';
  var match = /^https:\/\/([^/:?#]+)(?::443)?(\/[^?#]*)?(?:[?#].*)?$/i.exec(url);
  if (!match) return '';
  var host = match[1].toLowerCase().replace(/^www\./, '');
  if (host !== domain) return '';
  var path = match[2] || '/';
  if (path === '/' || /^\/(?:login|signin|registro|registrarse|search|buscar|alumnos|dashboard|area-profesores|mensajes|inbox|ayuda|contacto|dar-clases-particulares)(?:\/|\.|$)/i.test(path)) return '';
  return 'https://www.' + domain + path;
}
function teachingProfileReferences(cfg) {
  cfg = cfg || DEFAULT_CONFIG;
  if (!cfg.MOSTRAR_PERFILES_DOCENTES) return '';
  var tus = validTeachingProfileUrl(cfg.PERFIL_TUSCLASES_URL, 'tusclases.com.ar');
  var sup = validTeachingProfileUrl(cfg.PERFIL_SUPERPROF_URL, 'superprof.com.ar');
  var refs = [];
  if (tus) refs.push('Tusclases: ' + tus);
  if (sup) refs.push('Superprof: ' + sup);
  return refs.length ? 'Si querés conocer mi perfil docente antes de coordinar, podés consultarlo acá:\n' + refs.join('\n') : '';
}

function composeMessage(r, cfg) {
  cfg = cfg || DEFAULT_CONFIG;
  var s = r.id, name = firstName(r.studentName), mat = r.subject || '', lv = LEVEL_TXT[r.levelKey] || '';
  var years = new Date().getFullYear() - (cfg.ANIO_INICIO || 2010);
  var g = name ? pick(['Hola ' + name + ', ¿cómo estás?', '¡Hola ' + name + '!', 'Hola ' + name + ', ¿qué tal?'], s, 'g')
    : pick(['Hola, ¿cómo estás?', '¡Hola! ¿Qué tal?', 'Hola, buenas.'], s, 'g');
  var need;
  var who = r.parent ? 'para tu hijo/a ' : '';
  if (!mat) need = pick(['Vi tu consulta por clases particulares ' + who + 'y me interesa ayudarte.', 'Leí tu pedido de clases ' + who + 'y quería escribirte.'], s, 'n');
  else if (r.need === 'parcial' || r.need === 'recuperatorio') need = pick(['Vi que necesitás preparar el ' + r.need + ' de ' + mat + lv + '.', 'Leí que tenés que rendir el ' + r.need + ' de ' + mat + lv + ' y buscás ayuda.'], s, 'n');
  else if (r.need === 'final') need = pick(['Vi que estás preparando el final de ' + mat + lv + '.', 'Leí que tenés que rendir el final de ' + mat + lv + '.'], s, 'n');
  else if (r.need === 'ingreso' || r.levelKey === 'ingreso') need = 'Vi que ' + (r.parent ? 'tu hijo/a se está' : 'te estás') + ' preparando para el ingreso y necesitás reforzar ' + mat + '.';
  else if (r.need === 'examen') need = 'Vi que ' + (r.parent ? 'tu hijo/a tiene' : 'tenés') + ' que rendir ' + mat + lv + ' y buscás preparación.';
  else if (r.need === 'apoyo regular') need = pick(['Vi que buscás apoyo regular en ' + mat + lv + ' ' + who + '.', 'Leí que necesitás un acompañamiento continuo en ' + mat + lv + '.'], s, 'n').replace(/ \./, '.');
  else need = pick(['Vi tu consulta por clases de ' + mat + lv + ' ' + who + '.', 'Leí que buscás profe de ' + mat + lv + ' ' + who + '.'], s, 'n').replace(/ \./, '.');
  var group = /quimic|fisic|biofis/i.test(mat) ? 'química, física y fisicoquímica' : /biolog/i.test(mat) ? 'biología y química' : 'matemática, análisis y álgebra';
  var exp = pick(['Doy clases particulares desde ' + cfg.ANIO_INICIO + ' y trabajo mucho con ' + group + '.',
    'Hace más de ' + years + ' años que doy clases particulares, principalmente de ' + group + '.',
    'Enseño ' + (mat || group) + ' en clases particulares desde ' + cfg.ANIO_INICIO + ', con alumnos de secundario, ingreso y primeros años de facultad.'], s, 'e');
  var adapt = { secundario: 'Trabajamos a tu ritmo, con ejercicios parecidos a los que toman en el colegio.',
    cbc: 'Preparo alumnos de CBC, así que podemos trabajar sobre el tipo de ejercicios que suelen tomar.',
    ubaxxi: 'Preparo alumnos de UBA XXI, así que podemos enfocarnos en el formato de sus evaluaciones.',
    universitario: 'Podemos trabajar con la guía de tu cátedra y parciales anteriores.',
    ingreso: 'Podemos armar un plan de trabajo según la fecha del examen.',
    terciario: 'Podemos seguir el programa de tu materia y los ejercicios de la cursada.' }[r.levelKey] || '';
  var mod = pick(['Las clases son individuales y online por videollamada; el valor es de ARS ' + fmtMoney(cfg.TARIFA) + ' por hora.',
    'Trabajo online por videollamada, en clases individuales de ARS ' + fmtMoney(cfg.TARIFA) + ' la hora.',
    'Doy clases individuales por videollamada, a ARS ' + fmtMoney(cfg.TARIFA) + ' la hora.'], s, 'm');
  var usd = usdReference(cfg, new Date());
  mod = mod.replace(/(ARS [\d.]+)(?= (?:por hora|la hora))/, function (m) { return m + usd; });
  var minor = (r.minor && !r.parent) ? 'Si sos menor de edad, coordino horarios y pago con tu mamá, papá o adulto responsable.' : '';
  var q = pick(['¿Seguís buscando profesor?', '¿Todavía estás buscando profe?', '¿Seguís necesitando las clases?'], s, 'q');
  var cta = pick(['Si te sirve, tengo disponibilidad ' + cfg.HORARIOS + '; decime qué día te queda cómodo y reservamos la primera clase.',
    'Si querés, coordinamos una primera clase esta semana: tengo lugar ' + cfg.HORARIOS + '. ¿Qué día y horario te viene bien?',
    'Podemos agendar una primera clase: tengo horarios ' + cfg.HORARIOS + '. Contame qué te queda mejor y lo reservamos.'], s, 'c');
  var profiles = teachingProfileReferences(cfg);
  return [g, need + ' ' + exp + (adapt ? ' ' + adapt : ''), mod + (minor ? ' ' + minor : ''), q + ' ' + cta]
    .concat(profiles ? [profiles] : [])
    .concat(['Saludos,\n' + cfg.NOMBRE])
    .join('\n\n').replace(/ {2,}/g, ' ');
}

function composeJobMessage(r, cfg) {
  cfg = cfg || DEFAULT_CONFIG; var s = r.id;
  var g = pick(['Hola, ¿cómo están?', 'Hola, buenas tardes.', 'Hola, ¿qué tal?'], s, 'g');
  var t = r.title ? '"' + r.title.slice(0, 80) + '"' : 'el puesto publicado';
  var body = pick(['Vi la búsqueda de ' + t + ' y me interesa postularme.', 'Les escribo por la búsqueda de ' + t + '.'], s, 'n');
  var exp = pick(['Tengo experiencia en análisis y validación de datos, Excel y Google Sheets, Python y SQL básicos, y atención al cliente.',
    'Trabajo con Excel/Google Sheets, validación y limpieza de datos, Python y SQL básicos; también tengo experiencia en atención al cliente y soporte administrativo.'], s, 'e');
  var rem = 'Trabajo 100% remoto desde La Plata y tengo disponibilidad inmediata.';
  var q = pick(['¿Sigue abierta la búsqueda? Quedo atento para coordinar una entrevista.', '¿La posición sigue disponible? Me encantaría coordinar una charla.'], s, 'q');
  return [g, body + ' ' + exp + ' ' + rem, q, 'Saludos,\n' + cfg.NOMBRE].join('\n\n');
}

/* ---------- Modo B: consultas entrantes directas ---------- */
var INQ_RX = /clase|profe|profesor|apoyo escolar|parcial|final|ingreso|cbc|uba xxi|examen|particular/i;
var INQ_INTENT_RX = /(?:busco|buscan|necesito|necesitan|preciso|queria|quisiera|consultar|consulta|pregunto|interesa|interesad[oa]|averiguar|info|informacion|disponibilidad|dar|tomas|toman)\s+(?:por\s+)?(?:clases?|profe|profesor|profesora|apoyo|tutor)|(?:cuanto|precio|costo|tarifa|honorarios|cobras?|cobran|sale|salen|valor)\s+(?:la|las|por)?\s*(?:clase|hora|mes)|(?:preparar|preparacion|rendir)\s+(?:para\s+)?(?:el\s+|la\s+)?(?:final|parcial|examen|recuperatorio|ingreso)|dar\s+clases/i;
var ACADEMIC_EXCLUDE_RX = /secretaria|academica|academico|departamento de alumnos|bedelia|facultad|catedra|universidad|unlp\.edu|uba\.ar|utn\.edu|extension universitaria|mesa de examen|acta de examen|centro de estudiantes|bedel/i;
var NOREPLY_RX = /no-?reply|noreply|mailer-daemon|notificacion|notification|newsletter|bounce|info@|marketing/i;

/** email: {from, subject, plain, headers:{autoSubmitted, listUnsubscribe, precedence}, fromMe, messageCount} */
function analyzeInbound(email, cfg) {
  cfg = cfg || DEFAULT_CONFIG;
  var h = email.headers || {};
  var fromStr = String(email.from || '');
  var subjStr = String(email.subject || '');
  var plainStr = String(email.plain || '').slice(0, 2000);
  var n = norm(subjStr + ' ' + plainStr);

  if (email.fromMe) return { isInquiry: false, reason: 'enviado por mí' };
  if (findSource(email.from)) return { isInquiry: false, reason: 'plataforma (Modo A)' };
  if (NOREPLY_RX.test(fromStr)) return { isInquiry: false, reason: 'remitente automático' };
  if ((h.autoSubmitted && !/^no$/i.test(h.autoSubmitted)) || h.listUnsubscribe || /bulk|list|junk/i.test(h.precedence || '')) return { isInquiry: false, reason: 'correo automático o masivo' };

  // Filtro estricto contra correos académicos/institucionales (ej. secretaría académica, examen final institucional)
  if (ACADEMIC_EXCLUDE_RX.test(fromStr) || ACADEMIC_EXCLUDE_RX.test(subjStr)) {
    return { isInquiry: false, reason: 'correo académico o institucional' };
  }

  // Si hay lista de remitentes autorizados configurada, verificarla
  if (cfg.MODO_B_REMITENTES_AUTORIZADOS) {
    var allowedList = String(cfg.MODO_B_REMITENTES_AUTORIZADOS).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    if (allowedList.length) {
      var fromNorm = fromStr.toLowerCase();
      var isAllowed = allowedList.some(function (auth) { return fromNorm.indexOf(auth) >= 0; });
      if (!isAllowed) return { isInquiry: false, reason: 'remitente no autorizado en MODO_B_REMITENTES_AUTORIZADOS' };
    }
  }

  // Exigir intención explícita de contratación o búsqueda de clases
  if (!INQ_INTENT_RX.test(n)) return { isInquiry: false, reason: 'no expresa intención de contratar clases' };

  var subs = detectSubjects(n).filter(function (s) { return s.kind === 'tutoring'; });
  if (!subs.length && !/clase|profe|profesor/.test(n)) return { isInquiry: false, reason: 'sin materia ni pedido de clases' };
  if (NOT_TAUGHT.test(n) && !subs.length) return { isInquiry: false, reason: 'materia fuera de perfil' };
  var subj = subs[0] || null, level = detectLevel(n), need = detectNeed(n);
  var name = firstName(fromStr.replace(/<.*>/, '').replace(/"/g, '').trim());
  var parts = [name ? 'Hola ' + name + ', gracias por escribirme.' : 'Hola, gracias por escribirme.'];
  parts.push(subj ? 'Con gusto te ayudo con ' + subj.label + (LEVEL_TXT[level && level.key] || '') + '.' : 'Con gusto te ayudo; doy clases de matemática, física, química y biología.');
  var ask = [];
  if (!subj) ask.push('¿de qué materia se trata?');
  if (!level) ask.push('¿para qué nivel es (secundario, CBC/UBA XXI, ingreso o facultad)?');
  if (!need) ask.push('¿tenés alguna fecha de examen o es apoyo durante la cursada?');
  ask.push('¿qué temas estás viendo?');
  parts.push('Para preparar bien la clase, contame: ' + ask.join(' ') );
  parts.push('Las clases son individuales y online por videollamada, a ARS ' + fmtMoney(cfg.TARIFA) + ' la hora.' +
    ((RX.parent.test(n) || (level && /secundario|primario/.test(level.key))) ? ' Si el alumno es menor de edad, coordino horarios y pago con un adulto responsable.' : ''));
  parts.push('Tengo disponibilidad ' + cfg.HORARIOS + '. Decime qué opción te queda mejor y te confirmo el turno.');
  parts.push('Saludos,\n' + cfg.NOMBRE);
  return { isInquiry: true, reason: 'consulta directa', subject: subj ? subj.label : '', level: level ? level.label : '', name: name, reply: parts.join('\n\n') };
}

function autoSendAllowed(cfg, sentToday, now) {
  if (!cfg.SISTEMA_ACTIVO || !cfg.MODO_B_ACTIVO || cfg.MODO_B_AUTOENVIO !== true) return { ok: false, why: 'autoenvío no autorizado' };
  var until = cfg.MODO_B_AUTORIZADO_HASTA ? new Date(cfg.MODO_B_AUTORIZADO_HASTA) : null;
  if (!until || isNaN(until.getTime())) return { ok: false, why: 'falta fecha MODO_B_AUTORIZADO_HASTA' };
  if (now.getTime() > until.getTime() + 86400000) return { ok: false, why: 'autorización vencida' };
  if (sentToday >= Number(cfg.MODO_B_MAX_DIARIO || 0)) return { ok: false, why: 'límite diario alcanzado' };
  return { ok: true, why: 'autorizado' };
}

/* ---------- Resumen ---------- */
function buildDigest(st, cfg) {
  cfg = cfg || DEFAULT_CONFIG;
  var nov = st.nuevas + st.respuestas + st.reservas + st.cobrosNuevos + st.contactados;
  if (!nov) return null;
  var lines = ['Resumen de captación', '',
    'Oportunidades nuevas: ' + st.nuevas + ' (alta prioridad: ' + st.altas + ')',
    'Propuestas pendientes de envío: ' + st.pendientes,
    'Contactos realizados: ' + st.contactados,
    'Respuestas recibidas: ' + st.respuestas,
    'Reservas acordadas: ' + st.reservas,
    'Ingresos del mes: ARS ' + fmtMoney(st.ingresosMes) + ' de ARS ' + fmtMoney(cfg.OBJETIVO_MENSUAL) + ' objetivo'];
  if (st.top && st.top.length) { lines.push('', 'Mejores pendientes:'); st.top.forEach(function (t) { lines.push('- [' + t.score + '] ' + t.label + ' → ' + t.link); }); }
  return lines.join('\n');
}

/* ---------- Clasificador Gemini Flash-Lite (lógica pura) ---------- */
function buildGeminiPrompt(items) {
  var schemaDesc = 'Devuelve un JSON estrictamente válido, sin bloques de markdown adicionales ni texto introductorio, con un array de objetos con el siguiente esquema exacto:\n' +
    '[\n' +
    '  {\n' +
    '    "id": string,\n' +
    '    "es_solicitud_clases": boolean,\n' +
    '    "destinatario": "pedido_abierto" | "dirigido_al_creador" | "dirigido_a_otro_docente" | "ambiguo" | "desconocido",\n' +
    '    "contactabilidad": "canal_publico_permitido" | "contacto_ofrecido_voluntariamente" | "via_inexistente" | "no_verificada",\n' +
    '    "oportunidad_comercial_alejo": boolean,\n' +
    '    "materia": string,\n' +
    '    "nivel": string,\n' +
    '    "urgencia": "alta" | "media" | "baja" | "ninguna",\n' +
    '    "confianza": number,\n' +
    '    "resumen": string\n' +
    '  }\n' +
    ']';
  var prompt = 'Actuá como clasificador de oportunidades comerciales de clases particulares para Alejo (profesor particular independiente de Matemática, Física, Química, Biofísica y afines en Argentina).\n\n' +
    'Analizá cada comentario o publicación pública (en YouTube, TikTok, Instagram, foros, etc.) distinguiendo cuatro dimensiones independientes:\n\n' +
    '1. INTENCIÓN DE CLASES (es_solicitud_clases):\n' +
    '   - true: la persona busca o necesita tomar/contratar clases particulares o apoyo docente personalizado.\n' +
    '   - false: dudas puntuales o gratuitas del video/tema, agradecimientos, felicitaciones, spam o venta de apuntes.\n\n' +
    '2. DESTINATARIO (destinatario):\n' +
    '   - "pedido_abierto": búsqueda abierta dirigida a cualquier profesor o a la comunidad (ej. "busco profe particular de biofísica online", "alguien que dé clases de álgebra?", "conocen a alguien que explique química?").\n' +
    '   - "dirigido_al_creador": mensaje dirigido explícitamente al autor o creador del contenido (ej. "profe das clases particulares?", "cuánto cobrás tus clases?", "me gustaría estudiar con vos", "¿vos dictás clases?", "¿me das clases a mí?").\n' +
    '   - "dirigido_a_otro_docente": mensaje respondiendo a otro docente o mencionando a un tercero específico.\n' +
    '   - "ambiguo": no queda claro si le habla al creador del video o busca un profesor en general.\n' +
    '   - "desconocido": no determinable o no aplica.\n\n' +
    '3. CONTACTABILIDAD (contactabilidad):\n' +
    '   - "canal_publico_permitido": comentario en una plataforma pública donde es legítimo y habitual responder públicamente (YouTube, foros públicos como UTNianos).\n' +
    '   - "contacto_ofrecido_voluntariamente": el usuario facilitó voluntariamente en su mensaje un email, teléfono, WhatsApp o usuario de red social para que lo contacten.\n' +
    '   - "via_inexistente": no hay forma técnica ni canal viable para contactar a la persona.\n' +
    '   - "no_verificada": plataformas (como TikTok o Instagram) donde un tercero no puede enviar DM directo sin seguirse previamente o donde responder comercialmente viola normas comunitarias.\n\n' +
    '4. OPORTUNIDAD COMERCIAL PARA ALEJO (oportunidad_comercial_alejo):\n' +
    '   - true ÚNICAMENTE SI: es_solicitud_clases es true, destinatario es "pedido_abierto" (o contacto_ofrecido_voluntariamente), NO está dirigido al creador ni a otro docente, y hay vía de contacto ética y permitida.\n' +
    '   - false si está dirigido al creador ("dirigido_al_creador"), dirigido a otro docente, si no es solicitud de clases, o si la vía de contacto es inexistente.\n' +
    '   - Si el destinatario es "ambiguo", oportunidad_comercial_alejo DEBE ser false (requiere revisión manual).\n\n' +
    schemaDesc + '\n\n' +
    'Elementos a evaluar:\n';
  (items || []).forEach(function (it, idx) {
    prompt += '\n--- Elemento ' + (idx + 1) + ' ---\n';
    prompt += 'ID: ' + it.id + '\n';
    prompt += 'Plataforma: ' + (it.sourceLabel || it.source || it.platform || '') + '\n';
    prompt += 'Título/Contexto: ' + (it.title || '') + '\n';
    prompt += 'Texto: ' + (it.text ? String(it.text).slice(0, 500) : '') + '\n';
  });
  return prompt;
}

function parseGeminiResponse(rawText) {
  if (!rawText) return null;
  var clean = String(rawText).trim();
  clean = clean.replace(/^^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    var data = JSON.parse(clean);
    if (!Array.isArray(data)) {
      if (data && typeof data === 'object' && Array.isArray(data.items)) data = data.items;
      else return null;
    }
    var validated = [];
    var validDest = {
      'pedido_abierto': 1,
      'dirigido_al_creador': 1,
      'dirigido_a_otro_docente': 1,
      'ambiguo': 1,
      'desconocido': 1
    };
    var validCont = {
      'canal_publico_permitido': 1,
      'contacto_ofrecido_voluntariamente': 1,
      'via_inexistente': 1,
      'no_verificada': 1
    };

    data.forEach(function (obj) {
      if (obj && typeof obj === 'object' && obj.id) {
        var isSol = obj.es_solicitud_clases === true;

        var rawDest = String(obj.destinatario || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
        var dest = rawDest;
        if (!validDest[dest]) {
          if (/creador|autor|dueño|profe_vos|a_vos/i.test(rawDest)) dest = 'dirigido_al_creador';
          else if (/abierto|comunidad|todos/i.test(rawDest)) dest = 'pedido_abierto';
          else if (/otro|tercero/i.test(rawDest)) dest = 'dirigido_a_otro_docente';
          else if (/ambiguo|dudoso/i.test(rawDest)) dest = 'ambiguo';
          else dest = 'ambiguo';
        }

        var rawCont = String(obj.contactabilidad || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
        var cont = rawCont;
        if (!validCont[cont]) {
          if (/ofrecido|voluntario|whatsapp|email|telefono/i.test(rawCont)) cont = 'contacto_ofrecido_voluntariamente';
          else if (/publico|canal_publico|abierto/i.test(rawCont)) cont = 'canal_publico_permitido';
          else if (/inexistente|cerrado|imposible/i.test(rawCont)) cont = 'via_inexistente';
          else cont = 'no_verificada';
        }

        var conf = typeof obj.confianza === 'number' ? Math.max(0, Math.min(1, obj.confianza)) : 0.5;

        // Regla dura de seguridad: si está dirigido al creador, a otro docente, no busca clases o es ambiguo,
        // NUNCA puede considerarse oportunidad comercial real para Alejo.
        var opComercial = typeof obj.oportunidad_comercial_alejo === 'boolean'
          ? obj.oportunidad_comercial_alejo
          : false; // Nunca inventar oportunidad comercial ante respuesta incompleta.
        if (!isSol || dest !== 'pedido_abierto' ||
            (cont !== 'canal_publico_permitido' && cont !== 'contacto_ofrecido_voluntariamente')) {
          opComercial = false;
        }

        validated.push({
          id: String(obj.id),
          es_solicitud_clases: isSol,
          destinatario: dest,
          contactabilidad: cont,
          oportunidad_comercial_alejo: opComercial,
          materia: String(obj.materia || ''),
          nivel: String(obj.nivel || ''),
          urgencia: String(obj.urgencia || 'ninguna'),
          confianza: conf,
          resumen: String(obj.resumen || '')
        });
      }
    });
    return validated;
  } catch (e) {
    return null;
  }
}

if (typeof module !== 'undefined') module.exports = {
  ESTADOS: ESTADOS, DEFAULT_CONFIG: DEFAULT_CONFIG, SOURCES: SOURCES, EDUCATIONAL_SOURCES: EDUCATIONAL_SOURCES,
  YT_INTENT_RX: YT_INTENT_RX, YT_FREE_EXCLUDE_RX: YT_FREE_EXCLUDE_RX, parseYouTubeComments: parseYouTubeComments,
  buildGeminiPrompt: buildGeminiPrompt, parseGeminiResponse: parseGeminiResponse,
  norm: norm, stripHtml: stripHtml, hashStr: hashStr,
  canonicalUrl: canonicalUrl, isGenericDashboardUrl: isGenericDashboardUrl, sanitizeForSheets: sanitizeForSheets,
  cleanName: cleanName, detectSubjects: detectSubjects, detectLevel: detectLevel, detectModality: detectModality,
  detectNeed: detectNeed, extractName: extractName, extractLinks: extractLinks, extractFromEmail: extractFromEmail, parseGetOnBoard: parseGetOnBoard,
  parseRemotive: parseRemotive, parseRss: parseRss, makeId: makeId, dedupKey: dedupKey, contactKeys: contactKeys, evaluate: evaluate, composeMessage: composeMessage,
  composeJobMessage: composeJobMessage, analyzeInbound: analyzeInbound, autoSendAllowed: autoSendAllowed, buildDigest: buildDigest, fmtMoney: fmtMoney,
  assessContactability: assessContactability, usdReference: usdReference, validTeachingProfileUrl: validTeachingProfileUrl, teachingProfileReferences: teachingProfileReferences,
  isLocationIncompatible: isLocationIncompatible
};