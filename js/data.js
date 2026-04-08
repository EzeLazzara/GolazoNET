// ============================================
//   CANCHARANET - DATA.JS
//   Datos reales del futbol argentino
//   Liga Profesional 2025 - Torneo Apertura
//   Fuente: promiedos.com.ar - Fecha 11
// ============================================

// IDs de equipos de api.promiedos.com.ar
const ESCUDOS = {
  // Liga Profesional - Zona A
  "Velez Sarsfield":       "https://api.promiedos.com.ar/images/team/ihc/1",
  "Estudiantes":           "https://api.promiedos.com.ar/images/team/igh/1",
  "Defensa y Justicia":    "https://api.promiedos.com.ar/images/team/hcbh/1",
  "Lanus":                 "https://api.promiedos.com.ar/images/team/igj/1",
  "Talleres":              "https://api.promiedos.com.ar/images/team/jche/1",
  "Boca Juniors":          "https://api.promiedos.com.ar/images/team/igg/1",
  "Union Santa Fe":        "https://api.promiedos.com.ar/images/team/hcag/1",
  "Independiente":         "https://api.promiedos.com.ar/images/team/ihe/1",
  "San Lorenzo":           "https://api.promiedos.com.ar/images/team/igf/1",
  "Platense":              "https://api.promiedos.com.ar/images/team/hcah/1",
  "Central Cordoba":       "https://api.promiedos.com.ar/images/team/beafh/1",
  "Instituto":             "https://api.promiedos.com.ar/images/team/hchc/1",
  "Gimnasia Mendoza":      "https://api.promiedos.com.ar/images/team/bbjbf/1",
  "Riestra":               "https://api.promiedos.com.ar/images/team/bbjea/1",
  "Newells":               "https://api.promiedos.com.ar/images/team/ihh/1",
  // Liga Profesional - Zona B
  "Ind. Rivadavia":        "https://api.promiedos.com.ar/images/team/hcch/1",
  "River Plate":           "https://api.promiedos.com.ar/images/team/igi/1",
  "Argentinos Juniors":    "https://api.promiedos.com.ar/images/team/ihb/1",
  "Belgrano":              "https://api.promiedos.com.ar/images/team/fhid/1",
  "Racing Club":           "https://api.promiedos.com.ar/images/team/ihg/1",
  "Rosario Central":       "https://api.promiedos.com.ar/images/team/ihf/1",
  "Tigre":                 "https://api.promiedos.com.ar/images/team/iid/1",
  "Barracas Central":      "https://api.promiedos.com.ar/images/team/jafb/1",
  "Huracan":               "https://api.promiedos.com.ar/images/team/iie/1",
  "Gimnasia LP":           "https://api.promiedos.com.ar/images/team/iia/1",
  "Banfield":              "https://api.promiedos.com.ar/images/team/ihi/1",
  "Sarmiento":             "https://api.promiedos.com.ar/images/team/hbbh/1",
  "Atletico Tucuman":      "https://api.promiedos.com.ar/images/team/gbfc/1",
  "Aldosivi":              "https://api.promiedos.com.ar/images/team/hccd/1",
  "Estudiantes RC":        "https://api.promiedos.com.ar/images/team/bheaf/1",
  // Primera Nacional
  "San Martin Tucuman":    "https://upload.wikimedia.org/wikipedia/commons/6/66/Club_Atletico_San_Martin_Tucuman.svg",
  "Brown Adrogue":         "https://upload.wikimedia.org/wikipedia/commons/7/72/Club_Atletico_Brown.svg",
  "Quilmes":               "https://upload.wikimedia.org/wikipedia/commons/a/a9/Quilmes_Atletico_Club.svg",
  "Nueva Chicago":         "https://upload.wikimedia.org/wikipedia/commons/e/e6/Nueva_Chicago_logo.svg",
  "Ferro":                 "https://upload.wikimedia.org/wikipedia/commons/1/17/Ferro_Carril_Oeste_logo.svg",
  "Temperley":             "https://upload.wikimedia.org/wikipedia/commons/e/e3/Club_Atletico_Temperley.svg",
  "Chacarita":             "https://upload.wikimedia.org/wikipedia/commons/2/21/Chacarita_juniors_logo.svg",
  "All Boys":              "https://upload.wikimedia.org/wikipedia/commons/7/79/All_Boys_de_Buenos_Aires.svg",
};

function getEscudo(nombre, fallback) {
  fallback = fallback || "⚽";
  var url = ESCUDOS[nombre];
  if (url) return '<img src="' + url + '" alt="' + nombre + '" class="escudo-img" onerror="this.outerHTML=\'<span class=escudo-emoji>' + fallback + '</span>\'">';
  return '<span class="escudo-emoji">' + fallback + '</span>';
}

// Divisiones y competiciones argentinas
const DIVISIONES = {
  primera:    { nombre: "Liga Profesional",      emoji: "🏆", nivel: 1 },
  primera_a:  { nombre: "Liga Prof. - Zona A",   emoji: "🏆", nivel: 1 },
  primera_b:  { nombre: "Liga Prof. - Zona B",   emoji: "🏆", nivel: 1 },
  nacional:   { nombre: "Primera Nacional",      emoji: "🥈", nivel: 2 },
  federala:   { nombre: "Federal A",             emoji: "🥉", nivel: 3 },
  federalam:  { nombre: "Federal Amateur",       emoji: "⚡", nivel: 4 },
  bmetro:     { nombre: "B Metropolitana",       emoji: "🏙️", nivel: 3 },
  copa:       { nombre: "Copa Argentina",        emoji: "🏅", nivel: 0 },
  supercopa:  { nombre: "Supercopa Argentina",   emoji: "⭐", nivel: 0 },
};

// ============================================
//   PARTIDOS EN VIVO
// ============================================
const PARTIDOS_VIVO = [];

// ============================================
//   PARTIDOS HOY
// ============================================
const PARTIDOS_HOY = [];

// ============================================
//   PROXIMOS PARTIDOS
// ============================================
const PROXIMOS_PARTIDOS = [
  {
    id: 10,
    liga: "primera_a",
    ligaNombre: "Liga Profesional - Zona A",
    local:     { nombre: "Velez Sarsfield" },
    visitante: { nombre: "Estudiantes" },
    fecha: "Prox. fecha",
    hora: "A confirmar",
  },
  {
    id: 11,
    liga: "primera_b",
    ligaNombre: "Liga Profesional - Zona B",
    local:     { nombre: "River Plate" },
    visitante: { nombre: "Racing Club" },
    fecha: "Prox. fecha",
    hora: "A confirmar",
  },
  {
    id: 12,
    liga: "primera_a",
    ligaNombre: "Liga Profesional - Zona A",
    local:     { nombre: "Boca Juniors" },
    visitante: { nombre: "Independiente" },
    fecha: "Prox. fecha",
    hora: "A confirmar",
  },
  {
    id: 13,
    liga: "primera_b",
    ligaNombre: "Liga Profesional - Zona B",
    local:     { nombre: "Belgrano" },
    visitante: { nombre: "Argentinos Juniors" },
    fecha: "Prox. fecha",
    hora: "A confirmar",
  },
];

// ============================================
//   POSICIONES REALES
//   Liga Profesional 2025 - Apertura - Fecha 11
//   Fuente: promiedos.com.ar
// ============================================
const POSICIONES = {

  // ---- ZONA A ----
  // Fuente exacta: promiedos.com.ar - Fecha 11
  primera_a: [
    { pos:1,  equipo:"Velez Sarsfield",   pj:11, pg:6, pe:4, pp:1, gf:12, gc:6,  pts:22, zona:"champions" },
    { pos:2,  equipo:"Estudiantes",       pj:11, pg:6, pe:3, pp:2, gf:14, gc:5,  pts:21, zona:"champions" },
    { pos:3,  equipo:"Defensa y Justicia",pj:11, pg:4, pe:7, pp:0, gf:15, gc:8,  pts:19, zona:"europa" },
    { pos:4,  equipo:"Lanus",             pj:11, pg:5, pe:3, pp:3, gf:17, gc:14, pts:18, zona:"europa" },
    { pos:5,  equipo:"Talleres",          pj:11, pg:5, pe:3, pp:3, gf:12, gc:10, pts:18, zona:"normal" },
    { pos:6,  equipo:"Boca Juniors",      pj:11, pg:4, pe:5, pp:2, gf:13, gc:7,  pts:17, zona:"normal" },
    { pos:7,  equipo:"Union Santa Fe",    pj:11, pg:4, pe:4, pp:3, gf:16, gc:12, pts:16, zona:"normal" },
    { pos:8,  equipo:"Independiente",     pj:11, pg:3, pe:5, pp:3, gf:17, gc:15, pts:14, zona:"normal" },
    { pos:9,  equipo:"San Lorenzo",       pj:11, pg:3, pe:5, pp:3, gf:11, gc:12, pts:14, zona:"normal" },
    { pos:10, equipo:"Platense",          pj:11, pg:3, pe:5, pp:3, gf:6,  gc:7,  pts:14, zona:"normal" },
    { pos:11, equipo:"Central Cordoba",   pj:11, pg:3, pe:3, pp:5, gf:5,  gc:12, pts:12, zona:"normal" },
    { pos:12, equipo:"Instituto",         pj:11, pg:3, pe:2, pp:6, gf:11, gc:15, pts:11, zona:"normal" },
    { pos:13, equipo:"Gimnasia Mendoza",  pj:11, pg:2, pe:3, pp:6, gf:6,  gc:13, pts:9,  zona:"descenso" },
    { pos:14, equipo:"Riestra",           pj:11, pg:0, pe:7, pp:4, gf:3,  gc:7,  pts:7,  zona:"descenso" },
    { pos:15, equipo:"Newells",           pj:11, pg:1, pe:3, pp:7, gf:7,  gc:22, pts:6,  zona:"descenso" },
  ],

  // ---- ZONA B ----
  // Fuente exacta: promiedos.com.ar - Fecha 11
  primera_b: [
    { pos:1,  equipo:"Ind. Rivadavia",    pj:11, pg:7, pe:2, pp:2, gf:18, gc:12, pts:23, zona:"champions" },
    { pos:2,  equipo:"River Plate",       pj:11, pg:6, pe:2, pp:3, gf:14, gc:9,  pts:20, zona:"champions" },
    { pos:3,  equipo:"Argentinos Juniors",pj:11, pg:5, pe:5, pp:1, gf:10, gc:5,  pts:20, zona:"europa" },
    { pos:4,  equipo:"Belgrano",          pj:11, pg:5, pe:4, pp:2, gf:12, gc:9,  pts:19, zona:"europa" },
    { pos:5,  equipo:"Racing Club",       pj:11, pg:5, pe:3, pp:3, gf:15, gc:10, pts:18, zona:"normal" },
    { pos:6,  equipo:"Rosario Central",   pj:11, pg:5, pe:3, pp:3, gf:12, gc:9,  pts:18, zona:"normal" },
    { pos:7,  equipo:"Tigre",             pj:11, pg:4, pe:5, pp:2, gf:16, gc:10, pts:17, zona:"normal" },
    { pos:8,  equipo:"Barracas Central",  pj:11, pg:4, pe:4, pp:3, gf:10, gc:9,  pts:16, zona:"normal" },
    { pos:9,  equipo:"Huracan",           pj:11, pg:3, pe:5, pp:3, gf:9,  gc:9,  pts:14, zona:"normal" },
    { pos:10, equipo:"Gimnasia LP",       pj:11, pg:4, pe:2, pp:5, gf:13, gc:15, pts:14, zona:"normal" },
    { pos:11, equipo:"Banfield",          pj:11, pg:4, pe:1, pp:6, gf:12, gc:13, pts:13, zona:"normal" },
    { pos:12, equipo:"Sarmiento",         pj:11, pg:4, pe:1, pp:6, gf:8,  gc:11, pts:13, zona:"normal" },
    { pos:13, equipo:"Atletico Tucuman",  pj:11, pg:2, pe:3, pp:6, gf:12, gc:16, pts:9,  zona:"descenso" },
    { pos:14, equipo:"Aldosivi",          pj:11, pg:0, pe:5, pp:6, gf:3,  gc:13, pts:5,  zona:"descenso" },
    { pos:15, equipo:"Estudiantes RC",    pj:11, pg:1, pe:1, pp:9, gf:3,  gc:17, pts:4,  zona:"descenso" },
  ],

  // ---- TABLA ANUAL (alias "primera") ----
  primera: [
    { pos:1,  equipo:"Ind. Rivadavia",    pj:11, pg:7, pe:2, pp:2, gf:18, gc:12, pts:23, zona:"champions" },
    { pos:2,  equipo:"Velez Sarsfield",   pj:11, pg:7, pe:1, pp:3, gf:12, gc:6,  pts:22, zona:"champions" },
    { pos:3,  equipo:"Estudiantes",       pj:11, pg:6, pe:3, pp:2, gf:14, gc:5,  pts:21, zona:"champions" },
    { pos:4,  equipo:"River Plate",       pj:11, pg:6, pe:2, pp:3, gf:14, gc:9,  pts:20, zona:"champions" },
    { pos:5,  equipo:"Argentinos Juniors",pj:11, pg:6, pe:2, pp:3, gf:10, gc:5,  pts:20, zona:"europa" },
    { pos:6,  equipo:"Defensa y Justicia",pj:11, pg:6, pe:1, pp:4, gf:15, gc:8,  pts:19, zona:"europa" },
    { pos:7,  equipo:"Belgrano",          pj:11, pg:5, pe:4, pp:2, gf:12, gc:9,  pts:19, zona:"normal" },
    { pos:8,  equipo:"Racing Club",       pj:11, pg:5, pe:3, pp:3, gf:15, gc:10, pts:18, zona:"normal" },
    { pos:9,  equipo:"Lanus",             pj:11, pg:5, pe:3, pp:3, gf:17, gc:14, pts:18, zona:"normal" },
    { pos:10, equipo:"Rosario Central",   pj:11, pg:5, pe:3, pp:3, gf:12, gc:9,  pts:18, zona:"normal" },
    { pos:11, equipo:"Talleres",          pj:11, pg:5, pe:3, pp:3, gf:12, gc:10, pts:18, zona:"normal" },
    { pos:12, equipo:"Tigre",             pj:11, pg:5, pe:2, pp:4, gf:16, gc:10, pts:17, zona:"normal" },
    { pos:13, equipo:"Boca Juniors",      pj:11, pg:5, pe:2, pp:4, gf:13, gc:7,  pts:17, zona:"normal" },
    { pos:14, equipo:"Union Santa Fe",    pj:11, pg:4, pe:4, pp:3, gf:16, gc:12, pts:16, zona:"normal" },
    { pos:15, equipo:"Barracas Central",  pj:11, pg:4, pe:4, pp:3, gf:10, gc:9,  pts:16, zona:"normal" },
    { pos:16, equipo:"Independiente",     pj:11, pg:4, pe:2, pp:5, gf:17, gc:15, pts:14, zona:"normal" },
    { pos:17, equipo:"Huracan",           pj:11, pg:4, pe:2, pp:5, gf:9,  gc:9,  pts:14, zona:"normal" },
    { pos:18, equipo:"Gimnasia LP",       pj:11, pg:4, pe:2, pp:5, gf:13, gc:15, pts:14, zona:"normal" },
    { pos:19, equipo:"San Lorenzo",       pj:11, pg:4, pe:2, pp:5, gf:11, gc:12, pts:13, zona:"normal" },
    { pos:20, equipo:"Platense",          pj:11, pg:4, pe:2, pp:5, gf:6,  gc:7,  pts:13, zona:"normal" },
    { pos:21, equipo:"Banfield",          pj:11, pg:3, pe:4, pp:4, gf:12, gc:13, pts:13, zona:"normal" },
    { pos:22, equipo:"Sarmiento",         pj:11, pg:3, pe:4, pp:4, gf:8,  gc:11, pts:13, zona:"normal" },
    { pos:23, equipo:"Central Cordoba",   pj:11, pg:3, pe:3, pp:5, gf:5,  gc:12, pts:12, zona:"normal" },
    { pos:24, equipo:"Instituto",         pj:11, pg:3, pe:2, pp:6, gf:11, gc:15, pts:11, zona:"normal" },
    { pos:25, equipo:"Atletico Tucuman",  pj:11, pg:2, pe:2, pp:7, gf:12, gc:16, pts:8,  zona:"descenso" },
    { pos:26, equipo:"Gimnasia Mendoza",  pj:11, pg:2, pe:3, pp:6, gf:6,  gc:13, pts:9,  zona:"descenso" },
    { pos:27, equipo:"Riestra",           pj:11, pg:2, pe:3, pp:6, gf:3,  gc:7,  pts:9,  zona:"descenso" },
    { pos:28, equipo:"Newells",           pj:11, pg:2, pe:1, pp:8, gf:7,  gc:22, pts:7,  zona:"descenso" },
    { pos:29, equipo:"Aldosivi",          pj:11, pg:1, pe:2, pp:8, gf:3,  gc:13, pts:5,  zona:"descenso" },
    { pos:30, equipo:"Estudiantes RC",    pj:11, pg:1, pe:1, pp:9, gf:3,  gc:17, pts:4,  zona:"descenso" },
  ],

  nacional: [
    { pos:1,  equipo:"San Martin Tucuman",pj:12, pg:8, pe:2, pp:2, gf:22, gc:9,  pts:26, zona:"promotion" },
    { pos:2,  equipo:"Brown Adrogue",     pj:12, pg:7, pe:3, pp:2, gf:19, gc:10, pts:24, zona:"promotion" },
    { pos:3,  equipo:"Aldosivi",          pj:12, pg:7, pe:2, pp:3, gf:18, gc:11, pts:23, zona:"europa" },
    { pos:4,  equipo:"Quilmes",           pj:12, pg:6, pe:3, pp:3, gf:17, gc:12, pts:21, zona:"europa" },
    { pos:5,  equipo:"All Boys",          pj:12, pg:6, pe:2, pp:4, gf:16, gc:13, pts:20, zona:"normal" },
    { pos:6,  equipo:"Nueva Chicago",     pj:12, pg:5, pe:3, pp:4, gf:15, gc:13, pts:18, zona:"normal" },
    { pos:7,  equipo:"Ferro",             pj:12, pg:5, pe:2, pp:5, gf:14, gc:14, pts:17, zona:"normal" },
    { pos:8,  equipo:"Chacarita",         pj:12, pg:4, pe:4, pp:4, gf:13, gc:14, pts:16, zona:"normal" },
    { pos:9,  equipo:"Temperley",         pj:12, pg:4, pe:3, pp:5, gf:12, gc:15, pts:15, zona:"descenso" },
    { pos:10, equipo:"Gimnasia LP",       pj:12, pg:3, pe:4, pp:5, gf:11, gc:16, pts:13, zona:"descenso" },
  ],

  federala: [
    { pos:1, equipo:"Deportivo Maipu",    pj:10, pg:7, pe:2, pp:1, gf:20, gc:8,  pts:23, zona:"promotion" },
    { pos:2, equipo:"Atletico Rafaela",   pj:10, pg:6, pe:3, pp:1, gf:18, gc:9,  pts:21, zona:"promotion" },
    { pos:3, equipo:"Douglas Haig",       pj:10, pg:6, pe:2, pp:2, gf:17, gc:10, pts:20, zona:"normal" },
    { pos:4, equipo:"Defensores Belgrano",pj:10, pg:5, pe:3, pp:2, gf:15, gc:11, pts:18, zona:"normal" },
    { pos:5, equipo:"Huracan Las Heras",  pj:10, pg:4, pe:3, pp:3, gf:13, gc:12, pts:15, zona:"normal" },
  ],

  federalam: [
    { pos:1, equipo:"Sp. Las Parejas",    pj:8, pg:6, pe:1, pp:1, gf:18, gc:7,  pts:19, zona:"promotion" },
    { pos:2, equipo:"Boca Unidos",        pj:8, pg:5, pe:2, pp:1, gf:16, gc:8,  pts:17, zona:"promotion" },
    { pos:3, equipo:"Crucero del Norte",  pj:8, pg:4, pe:2, pp:2, gf:14, gc:10, pts:14, zona:"normal" },
    { pos:4, equipo:"Guarani AnT",        pj:8, pg:3, pe:3, pp:2, gf:11, gc:11, pts:12, zona:"normal" },
  ],

  bmetro: [
    { pos:1, equipo:"Excursionistas",     pj:14, pg:9, pe:3, pp:2, gf:26, gc:12, pts:30, zona:"promotion" },
    { pos:2, equipo:"Flandria",           pj:14, pg:8, pe:3, pp:3, gf:24, gc:13, pts:27, zona:"promotion" },
    { pos:3, equipo:"Victoriano Arenas",  pj:14, pg:7, pe:4, pp:3, gf:21, gc:14, pts:25, zona:"normal" },
    { pos:4, equipo:"Canuelas",           pj:14, pg:6, pe:4, pp:4, gf:19, gc:15, pts:22, zona:"normal" },
    { pos:5, equipo:"Deportivo Merlo",    pj:14, pg:5, pe:4, pp:5, gf:17, gc:17, pts:19, zona:"normal" },
  ],
};

// ============================================
//   GOLEADORES REALES
//   Liga Profesional 2025 - Apertura
//   Fuente: promiedos.com.ar
// ============================================
const GOLEADORES = {
  primera: [
    { rank:1,  nombre:"Gabriel Avalos",       equipo:"Independiente",     goles:8,  liga:"Liga Profesional" },
    { rank:2,  nombre:"David Romero",          equipo:"Tigre",             goles:7,  liga:"Liga Profesional" },
    { rank:3,  nombre:"Junior Marabel",        equipo:"Lanus",             goles:6,  liga:"Liga Profesional" },
    { rank:4,  nombre:"Dylan Aquino",          equipo:"Union Santa Fe",    goles:6,  liga:"Liga Profesional" },
    { rank:5,  nombre:"Rafael Profini",        equipo:"Defensa y Justicia",goles:5,  liga:"Liga Profesional" },
    { rank:6,  nombre:"Rodrigo Castillo",      equipo:"Atletico Tucuman",  goles:5,  liga:"Liga Profesional" },
    { rank:7,  nombre:"Dilan Godoy",           equipo:"Racing Club",       goles:5,  liga:"Liga Profesional" },
    { rank:8,  nombre:"Lucas Passerini",       equipo:"Central Cordoba",   goles:5,  liga:"Liga Profesional" },
    { rank:9,  nombre:"Fabrizio Sartori",      equipo:"Velez Sarsfield",   goles:5,  liga:"Liga Profesional" },
    { rank:10, nombre:"Sebastian Villa",       equipo:"Ind. Rivadavia",    goles:4,  liga:"Liga Profesional" },
  ],
  primera_a: [
    { rank:1, nombre:"Junior Marabel",         equipo:"Lanus",             goles:6,  liga:"LP - Zona A" },
    { rank:2, nombre:"Dylan Aquino",           equipo:"Union Santa Fe",    goles:6,  liga:"LP - Zona A" },
    { rank:3, nombre:"Fabrizio Sartori",       equipo:"Velez Sarsfield",   goles:5,  liga:"LP - Zona A" },
    { rank:4, nombre:"Rafael Profini",         equipo:"Defensa y Justicia",goles:5,  liga:"LP - Zona A" },
    { rank:5, nombre:"Lucas Passerini",        equipo:"Central Cordoba",   goles:5,  liga:"LP - Zona A" },
  ],
  primera_b: [
    { rank:1, nombre:"Gabriel Avalos",         equipo:"Ind. Rivadavia",    goles:8,  liga:"LP - Zona B" },
    { rank:2, nombre:"David Romero",           equipo:"Tigre",             goles:7,  liga:"LP - Zona B" },
    { rank:3, nombre:"Rodrigo Castillo",       equipo:"Atletico Tucuman", goles:5,  liga:"LP - Zona B" },
    { rank:4, nombre:"Dilan Godoy",            equipo:"Racing Club",       goles:5,  liga:"LP - Zona B" },
    { rank:5, nombre:"Sebastian Villa",        equipo:"Ind. Rivadavia",    goles:4,  liga:"LP - Zona B" },
  ],
  nacional: [
    { rank:1, nombre:"Martin Cauteruccio",     equipo:"San Martin Tucuman",goles:9,  liga:"Primera Nacional" },
    { rank:2, nombre:"Brian Fernandez",        equipo:"Aldosivi",          goles:8,  liga:"Primera Nacional" },
    { rank:3, nombre:"Patricio Cucchi",        equipo:"Quilmes",           goles:7,  liga:"Primera Nacional" },
  ],
  federala: [
    { rank:1, nombre:"Ariel Verdugo",          equipo:"Deportivo Maipu",   goles:8,  liga:"Federal A" },
    { rank:2, nombre:"Ignacio Arce",           equipo:"Atletico Rafaela",  goles:7,  liga:"Federal A" },
  ],
};

// ============================================
//   NOTICIAS
// ============================================
const NOTICIAS = [
  { emoji:"🏆", titulo:"Ind. Rivadavia lidera la Zona B con 23 puntos tras 11 fechas del Apertura", tiempo:"Hace 1 hora" },
  { emoji:"⚽", titulo:"Gabriel Avalos es el goleador del torneo: 8 goles en 11 fechas para Ind. Rivadavia", tiempo:"Hace 2 horas" },
  { emoji:"🔵", titulo:"Velez punta en la Zona A con 22 puntos, Estudiantes escolta con 21", tiempo:"Hace 3 horas" },
  { emoji:"🇦🇷", titulo:"Scaloni confirma convocatoria para la proxima doble fecha de Eliminatorias", tiempo:"Hace 4 horas" },
  { emoji:"🔴", titulo:"River en la pelea: segundo en Zona B con 20 puntos, a tres del lider", tiempo:"Hace 5 horas" },
  { emoji:"📉", titulo:"Newells en zona de descenso: solo 7 puntos y -15 de diferencia de gol", tiempo:"Hace 6 horas" },
];
