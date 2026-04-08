// ============================================
//   CANCHARANET - API.JS
//   Carga datos desde JSONs locales.
//   Preparado para conectar scraper Python.
// ============================================

// Rutas a los JSONs que genera el scraper
// (cuando el scraper no exista, usa los mocks de data.js)
const JSON_BASE = './data/';

const ARCHIVOS = {
  primera:    'primera.json',
  primera_a:  'primera-zona-a.json',
  primera_b:  'primera-zona-b.json',
  nacional:   'nacional.json',
  bmetro:     'bmetro.json',
  federala:   'federala.json',
  primerac:   'primerac.json',
  regional:   'regional.json',
  copa:       'copa-argentina.json',
};

// Cache en memoria
var _cache = {};
var CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function fetchJSON(archivo) {
  var url = JSON_BASE + archivo;
  var ahora = Date.now();
  if (_cache[url] && (ahora - _cache[url].ts) < CACHE_TTL) {
    return _cache[url].data;
  }
  try {
    var res = await fetch(url);
    if (!res.ok) throw new Error('No encontrado');
    var data = await res.json();
    _cache[url] = { ts: ahora, data: data };
    return data;
  } catch(e) {
    return null;
  }
}

// ============================================
//   PARTIDOS EN VIVO
//   Lee partidos-vivo.json si existe, sino mock
// ============================================
async function fetchPartidosVivo() {
  var data = await fetchJSON('partidos-vivo.json');
  if (data && data.partidos && data.partidos.length > 0) {
    return data.partidos;
  }
  // Fallback a mock
  if (typeof PARTIDOS_VIVO !== 'undefined') return PARTIDOS_VIVO;
  return [];
}

// ============================================
//   PARTIDOS HOY
// ============================================
async function fetchPartidosHoy() {
  var data = await fetchJSON('partidos-hoy.json');
  if (data && data.partidos && data.partidos.length > 0) {
    return data.partidos;
  }
  // Fallback a mock
  if (typeof PARTIDOS_HOY !== 'undefined') return PARTIDOS_HOY;
  return [];
}

// ============================================
//   PROXIMOS PARTIDOS
// ============================================
async function fetchProximos() {
  var data = await fetchJSON('proximos.json');
  if (data && data.partidos && data.partidos.length > 0) {
    return data.partidos;
  }
  // Fallback a mock
  if (typeof PROXIMOS_PARTIDOS !== 'undefined') return PROXIMOS_PARTIDOS;
  return [];
}

// ============================================
//   POSICIONES
//   Primero intenta cargar JSON del scraper,
//   si no existe usa POSICIONES del mock
// ============================================
async function fetchStandings(ligaKey) {
  var archivo = ARCHIVOS[ligaKey];
  if (archivo) {
    var data = await fetchJSON(archivo);
    if (data && data.posiciones && data.posiciones.length > 0) {
      return data.posiciones;
    }
  }
  // Fallback a mock
  if (typeof POSICIONES !== 'undefined' && POSICIONES[ligaKey]) {
    return POSICIONES[ligaKey];
  }
  return null;
}

// ============================================
//   GOLEADORES
// ============================================
async function fetchGoleadoresDivision(ligaKey) {
  var archivo = ARCHIVOS[ligaKey];
  if (!archivo) return null;
  var data = await fetchJSON(archivo);
  if (data && data.goleadores && data.goleadores.length > 0) {
    return data.goleadores;
  }
  // Fallback a mock
  if (typeof GOLEADORES !== 'undefined' && GOLEADORES[ligaKey]) {
    return GOLEADORES[ligaKey];
  }
  return null;
}

// ============================================
//   HELPERS DE ESCUDOS
//   Busca en ESCUDOS local, si no usa fallback emoji
// ============================================
function getEscudoAPI(nombre, logoUrl, fallback) {
  fallback = fallback || '⚽';
  if (typeof ESCUDOS !== 'undefined' && ESCUDOS[nombre]) {
    return '<img src="' + ESCUDOS[nombre] + '" alt="' + nombre + '" class="escudo-img" onerror="this.outerHTML=\'<span class=escudo-emoji>' + fallback + '</span>\'">';
  }
  if (logoUrl) {
    return '<img src="' + logoUrl + '" alt="' + nombre + '" class="escudo-img" onerror="this.outerHTML=\'<span class=escudo-emoji>' + fallback + '</span>\'">';
  }
  return '<span class="escudo-emoji">' + fallback + '</span>';
}

function getEscudoAPIsm(nombre, logoUrl, fallback) {
  fallback = fallback || '⚽';
  if (typeof ESCUDOS !== 'undefined' && ESCUDOS[nombre]) {
    return '<img src="' + ESCUDOS[nombre] + '" alt="' + nombre + '" class="escudo-img-sm" onerror="this.outerHTML=\'<span class=escudo-emoji>' + fallback + '</span>\'">';
  }
  if (logoUrl) {
    return '<img src="' + logoUrl + '" alt="' + nombre + '" class="escudo-img-sm" onerror="this.outerHTML=\'<span class=escudo-emoji>' + fallback + '</span>\'">';
  }
  return '<span class="escudo-emoji">' + fallback + '</span>';
}



