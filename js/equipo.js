// ============================================
//   CANCHARANET - EQUIPO.JS
//   Página de plantel del equipo
// ============================================

var PLANTEL_ACTUAL = null;
var FILTRO_ACTIVO = 'todos';

// Grupos de posición
var GRUPOS_POS = {
  PO:  ['Portero', 'Arquero', 'Goalkeeper'],
  DEF: ['Defensa central', 'Defensa', 'Lateral derecho', 'Lateral izquierdo',
        'Defensa izquierdo', 'Defensa derecho', 'Carrilero'],
  MED: ['Mediocentro defensivo', 'Mediocentro', 'Mediapunta', 'Centrocampista',
        'Interior derecho', 'Interior izquierdo', 'Pivote', 'Volante'],
  DEL: ['Delantero centro', 'Delantero', 'Extremo derecho', 'Extremo izquierdo',
        'Segundo delantero', 'Punta']
};

// Colores por posición
var COLORS_POS = {
  PO:  { bg: '#f59e0b', text: '#000' },
  DEF: { bg: '#3b82f6', text: '#fff' },
  MED: { bg: '#10b981', text: '#fff' },
  DEL: { bg: '#ef4444', text: '#fff' }
};

function getGrupoPosicion(posicion) {
  if (!posicion) return 'MED';
  for (var g in GRUPOS_POS) {
    if (GRUPOS_POS[g].some(function(p) {
      return posicion.toLowerCase().includes(p.toLowerCase());
    })) return g;
  }
  return 'MED';
}

function getLabelGrupo(grupo) {
  return { PO: 'Arquero', DEF: 'Defensor', MED: 'Mediocampista', DEL: 'Delantero' }[grupo] || grupo;
}

// ── Fecha ─────────────────────────────────────────────
function formatFecha(date) {
  var dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
               'Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return dias[date.getDay()] + ' ' + date.getDate() + ' de ' + meses[date.getMonth()] + ' ' + date.getFullYear();
}

// ── Theme toggle ──────────────────────────────────────
function initTheme() {
  var saved = localStorage.getItem('cancharanet-theme') || 'dark';
  document.body.setAttribute('data-theme', saved);
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';

  if (btn) {
    btn.addEventListener('click', function() {
      var t = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', t);
      localStorage.setItem('cancharanet-theme', t);
      btn.textContent = t === 'dark' ? '🌙' : '☀️';
    });
  }
}

// ── Render plantel ────────────────────────────────────
function renderPlantel(jugadores) {
  var container = document.getElementById('plantel-container');
  if (!container) return;

  var filtrados = jugadores;
  if (FILTRO_ACTIVO !== 'todos') {
    filtrados = jugadores.filter(function(j) {
      return getGrupoPosicion(j.posicion) === FILTRO_ACTIVO;
    });
  }

  if (filtrados.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚽</div><p>No hay jugadores en esta posición.</p></div>';
    return;
  }

  // Agrupar por posición
  var grupos = {};
  filtrados.forEach(function(j) {
    var g = getGrupoPosicion(j.posicion);
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(j);
  });

  var orden_grupos = ['PO', 'DEF', 'MED', 'DEL'];
  var html = '';

  orden_grupos.forEach(function(g) {
    if (!grupos[g] || grupos[g].length === 0) return;
    var col = COLORS_POS[g];
    html += '<div class="plantel-grupo">';
    html += '<div class="plantel-grupo-titulo" style="border-color:' + col.bg + '">';
    html += '<span class="grupo-dot" style="background:' + col.bg + '"></span>';
    html += getLabelGrupo(g) + 'es';
    html += '</div>';
    html += '<div class="plantel-grid">';

    grupos[g].forEach(function(j) {
      var dorsal = j.dorsal ? j.dorsal : '—';
      var edad   = j.edad   ? j.edad + ' años' : '—';
      var valor  = j.valor  || '—';

      // Bandera
      var bandera = '';
      if (j.nac) {
        bandera = '<span class="jugador-nac" title="' + j.nac + '">' + j.nac + '</span>';
      }

      // Foto del jugador
      var fotoHtml = '';
      if (j.foto && j.foto.indexOf('default') === -1) {
        fotoHtml = '<img src="' + j.foto + '" alt="' + j.nombre + '" class="jugador-foto" onerror="this.outerHTML=\'<div class=jugador-foto-placeholder>👤</div>\'">';
      } else {
        fotoHtml = '<div class="jugador-foto-placeholder">👤</div>';
      }

      html += '<div class="jugador-card">';
      html += '  <div class="jugador-dorsal-wrap" style="background:' + col.bg + ';color:' + col.text + '">' + dorsal + '</div>';
      html += '  <div class="jugador-foto-wrap">' + fotoHtml + '</div>';
      html += '  <div class="jugador-data">';
      html += '    <div class="jugador-nombre">' + j.nombre + '</div>';
      html += '    <div class="jugador-pos-badge" style="background:' + col.bg + '22;color:' + col.bg + ';border:1px solid ' + col.bg + '44">' + (j.posicion || '—') + '</div>';
      html += '    <div class="jugador-meta">';
      html += '      <span><i class="fas fa-birthday-cake"></i> ' + edad + '</span>';
      html += '      <span>' + bandera + '</span>';
      html += '    </div>';
      html += '    <div class="jugador-valor"><i class="fas fa-tag"></i> ' + valor + '</div>';
      html += '  </div>';
      html += '</div>';
    });

    html += '</div></div>';
  });

  container.innerHTML = html;
}

// ── Filtros ───────────────────────────────────────────
function initFiltros() {
  document.querySelectorAll('.filtro-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filtro-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      FILTRO_ACTIVO = btn.getAttribute('data-pos');
      if (PLANTEL_ACTUAL) renderPlantel(PLANTEL_ACTUAL);
    });
  });
}

// ── Init ──────────────────────────────────────────────
async function init() {
  // Fecha
  var elFecha = document.getElementById('fecha-actual');
  if (elFecha) elFecha.textContent = formatFecha(new Date());

  initTheme();
  initFiltros();

  // Leer parámetro ?equipo=
  var params  = new URLSearchParams(window.location.search);
  var equipo  = params.get('equipo');
  if (!equipo) {
    document.getElementById('plantel-container').innerHTML =
      '<div class="empty-state"><div class="empty-icon">❌</div><p>No se especificó un equipo.</p></div>';
    return;
  }

  // Actualizar cabecera
  document.title = equipo + ' — CancharaNet';
  var elNombre = document.getElementById('equipo-nombre');
  var elBc     = document.getElementById('bc-equipo');
  if (elNombre) elNombre.textContent = equipo;
  if (elBc)     elBc.textContent     = equipo;

  // Escudo
  var elEscudo = document.getElementById('equipo-escudo');
  if (elEscudo && typeof ESCUDOS !== 'undefined' && ESCUDOS[equipo]) {
    elEscudo.innerHTML = '<img src="' + ESCUDOS[equipo] + '" alt="' + equipo + '" class="equipo-escudo-img" onerror="this.outerHTML=\'<span style=font-size:60px>⚽</span>\'">';
  } else {
    if (elEscudo) elEscudo.innerHTML = '<span style="font-size:60px">⚽</span>';
  }

  // Cargar plantel
  try {
    var res  = await fetch('./data/planteles.json?v=' + Date.now());
    var data = await res.json();
    var plantelEquipo = data.equipos && data.equipos[equipo];

    if (!plantelEquipo || !plantelEquipo.jugadores || plantelEquipo.jugadores.length === 0) {
      document.getElementById('plantel-container').innerHTML =
        '<div class="empty-state"><div class="empty-icon">😞</div><p>No hay datos del plantel de <strong>' + equipo + '</strong>.<br>Corré el scraper para actualizar.</p></div>';
      return;
    }

    PLANTEL_ACTUAL = plantelEquipo.jugadores;

    // Actualizar meta
    var elTotal = document.getElementById('equipo-total-jugadores');
    if (elTotal) elTotal.innerHTML = '<i class="fas fa-users"></i> ' + PLANTEL_ACTUAL.length + ' jugadores';

    var elAct = document.getElementById('plantel-actualizado');
    if (elAct && plantelEquipo.actualizado) {
      var d = new Date(plantelEquipo.actualizado);
      elAct.textContent = 'Actualizado: ' + d.toLocaleDateString('es-AR');
    }

    renderPlantel(PLANTEL_ACTUAL);

  } catch(e) {
    document.getElementById('plantel-container').innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se pudo cargar el plantel.<br>Asegurate de haber corrido el scraper de planteles.</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', init);
