/**
 * youtube_poc.js — Prueba de Concepto (PoC): Captación de Alumnos en Comentarios de YouTube
 * 
 * Demuestra:
 * 1. Consulta y parseo de commentThreads (YouTube Data API v3).
 * 2. Construcción de permalinks directos con parámetro &lc=COMMENT_ID para inspección instantánea.
 * 3. Filtrado semántico estricto: separación de dudas gratuitas / elogios vs. intención genuina de contratación.
 * 4. Puntuación y generación de mensaje personalizado (pendiente de aprobación, 0 spam, 0 autoenvío).
 * 
 * Uso:
 *   node scratch/youtube_poc.js                 (Modo demostración con casos sintéticos representativos)
 *   YOUTUBE_API_KEY=AIzaSy... node scratch/youtube_poc.js  (Modo en vivo con la API oficial)
 */

const https = require('https');
const core = require('../gas/Core.js');

const API_KEY = process.env.YOUTUBE_API_KEY || '';

// Muestra representativa de comentarios SINTÉTICOS en canales educativos universitarios (CBC, UBA XXI, UTN, UNLP)
const MOCK_COMMENTS_DATASET = {
  kind: 'youtube#commentThreadListResponse',
  items: [
    {
      id: 'Ugx_DudaVideo_01',
      snippet: {
        videoId: '_6uyQISZvBc',
        topLevelComment: {
          id: 'Ugx_DudaVideo_01',
          snippet: {
            videoId: '_6uyQISZvBc',
            authorDisplayName: '@nahuel_fiuba',
            textDisplay: 'Hola profe, en el minuto 14:35 no entendí por qué cambiaste el signo de la matriz inversa. ¿Alguien me explica?',
            publishedAt: '2026-10-28T18:20:00Z'
          }
        }
      }
    },
    {
      id: 'Ugx_Elogio_02',
      snippet: {
        videoId: '_6uyQISZvBc',
        topLevelComment: {
          id: 'Ugx_Elogio_02',
          snippet: {
            videoId: '_6uyQISZvBc',
            authorDisplayName: '@camila_cbc',
            textDisplay: 'Sos un genio profe, mil gracias!! Me salvaste para el parcial de Álgebra, aprobé con 8.',
            publishedAt: '2026-10-28T19:00:00Z'
          }
        }
      }
    },
    {
      id: 'Ugx_SugerenciaVideo_03',
      snippet: {
        videoId: 'Z5DyEohToDs',
        topLevelComment: {
          id: 'Ugx_SugerenciaVideo_03',
          snippet: {
            videoId: 'Z5DyEohToDs',
            authorDisplayName: '@estudiante_quimica',
            textDisplay: '¿Podrías hacer un video explicando equilibrio químico y pH para la cátedra Di Risio?',
            publishedAt: '2026-10-29T11:15:00Z'
          }
        }
      }
    },
    {
      id: 'Ugx_Oportunidad_04',
      snippet: {
        videoId: '_6uyQISZvBc',
        topLevelComment: {
          id: 'Ugx_Oportunidad_04',
          snippet: {
            videoId: '_6uyQISZvBc',
            authorDisplayName: 'Martín Gómez',
            textDisplay: 'Buenas tardes! ¿Das clases particulares de Álgebra online? Tengo que rendir el final en diciembre para la facultad y necesito preparar la materia.',
            publishedAt: '2026-10-29T14:40:00Z'
          }
        }
      }
    },
    {
      id: 'Ugx_Oportunidad_05',
      snippet: {
        videoId: 'Z5DyEohToDs',
        topLevelComment: {
          id: 'Ugx_Oportunidad_05',
          snippet: {
            videoId: 'Z5DyEohToDs',
            authorDisplayName: 'Lucía Fernández',
            textDisplay: 'Hola, busco profesor particular urgente de Biofísica para CBC / UBA XXI. ¿Cuánto cobrás la hora y qué disponibilidad tenés?',
            publishedAt: '2026-10-29T16:10:00Z'
          }
        }
      }
    },
    {
      id: 'Ugx_FueraPerfil_06',
      snippet: {
        videoId: '_6uyQISZvBc',
        topLevelComment: {
          id: 'Ugx_FueraPerfil_06',
          snippet: {
            videoId: '_6uyQISZvBc',
            authorDisplayName: 'Javier Rossi',
            textDisplay: 'Hola, busco profesor particular de italiano para rendir un examen de idiomas.',
            publishedAt: '2026-10-29T17:00:00Z'
          }
        }
      }
    }
  ]
};

function fetchLiveYouTubeComments(videoId, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=25&order=time&textFormat=plainText&key=${apiKey}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`YouTube API HTTP ${res.statusCode}: ${json.error ? json.error.message : data}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runPoC() {
  console.log('='.repeat(78));
  console.log('PRUEBA DE CONCEPTO (PoC) — CAPTACIÓN EN COMENTARIOS EDUCATIVOS DE YOUTUBE');
  console.log('='.repeat(78));

  let data;
  let videoCtx;

  if (API_KEY) {
    const targetSource = core.EDUCATIONAL_SOURCES[0];
    console.log(`\n[MODO EN VIVO] Conectando a YouTube Data API v3 con API Key...`);
    console.log(`Canal objetivo: ${targetSource.creator}`);
    console.log(`Video ID: ${targetSource.resourceId} (${targetSource.videoTitle})`);
    try {
      data = await fetchLiveYouTubeComments(targetSource.resourceId, API_KEY);
      videoCtx = {
        videoId: targetSource.resourceId,
        videoTitle: targetSource.videoTitle,
        channelTitle: targetSource.creator,
        subject: targetSource.topics,
        level: targetSource.level
      };
      console.log(`✓ Obtenidos ${data.items ? data.items.length : 0} comentarios en vivo.`);
    } catch (err) {
      console.error(`✗ Error consultando API en vivo: ${err.message}`);
      console.log(`-> Revertiendo a dataset sintético de demostración...`);
      data = MOCK_COMMENTS_DATASET;
      videoCtx = {
        videoId: '_6uyQISZvBc',
        videoTitle: 'Álgebra desde cero',
        channelTitle: 'Mathematics with Juan',
        subject: 'Álgebra',
        level: 'Universitario'
      };
    }
  } else {
    console.log('\n[MODO DEMOSTRACIÓN OFFLINE] Utilizando dataset sintético de comentarios');
    console.log('(Para consultar la API oficial en vivo: export YOUTUBE_API_KEY="tu_clave")\n');
    data = MOCK_COMMENTS_DATASET;
    videoCtx = {
      videoId: '_6uyQISZvBc',
      videoTitle: 'Álgebra desde cero',
      channelTitle: 'Mathematics with Juan',
      subject: 'Álgebra',
      level: 'Universitario'
    };
  }

  // 1. Parseo con Core.js
  const parsedItems = core.parseYouTubeComments(data, videoCtx);
  console.log(`Total comentarios procesados: ${parsedItems.length}\n`);

  let aceptados = 0;
  let descartados = 0;
  const cfg = core.DEFAULT_CONFIG;
  const now = new Date('2026-10-30T15:00:00Z');

  parsedItems.forEach((item, idx) => {
    const ev = core.evaluate(item, cfg, now, {}, {});
    console.log('-'.repeat(78));
    console.log(`[#${idx + 1}] Autor: ${item.studentName || 'Anónimo'}`);
    console.log(`Permalink directo: ${item.url}`);
    console.log(`Texto: "${item.text.split('\n[Materia')[0].slice(0, 100)}..."`);

    if (ev.status === 'Descartado') {
      descartados++;
      console.log(`-> ESTADO: DESCARTADO`);
      console.log(`-> MOTIVO: ${ev.reasons.split(' | ')[0]}`);
    } else {
      aceptados++;
      console.log(`-> ESTADO: ${ev.status.toUpperCase()} (Compatibilidad: ${ev.compatible}, Prioridad: ${ev.score}/100)`);
      console.log(`-> MATERIA: ${ev.subject} | NIVEL: ${ev.level || 'Universitario'} | MODALIDAD: ${ev.modality}`);
      console.log(`-> EVALUACIÓN: ${ev.reasons}`);
      console.log(`\n[BORRADOR DE RESPUESTA SUGERIDA (MANUAL, SIN AUTOENVÍO)]:\n${ev.message.split('\n').map(l => '   ' + l).join('\n')}`);
    }
  });

  console.log('\n' + '='.repeat(78));
  console.log('RESUMEN DE RENDIMIENTO DE LA PRUEBA DE CONCEPTO:');
  console.log('='.repeat(78));
  console.log(`• Comentarios inspeccionados: ${parsedItems.length}`);
  console.log(`• Dudas gratuitas / agradecimientos / fuera de perfil descartados: ${descartados}`);
  console.log(`• Oportunidades legítimas de contratación identificadas: ${aceptados}`);
  console.log(`• Tasa de filtrado de ruido: ${((descartados / parsedItems.length) * 100).toFixed(1)}%`);
  console.log(`• Consumo de cuota YouTube API v3: 1 unidad por consulta (límite gratuito: 10.000 unidades/día)`);
  console.log(`• Costo económico: ARS $0 (100% dentro de la capa gratuita)`);
  console.log(`• Garantía anti-spam: 0 mensajes salientes automáticos. Toda oportunidad requiere revisión manual.`);
  console.log('='.repeat(78) + '\n');
}

runPoC().catch(console.error);
