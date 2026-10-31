/**
 * Catalogo.js — Catálogo maestro de fuentes (Base_maestra_fuentes_bots_Alejo_2026-10-30.xlsx)
 * Contiene 239 puntos de entrada únicos consolidados.
 * Regla: Todas las fuentes inician con Activo=FALSE. La activación es selectiva y manual.
 */

var MASTER_CATALOG_SOURCES = [
  {
    "id": "CAT-0001",
    "plataforma": "Tusclases",
    "creador": "Tusclases ARG > quimica",
    "materias": "quimica",
    "nivel": "todas",
    "url": "https://www.tusclases.com.ar/alumnos/quimica.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P0 - Demanda directa | Tablón de solicitudes | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0002",
    "plataforma": "Tusclases",
    "creador": "Tusclases ARG > sitemap de anuncios de alumnos",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.tusclases.com.ar/sitemap-anuncios.aspx?tipo=Alumnos",
    "resourceId": "",
    "activo": false,
    "notas": "P0 - Demanda directa | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0003",
    "plataforma": "Tusclases",
    "creador": "Tusclases Argentina",
    "materias": "Matemática",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclases.com.ar/alumnos/matematica.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P0 - Demanda directa | Tablón de solicitudes | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0004",
    "plataforma": "Tusclases",
    "creador": "Tusclases: alumnos buscando profesor",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / online",
    "url": "https://www.tusclases.com.ar/buscar/alumnos.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P0 - Demanda directa | Tablón de solicitudes | Verificar: Verificado aquí (pedido visible)"
  },
  {
    "id": "CAT-0005",
    "plataforma": "Tusclases",
    "creador": "Tusclases: alumnos de ciencias",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.tusclases.com.ar/alumnos/ciencias.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P0 - Demanda directa | Tablón de solicitudes | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0006",
    "plataforma": "Tusclases",
    "creador": "Tusclases: alumnos de física",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.tusclases.com.ar/alumnos/fisica.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P0 - Demanda directa | Tablón de solicitudes | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0007",
    "plataforma": "Directorios universitarios",
    "creador": "Agronomía UNLPam",
    "materias": "Biología; Química; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/AgronomiaUNLPam",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0008",
    "plataforma": "Directorios universitarios",
    "creador": "Antídoto FFyB UBA",
    "materias": "Química; Biología; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/Antidoto_ffyb",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0009",
    "plataforma": "Directorios universitarios",
    "creador": "Cbceando en la UBA",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/alumnosubaxxi",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0010",
    "plataforma": "Directorios universitarios",
    "creador": "Centro de Estudiantes Veterinaria UNLP",
    "materias": "Química; Biología; Física; Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/FCVUNLP",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0011",
    "plataforma": "Directorios universitarios",
    "creador": "CET AETI ingreso UTN Córdoba",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/cetaetifrc.ingreso",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0012",
    "plataforma": "Directorios universitarios",
    "creador": "Equilibrio Económicas UNLP",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/equilibriofce",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0013",
    "plataforma": "Directorios universitarios",
    "creador": "Espacio Estudiantil FIUBA",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/espacioestudiantilfiuba",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0014",
    "plataforma": "Directorios universitarios",
    "creador": "Facultad de Informática UNLP",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/facultad.informatica",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0015",
    "plataforma": "Directorios universitarios",
    "creador": "Facultad de Ingeniería UNLP",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/ingenieriaunlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0016",
    "plataforma": "Directorios universitarios",
    "creador": "Franja Ciencias Médicas UNLP",
    "materias": "Biología; Química; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/fmcsmedicasunlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0017",
    "plataforma": "Directorios universitarios",
    "creador": "Franja Ingeniería UNLP",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/franjaingenieriaunlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0018",
    "plataforma": "Directorios universitarios",
    "creador": "Franja Naturales UNLP",
    "materias": "Biología; Química; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/franjanaturalesunlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0019",
    "plataforma": "Directorios universitarios",
    "creador": "Grupos Informática UNLP",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/gruposdewsp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0020",
    "plataforma": "Directorios universitarios",
    "creador": "Ingresantes Agrarias y Forestales UNLP",
    "materias": "Biología; Química; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/ingresantesfcayf",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0021",
    "plataforma": "Directorios universitarios",
    "creador": "Ingreso UTN 19 de Agosto",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/Ingreso19",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0022",
    "plataforma": "Directorios universitarios",
    "creador": "INSPT UTN",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/inspt.utn",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0023",
    "plataforma": "Directorios universitarios",
    "creador": "Interconectados CBC presencial",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/interconectadoscbc",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0024",
    "plataforma": "Directorios universitarios",
    "creador": "Interconectados UBA XXI",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/interconectados",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0025",
    "plataforma": "Directorios universitarios",
    "creador": "Lista Unidad Ingeniería UNLP",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/ListaUnidadIngenieria",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0026",
    "plataforma": "Directorios universitarios",
    "creador": "SAE Exactas UNLP",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/sae.exactas.unlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0027",
    "plataforma": "Directorios universitarios",
    "creador": "SAE Veterinaria UNLP",
    "materias": "Química; Biología; Física; Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/saeveteriariaunlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0028",
    "plataforma": "Directorios universitarios",
    "creador": "Sinapsis CEFyB UBA",
    "materias": "Química; Biología; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/sinapsis.ffyb",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0029",
    "plataforma": "Directorios universitarios",
    "creador": "Suma Exactas UNLP",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/sumaexactas",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0030",
    "plataforma": "Directorios universitarios",
    "creador": "UBA Connect",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/uba.connect",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0031",
    "plataforma": "Directorios universitarios",
    "creador": "UBA Unidos",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/ubaunidos",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0032",
    "plataforma": "Directorios universitarios",
    "creador": "UTN Regional La Plata",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/utn.frlp",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Investigar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0033",
    "plataforma": "Facebook",
    "creador": "INFO CBC / UBA XXI — Interconectados",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.facebook.com/groups/476348216692653",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Manual | Grupo/comunidad | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0034",
    "plataforma": "YouTube",
    "creador": "Academia Filadd",
    "materias": "Matemática",
    "nivel": "Ingreso UNC",
    "url": "https://www.youtube.com/channel/UC6PoYEu79xbbUGSM0s38Esg",
    "resourceId": "t4kBBDBOj6s",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0035",
    "plataforma": "YouTube",
    "creador": "El Traductor de Ingeniería",
    "materias": "Matemática; Física",
    "nivel": "Universidad; tecnicaturas",
    "url": "https://www.youtube.com/@eltraductor_ok",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0036",
    "plataforma": "YouTube",
    "creador": "Filadd UBA",
    "materias": "Matemática; Física; Química",
    "nivel": "CBC; UBA XXI",
    "url": "https://www.youtube.com/c/FiladdUBA",
    "resourceId": "Z5DyEohToDs",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0037",
    "plataforma": "YouTube",
    "creador": "FISICA EN SEGUNDOS",
    "materias": "Física",
    "nivel": "CBC; universidad",
    "url": "https://www.youtube.com/c/FISICAENSEGUNDOS",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0038",
    "plataforma": "YouTube",
    "creador": "Física en Segundos",
    "materias": "Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/channel/UCfC8fA12mBQB5_0h_CJAdcg",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: canal_localizado_en_indice_web"
  },
  {
    "id": "CAT-0039",
    "plataforma": "YouTube",
    "creador": "Física Exactas UBA",
    "materias": "Física",
    "nivel": "Universidad",
    "url": "https://www.youtube.com/channel/UCQ6bzKVkLIqwYUpzyUDx4qg",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0040",
    "plataforma": "YouTube",
    "creador": "Popularización Exactas UBA",
    "materias": "Biología; Química; Física",
    "nivel": "Secundaria; universidad",
    "url": "https://www.youtube.com/c/PopExactasUBAOficial",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0041",
    "plataforma": "YouTube",
    "creador": "Preu Filadd Chile",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "PAES",
    "url": "https://www.youtube.com/@FiladdChile",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0042",
    "plataforma": "YouTube",
    "creador": "Suma Exactas UNLP: YouTube",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/channel/UCgKm7GRhhRBpMlZt9oT1qTw",
    "resourceId": "",
    "activo": false,
    "notas": "P1 - Piloto | Canal o creador | Verificar: Informe externo: enlace_en_directorio_de_la_comunidad"
  },
  {
    "id": "CAT-0043",
    "plataforma": "Contenido",
    "creador": "Khan Academy ES",
    "materias": "matematica",
    "nivel": "secundaria",
    "url": "https://es.khanacademy.org/math",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0044",
    "plataforma": "Directorios universitarios",
    "creador": "Franja Tecnológica ingreso Córdoba",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/franjamoradafrc.ingreso",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0045",
    "plataforma": "Directorios universitarios",
    "creador": "Frente Natural",
    "materias": "Biología; Química; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/frentenatural",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0046",
    "plataforma": "Directorios universitarios",
    "creador": "Ingresantes UNRC",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/ingresantesunrc",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Directorio de comunidades | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0047",
    "plataforma": "Directorios universitarios",
    "creador": "XXI Aprendiendo",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://linktr.ee/xxi_aprendiendo",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Directorio de comunidades | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0048",
    "plataforma": "Empleo docente",
    "creador": "Argentina.gob.ar trabajo",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.argentina.gob.ar/trabajo",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0049",
    "plataforma": "Empleo docente",
    "creador": "Computrabajo AR > ofertas de trabajo",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://ar.computrabajo.com/ofertas-de-trabajo/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0050",
    "plataforma": "Empleo docente",
    "creador": "Ofertip",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://ofertip.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0051",
    "plataforma": "Foros",
    "creador": "3DGAMES: alumnos del CBC",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://foros.3dgames.com.ar/threads/378583-el-thread-de-los-alumnos-del-cbc",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0052",
    "plataforma": "Foros",
    "creador": "4chan /sci",
    "materias": "matematica/fisica",
    "nivel": "universidad",
    "url": "https://boards.4chan.org/sci/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0053",
    "plataforma": "Foros",
    "creador": "Brainly español",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://brainly.lat/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0054",
    "plataforma": "Foros",
    "creador": "casiMedicos",
    "materias": "Biología; Química; Matemática",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.casimedicos.com/foro/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido leído"
  },
  {
    "id": "CAT-0055",
    "plataforma": "Foros",
    "creador": "La web de Física: foro",
    "materias": "Física; Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://forum.lawebdefisica.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0056",
    "plataforma": "Foros",
    "creador": "Química Orgánica",
    "materias": "Química",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.quimicaorganica.org/foro/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido leído"
  },
  {
    "id": "CAT-0057",
    "plataforma": "Foros",
    "creador": "Rincón Matemático",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://foro.rinconmatematico.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0058",
    "plataforma": "Foros",
    "creador": "Todoexpertos Biología",
    "materias": "Biología",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.todoexpertos.com/categorias/ciencias-e-ingenieria/biologia",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0059",
    "plataforma": "Foros",
    "creador": "Todoexpertos Física",
    "materias": "Física",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.todoexpertos.com/categorias/ciencias-e-ingenieria/fisica",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0060",
    "plataforma": "Foros",
    "creador": "Todoexpertos Matemáticas",
    "materias": "Matemática",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.todoexpertos.com/categorias/ciencias-e-ingenieria/matematicas",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0061",
    "plataforma": "Foros",
    "creador": "Todoexpertos Química",
    "materias": "Química",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.todoexpertos.com/categorias/ciencias-e-ingenieria/quimica",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0062",
    "plataforma": "Foros",
    "creador": "Unicoos Física",
    "materias": "Física",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.unicoos.com/foro/fisica",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0063",
    "plataforma": "Foros",
    "creador": "Unicoos Matemáticas",
    "materias": "Matemática",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.unicoos.com/foro/matematicas",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0064",
    "plataforma": "Foros",
    "creador": "Unicoos Química",
    "materias": "Química",
    "nivel": "Secundaria; ingreso; universidad",
    "url": "https://www.unicoos.com/foro/quimica",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: Contenido localizado en índice"
  },
  {
    "id": "CAT-0065",
    "plataforma": "Foros",
    "creador": "UTNianos",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.utnianos.com.ar/foro/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0066",
    "plataforma": "Foros",
    "creador": "UTNianos — RSS",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / UTN",
    "url": "https://www.utnianos.com.ar/foro/syndication.php",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Foro | Verificar: Conector existente; calidad pendiente"
  },
  {
    "id": "CAT-0067",
    "plataforma": "Gauth",
    "creador": "Gauthmath",
    "materias": "todas",
    "nivel": "secundaria/universidad",
    "url": "https://gauthmath.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0068",
    "plataforma": "MercadoLibre",
    "creador": "MercadoLibre servicios AR",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://servicios.mercadolibre.com.ar/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0069",
    "plataforma": "Numerade",
    "creador": "Numerade",
    "materias": "todas",
    "nivel": "universidad",
    "url": "https://numerade.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0070",
    "plataforma": "Otros puntos de entrada",
    "creador": "Altillo",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.altillo.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0071",
    "plataforma": "Otros puntos de entrada",
    "creador": "Comunidad CBC",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://comunidadcbcoficial.wixsite.com/supremo",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0072",
    "plataforma": "Otros puntos de entrada",
    "creador": "Fisicalab",
    "materias": "Física; Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.fisicalab.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0073",
    "plataforma": "Otros puntos de entrada",
    "creador": "MuyApp: Matemática FADU",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://muyapp.com/materia/379/matematica",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0074",
    "plataforma": "Otros puntos de entrada",
    "creador": "No me salen — Ricardo Cabrera",
    "materias": "Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://ricuti.com.ar/intro_NMS_presentacion.html",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0075",
    "plataforma": "Plataformas docentes",
    "creador": "Apprentus",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.apprentus.com/es/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0076",
    "plataforma": "Plataformas docentes",
    "creador": "Apprentus",
    "materias": "Ciencias",
    "nivel": "Validar por anuncio",
    "url": "https://www.apprentus.com/es/ciencias-lecciones/estadosunidos",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0077",
    "plataforma": "Plataformas docentes",
    "creador": "Busca Tu Profesor",
    "materias": "Matemática",
    "nivel": "Validar por anuncio",
    "url": "https://buscatuprofesor.es/tutors-online/matematicas/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0078",
    "plataforma": "Plataformas docentes",
    "creador": "Clases particulares .com.ar",
    "materias": "todas",
    "nivel": "secundaria",
    "url": "https://www.clasesparticulares.com.ar",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0079",
    "plataforma": "Plataformas docentes",
    "creador": "Classgap",
    "materias": "Todas",
    "nivel": "Validar por anuncio",
    "url": "https://www.classgap.com/es/become-an-online-tutor",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0080",
    "plataforma": "Plataformas docentes",
    "creador": "Classgap Argentina",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.classgap.com/es-ar",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0081",
    "plataforma": "Plataformas docentes",
    "creador": "iProfe",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.iprofe.com.ar/faq/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0082",
    "plataforma": "Plataformas docentes",
    "creador": "italki / Preply / Cambly",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.italki.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0083",
    "plataforma": "Plataformas docentes",
    "creador": "Nuclea",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.nuclea.net/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0084",
    "plataforma": "Plataformas docentes",
    "creador": "Preply: ofertas para enseñar matemática",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://preply.com/es/online/empleo-profesor-de-matematicas",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0085",
    "plataforma": "Plataformas docentes",
    "creador": "StudiApp",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://studiapp.com.ar/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0086",
    "plataforma": "Plataformas docentes",
    "creador": "Superprof AR",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.superprof.com.ar",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0087",
    "plataforma": "Plataformas docentes",
    "creador": "Superprof Argentina",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.superprof.com.ar/dar-clases-particulares/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0088",
    "plataforma": "Plataformas docentes",
    "creador": "Superprof Colombia",
    "materias": "Todas",
    "nivel": "Validar por anuncio",
    "url": "https://www.superprof.co/dar-clases-particulares/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0089",
    "plataforma": "Plataformas docentes",
    "creador": "Superprof España",
    "materias": "Todas",
    "nivel": "Validar por anuncio",
    "url": "https://www.superprof.es/dar-clases-particulares/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0090",
    "plataforma": "Quora",
    "creador": "Quora ES",
    "materias": "todas",
    "nivel": "universidad",
    "url": "https://es.quora.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0091",
    "plataforma": "Reddit",
    "creador": "r/AskArgentina",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/AskArgentina/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0092",
    "plataforma": "Reddit",
    "creador": "r/AskMexico",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/AskMexico/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0093",
    "plataforma": "Reddit",
    "creador": "r/BuenosAires",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/BuenosAires/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0094",
    "plataforma": "Reddit",
    "creador": "r/ciencia",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/ciencia/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0095",
    "plataforma": "Reddit",
    "creador": "r/Cordoba",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/Cordoba/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0096",
    "plataforma": "Reddit",
    "creador": "r/EducacionChile",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/EducacionChile/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0097",
    "plataforma": "Reddit",
    "creador": "r/empleos_AR",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/empleos_AR/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0098",
    "plataforma": "Reddit",
    "creador": "r/esConversacion",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/esConversacion/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0099",
    "plataforma": "Reddit",
    "creador": "r/fceyn",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/fceyn/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0100",
    "plataforma": "Reddit",
    "creador": "r/fisica",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/fisica/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0101",
    "plataforma": "Reddit",
    "creador": "r/Guadalajara",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/Guadalajara/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0102",
    "plataforma": "Reddit",
    "creador": "r/IB_Biology",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/IB_Biology/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0103",
    "plataforma": "Reddit",
    "creador": "r/LaPlataCiudad",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/LaPlataCiudad/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0104",
    "plataforma": "Reddit",
    "creador": "r/Lima_Peru",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/Lima_Peru/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0105",
    "plataforma": "Reddit",
    "creador": "r/Matematicas",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/Matematicas/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0106",
    "plataforma": "Reddit",
    "creador": "r/Mercadoreddit",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/Mercadoreddit/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0107",
    "plataforma": "Reddit",
    "creador": "r/Monterrey",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/Monterrey/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0108",
    "plataforma": "Reddit",
    "creador": "r/preuniversitario",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/preuniversitario/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0109",
    "plataforma": "Reddit",
    "creador": "r/Quimica",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/Quimica/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0110",
    "plataforma": "Reddit",
    "creador": "r/UBA",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/UBA/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0111",
    "plataforma": "Reddit",
    "creador": "r/uruguay",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/uruguay/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0112",
    "plataforma": "Reddit",
    "creador": "r/UTN",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.reddit.com/r/UTN/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: comunidad_identificada_por_publicacion"
  },
  {
    "id": "CAT-0113",
    "plataforma": "Reddit",
    "creador": "r/vzla",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Validar en publicación",
    "url": "https://www.reddit.com/r/vzla/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: Hilo localizado en índice; vigencia no comprobada"
  },
  {
    "id": "CAT-0114",
    "plataforma": "Reddit",
    "creador": "Reddit > r/askmath",
    "materias": "matematica",
    "nivel": "todas",
    "url": "https://www.reddit.com/r/askmath",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0115",
    "plataforma": "Reddit",
    "creador": "Reddit > r/biology + r/biochemistry",
    "materias": "biologia",
    "nivel": "universidad",
    "url": "https://www.reddit.com/r/biology",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0116",
    "plataforma": "Reddit",
    "creador": "Reddit > r/chemistry",
    "materias": "quimica",
    "nivel": "universidad",
    "url": "https://www.reddit.com/r/chemistry",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0117",
    "plataforma": "Reddit",
    "creador": "Reddit > r/homeworkhelp",
    "materias": "todas",
    "nivel": "secundaria",
    "url": "https://www.reddit.com/r/homeworkhelp",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0118",
    "plataforma": "Reddit",
    "creador": "Reddit > r/learnmath",
    "materias": "matematica",
    "nivel": "secundaria/universidad",
    "url": "https://www.reddit.com/r/learnmath",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0119",
    "plataforma": "Reddit",
    "creador": "Reddit > r/physics + r/physicshelp",
    "materias": "fisica",
    "nivel": "universidad",
    "url": "https://www.reddit.com/r/physicshelp",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0120",
    "plataforma": "Reddit",
    "creador": "Reddit > r/tutor / r/teachers",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.reddit.com/r/tutor",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Con permiso | Comunidad Reddit | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0121",
    "plataforma": "Stack Exchange",
    "creador": "Stack Exchange > Chemistry + Biology",
    "materias": "quimica/biologia",
    "nivel": "universidad",
    "url": "https://chemistry.stackexchange.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0122",
    "plataforma": "Stack Exchange",
    "creador": "Stack Exchange > es (es.stackoverflow)",
    "materias": "programacion",
    "nivel": "universidad",
    "url": "https://es.stackoverflow.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0123",
    "plataforma": "Stack Exchange",
    "creador": "Stack Exchange > Math",
    "materias": "matematica",
    "nivel": "universidad",
    "url": "https://math.stackexchange.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0124",
    "plataforma": "Stack Exchange",
    "creador": "Stack Exchange > Physics",
    "materias": "fisica",
    "nivel": "universidad",
    "url": "https://physics.stackexchange.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0125",
    "plataforma": "Telegram",
    "creador": "Matemáticas con Juan",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://t.me/s/matematicasconjuan",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0126",
    "plataforma": "Telegram",
    "creador": "Telegram > grupos privados de estudiantes",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://t.me/+<invite>",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Punto de entrada | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0127",
    "plataforma": "Telegram",
    "creador": "Telegram > previews de canal publico",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://t.me/s/<canal>",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Explorar | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0128",
    "plataforma": "Tusclases",
    "creador": "Alertas Tusclases — Gmail",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / online",
    "url": "https://www.tusclases.com.ar/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Punto de entrada | Verificar: Conector existente; calidad pendiente"
  },
  {
    "id": "CAT-0129",
    "plataforma": "Tusclases",
    "creador": "Tusclases > marketplace internacional",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.tusclases.com",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0130",
    "plataforma": "Tusclases",
    "creador": "Tusclases ARG > CABA",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.tusclases.com.ar/alumnos/buenos-aires.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Demanda regional mixta | Tablón de solicitudes | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0131",
    "plataforma": "Tusclases",
    "creador": "Tusclases Colombia",
    "materias": "Todas: filtrar",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclases.co/estudiantes/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada; contenido leído"
  },
  {
    "id": "CAT-0132",
    "plataforma": "Tusclases",
    "creador": "Tusclases México",
    "materias": "Todas: filtrar",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclases.mx/estudiantes/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0133",
    "plataforma": "Tusclases",
    "creador": "Tusclases Perú",
    "materias": "Todas: filtrar",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclases.pe/estudiantes/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Evaluar | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0134",
    "plataforma": "YouTube",
    "creador": "Academia Saco Oliveros",
    "materias": "Matemática; ciencias",
    "nivel": "Ingreso UNI; UNMSM",
    "url": "https://www.youtube.com/@AcademiaSacoOliveros",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0135",
    "plataforma": "YouTube",
    "creador": "Amigos de la Química",
    "materias": "Química",
    "nivel": "Bachillerato; ingreso",
    "url": "https://www.youtube.com/channel/UCTiu0apxEtCGpuLYeI-owkg",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0136",
    "plataforma": "YouTube",
    "creador": "Bio[ESO]sfera",
    "materias": "Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/channel/UCFUf1FXAUF4C20a9O896TuQ",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0137",
    "plataforma": "YouTube",
    "creador": "Biología desde cero",
    "materias": "Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/@biologiadesdecero",
    "resourceId": "gw49nIvyhLE",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: identificador_en_descripcion_de_video"
  },
  {
    "id": "CAT-0138",
    "plataforma": "YouTube",
    "creador": "Ciencias con la Bióloga Elena",
    "materias": "Biología",
    "nivel": "Secundaria; bachillerato",
    "url": "https://www.youtube.com/biologaelena",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0139",
    "plataforma": "YouTube",
    "creador": "Daniel Carreón",
    "materias": "Matemática",
    "nivel": "Secundaria",
    "url": "https://www.youtube.com/channel/UCwScwtu5zVqc_wHtRx9XvDA",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0140",
    "plataforma": "YouTube",
    "creador": "Date un Vlog",
    "materias": "Física",
    "nivel": "Divulgación",
    "url": "https://www.youtube.com/@dateunvlog",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0141",
    "plataforma": "YouTube",
    "creador": "Derivando",
    "materias": "Matemática",
    "nivel": "Divulgación",
    "url": "https://www.youtube.com/channel/UCH-Z8ya93m7_RD02WsCSZYA",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0142",
    "plataforma": "YouTube",
    "creador": "Grupo Ciencias San Marcos",
    "materias": "Matemática; Química; Biología",
    "nivel": "Ingreso UNMSM",
    "url": "https://www.youtube.com/@GrupoCienciasSanMarcos",
    "resourceId": "N8diErkJ_k4",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0143",
    "plataforma": "YouTube",
    "creador": "Grupo Ciencias UNI",
    "materias": "Matemática; Física; Química",
    "nivel": "Ingreso UNI",
    "url": "https://www.youtube.com/c/GrupoCienciasUNI",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0144",
    "plataforma": "YouTube",
    "creador": "IkniuM Media Superior",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Ingreso media superior",
    "url": "https://www.youtube.com/@IkniuM",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0145",
    "plataforma": "YouTube",
    "creador": "IkniuM UNAM",
    "materias": "Matemática; ciencias",
    "nivel": "Ingreso UNAM",
    "url": "https://www.youtube.com/@IkniuMUNAM",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0146",
    "plataforma": "YouTube",
    "creador": "Julioprofe",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/channel/UC92hfTUYx8N3QKYRcFxljyg/",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0147",
    "plataforma": "YouTube",
    "creador": "julioprofe",
    "materias": "Matemática; Física",
    "nivel": "Secundaria; universidad",
    "url": "https://www.youtube.com/user/julioprofe",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0148",
    "plataforma": "YouTube",
    "creador": "La Hiperactina",
    "materias": "Biología",
    "nivel": "Divulgación",
    "url": "https://www.youtube.com/Lahiperactina",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0149",
    "plataforma": "YouTube",
    "creador": "La Prof Lina M3",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/c/LaProfLinaM3",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: canal_enlazado_por_fuente_educativa"
  },
  {
    "id": "CAT-0150",
    "plataforma": "YouTube",
    "creador": "La RuBisCO es lo más",
    "materias": "Biología",
    "nivel": "ESO; bachillerato",
    "url": "https://www.youtube.com/channel/UCxkyw-ewW3pPZ5Wab345PVw",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0151",
    "plataforma": "YouTube",
    "creador": "Matemáticas profe Alex",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/matematicasprofealex",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_directorio_del_autor"
  },
  {
    "id": "CAT-0152",
    "plataforma": "YouTube",
    "creador": "Matemáticas profe Alex",
    "materias": "Matemática",
    "nivel": "Secundaria; universidad",
    "url": "https://www.youtube.com/channel/UCanMxWvOoiwtjLYm08Bo8QQ",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0153",
    "plataforma": "YouTube",
    "creador": "Matemóvil",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://youtube.com/matemovil",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0154",
    "plataforma": "YouTube",
    "creador": "Matemóvil",
    "materias": "Matemática",
    "nivel": "Secundaria; universidad",
    "url": "https://www.youtube.com/c/Matemovil",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0155",
    "plataforma": "YouTube",
    "creador": "Mates con Andrés",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/@MatesconAndr%C3%A9s",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0156",
    "plataforma": "YouTube",
    "creador": "Math2me",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/c/math2me",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0157",
    "plataforma": "YouTube",
    "creador": "Pablo Borsoi / Matetutoriales",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/pabloborsoi",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0158",
    "plataforma": "YouTube",
    "creador": "Preu Cpech",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "PAES",
    "url": "https://www.youtube.com/@PreuCpechCanalOficial",
    "resourceId": "3vV6PTTe6mM",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0159",
    "plataforma": "YouTube",
    "creador": "Preu M30M",
    "materias": "Matemática; Física",
    "nivel": "PAES",
    "url": "https://www.youtube.com/channel/UCQ3DtXinWzMgCGEjwJVQfnw",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0160",
    "plataforma": "YouTube",
    "creador": "Preuniversitario Pedro de Valdivia",
    "materias": "Matemática; ciencias",
    "nivel": "PAES",
    "url": "https://www.youtube.com/@PreuniversitarioPDV",
    "resourceId": "7l573SfhWgU",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0161",
    "plataforma": "YouTube",
    "creador": "Profe Luis Conchas",
    "materias": "Matemática",
    "nivel": "PAA; EXANI II; ingreso",
    "url": "https://www.youtube.com/c/ProfeLuisConchas",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0162",
    "plataforma": "YouTube",
    "creador": "Profesor Sergio Llanos",
    "materias": "Física; Matemática",
    "nivel": "Secundaria; universidad",
    "url": "https://www.youtube.com/@ProfesorSergioLlanos",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0163",
    "plataforma": "YouTube",
    "creador": "Profesor10demates",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/channel/UCx2Y_55MBCq3lkc3aOtmAiw",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: canal_localizado_en_indice_web"
  },
  {
    "id": "CAT-0164",
    "plataforma": "YouTube",
    "creador": "Puntaje Nacional Chile",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "PAES",
    "url": "https://www.youtube.com/PuntajeNacionalChile",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0165",
    "plataforma": "YouTube",
    "creador": "Puntaje Nacional Colombia",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Saber 11; ICFES",
    "url": "https://www.youtube.com/c/PuntajeNacionalColombia",
    "resourceId": "epPONh43eYs",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0166",
    "plataforma": "YouTube",
    "creador": "QuantumFracture",
    "materias": "Física",
    "nivel": "Divulgación",
    "url": "https://www.youtube.com/user/QuantumFracture",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0167",
    "plataforma": "YouTube",
    "creador": "Quimiayudas",
    "materias": "Química",
    "nivel": "Secundaria; universidad",
    "url": "https://www.youtube.com/user/Quimiayudas",
    "resourceId": "4FdLXk1Jv3E",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0168",
    "plataforma": "YouTube",
    "creador": "Quimitube",
    "materias": "Química",
    "nivel": "Bachillerato; ingreso",
    "url": "https://www.youtube.com/channel/UCJW41iRv8GtXPNr7hVgKc4Q",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0169",
    "plataforma": "YouTube",
    "creador": "Salvador FI",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/@SalvadorFI",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0170",
    "plataforma": "YouTube",
    "creador": "Susi Profe",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.youtube.com/susiprofe",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: enlace_en_sitio_del_autor"
  },
  {
    "id": "CAT-0171",
    "plataforma": "YouTube",
    "creador": "Susi Profe",
    "materias": "Matemática; Física; Química",
    "nivel": "Secundaria; bachillerato",
    "url": "https://www.youtube.com/c/SusiProfe",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0172",
    "plataforma": "YouTube",
    "creador": "unicoos",
    "materias": "Matemática; Física; Química",
    "nivel": "ESO; bachillerato; ingreso",
    "url": "https://www.youtube.com/@unicoos",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0173",
    "plataforma": "YouTube",
    "creador": "Unitips",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Ingreso UNAM; IPN",
    "url": "https://www.youtube.com/@unitipsmx",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: Identidad localizada en búsqueda/ fuente oficial"
  },
  {
    "id": "CAT-0174",
    "plataforma": "YouTube",
    "creador": "YouTube > comentarios (mecanismo)",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://developers.google.com/youtube/v3/docs/commentThreads/list",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0175",
    "plataforma": "YouTube",
    "creador": "YouTube > Daniel Carreón",
    "materias": "matematica",
    "nivel": "secundaria",
    "url": "https://www.youtube.com/@DanielCarreon",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0176",
    "plataforma": "YouTube",
    "creador": "YouTube > Matemáticas con Grajeda",
    "materias": "matematica",
    "nivel": "secundaria/universidad",
    "url": "https://www.youtube.com/@MatematicasConGrajeda",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0177",
    "plataforma": "YouTube",
    "creador": "YouTube > Matemáticas profe Alex",
    "materias": "matematica",
    "nivel": "secundaria",
    "url": "https://www.youtube.com/@MatematicasProfeAlex",
    "resourceId": "",
    "activo": false,
    "notas": "P2 - Comentarios | Canal o creador | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0178",
    "plataforma": "YouTube",
    "creador": "YouTube > video 'Álgebra desde cero' (Mathematics with Juan)",
    "materias": "matematica",
    "nivel": "secundaria/universidad",
    "url": "https://www.youtube.com/watch?v=_6uyQISZvBc",
    "resourceId": "_6uyQISZvBc",
    "activo": false,
    "notas": "P2 - Comentarios | Video concreto | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0179",
    "plataforma": "Apuntes y documentos",
    "creador": "Scribd / Docsity / Issuu",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.scribd.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0180",
    "plataforma": "Apuntes y documentos",
    "creador": "Studocu > consultas de necesidad",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.studocu.com",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0181",
    "plataforma": "Apuntes y documentos",
    "creador": "Studocu > filtro Argentina",
    "materias": "todas",
    "nivel": "universidad",
    "url": "https://www.studocu.com/es-ar",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0182",
    "plataforma": "Apuntes y documentos",
    "creador": "Studocu > indice Algolia (mineria documental)",
    "materias": "todas",
    "nivel": "universidad",
    "url": "https://X5UKSETF9T-dsn.algolia.net/1/indexes/production_document/query",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0183",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "A Cierta Ciencia",
    "materias": "Biología; Química; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.aciertaciencia.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0184",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "Amigos de la Química",
    "materias": "Química; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://amigosdelaquimica.es/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0185",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "Breaking Vlad",
    "materias": "Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.patreon.com/breakingvlad/about?l=es-ES",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0186",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "Daniel Carreón",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://blog.youtube/intl/es-419/creator-and-artist-stories/facilisimo-verdad-daniel-carreon-celebra-10-millones-de-suscriptores/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0187",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "Educatina",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.educatina.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: localizada_en_busqueda_web"
  },
  {
    "id": "CAT-0188",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "El Traductor de Ingeniería",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.patreon.com/eltraductordeingenieria/about?l=es-419",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0189",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "La Hiperactina",
    "materias": "Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.patreon.com/lahiperactina/about",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0190",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "Quimitube",
    "materias": "Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.quimitube.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0191",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "Unicoos",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.beunicoos.com/canal/unicoos",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0192",
    "plataforma": "Creadores: entrada para resolver canal",
    "creador": "unProfesor",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.unprofesor.com/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Resolver URL de canal | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0193",
    "plataforma": "Discord",
    "creador": "DISBOARD — Matemáticas",
    "materias": "Matemática",
    "nivel": "Validar",
    "url": "https://disboard.org/servers/tag/matematicas?nsfw=0&sort=-id&fl=et",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: Directorio localizado; filtro lingüístico no fiable"
  },
  {
    "id": "CAT-0194",
    "plataforma": "Discord",
    "creador": "DISBOARD: comunidades de matemática en español",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://disboard.org/es/servers/tag/matematicas?fl=es",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: pagina_leida"
  },
  {
    "id": "CAT-0195",
    "plataforma": "Discord",
    "creador": "Discord > directorio por tema",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://discord.me/servers/tag/mathematics",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0196",
    "plataforma": "Discord",
    "creador": "Discord > mensajes de canal",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://discord.com",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0197",
    "plataforma": "Discord",
    "creador": "Discord > servidores de matematicas",
    "materias": "matematica",
    "nivel": "todas",
    "url": "https://discord.com/invite/maths",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0198",
    "plataforma": "Discord",
    "creador": "DiscordHome — Ciencia",
    "materias": "Ciencias",
    "nivel": "Validar",
    "url": "https://discordhome.com/es/server/science-",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: Ficha localizada; idioma y vigencia pendientes"
  },
  {
    "id": "CAT-0199",
    "plataforma": "Facebook",
    "creador": "Facebook > Content Library",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/fb-groups/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0200",
    "plataforma": "Facebook",
    "creador": "Facebook Marketplace / Instagram servicios",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://www.facebook.com/marketplace/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Portal o plataforma | Verificar: Informe externo: NO VERIFICADO"
  },
  {
    "id": "CAT-0201",
    "plataforma": "Facebook",
    "creador": "Instagram > API de comentarios",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0202",
    "plataforma": "Facebook",
    "creador": "Instagram > hashtag search",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0203",
    "plataforma": "Facebook",
    "creador": "La Prof Lina M3 — ProfesoraLina",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.facebook.com/ProfesoraLina",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0204",
    "plataforma": "Facebook",
    "creador": "Matemáticas profe Alex",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.facebook.com/MatematicasProfeAlex",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0205",
    "plataforma": "Facebook",
    "creador": "Susi Profe",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://facebook.com/susiprofe",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0206",
    "plataforma": "Instagram",
    "creador": "Amigos de la Química",
    "materias": "Química; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/amigosdelaquimica",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0207",
    "plataforma": "Instagram",
    "creador": "Bio[ESO]sfera",
    "materias": "Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/bioesosfera/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0208",
    "plataforma": "Instagram",
    "creador": "Bióloga Elena — Instagram",
    "materias": "Biología",
    "nivel": "Varios",
    "url": "https://www.instagram.com/biologaelena/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda/ enlace oficial"
  },
  {
    "id": "CAT-0209",
    "plataforma": "Instagram",
    "creador": "Filadd Chile — Instagram",
    "materias": "Ciencias; Matemática",
    "nivel": "Varios",
    "url": "https://www.instagram.com/filadd.cl/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda/ enlace oficial"
  },
  {
    "id": "CAT-0210",
    "plataforma": "Instagram",
    "creador": "FISICA EN SEGUNDOS — Instagram",
    "materias": "Física",
    "nivel": "Varios",
    "url": "https://www.instagram.com/fisicaensegundos/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda/ enlace oficial"
  },
  {
    "id": "CAT-0211",
    "plataforma": "Instagram",
    "creador": "Grupo Ciencias — Instagram",
    "materias": "Ciencias; Matemática",
    "nivel": "Varios",
    "url": "https://www.instagram.com/cienciasgrupo/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda/ enlace oficial"
  },
  {
    "id": "CAT-0212",
    "plataforma": "Instagram",
    "creador": "Ingreso Suma Exactas UNLP",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/exactas.ingreso.suma",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0213",
    "plataforma": "Instagram",
    "creador": "Instagram > cuentas docente (imanes de comentarios)",
    "materias": "todas",
    "nivel": "secundaria",
    "url": "https://www.instagram.com/matematicas.profes/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0214",
    "plataforma": "Instagram",
    "creador": "Instagram > hashtags de ejercicios",
    "materias": "todas",
    "nivel": "secundaria",
    "url": "https://www.instagram.com/explore/tags/matematicas/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0215",
    "plataforma": "Instagram",
    "creador": "Interconectados UBA XXI",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/interconectadosubaxxi",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0216",
    "plataforma": "Instagram",
    "creador": "La Hiperactina — Instagram",
    "materias": "Biología",
    "nivel": "Varios",
    "url": "https://www.instagram.com/lahiperactina/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda/ enlace oficial"
  },
  {
    "id": "CAT-0217",
    "plataforma": "Instagram",
    "creador": "La Prof Lina M3",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/laproflinam3/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0218",
    "plataforma": "Instagram",
    "creador": "Matemáticas profe Alex",
    "materias": "Matemática",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/matematicasprofealex/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0219",
    "plataforma": "Instagram",
    "creador": "Math2me",
    "materias": "Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/math2me/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0220",
    "plataforma": "Instagram",
    "creador": "Profesor Sergio Llanos — Instagram",
    "materias": "Física; Matemática",
    "nivel": "Varios",
    "url": "https://www.instagram.com/profesorsergiollanos/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda/ enlace oficial"
  },
  {
    "id": "CAT-0221",
    "plataforma": "Instagram",
    "creador": "Sinapsis FFyB UBA",
    "materias": "Química; Biología; Matemática; Física",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/sinapsisffyb/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0222",
    "plataforma": "Instagram",
    "creador": "Susi Profe",
    "materias": "Matemática; Física; Química",
    "nivel": "Argentina / enseñanza online en español",
    "url": "https://www.instagram.com/susi.profe",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: enlace_o_identificador_en_fuente"
  },
  {
    "id": "CAT-0223",
    "plataforma": "Preguntas y respuestas",
    "creador": "AskFilo ES",
    "materias": "todas",
    "nivel": "secundaria/universidad",
    "url": "https://askfilo.com",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0224",
    "plataforma": "Preguntas y respuestas",
    "creador": "IXL LATAM",
    "materias": "matematica",
    "nivel": "secundaria",
    "url": "https://la.ixl.com",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0225",
    "plataforma": "Preguntas y respuestas",
    "creador": "Symbolab ES",
    "materias": "todas",
    "nivel": "universidad",
    "url": "https://es.symbolab.com",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Señal débil | Punto de entrada | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0226",
    "plataforma": "TikTok",
    "creador": "Física en segundos — TikTok",
    "materias": "Ciencias; Matemática",
    "nivel": "Varios",
    "url": "https://www.tiktok.com/@fisicaensegundos",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda"
  },
  {
    "id": "CAT-0227",
    "plataforma": "TikTok",
    "creador": "Grupo Ciencias — TikTok",
    "materias": "Ciencias; Matemática",
    "nivel": "Varios",
    "url": "https://www.tiktok.com/@grupociencias",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: Perfil localizado en búsqueda"
  },
  {
    "id": "CAT-0228",
    "plataforma": "TikTok",
    "creador": "TikTok > Display API",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://developers.tiktok.com/docs/en/tiktok-api-v1-video-list",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0229",
    "plataforma": "TikTok",
    "creador": "TikTok > hashtags de mate y tareas",
    "materias": "todas",
    "nivel": "secundaria",
    "url": "https://www.tiktok.com/tag/matematicas",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0230",
    "plataforma": "TikTok",
    "creador": "TikTok > Research API",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://developers.tiktok.com/docs/en/research-api-get-started",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Perfil social | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0231",
    "plataforma": "Tusclases",
    "creador": "Tusclases ARG > API host",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://api.tusclasesparticulares.com",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Mercado extranjero | Punto de entrada | Verificar: Informe externo: PARCIAL"
  },
  {
    "id": "CAT-0232",
    "plataforma": "Tusclases",
    "creador": "Tusclases ARG > biologia",
    "materias": "biologia",
    "nivel": "todas",
    "url": "https://www.tusclases.com.ar/alumnos/biologia.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - No prioritario / posible 404 | Tablón de solicitudes | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0233",
    "plataforma": "Tusclases",
    "creador": "Tusclases ARG > ingles",
    "materias": "ingles",
    "nivel": "todas",
    "url": "https://www.tusclases.com.ar/alumnos/ingles.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - No prioritario / posible 404 | Tablón de solicitudes | Verificar: Informe externo: VERIFICADO"
  },
  {
    "id": "CAT-0234",
    "plataforma": "Tusclases",
    "creador": "Tusclases España — Biología",
    "materias": "Biología",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclasesparticulares.com/alumnos/biologia.aspx?pagina=2",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - No prioritario / posible 404 | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0235",
    "plataforma": "Tusclases",
    "creador": "Tusclases España — Física",
    "materias": "Física",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclasesparticulares.com/alumnos/fisica.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Mercado extranjero | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0236",
    "plataforma": "Tusclases",
    "creador": "Tusclases España — Matemáticas",
    "materias": "Matemática",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclasesparticulares.com/alumnos/matematicas.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Mercado extranjero | Portal o plataforma | Verificar: Informe externo: Página localizada; contenido leído"
  },
  {
    "id": "CAT-0237",
    "plataforma": "Tusclases",
    "creador": "Tusclases España — Química",
    "materias": "Química",
    "nivel": "Validar por anuncio",
    "url": "https://www.tusclasesparticulares.com/alumnos/quimica.aspx",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Mercado extranjero | Portal o plataforma | Verificar: Informe externo: Página localizada en búsqueda"
  },
  {
    "id": "CAT-0238",
    "plataforma": "WhatsApp",
    "creador": "Directorio de grupos CBC y UBA XXI — Entienda y Aprenda",
    "materias": "Matemática; Física; Química; Biología",
    "nivel": "CBC; UBA XXI",
    "url": "https://entiendayaprenda.com/gruposcbcyubaxxi/",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: Directorio localizado en búsqueda"
  },
  {
    "id": "CAT-0239",
    "plataforma": "WhatsApp",
    "creador": "WhatsApp > grupos de clase",
    "materias": "todas",
    "nivel": "todas",
    "url": "https://chat.whatsapp.com/<invite>",
    "resourceId": "",
    "activo": false,
    "notas": "P3 - Acceso restringido | Punto de entrada | Verificar: Informe externo: NO VERIFICADO"
  }
];

function resolverConectorFuente(f) {
  var url = String(f.url || '').toLowerCase();
  var plat = String(f.plataforma || '').toLowerCase();
  if (url.indexOf('tusclases.com') >= 0 || plat === 'tusclases') return 'tusclases';
  if (url.indexOf('utnianos.com.ar') >= 0 || plat.indexOf('utnianos') >= 0) return 'utnianos';
  if (url.indexOf('youtube.com') >= 0 || plat === 'youtube') return 'youtube';
  if (url.indexOf('syndication') >= 0 || url.indexOf('rss') >= 0 || url.indexOf('.xml') >= 0) return 'rss';
  if (/facebook|instagram|telegram|whatsapp|discord|tiktok/.test(plat)) return 'manual';
  return 'exploratorio';
}

function importarCatalogoMaestro(opts) {
  opts = opts || {};
  var ss = ss_();
  var sh = ss.getSheetByName(SH.FN) || ss.insertSheet(SH.FN);
  var lastRow = sh.getLastRow();
  if (lastRow > 1 && !opts.force) {
    return { total: MASTER_CATALOG_SOURCES.length, status: 'conservado', mensaje: 'La hoja Fuentes ya contiene registros. Usar {force:true} para reiniciar.' };
  }
  if (lastRow > 1 && opts.force) {
    try {
      if (sh.deleteRows) sh.deleteRows(2, lastRow - 1);
    } catch (e) { }
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.Fuentes.length).setValues([HEADERS.Fuentes]);
    sh.setFrozenRows(1);
  }
  var rows = MASTER_CATALOG_SOURCES.map(function(s) {
    return [
      s.id,
      s.plataforma,
      s.creador,
      s.materias,
      s.nivel,
      s.url,
      s.resourceId || '',
      false, // Activo = FALSE obligatorio
      '',
      s.notas || ('Conector: ' + resolverConectorFuente(s))
    ];
  });
  append_(SH.FN, rows);
  return { total: rows.length, status: 'importado' };
}


/**
 * Clasifica cualquier fuente según plataforma, tipo de acceso, prioridad, disponibilidad y conector.
 * Usado por el orquestador y la reconciliación del catálogo maestro.
 */
function clasificarFuenteCatalogo(s) {
  var url = String(s.url || '').toLowerCase();
  var plat = String(s.plataforma || '').toLowerCase();
  var creador = String(s.creador || '').toLowerCase();
  var notas = String(s.notas || '');

  var prioridad = 'P3';
  if (/P0\b/i.test(notas)) prioridad = 'P0';
  else if (/P1\b/i.test(notas)) prioridad = 'P1';
  else if (/P2\b/i.test(notas)) prioridad = 'P2';

  // 1. YouTube
  if (plat === 'youtube' || url.indexOf('youtube.com') >= 0 || url.indexOf('youtu.be') >= 0) {
    return {
      tipoAcceso: 'api_oficial',
      conector: 'youtube_canales',
      disponibilidad: 'DISPONIBLE',
      prioridad: prioridad,
      motivoNoDisp: ''
    };
  }

  // 2. RSS / Atom / Syndication (e.g. UTNianos RSS)
  if (url.indexOf('syndication.php') >= 0 || url.indexOf('/rss') >= 0 || url.indexOf('/feed') >= 0 || url.endsWith('.xml') || creador.indexOf('rss') >= 0) {
    return {
      tipoAcceso: 'rss_publico',
      conector: 'rss_foros',
      disponibilidad: 'DISPONIBLE',
      prioridad: prioridad,
      motivoNoDisp: ''
    };
  }

  // 3. Gmail: Tusclases, Superprof, Google Alerts (vía alertas docentes en correo)
  if (plat === 'tusclases' || url.indexOf('tusclases.com') >= 0 || plat.indexOf('superprof') >= 0 || url.indexOf('superprof') >= 0 || creador.indexOf('alertas') >= 0 || creador.indexOf('google alerts') >= 0) {
    return {
      tipoAcceso: 'gmail_autorizado',
      conector: 'gmail_alertas',
      disponibilidad: 'DISPONIBLE',
      prioridad: prioridad,
      motivoNoDisp: ''
    };
  }

  // 4. Plataformas con restricciones estrictas de términos de servicio / sin API pública autorizada
  if (/facebook|instagram|tiktok|telegram|whatsapp|discord/.test(plat)) {
    return {
      tipoAcceso: 'no_automatizable',
      conector: 'ninguno',
      disponibilidad: 'NO_AUTOMATIZABLE',
      prioridad: prioridad,
      motivoNoDisp: 'Restricciones de CGU / Requiere API oficial verificada y tokens comerciales'
    };
  }

  // 5. Reddit
  if (plat === 'reddit' || url.indexOf('reddit.com') >= 0) {
    return {
      tipoAcceso: 'requiere_permiso',
      conector: 'ninguno',
      disponibilidad: 'REQUIERE_CONFIG',
      prioridad: prioridad,
      motivoNoDisp: 'Requiere registro OAuth y credenciales de desarrollador de Reddit'
    };
  }

  // 6. Foros sin RSS público explícito / Directorios universitarios / Apuntes
  return {
    tipoAcceso: 'no_automatizable',
    conector: 'ninguno',
    disponibilidad: 'NO_AUTOMATIZABLE',
    prioridad: prioridad,
    motivoNoDisp: 'Punto de entrada informativo sin feed o conector automatizado autorizado'
  };
}

/**
 * Reconcilia e incorpora las 239 entradas del catálogo maestro a la hoja Fuentes.
 * Preserva estrictamente los identificadores y registros preexistentes en STAGING.
 */
/**
 * Reconcilia e incorpora las 239 entradas del catálogo maestro a la hoja Fuentes.
 * Migración idempotente por encabezado:
 * - Detecta el encabezado existente (10 columnas históricas o nuevas).
 * - Migra a las 15 columnas canónicas completas.
 * - Preserva rigurosamente los valores existentes de Activo, Notas, ID y Última revisión.
 * - Asegura que todas las fuentes nuevas arranquen con Activo = FALSE y estado PENDIENTE_VERIFICACION.
 */
function resolverSpreadsheetCatalogo_() {
  // Seguridad: una migración NUNCA puede saltarse la verificación de STAGING.
  // No hay fallback a SHEET_ID, hoja activa ni otro proyecto.
  if (typeof orqDb_ !== 'function') {
    throw new Error('No está disponible orqDb_. La migración se canceló sin modificar datos.');
  }
  return orqDb_();
}

function respaldarHojaFuentes_(ss) {
  var sh = ss.getSheetByName('Fuentes');
  if (!sh || sh.getLastRow() < 1) return null;

  var ts = '';
  try {
    ts = Utilities.formatDate(new Date(), 'GMT-3', 'yyyyMMdd_HHmmss');
  } catch (e) {
    ts = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  }
  var backupName = 'Fuentes_Backup_' + ts;
  if (ss.getSheetByName(backupName)) {
    backupName += '_' + Math.floor(Math.random() * 1000);
  }

  var backupSheet = null;
  if (typeof sh.copyTo === 'function') {
    try {
      backupSheet = sh.copyTo(ss);
      if (backupSheet && typeof backupSheet.setName === 'function') {
        backupSheet.setName(backupName);
      }
    } catch(e) {
      backupSheet = null;
    }
  }

  if (!backupSheet) {
    backupSheet = ss.insertSheet(backupName);
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    if (lr > 0 && lc > 0) {
      var vals = sh.getRange(1, 1, lr, lc).getValues();
      backupSheet.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
    }
  }
  return backupName;
}

function sincronizarCatalogoFuentes(ss, opts) {
  if (!ss) {
    ss = resolverSpreadsheetCatalogo_();
  }
  opts = opts || {};
  var backupName = opts.backupHoja || null;
  if (opts.crearBackup !== false && !backupName) {
    backupName = respaldarHojaFuentes_(ss);
  }

  var sh = ss.getSheetByName('Fuentes') || ss.insertSheet('Fuentes');
  var canonicalHeaders = [
    'ID Fuente', 'Plataforma', 'Canal / Creador', 'Temas / Materias', 'Nivel / Universidad',
    'URL Canal / Recurso', 'ID Recurso', 'Activo', 'Tipo Acceso', 'Prioridad',
    'Disponibilidad', 'Conector', 'Estado Verificacion', 'Ultima revision', 'Notas'
  ];

  var lastRow = sh.getLastRow();
  var existingRows = [];
  var headerMap = {};

  if (lastRow > 0) {
    var rawHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    rawHeaders.forEach(function(h, idx) {
      var norm = String(h || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      headerMap[norm] = idx;
    });

    if (lastRow > 1) {
      existingRows = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
    }
  }

  // Mapear cada fila existente por nombre de columna
  function getVal(row, keyVariants) {
    for (var k = 0; k < keyVariants.length; k++) {
      var idx = headerMap[keyVariants[k]];
      if (typeof idx === 'number' && idx >= 0 && idx < row.length) {
        return row[idx];
      }
    }
    return '';
  }

  var existingById = {}, existingByUrl = {};
  var migratedExisting = [];

  existingRows.forEach(function(r) {
    var rawId = String(getVal(r, ['idfuente', 'id', 'idfuentes']) || r[0] || '').trim();
    var plat = String(getVal(r, ['plataforma', 'plat']) || r[1] || '').trim();
    var creator = String(getVal(r, ['canalcreador', 'creador', 'canal', 'nombre']) || r[2] || '').trim();
    var topics = String(getVal(r, ['temasmaterias', 'materias', 'tema']) || r[3] || '').trim();
    var level = String(getVal(r, ['niveluniversidad', 'nivel']) || r[4] || '').trim();
    var url = String(getVal(r, ['urlcanalrecurso', 'urlrecurso', 'url']) || r[5] || '').trim();
    var resId = String(getVal(r, ['idrecurso', 'resourceid', 'recursoid']) || r[6] || '').trim();
    var rawAct = getVal(r, ['activo']);
    if (rawAct === '' && typeof r[7] !== 'undefined') rawAct = r[7];
    var active = (String(rawAct).toUpperCase() === 'TRUE' || rawAct === true);

    var access = String(getVal(r, ['tipoacceso', 'acceso']) || '').trim();
    var priority = String(getVal(r, ['prioridad']) || '').trim();
    var avail = String(getVal(r, ['disponibilidad']) || '').trim();
    var connector = String(getVal(r, ['conector']) || '').trim();
    var verState = String(getVal(r, ['estadoverificacion', 'estado']) || '').trim();
    var lastRev = getVal(r, ['ultimarevision', 'revisado']);
    var notes = String(getVal(r, ['notas', 'observaciones']) || '').trim();

    // Si faltan campos de clasificación, autocompletar mediante clasificarFuenteCatalogo
    if (!connector || !access || !avail) {
      var c = clasificarFuenteCatalogo({ id: rawId, plataforma: plat, creador: creator, url: url, resourceId: resId, notas: notes });
      access = access || c.tipoAcceso;
      priority = priority || c.prioridad;
      avail = avail || c.disponibilidad;
      connector = connector || c.conector;
    }
    if (!verState) {
      verState = (connector !== 'ninguno') ? 'PENDIENTE_VERIFICACION' : (avail === 'NO_AUTOMATIZABLE' ? 'NO_AUTOMATIZABLE' : 'PENDIENTE_VERIFICACION');
    }

    var record = [
      rawId, plat, creator, topics, level, url, resId, active,
      access, priority, avail, connector, verState, lastRev || '', notes
    ];

    if (rawId) existingById[rawId] = record;
    if (url) existingByUrl[url.toLowerCase()] = record;
    migratedExisting.push(record);
  });

  // Incorporar fuentes faltantes del catálogo maestro (239 entradas)
  var addedCount = 0;
  MASTER_CATALOG_SOURCES.forEach(function(s) {
    var id = String(s.id).trim();
    var url = String(s.url || '').trim().toLowerCase();
    if (existingById[id] || (url && existingByUrl[url])) {
      return;
    }
    var c = clasificarFuenteCatalogo(s);
    var verState = (c.conector !== 'ninguno') ? 'PENDIENTE_VERIFICACION' : (c.disponibilidad === 'NO_AUTOMATIZABLE' ? 'NO_AUTOMATIZABLE' : 'PENDIENTE_VERIFICACION');
    var newRow = [
      s.id,
      s.plataforma,
      s.creador,
      s.materias,
      s.nivel,
      s.url,
      s.resourceId || '',
      false, // Activo = FALSE obligatorio para fuentes del catálogo inicial
      c.tipoAcceso,
      c.prioridad,
      c.disponibilidad,
      c.conector,
      verState,
      '', // Última revisión
      s.notas || c.motivoNoDisp
    ];
    migratedExisting.push(newRow);
    existingById[s.id] = newRow;
    if (url) existingByUrl[url] = newRow;
    addedCount++;
  });

  // Escribir encabezado canónico y todas las filas migradas
  if (typeof sh.clearContents === 'function') { sh.clearContents(); }
  sh.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);
  sh.setFrozenRows(1);
  if (migratedExisting.length > 0) {
    sh.getRange(2, 1, migratedExisting.length, canonicalHeaders.length).setValues(migratedExisting);
  }

  return {
    ok: true,
    backupHoja: backupName,
    preservados: existingRows.length,
    agregados: addedCount,
    total: migratedExisting.length,
    unicas: migratedExisting.length
  };
}

/**
 * FUNCIÓN PÚBLICA DE MIGRACIÓN SEGURA (ejecutable desde el selector de Apps Script sin parámetros)
 * - Conecta a la planilla STAGING de forma segura.
 * - Genera un respaldo íntegro de la hoja Fuentes preexistente en Fuentes_Backup_YYYYMMDD_HHMMSS.
 * - Migra el encabezado histórico de 10 columnas al esquema canónico de 15 columnas.
 * - Preserva rigurosamente los registros existentes (IDs, Activo=FALSE, Notas, Última revisión).
 * - Incorpora las fuentes faltantes del catálogo maestro hasta totalizar exactamente 239 entradas únicas.
 * - Asegura que todas las fuentes arranquen con Activo = FALSE.
 * - Realiza una verificación final estricta y emite informe detallado en Logger.log.
 */
function migrarCatalogoFuentesSeguro() {
  var ss = resolverSpreadsheetCatalogo_();
  var backupName = respaldarHojaFuentes_(ss);
  var res = sincronizarCatalogoFuentes(ss, { backupHoja: backupName, crearBackup: false });

  // Comprobación final estricta
  var sh = ss.getSheetByName('Fuentes');
  if (!sh) throw new Error('Error crítico: no se encontró la hoja Fuentes tras la migración.');
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lc !== 15) throw new Error('Verificación fallida: se esperaban 15 columnas canónicas, pero hay ' + lc);
  if (lr !== 240) throw new Error('Verificación fallida: se esperaban exactamente 239 fuentes + 1 encabezado, pero hay ' + lr);

  var headers = sh.getRange(1, 1, 1, 15).getValues()[0];
  var rows = sh.getRange(2, 1, lr - 1, 15).getValues();

  var allInactive = true;
  var hasEmptyId = false;
  var uniqueIds = {};

  for (var i = 0; i < rows.length; i++) {
    var id = String(rows[i][0] || '').trim();
    if (!id) hasEmptyId = true;
    uniqueIds[id] = (uniqueIds[id] || 0) + 1;
    var act = rows[i][7];
    if (act === true || String(act).toUpperCase() === 'TRUE') {
      allInactive = false;
    }
  }

  if (hasEmptyId) throw new Error('Verificación fallida: existen filas con ID Fuente vacío.');
  if (Object.keys(uniqueIds).length !== 239) {
    throw new Error('Verificación fallida: no hay exactamente 239 IDs únicos.');
  }
  MASTER_CATALOG_SOURCES.forEach(function(s) {
    if (uniqueIds[s.id] !== 1) {
      throw new Error('Verificación fallida: ID faltante o repetido: ' + s.id);
    }
  });

  var report = [
    '=================================================================',
    '  MIGRACIÓN SEGURA DEL CATÁLOGO DE FUENTES (Apps Script STAGING)  ',
    '=================================================================',
    'Planilla: ' + (ss.getName ? ss.getName() : 'STAGING') + ' (' + (ss.getId ? ss.getId() : '') + ')',
    'Hoja de respaldo creada: ' + (backupName || '(sin hoja previa)'),
    'Columnas canónicas: ' + lc + ' (esquema canónico de 15 columnas)',
    'Fuentes preexistentes preservadas: ' + res.preservados,
    'Fuentes nuevas incorporadas: ' + res.agregados,
    'Total de entradas en Fuentes: ' + rows.length + ' (239 entradas únicas)',
    'Total IDs únicos: ' + Object.keys(uniqueIds).length,
    'Estado Activo=FALSE general: ' + (allInactive ? 'VERIFICADO (todas en FALSE)' : 'CONSERVA CONFIGURACIÓN PREVIA'),
    'Verificación de integridad: EXITOSA Y VALIDADA',
    '================================================================='
  ].join('\n');

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(report);
  }

  return {
    ok: true,
    backupHoja: backupName,
    preservados: res.preservados,
    agregados: res.agregados,
    total: rows.length,
    columnas: lc,
    verificacion: 'EXITOSA'
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    MASTER_CATALOG_SOURCES: MASTER_CATALOG_SOURCES,
    resolverConectorFuente: resolverConectorFuente,
    importarCatalogoMaestro: importarCatalogoMaestro,
    clasificarFuenteCatalogo: clasificarFuenteCatalogo,
    sincronizarCatalogoFuentes: sincronizarCatalogoFuentes,
    migrarCatalogoFuentesSeguro: migrarCatalogoFuentesSeguro,
    resolverSpreadsheetCatalogo_: resolverSpreadsheetCatalogo_,
    respaldarHojaFuentes_: respaldarHojaFuentes_
  };
}
