// ============================================
//   CANCHARANET - PARTIDO.JS
//   Pagina de detalle de partido
// ============================================

var partidoActual = null;
var intervaloVivo = null;

function getParam(nombre) {
  var params = new URLSearchParams(window.location.search);
  return params.get(nombre);
}

function formatHora(date) {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================
//   BUSCAR PARTIDO EN LOS MOCKS
// ============================================
function buscarPartidoMock(id) {
  var todos = (PARTIDOS_VIVO || []).concat(PARTIDOS_HOY || []).concat(PROXIMOS_PARTIDOS || []);
  return todos.find(function(p) { return String(p.id) === String(id); }) || null;
}

// ============================================
//   INICIALIZAR HERO
// ============================================
function initHero(p) {
  // Breadcrumb
  var div = typeof DIVISIONES !== 'undefined' ? (DIVISIONES[p.liga] || {}) : {};
  var el = document.getElementById('breadcrumb-liga');
  if (el) el.textContent = div.nombre || p.liga;
  var elP = document.getElementById('breadcrumb-partido');
  if (elP) elP.textContent = p.local.nombre + ' vs ' + p.visitante.nombre;

  // Liga info
  var emoji = document.getElementById('hero-liga-emoji');
  if (emoji) emoji.textContent = div.emoji || '🏆';
  var liga = document.getElementById('hero-liga-nombre');
  if (liga) liga.textContent = p.ligaNombre || div.nombre || '';
  var estadio = document.getElementById('hero-estadio');
  if (estadio) estadio.textContent = p.estadio || '';

  // Escudos y nombres
  var escLocal = document.getElementById('escudo-local');
  if (escLocal) escLocal.innerHTML = getEscudoAPI(p.local.nombre, null, '⚽');
  var escVis = document.getElementById('escudo-visitante');
  if (escVis) escVis.innerHTML = getEscudoAPI(p.visitante.nombre, null, '⚽');
  var nomLocal = document.getElementById('nombre-local');
  if (nomLocal) nomLocal.textContent = p.local.nombre;
  var nomVis = document.getElementById('nombre-visitante');
  if (nomVis) nomVis.textContent = p.visitante.nombre;

  actualizarMarcador(p);
}

function actualizarMarcador(p) {
  var esVivo = p.estado === 'vivo';
  var esFin  = p.estado === 'finalizado';

  // Marcador
  var marcador = document.getElementById('marcador-goles');
  if (marcador) {
    if (esVivo || esFin) {
      marcador.textContent = (p.local.goles != null ? p.local.goles : 0) + ' - ' + (p.visitante.goles != null ? p.visitante.goles : 0);
    } else {
      marcador.textContent = 'vs';
      marcador.style.fontSize = '32px';
    }
  }

  // Estado y minuto
  var estadoEl = document.getElementById('estado-partido');
  var minutoEl = document.getElementById('minuto-actual');
  var badgeEl  = document.getElementById('badge-vivo-eventos');
  if (esVivo) {
    if (estadoEl) estadoEl.innerHTML = '<span class="live-badge-hero">● EN VIVO</span>';
    if (minutoEl) minutoEl.textContent = (p.minuto ? p.minuto + "'" : '');
    if (badgeEl)  badgeEl.style.display = 'inline';
    // Barra de progreso
    var pct = Math.min(100, Math.round(((p.minuto || 0) / 90) * 100));
    var fill = document.getElementById('progreso-fill');
    if (fill) fill.style.width = pct + '%';
  } else if (esFin) {
    if (estadoEl) estadoEl.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Partido Finalizado</span>';
    if (minutoEl) minutoEl.textContent = '';
    if (badgeEl)  badgeEl.style.display = 'none';
    var fill2 = document.getElementById('progreso-fill');
    if (fill2) fill2.style.width = '100%';
  } else {
    if (estadoEl) estadoEl.innerHTML = '<span style="color:var(--celeste);font-size:13px;">' + (p.hora ? p.hora : 'Programado') + '</span>';
    if (minutoEl) minutoEl.textContent = '';
    if (badgeEl)  badgeEl.style.display = 'none';
  }

  // Medio tiempo
  if (p.halfTime) {
    var ht = document.getElementById('medio-tiempo');
    if (ht) ht.textContent = 'HT: ' + p.halfTime;
  }
}

// ============================================
//   RENDER EVENTOS
// ============================================
function renderEventos(p) {
  var timeline = document.getElementById('timeline-eventos');
  var resumen  = document.getElementById('goles-resumen');
  if (!timeline) return;

  // Hora de actualizacion
  var horaEl = document.getElementById('hora-eventos');
  if (horaEl) horaEl.textContent = formatHora(new Date());

  var eventos = p.eventos || [];

  // Si no hay eventos del partido, mostrar mensaje de ejemplo
  if (eventos.length === 0) {
    if (p.estado === 'vivo') {
      timeline.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⏱️</div>' +
        '<p>El partido esta en curso.<br>Los eventos se cargaran cuando esten disponibles.</p></div>';
    } else if (p.estado === 'finalizado') {
      // Generar eventos de ejemplo para mostrar la UI
      eventos = generarEventosEjemplo(p);
    } else {
      timeline.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📅</div>' +
        '<p>El partido todavia no inicio.</p></div>';
      return;
    }
  }

  // Resumen de goles
  var goles = eventos.filter(function(e) { return e.tipo === 'gol'; });
  if (resumen && goles.length > 0) {
    resumen.innerHTML = goles.map(function(g) {
      return '<div class="gol-item ' + g.equipo + '">' +
        (g.equipo === 'local' ? "<span class='gol-min'>" + g.min + "'</span> <span class='gol-jugador'>⚽ " + g.jugador + '</span>' :
          "<span class='gol-jugador'>" + g.jugador + " ⚽</span> <span class='gol-min'>" + g.min + "'</span>") +
        '</div>';
    }).join('');
  }

  // Timeline
  timeline.innerHTML = eventos.map(function(ev) {
    var esLocal = ev.equipo === 'local';
    var iconos = {
      'gol':              '⚽',
      'tarjeta-amarilla': '🟨',
      'tarjeta-roja':     '🟥',
      'sustitucion':      '🔄',
      'normal':           '⚡',
      'actual':           '⏱️',
    };
    var icono = iconos[ev.tipo] || '•';
    return '<div class="evento-item ' + (ev.tipo === 'actual' ? 'evento-actual' : '') + '">' +
      '<div class="evento-min">' + ev.min + "'</div>" +
      '<div class="evento-icono">' + (ev.icono || icono) + '</div>' +
      '<div class="evento-desc ' + (esLocal ? 'evento-local' : 'evento-visitante') + '">' +
        '<span class="evento-jugador">' + (ev.jugador || '') + '</span>' +
        (ev.desc ? '<span class="evento-texto"> — ' + ev.desc + '</span>' : '') +
      '</div>' +
      '</div>';
  }).reverse().join('');
}

function generarEventosEjemplo(p) {
  var evs = [];
  if (p.local.goles > 0) {
    evs.push({ min: 23, tipo: 'gol', equipo: 'local', jugador: p.local.nombre, desc: 'Gol del equipo local', icono: '⚽' });
  }
  if (p.visitante.goles > 0) {
    evs.push({ min: 55, tipo: 'gol', equipo: 'visitante', jugador: p.visitante.nombre, desc: 'Gol del equipo visitante', icono: '⚽' });
  }
  evs.push({ min: 90, tipo: 'normal', equipo: 'local', jugador: 'Fin del partido', desc: '', icono: '🏁' });
  return evs.sort(function(a, b) { return a.min - b.min; });
}

// ============================================
//   ESTADISTICAS
// ============================================
function renderEstadisticas(p) {
  var container = document.getElementById('estadisticas-partido');
  if (!container) return;

  var stats = p.estadisticas || [];

  if (stats.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📊</div>' +
      '<p>Estadisticas no disponibles para este partido.</p></div>';
    return;
  }

  container.innerHTML =
    '<div class="stat-equipos-header">' +
      '<span>' + p.local.nombre + '</span>' +
      '<span>' + p.visitante.nombre + '</span>' +
    '</div>' +
    stats.map(function(s) {
      var total = (s.local || 0) + (s.visitante || 0);
      var pctL = total > 0 ? Math.round((s.local / total) * 100) : 50;
      var pctV = 100 - pctL;
      return '<div class="stat-row">' +
        '<span class="stat-val-local">' + s.local + '</span>' +
        '<div class="stat-barra-wrap">' +
          '<div class="stat-nombre">' + s.nombre + '</div>' +
          '<div class="stat-barra">' +
            '<div class="stat-fill-local" style="width:' + pctL + '%"></div>' +
            '<div class="stat-fill-visit" style="width:' + pctV + '%"></div>' +
          '</div>' +
        '</div>' +
        '<span class="stat-val-visit">' + s.visitante + '</span>' +
        '</div>';
    }).join('');
}

// ============================================
//   ALINEACIONES
// ============================================
function renderAlineaciones(p) {
  var container = document.getElementById('alineaciones-partido');
  if (!container) return;

  var jLocal = (p.local && p.local.jugadores) || [];
  var jVis   = (p.visitante && p.visitante.jugadores) || [];

  if (jLocal.length === 0 && jVis.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">👥</div>' +
      '<p>Alineaciones no disponibles todavia.</p></div>';
    return;
  }

  function listaJugadores(jugadores, titulo) {
    return '<div class="alineacion-equipo">' +
      '<div class="alineacion-titulo">' + titulo + '</div>' +
      jugadores.map(function(j) {
        return '<div class="jugador-row">' +
          '<span class="jugador-num">' + j.num + '</span>' +
          '<span class="jugador-nombre">' + j.nombre + '</span>' +
          '<span class="jugador-pos">' + j.pos + '</span>' +
          '</div>';
      }).join('') +
      '</div>';
  }

  container.innerHTML =
    '<div class="alineaciones-wrap">' +
    listaJugadores(jLocal, p.local.nombre + (p.local.formacion ? ' · ' + p.local.formacion : '')) +
    listaJugadores(jVis, p.visitante.nombre + (p.visitante.formacion ? ' · ' + p.visitante.formacion : '')) +
    '</div>';
}

// ============================================
//   H2H
// ============================================
function renderH2H(p) {
  var container = document.getElementById('h2h-partido');
  if (!container) return;

  var h2h = p.h2h || [];

  if (h2h.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📋</div>' +
      '<p>Sin historial de enfrentamientos disponible.</p></div>';
    return;
  }

  container.innerHTML = h2h.map(function(e) {
    return '<div class="h2h-row ' + (e.ganador === 'local' ? 'h2h-local' : e.ganador === 'visitante' ? 'h2h-visit' : '') + '">' +
      '<span class="h2h-fecha">' + e.fecha + '</span>' +
      '<span class="h2h-local">' + e.local + '</span>' +
      '<span class="h2h-res">' + e.resultado + '</span>' +
      '<span class="h2h-visit">' + e.visitante + '</span>' +
      '</div>';
  }).join('');
}

// ============================================
//   SIDEBAR: OTROS PARTIDOS EN VIVO
// ============================================
function renderSidebarVivo() {
  var container = document.getElementById('sidebar-vivo');
  if (!container) return;
  var partidos = typeof PARTIDOS_VIVO !== 'undefined' ? PARTIDOS_VIVO : [];
  if (partidos.length === 0) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">No hay otros partidos en vivo.</div>';
    return;
  }
  container.innerHTML = partidos.map(function(p) {
    return '<div class="lista-item" style="cursor:pointer" onclick="window.location.href=\'partido.html?id=' + p.id + '\'">' +
      '<div class="item-hora vivo"><span style="color:var(--live-color);font-size:10px;">🔴 ' + (p.minuto || '') + "'</span></div>" +
      '<div class="item-equipos">' +
        '<div class="item-equipo">' + getEscudoAPIsm(p.local.nombre, null) + '<span>' + p.local.nombre + '</span></div>' +
        '<div class="item-equipo">' + getEscudoAPIsm(p.visitante.nombre, null) + '<span>' + p.visitante.nombre + '</span></div>' +
      '</div>' +
      '<div class="item-marcador">' +
        '<span class="gol-num">' + (p.local.goles != null ? p.local.goles : '-') + '</span>' +
        '<span class="gol-num">' + (p.visitante.goles != null ? p.visitante.goles : '-') + '</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ============================================
//   TABS
// ============================================
function initTabs() {
  document.querySelectorAll('.partido-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.partido-tab').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
      btn.classList.add('active');
      var tab = document.getElementById('tab-' + btn.dataset.tab);
      if (tab) tab.classList.add('active');
    });
  });
}

// ============================================
//   CARGAR PARTIDO
// ============================================
async function cargarPartido() {
  var id = getParam('id');

  // Fecha en header
  var fechaEl = document.getElementById('fecha-actual');
  if (fechaEl) {
    var d = new Date();
    var dias  = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    fechaEl.textContent = dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];
  }

  var p = null;

  if (id) {
    // Buscar en mock
    p = buscarPartidoMock(id);
  }

  // Si no encontro nada, usar el primer partido vivo de ejemplo
  if (!p) {
    p = (typeof PARTIDOS_VIVO !== 'undefined' && PARTIDOS_VIVO.length > 0)
      ? PARTIDOS_VIVO[0]
      : null;
  }

  if (!p) {
    document.getElementById('partido-hero').innerHTML =
      '<div class="container"><div class="empty-state"><div class="empty-icon">😕</div><p>Partido no encontrado.</p><br><a href="index.html" style="color:var(--celeste)">← Volver al inicio</a></div></div>';
    return;
  }

  // Agregar datos de detalle de ejemplo si no tiene
  if (!p.estadio) p.estadio = '📍 Estadio Argentino';
  if (!p.halfTime && (p.estado === 'finalizado' || p.estado === 'vivo')) {
    p.halfTime = (p.local.goles || 0) + ' - ' + (p.visitante.goles || 0);
  }

  partidoActual = p;

  initHero(p);
  renderEventos(p);
  renderEstadisticas(p);
  renderAlineaciones(p);
  renderH2H(p);
  renderSidebarVivo();

  // Auto-refresh si esta en vivo
  if (p.estado === 'vivo') {
    intervaloVivo = setInterval(function() {
      var horaEl = document.getElementById('hora-eventos');
      if (horaEl) horaEl.textContent = formatHora(new Date());
    }, 30000);
  }
}

// ============================================
//   INICIO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  initTabs();
  cargarPartido();
});
