// ============================================
//   CANCHARANET - APP.JS
// ============================================

var ligaActivaTab   = 'todos';
var ligaActivaTabla = 'primera_a';
var ligaActivaGol   = 'primera';
var partidosVivo    = [];
var partidosHoy     = [];

// ============================================
//   UTILIDADES
// ============================================
function formatFecha(date) {
  var dias  = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return dias[date.getDay()] + ' ' + date.getDate() + ' de ' + meses[date.getMonth()] + ' ' + date.getFullYear();
}

function formatHora(date) {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function actualizarFecha() {
  var el = document.getElementById('fecha-actual');
  if (el) el.textContent = formatFecha(new Date());
}

function actualizarHora() {
  var el = document.getElementById('hora-actualizacion');
  if (el) el.textContent = formatHora(new Date());
}

function showLoading(id, msg) {
  var c = document.getElementById(id);
  if (!c) return;
  c.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;padding:28px;color:var(--text-muted);justify-content:center;">' +
    '<div class="spinner"></div>' + (msg || 'Cargando...') + '</div>';
}

function divisionBadge(ligaKey) {
  var clases = { primera:'badge-primera', primera_a:'badge-primera', primera_b:'badge-primera', nacional:'badge-nacional', federala:'badge-federal', federalam:'badge-federal', copa:'badge-copa', supercopa:'badge-copa' };
  var d = typeof DIVISIONES !== 'undefined' ? (DIVISIONES[ligaKey] || {}) : {};
  var cls = clases[ligaKey] || 'badge-primera';
  return '<span class="division-badge ' + cls + '">' + (d.emoji || '') + ' ' + (d.nombre || ligaKey) + '</span>';
}

// ============================================
//   PARTIDOS EN VIVO
// ============================================
function renderPartidosVivo(partidos) {
  var container = document.getElementById('partidos-vivo');
  if (!container) return;

  var filtrados = ligaActivaTab === 'todos'
    ? partidos
    : partidos.filter(function(p) { return p.liga === ligaActivaTab; });

  if (!filtrados || filtrados.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚽</div>' +
      '<p>No hay partidos en vivo ahora mismo.</p></div>';
    return;
  }

  container.innerHTML = '';
  filtrados.forEach(function(p) {
    var card = document.createElement('div');
    card.className = 'partido-card vivo';
    card.onclick = function() { window.location.href = 'partido.html?id=' + p.id; };
    var min = p.minuto ? p.minuto + "'" : 'EN VIVO';
    card.innerHTML =
      '<div class="card-liga">' +
        '<span>' + divisionBadge(p.liga) + ' ' + (p.ligaNombre || '') + '</span>' +
        '<span class="badge-vivo">🔴 ' + min + '</span>' +
      '</div>' +
      '<div class="card-marcador">' +
        '<div class="equipo">' +
          '<div class="equipo-escudo">' + getEscudoAPI(p.local.nombre, null) + '</div>' +
          '<div class="equipo-nombre">' + p.local.nombre + '</div>' +
        '</div>' +
        '<div class="marcador-centro">' +
          '<div class="marcador-goles">' + (p.local.goles != null ? p.local.goles : 0) + ' - ' + (p.visitante.goles != null ? p.visitante.goles : 0) + '</div>' +
        '</div>' +
        '<div class="equipo">' +
          '<div class="equipo-escudo">' + getEscudoAPI(p.visitante.nombre, null) + '</div>' +
          '<div class="equipo-nombre">' + p.visitante.nombre + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-eventos"><div class="evento-mini">⚡ Toca para ver el partido</div></div>';
    container.appendChild(card);
  });
}

// ============================================
//   PARTIDOS HOY
// ============================================
function renderPartidosHoy(partidos) {
  var container = document.getElementById('partidos-hoy');
  if (!container) return;

  if (!partidos || partidos.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📅</div>' +
      '<p>No hay partidos cargados para hoy.</p></div>';
    return;
  }

  var grupos = {};
  partidos.forEach(function(p) {
    var key = p.liga;
    if (!grupos[key]) grupos[key] = { ligaNombre: p.ligaNombre, partidos: [] };
    grupos[key].partidos.push(p);
  });

  container.innerHTML = '';
  Object.keys(grupos).forEach(function(ligaKey) {
    var grupo = grupos[ligaKey];
    var d = typeof DIVISIONES !== 'undefined' ? (DIVISIONES[ligaKey] || {}) : {};
    var div = document.createElement('div');
    div.className = 'lista-grupo';
    div.innerHTML =
      '<div class="grupo-header">' + (d.emoji || '⚽') + ' ' + (grupo.ligaNombre || d.nombre || ligaKey) + '</div>' +
      grupo.partidos.map(renderItemPartido).join('');
    container.appendChild(div);
  });
}

function renderItemPartido(p) {
  var esVivo = p.estado === 'vivo';
  var esFin  = p.estado === 'finalizado';
  var ml = (esVivo || esFin) ? (p.local.goles != null ? p.local.goles : '-') : '-';
  var mv = (esVivo || esFin) ? (p.visitante.goles != null ? p.visitante.goles : '-') : '-';
  var lGana = (esFin && p.local.goles > p.visitante.goles);
  var vGana = (esFin && p.visitante.goles > p.local.goles);
  return '<div class="lista-item" onclick="window.location.href=\'partido.html?id=' + p.id + '\'">' +
    '<div class="item-hora' + (esVivo ? ' vivo' : '') + '">' +
      (esVivo ? '<span style="color:var(--live-color)">🔴 ' + (p.minuto || '') + "'</span>" : (p.hora || '')) +
    '</div>' +
    '<div class="item-equipos">' +
      '<div class="item-equipo">' + getEscudoAPIsm(p.local.nombre, null) +
        '<span style="' + (lGana ? 'color:var(--text-primary);font-weight:700' : '') + '">' + p.local.nombre + '</span></div>' +
      '<div class="item-equipo">' + getEscudoAPIsm(p.visitante.nombre, null) +
        '<span style="' + (vGana ? 'color:var(--text-primary);font-weight:700' : '') + '">' + p.visitante.nombre + '</span></div>' +
    '</div>' +
    '<div class="item-marcador">' +
      '<span class="gol-num' + (lGana ? ' gol-ganador' : '') + '">' + ml + '</span>' +
      '<span class="gol-num' + (vGana ? ' gol-ganador' : '') + '">' + mv + '</span>' +
    '</div>' +
    '<div class="item-estado' + (esVivo ? ' vivo' : '') + '">' +
      (esVivo ? 'VIVO' : esFin ? 'Final' : '') +
    '</div>' +
    '</div>';
}

// ============================================
//   PROXIMOS PARTIDOS
// ============================================
function renderProximos(partidos) {
  var container = document.getElementById('proximos');
  if (!container) return;

  if (!partidos || partidos.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📆</div>' +
      '<p>No hay proximos partidos cargados.</p></div>';
    return;
  }

  // Agrupar por liga
  var grupos = {};
  partidos.forEach(function(p) {
    var key = p.liga || 'primera';
    if (!grupos[key]) grupos[key] = { ligaNombre: p.ligaNombre || 'Liga Profesional', partidos: [] };
    grupos[key].partidos.push(p);
  });

  container.innerHTML = '';
  Object.keys(grupos).forEach(function(ligaKey) {
    var grupo = grupos[ligaKey];
    var d = typeof DIVISIONES !== 'undefined' ? (DIVISIONES[ligaKey] || {}) : {};
    var div = document.createElement('div');
    div.className = 'lista-grupo';

    // Agrupar partidos por día dentro de cada liga
    var diasVisto = {};
    var filas = grupo.partidos.map(function(p) {
      var diaLabel = p.dia || '';
      var separador = '';
      if (diaLabel && !diasVisto[diaLabel]) {
        diasVisto[diaLabel] = true;
        separador = '<div class="proximo-dia-sep">' + formatearDia(diaLabel) + '</div>';
      }
      return separador +
        '<div class="lista-item">' +
          '<div class="item-hora">' + (p.hora || '') + '</div>' +
          '<div class="item-equipos">' +
            '<div class="item-equipo">' + getEscudoAPIsm(p.local.nombre, null) + '<span>' + p.local.nombre + '</span></div>' +
            '<div class="item-equipo">' + getEscudoAPIsm(p.visitante.nombre, null) + '<span>' + p.visitante.nombre + '</span></div>' +
          '</div>' +
          '<div class="item-marcador"><span class="gol-num">-</span><span class="gol-num">-</span></div>' +
          '<div class="item-estado"></div>' +
        '</div>';
    }).join('');

    div.innerHTML =
      '<div class="grupo-header">' + (d.emoji || '⚽') + ' ' +
        (grupo.ligaNombre || d.nombre || ligaKey) +
        (grupo.partidos[0] && grupo.partidos[0].fecha ? ' — Fecha ' + grupo.partidos[0].fecha : '') +
      '</div>' + filas;
    container.appendChild(div);
  });
}

function formatearDia(dia) {
  // "Jue 02/04" → "Jueves 2 de Abril"
  var map = { 'Lun': 'Lunes', 'Mar': 'Martes', 'Mié': 'Miércoles', 'Jue': 'Jueves',
              'Vie': 'Viernes', 'Sáb': 'Sábado', 'Dom': 'Domingo' };
  var meses = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var partes = dia.split(' ');
  var abrev  = partes[0];
  var fecha  = partes[1] || '';
  var nombre = map[abrev] || abrev;
  if (fecha.includes('/')) {
    var df = fecha.split('/');
    return nombre + ' ' + parseInt(df[0]) + ' de ' + (meses[parseInt(df[1])] || df[1]);
  }
  return dia;
}

// ============================================
//   TABLA DE POSICIONES
// ============================================
function renderTablaPosiciones(equipos, ligaKey) {
  var container = document.getElementById('tabla-posiciones');
  if (!container) return;

  if (!equipos || equipos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Sin datos de posiciones.</p></div>';
    return;
  }

  var filas = equipos.map(function(e) {
    var urlEquipo = 'equipo.html?equipo=' + encodeURIComponent(e.equipo);
    return '<tr class="pos-zona ' + (e.zona || 'normal') + '">' +
      '<td style="text-align:center;color:var(--text-muted);">' + e.pos + '</td>' +
      '<td><a href="' + urlEquipo + '" class="equipo-link-tabla" style="display:flex;align-items:center;gap:7px;padding:5px 8px;text-decoration:none;color:inherit;">' +
        getEscudoAPIsm(e.equipo, e.logo) +
        '<span class="equipo-nombre-tabla">' + e.equipo + '</span>' +
      '</a></td>' +
      '<td>' + e.pj + '</td>' +
      '<td>' + e.pg + '</td>' +
      '<td>' + e.pe + '</td>' +
      '<td>' + e.pp + '</td>' +
      '<td>' + (e.gf - e.gc > 0 ? '+' : '') + (e.gf - e.gc) + '</td>' +
      '<td class="pos-puntos">' + e.pts + '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<table class="tabla-pos">' +
    '<colgroup><col><col><col><col><col><col><col><col></colgroup>' +
    '<thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr></thead>' +
    '<tbody>' + filas + '</tbody>' +
    '</table>' +
    '<div class="tabla-leyenda">' +
      leyendaZonas(ligaKey) +
    '</div>';
}

function leyendaZonas(ligaKey) {
  var base = '<span class="leyenda-item"><span class="leyenda-dot" style="background:var(--zona-champions)"></span> Libertadores</span>';
  if (ligaKey === 'primera' || ligaKey === 'primera_a' || ligaKey === 'primera_b') {
    return base +
      '<span class="leyenda-item"><span class="leyenda-dot" style="background:var(--zona-europa)"></span> Sudamericana</span>' +
      '<span class="leyenda-item"><span class="leyenda-dot" style="background:var(--zona-descenso)"></span> Descenso</span>';
  }
  if (ligaKey === 'nacional' || ligaKey === 'federala' || ligaKey === 'federalam' || ligaKey === 'bmetro') {
    return '<span class="leyenda-item"><span class="leyenda-dot" style="background:var(--zona-promo)"></span> Ascenso</span>' +
      '<span class="leyenda-item"><span class="leyenda-dot" style="background:var(--zona-descenso)"></span> Descenso</span>';
  }
  return base;
}

// ============================================
//   GOLEADORES
// ============================================
function renderGoleadores(goleadores) {
  var container = document.getElementById('tabla-goleadores');
  if (!container) return;

  if (!goleadores || goleadores.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Sin datos de goleadores.</p></div>';
    return;
  }

  container.innerHTML = goleadores.map(function(g) {
    var rankCls = g.rank <= 3 ? ' goleador-rank-top' : '';
    var medal = g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : g.rank === 3 ? '🥉' : g.rank;
    return '<div class="goleador-item">' +
      '<div class="goleador-rank' + rankCls + '">' + medal + '</div>' +
      '<div>' + getEscudoAPIsm(g.equipo, g.logo) + '</div>' +
      '<div class="goleador-info">' +
        '<div class="goleador-nombre">' + g.nombre + '</div>' +
        '<div class="goleador-equipo">' + g.equipo + '</div>' +
      '</div>' +
      '<div class="goleador-goles">⚽ ' + g.goles + '</div>' +
      '</div>';
  }).join('');
}

// ============================================
//   NOTICIAS
// ============================================
function renderNoticias() {
  var container = document.getElementById('noticias');
  if (!container) return;
  if (typeof NOTICIAS === 'undefined') return;
  container.innerHTML = NOTICIAS.map(function(n) {
    return '<div class="noticia-item">' +
      '<div class="noticia-emoji">' + n.emoji + '</div>' +
      '<div class="noticia-texto">' +
        '<div class="noticia-titulo">' + n.titulo + '</div>' +
        '<div class="noticia-tiempo">' + n.tiempo + '</div>' +
      '</div></div>';
  }).join('');
}

// ============================================
//   TABS DE DIVISIONES
// ============================================

// Mapa: tab → liga de posiciones / goleadores
var TAB_A_LIGA = {
  'todos':      'primera_a',
  'primera':    'primera_a',
  'nacional':   'nacional',
  'federala':   'federala',
  'federalam':  'federalam',
  'bmetro':     'bmetro',
  'copa':       'copa',
  'supercopa':  'supercopa'
};
var TAB_A_GOL = {
  'todos':      'primera',
  'primera':    'primera',
  'nacional':   'nacional',
  'federala':   'federala',
  'federalam':  'federalam',
  'bmetro':     'bmetro',
  'copa':       'primera',
  'supercopa':  'primera'
};

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      ligaActivaTab = btn.dataset.liga;

      // Filtrar partidos en vivo
      renderPartidosVivo(partidosVivo);

      // Sincronizar tabla de posiciones
      var ligaPos = TAB_A_LIGA[ligaActivaTab] || 'primera_a';
      ligaActivaTabla = ligaPos;
      var selectPos = document.getElementById('liga-posiciones');
      if (selectPos) selectPos.value = ligaPos;

      // Actualizar título sidebar
      var d = typeof DIVISIONES !== 'undefined' ? (DIVISIONES[ligaPos] || {}) : {};
      var titPos = document.getElementById('titulo-posiciones');
      if (titPos) titPos.innerHTML = '<i class="fas fa-trophy"></i> Posiciones ' + (d.emoji || '') + ' <span style="color:var(--celeste);font-size:13px">' + (d.nombre || '') + '</span>';

      showLoading('tabla-posiciones', 'Cargando posiciones...');
      var dataPos = await fetchStandings(ligaPos);
      renderTablaPosiciones(dataPos || [], ligaPos);

      // Sincronizar goleadores
      var ligaGol = TAB_A_GOL[ligaActivaTab] || 'primera';
      ligaActivaGol = ligaGol;
      var selectGol = document.getElementById('liga-goleadores');
      if (selectGol) selectGol.value = ligaGol;
      showLoading('tabla-goleadores', 'Cargando goleadores...');
      var dataGol = await fetchGoleadoresDivision(ligaGol);
      renderGoleadores(dataGol || []);

      // Scroll suave a posiciones en mobile
      var secPos = document.getElementById('posiciones');
      if (secPos && window.innerWidth < 900) {
        secPos.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ============================================
//   SELECT POSICIONES
// ============================================
function initSelectPosiciones() {
  var select = document.getElementById('liga-posiciones');
  if (!select) return;
  select.addEventListener('change', async function() {
    ligaActivaTabla = select.value;
    showLoading('tabla-posiciones', 'Cargando posiciones...');
    var data = await fetchStandings(ligaActivaTabla);
    renderTablaPosiciones(data || [], ligaActivaTabla);
  });
}

// ============================================
//   SELECT GOLEADORES
// ============================================
function initSelectGoleadores() {
  var select = document.getElementById('liga-goleadores');
  if (!select) return;
  select.addEventListener('change', async function() {
    ligaActivaGol = select.value;
    showLoading('tabla-goleadores', 'Cargando goleadores...');
    var data = await fetchGoleadoresDivision(ligaActivaGol);
    renderGoleadores(data || []);
  });
}

// ============================================
//   CARGA PRINCIPAL
// ============================================
async function cargarDatos() {
  actualizarHora();

  // Partidos en vivo
  showLoading('partidos-vivo', 'Buscando partidos en vivo...');
  try { partidosVivo = await fetchPartidosVivo(); } catch(e) { partidosVivo = []; }
  if (!partidosVivo || partidosVivo.length === 0) {
    partidosVivo = typeof PARTIDOS_VIVO !== 'undefined' ? PARTIDOS_VIVO : [];
  }
  renderPartidosVivo(partidosVivo);

  // Partidos hoy
  showLoading('partidos-hoy', 'Cargando partidos de hoy...');
  try { partidosHoy = await fetchPartidosHoy(); } catch(e) { partidosHoy = []; }
  if (!partidosHoy || partidosHoy.length === 0) {
    partidosHoy = typeof PARTIDOS_HOY !== 'undefined' ? PARTIDOS_HOY : [];
  }
  // Combinar: en vivo primero, luego el resto de hoy
  var vivoIds = partidosVivo.map(function(p) { return p.id; });
  var hoyExtra = partidosHoy.filter(function(p) { return vivoIds.indexOf(p.id) < 0; });
  renderPartidosHoy(partidosVivo.concat(hoyExtra));

  // Proximos
  var proximos = [];
  try { proximos = await fetchProximos(); } catch(e) { proximos = []; }
  if (!proximos || proximos.length === 0) {
    proximos = typeof PROXIMOS_PARTIDOS !== 'undefined' ? PROXIMOS_PARTIDOS : [];
  }
  renderProximos(proximos);

  // Posiciones
  showLoading('tabla-posiciones', 'Cargando posiciones...');
  var standings = await fetchStandings('primera_a');
  renderTablaPosiciones(standings || [], 'primera_a');

  // Goleadores
  showLoading('tabla-goleadores', 'Cargando goleadores...');
  var goles = await fetchGoleadoresDivision('primera');
  renderGoleadores(goles || []);

  // Noticias
  renderNoticias();
}

// ============================================
//   ACTUALIZACION PERIODICA
// ============================================
async function actualizarVivo() {
  actualizarHora();
  try {
    var nuevos = await fetchPartidosVivo();
    if (nuevos && nuevos.length > 0) {
      partidosVivo = nuevos;
      renderPartidosVivo(partidosVivo);
    }
  } catch(e) {}
}

// ============================================
//   INICIO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
  actualizarFecha();
  actualizarHora();
  initTabs();
  initSelectPosiciones();
  initSelectGoleadores();
  initThemeToggle();
  await cargarDatos();
  setInterval(actualizarVivo, 60000);
  setInterval(actualizarHora, 1000);
});

// ============================================
//   TOGGLE MODO OSCURO / CLARO
// ============================================
function initThemeToggle() {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  // Aplicar tema guardado
  var saved = localStorage.getItem('cn-theme') || 'dark';
  applyTheme(saved);

  btn.addEventListener('click', function() {
    var current = document.body.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('cn-theme', next);
  });
}

function applyTheme(theme) {
  var btn = document.getElementById('theme-toggle');
  if (theme === 'light') {
    document.body.setAttribute('data-theme', 'light');
    if (btn) btn.textContent = '🌙';
    if (btn) btn.title = 'Modo oscuro';
  } else {
    document.body.setAttribute('data-theme', 'dark');
    if (btn) btn.textContent = '☀️';
    if (btn) btn.title = 'Modo claro';
  }
}
