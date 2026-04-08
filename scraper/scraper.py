"""
=============================================================
  CANCHARANET - SCRAPER DE PROMIEDOS
  Versión 2.0 - Parser basado en estructura real del HTML
=============================================================

  CÓMO FUNCIONA:
  ──────────────
  1. Abre Chromium headless (sin ventana visible)
  2. Navega a promiedos.com.ar/league/liga-profesional/hc
  3. Espera que el JavaScript renderice la página
  4. Extrae el texto por zonas usando las clases CSS reales
  5. Parsea cada fila: pos, equipo, pts, pj, gf:gc, +/-, G, E, P
  6. Guarda JSONs en ../data/ que el frontend lee automáticamente

  CÓMO CORRERLO:
  ──────────────
  Una sola vez (manual):
      python scraper.py

  En loop automático (para dejar corriendo durante un partido):
      python scraper.py --loop --intervalo 60
      (actualiza cada 60 segundos — Ctrl+C para parar)

  ARCHIVOS QUE GENERA:
  ─────────────────────
  ../data/primera-zona-a.json   → Posiciones Zona A
  ../data/primera-zona-b.json   → Posiciones Zona B
  ../data/primera.json          → Tabla anual combinada
  ../data/partidos-hoy.json     → Partidos del día
  ../data/partidos-vivo.json    → Solo partidos en curso (minuto a minuto)
  ../data/proximos.json         → Próximos partidos

  ESTRUCTURA DE CADA JSON:
  ─────────────────────────
  {
    "actualizado": "2026-04-01T12:00:00",
    "posiciones": [
      {
        "pos": 1,
        "equipo": "Vélez Sarsfield",
        "pj": 11, "pg": 6, "pe": 4, "pp": 1,
        "gf": 12, "gc": 6,
        "pts": 22,
        "zona": "champions"   // champions | europa | normal | descenso
      },
      ...
    ]
  }
=============================================================
"""

import json, os, time, argparse, unicodedata
from datetime import datetime
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

# ── Configuración ──────────────────────────────────────────
BASE_URL     = "https://www.promiedos.com.ar"
LIGA_URL     = f"{BASE_URL}/league/liga-profesional/hc"
DATA_DIR     = os.path.join(os.path.dirname(__file__), "..", "data")
ESPERA_MS    = 8000    # ms para que cargue el JS
GOTO_TIMEOUT = 60000   # 60s — necesario en GitHub Actions

# URLs de todas las ligas a scrapear
LIGAS_EXTRA = [
    {
        "key":      "nacional",
        "nombre":   "Primera Nacional",
        "url":      f"{BASE_URL}/league/primera-nacional/ebj",
        "json":     "nacional.json",
        "tipo":     "normal",
    },
    {
        "key":      "bmetro",
        "nombre":   "Primera B Metropolitana",
        "url":      f"{BASE_URL}/league/primera-b-metropolitana/fahh",
        "json":     "bmetro.json",
        "tipo":     "normal",
    },
    {
        "key":      "federala",
        "nombre":   "Federal A",
        "url":      f"{BASE_URL}/league/federal-a/fahi",
        "json":     "federala.json",
        "tipo":     "normal",
    },
    {
        "key":      "primerac",
        "nombre":   "Primera C Metropolitana",
        "url":      f"{BASE_URL}/league/primera-c/ffjb",
        "json":     "primerac.json",
        "tipo":     "normal",
    },
    {
        "key":      "regional",
        "nombre":   "Regional Amateur",
        "url":      f"{BASE_URL}/league/promocional-amateur/iage",
        "json":     "regional.json",
        "tipo":     "normal",
    },
]

COPA_URL = f"{BASE_URL}/league/copa-argentina/gea"

# Mapeo de nombres cortos de Promiedos a nombres completos del frontend
NOMBRES = {
    "Vélez":         "Velez Sarsfield",
    "Velez":         "Velez Sarsfield",
    "VÃ©lez":        "Velez Sarsfield",
    "Estudiantes":   "Estudiantes",
    "Defensa":       "Defensa y Justicia",
    "Lanús":         "Lanus",
    "LanÃºs":        "Lanus",
    "Lanus":         "Lanus",
    "Talleres":      "Talleres",
    "Boca Jrs.":     "Boca Juniors",
    "Boca":          "Boca Juniors",
    "Unión":         "Union Santa Fe",
    "UniÃ³n":        "Union Santa Fe",
    "Union":         "Union Santa Fe",
    "Independiente": "Independiente",
    "San Lorenzo":   "San Lorenzo",
    "Platense":      "Platense",
    "Central Córdoba":"Central Cordoba",
    "Central CÃ³rdoba":"Central Cordoba",
    "Central Cordoba":"Central Cordoba",
    "Instituto":     "Instituto",
    "Gimnasia (M)":  "Gimnasia Mendoza",
    "Riestra":       "Riestra",
    "Newell's":      "Newells",
    "Newells":       "Newells",
    "Ind. Rivadavia":"Ind. Rivadavia",    # Independiente Rivadavia de Mendoza — NO confundir con Independiente (Rojo, Avellaneda)
    "River":         "River Plate",
    "Argentinos":    "Argentinos Juniors",
    "Belgrano":      "Belgrano",
    "Racing":        "Racing Club",
    "Central":       "Rosario Central",
    "Tigre":         "Tigre",
    "Barracas":      "Barracas Central",
    "Huracán":       "Huracan",
    "HuracÃ¡n":      "Huracan",
    "Huracan":       "Huracan",
    "Gimnasia":      "Gimnasia LP",
    "Banfield":      "Banfield",
    "Sarmiento":     "Sarmiento",
    "Atl. Tucumán":  "Atletico Tucuman",
    "Atl. TucumÃ¡n": "Atletico Tucuman",
    "Aldosivi":      "Aldosivi",
    "Estudiantes RC":"Estudiantes RC",
}

def normalizar(nombre):
    """Limpia caracteres raros y busca en el mapa de nombres"""
    nombre = nombre.strip()
    if nombre in NOMBRES:
        return NOMBRES[nombre]
    # Intentar normalizar Unicode
    nombre_norm = unicodedata.normalize("NFKD", nombre)
    nombre_norm = "".join(c for c in nombre_norm if not unicodedata.combining(c))
    if nombre_norm in NOMBRES:
        return NOMBRES[nombre_norm]
    return nombre  # devolver tal cual si no está en el mapa

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def guardar_json(nombre, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    ruta = os.path.join(DATA_DIR, nombre)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log(f"  ✓ Guardado: {nombre}")


# ══════════════════════════════════════════════════════════
#   PARSER DE TABLA DE POSICIONES
#   Estructura real detectada por inspector.py:
#
#   Zona A
#   # Equipos PTS J Gol +/- G E P Últimas
#   1
#   Vélez
#   22
#   11
#   12:6
#   6        ← diferencia goles
#   6        ← G (victorias)
#   4        ← E (empates)
#   1        ← P (derrotas)
#   D V E V E  ← últimos 5 resultados (uno por línea)
#   2
#   Estudiantes
#   ...
# ══════════════════════════════════════════════════════════
def parsear_tabla_texto(texto_completo):
    """
    Parsea el texto plano extraído de Promiedos con inner_text("body").

    Estructura REAL confirmada por diagnóstico (inner_text usa tabs):
      [36]: 'ZONA A'
      [37]: '#'
      [38]: 'Equipos'
      [39]: 'PTS\\tJ\\tGol\\t+/-\\tG\\tE\\tP\\tÚltimas'  ← una sola línea con tabs
      [40]: '1'
      [41]: 'Vélez'
      [42]: '22\\t11\\t12:6\\t6\\t6\\t4\\t1'              ← una sola línea con tabs
      [43]: 'D'
      [44]: 'V'
      ...
      [48]: '2'
      [49]: 'Estudiantes'
      [50]: '21\\t11\\t14:5\\t9\\t6\\t3\\t2'
      ...
    """
    lineas = [l.strip() for l in texto_completo.split("\n") if l.strip()]

    zona_a = []
    zona_b = []
    zona_actual = None
    SKIP = {"#", "Equipos", "Últimas", "ZONA A", "ZONA B", "Zona A", "Zona B"}

    i = 0
    while i < len(lineas):
        linea = lineas[i]

        # ── Detectar inicio de zonas ────────────────────
        if linea in ("ZONA A", "Zona A"):
            zona_actual = zona_a
            i += 1
            continue
        if linea in ("ZONA B", "Zona B"):
            zona_actual = zona_b
            i += 1
            continue

        # Si llegamos a tabla anual o promedios o siguiente sección, paramos
        if zona_actual is zona_b and len(zona_b) >= 15:
            break
        if linea in ("ZONA A", "Zona A", "ZONA B", "Zona B"):
            pass  # ya manejado arriba

        if zona_actual is None:
            i += 1
            continue

        # Saltar líneas de header o de posición numérica (1..15)
        if linea in SKIP:
            i += 1
            continue

        # Saltar la línea de headers con tabs (contiene "PTS" y tabs)
        if "\t" in linea and "PTS" in linea:
            i += 1
            continue

        # Saltar resultados sueltos (V, E, D) o posición suelta (número 1-15 solo)
        if linea in ("V", "E", "D"):
            i += 1
            continue
        if linea.isdigit() and 1 <= int(linea) <= 15:
            i += 1
            continue

        # ── Detectar nombre de equipo ───────────────────
        # Un nombre tiene letras, no es solo número, no es V/E/D
        tiene_letras = any(c.isalpha() for c in linea)
        tiene_tab    = "\t" in linea

        if tiene_letras and not tiene_tab and len(linea) >= 2:
            nombre = normalizar(linea)

            # La siguiente línea NO-vacía contiene los datos con tabs: PTS\tPJ\tGF:GC\t+/-\tG\tE\tP
            j = i + 1
            # Saltar números de posición (1-15) que puedan venir entre nombre y datos
            while j < len(lineas) and lineas[j].isdigit() and 1 <= int(lineas[j]) <= 15:
                j += 1

            if j < len(lineas) and "\t" in lineas[j]:
                datos_tab = lineas[j]
                partes = datos_tab.split("\t")
                # Saltar los 5 resultados (V/E/D) que vienen DESPUÉS de los datos
                j += 1
                while j < len(lineas) and lineas[j] in ("V", "E", "D"):
                    j += 1

                # Parsear partes: PTS, PJ, GF:GC, +/-, G, E, P
                try:
                    if len(partes) >= 7:
                        pts = int(partes[0])
                        pj  = int(partes[1])
                        goles_str = partes[2]   # "12:6"
                        # partes[3] es +/-
                        pg  = int(partes[4])
                        pe  = int(partes[5])
                        pp  = int(partes[6])
                        gf, gc = 0, 0
                        if ":" in goles_str:
                            g_parts = goles_str.split(":")
                            gf = int(g_parts[0])
                            gc = int(g_parts[1])

                        zona_actual.append({
                            "pos":    len(zona_actual) + 1,
                            "equipo": nombre,
                            "pj":     pj,
                            "pg":     pg,
                            "pe":     pe,
                            "pp":     pp,
                            "gf":     gf,
                            "gc":     gc,
                            "pts":    pts,
                            "zona":   "normal"
                        })
                        i = j
                        continue
                except (ValueError, IndexError):
                    pass

        i += 1

    return zona_a, zona_b


def asignar_zonas(equipos, tipo="primera"):
    """
    Colorea las zonas según posición en la tabla.
    Liga Profesional: top3=Libertadores, 4-6=Sudamericana, últimos3=Descenso
    """
    n = len(equipos)
    for idx, e in enumerate(equipos):
        pos = idx + 1
        if tipo == "primera":
            if pos <= 3:
                e["zona"] = "champions"
            elif pos <= 6:
                e["zona"] = "europa"
            elif pos > n - 3:
                e["zona"] = "descenso"
            else:
                e["zona"] = "normal"
        else:  # nacional/federal
            if pos <= 2:
                e["zona"] = "promotion"
            elif pos > n - 2:
                e["zona"] = "descenso"
            else:
                e["zona"] = "normal"
    return equipos


# ══════════════════════════════════════════════════════════
#   PARSER DE PARTIDOS
#   Estructura real confirmada en Promiedos (inner_text):
#
#   'FECHA 13'
#   'Mié 01/04'     ← día + fecha (nuevo bloque de día)
#   '20:00'         ← hora
#   'Lanús'         ← equipo local
#   '-'             ← separador (o marcador como '2\t1')
#   'Platense'      ← equipo visitante
#   'Jue 02/04'     ← siguiente día
#   '15:00'
#   ...
#
#   Si el partido está en vivo el separador es el marcador: '1\t0'
#   Si terminó puede ser 'FT' o el marcador final
# ══════════════════════════════════════════════════════════

import re as _re

PATRON_FECHA_DIA  = _re.compile(r'^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)\s+\d{2}/\d{2}$')
PATRON_HORA       = _re.compile(r'^\d{2}:\d{2}$')
PATRON_MARCADOR   = _re.compile(r'^\d+\t\d+$')   # "1\t2" = en vivo o finalizado
PATRON_MINUTO     = _re.compile(r"^\d{1,3}'?$")  # "45'" o "90"


def parsear_partidos(texto_completo):
    """
    Parsea partidos desde el texto plano de Promiedos.
    Detecta la sección FECHA XX y lee los partidos agrupados por día.
    """
    lineas = [l.strip() for l in texto_completo.split("\n") if l.strip()]

    partidos   = []
    partido_id = 100
    en_fixture = False
    fecha_num  = None
    dia_actual = None   # "Mié 01/04"
    fecha_act  = None   # "01/04"

    i = 0
    while i < len(lineas):
        l = lineas[i]

        # Detectar inicio del fixture
        if l.startswith("FECHA ") and l[6:].isdigit():
            en_fixture = True
            fecha_num  = int(l[6:])
            i += 1
            continue

        if not en_fixture:
            i += 1
            continue

        # Fin del fixture (publicidad o fin de página)
        if "compulsivo" in l.lower() or "perjudicial" in l.lower():
            break

        # Nuevo día
        if PATRON_FECHA_DIA.match(l):
            dia_actual = l           # "Mié 01/04"
            fecha_act  = l.split()[-1]  # "01/04"
            i += 1
            continue

        # Hora de partido → inicia una secuencia: hora, local, sep/marcador, visitante
        if PATRON_HORA.match(l) and i + 3 < len(lineas):
            hora       = l
            local_raw  = lineas[i + 1]
            sep        = lineas[i + 2]   # '-' o '1\t0' (marcador) o minuto
            visit_raw  = lineas[i + 3]

            # Validar que local y visitante son nombres de equipo (tienen letras)
            if not any(c.isalpha() for c in local_raw):
                i += 1
                continue
            if not any(c.isalpha() for c in visit_raw):
                i += 1
                continue

            local     = normalizar(local_raw)
            visitante = normalizar(visit_raw)

            # Detectar estado y marcador
            estado       = "programado"
            goles_local  = None
            goles_visit  = None
            minuto       = None

            if sep == "-":
                # Partido programado (sin jugar)
                estado = "programado"
            elif PATRON_MARCADOR.match(sep):
                # Marcador vivo o finalizado: "1\t0"
                partes      = sep.split("\t")
                goles_local = int(partes[0])
                goles_visit = int(partes[1])
                # Ver si la siguiente línea es un minuto o "FT"
                if i + 4 < len(lineas):
                    sig = lineas[i + 4]
                    if sig.upper() in ("FT", "FINAL", "FIN"):
                        estado = "finalizado"
                        i += 1  # saltar esa línea extra
                    elif PATRON_MINUTO.match(sig):
                        minuto = sig.replace("'", "")
                        estado = "vivo"
                        i += 1
                    else:
                        estado = "finalizado"  # marcador sin minuto = terminado
            elif sep.upper() in ("FT", "FINAL", "FIN"):
                estado = "finalizado"

            # Año actual para la fecha completa
            anio = datetime.now().year
            fecha_iso = None
            if fecha_act:
                try:
                    d, m   = fecha_act.split("/")
                    fecha_iso = f"{anio}-{m.zfill(2)}-{d.zfill(2)}"
                except Exception:
                    pass

            # Determinar si es hoy
            hoy = datetime.now().strftime("%d/%m")
            es_hoy = (fecha_act == hoy) if fecha_act else False

            partidos.append({
                "id":          partido_id,
                "fecha":       fecha_num,
                "dia":         dia_actual or "",
                "fechaISO":    fecha_iso,
                "esHoy":       es_hoy,
                "liga":        "primera",
                "ligaNombre":  "Liga Profesional",
                "local":       {"nombre": local,     "goles": goles_local},
                "visitante":   {"nombre": visitante, "goles": goles_visit},
                "hora":        hora,
                "minuto":      minuto,
                "estado":      estado,
            })
            partido_id += 1
            i += 4  # saltar hora + local + sep + visitante
            continue

        i += 1

    return partidos


# ══════════════════════════════════════════════════════════
#   PARSER COPA ARGENTINA — BRACKET
# ══════════════════════════════════════════════════════════
import re as _re2
from bs4 import BeautifulSoup as _BS

RONDAS_COPA = ["32AVOS", "16AVOS", "OCTAVOS", "CUARTOS", "SEMIFINALES", "FINAL"]

def parsear_copa(html):
    """
    Parsea el bracket de Copa Argentina desde el HTML de promiedos.
    Devuelve dict con rondas: { "32avos": [...cruces...], ... }
    """
    soup = _BS(html, "html.parser")
    resultado = {}

    for ronda_key in RONDAS_COPA:
        # Buscar el h2 que contiene el nombre de la ronda
        headers = soup.find_all(["h2", "h3", "div"])
        ronda_section = None
        for h in headers:
            txt = h.get_text(strip=True).upper()
            if ronda_key in txt and len(txt) < 40:
                ronda_section = h
                break

        if not ronda_section:
            continue

        cruces = []
        # Recorrer elementos hermanos buscando pares de equipos
        siguiente = ronda_section.find_next_sibling()
        equipos_ronda = []
        conteo = 0
        while siguiente and conteo < 200:
            conteo += 1
            txt = siguiente.get_text(separator="\n", strip=True)
            # Buscar nombres de equipos e imagen de escudo
            imgs = siguiente.find_all("img")
            nombres = []
            for img in imgs:
                src = img.get("src", "")
                alt = img.get("alt", "")
                # Texto adyacente al img
                parent = img.parent
                if parent:
                    ptxt = parent.get_text(strip=True)
                    if ptxt and len(ptxt) > 1 and "confirmar" not in ptxt.lower() and ptxt not in nombres:
                        nombres.append(ptxt)

            # También buscar divs con nombres directos
            divs_txt = [d.get_text(strip=True) for d in siguiente.find_all(["span", "div", "p"])
                        if d.get_text(strip=True) and len(d.get_text(strip=True)) > 2]

            equipos_ronda.extend(nombres)

            # Verificar si ya llegamos a la siguiente ronda
            sig_txt = siguiente.get_text(strip=True).upper()
            es_nueva_ronda = any(r in sig_txt and len(sig_txt) < 40 for r in RONDAS_COPA if r != ronda_key)
            if es_nueva_ronda:
                break

            siguiente = siguiente.find_next_sibling()

        # Limpiar y deduplicar nombres
        equipos_limpios = []
        vistos = set()
        for e in equipos_ronda:
            e2 = e.strip()
            if e2 and e2 not in vistos and len(e2) > 2:
                vistos.add(e2)
                equipos_limpios.append(e2)

        # Armar cruces de a pares
        for i in range(0, len(equipos_limpios) - 1, 2):
            cruces.append({
                "local":     equipos_limpios[i],
                "visitante": equipos_limpios[i + 1] if i + 1 < len(equipos_limpios) else "A confirmar",
                "goles_l":   None,
                "goles_v":   None,
            })

        if cruces:
            resultado[ronda_key.lower().replace("avos", "avos_final")] = cruces

    return resultado


def parsear_copa_desde_texto(texto):
    """
    Versión simplificada basada en inner_text para extraer los cruces de Copa.
    Estructura en texto: RONDA → equipo1 → resultado/guion → equipo2
    """
    lineas = [l.strip() for l in texto.split("\n") if l.strip()]
    rondas = {}
    ronda_actual = None
    NOMBRES_RONDAS = {
        "32AVOS DE FINAL":   "32avos",
        "16AVOS DE FINAL":   "16avos",
        "OCTAVOS DE FINAL":  "octavos",
        "CUARTOS DE FINAL":  "cuartos",
        "SEMIFINALES":       "semifinales",
        "FINAL":             "final",
    }
    SKIP_COPA = {"A confirmar", "CUADRO", "TEMPORADA", "VER MÁS", "FIXTURE Y TABLAS",
                 "EQUIPOS Y ESTADISTICAS", "CAMPEONES", "ESTADÍSTICAS PERSONALES"}

    i = 0
    while i < len(lineas):
        l = lineas[i]
        lu = l.upper()

        # Detectar ronda
        for nombre_ronda, key_ronda in NOMBRES_RONDAS.items():
            if nombre_ronda in lu:
                ronda_actual = key_ronda
                if ronda_actual not in rondas:
                    rondas[ronda_actual] = []
                i += 1
                break
        else:
            if ronda_actual is None or l in SKIP_COPA:
                i += 1
                continue

            # Si llegamos a sección de stats o publicidad, terminamos
            if any(s in l for s in ["compulsivo", "perjudicial", "ESTADÍSTICAS", "TEMPORADA"]):
                break

            # Detectar nombre de equipo (tiene letras, no es número, no es separador)
            tiene_letras = any(c.isalpha() for c in l)
            es_num_solo  = l.replace(":", "").replace("\t", "").strip().isdigit()
            es_marcador  = bool(_re.match(r'^\d+\s*[\t:]\s*\d+$', l))

            if tiene_letras and not es_num_solo and l not in SKIP_COPA and len(l) > 2:
                local = normalizar(l)
                # Buscar visitante: la siguiente línea con letras que no sea skip
                j = i + 1
                goles_l, goles_v = None, None

                # Puede haber un marcador entre local y visitante
                while j < len(lineas) and not any(c.isalpha() for c in lineas[j]):
                    # es número o marcador
                    if _re.match(r'^\d+$', lineas[j].strip()):
                        if goles_l is None:
                            goles_l = int(lineas[j].strip())
                        else:
                            goles_v = int(lineas[j].strip())
                    j += 1

                if j < len(lineas):
                    visit_raw = lineas[j]
                    if any(c.isalpha() for c in visit_raw) and visit_raw not in SKIP_COPA:
                        visitante = normalizar(visit_raw)
                        rondas[ronda_actual].append({
                            "local":     local,
                            "visitante": visitante,
                            "goles_l":   goles_l,
                            "goles_v":   goles_v,
                        })
                        i = j + 1
                        continue
            i += 1

    return rondas


# ══════════════════════════════════════════════════════════
#   FUNCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════
def ejecutar_scraper():
    log("=" * 55)
    log("CancharaNet Scraper — iniciando")
    log("=" * 55)

    todos_partidos_hoy  = []
    todos_partidos_vivo = []
    todos_proximos      = []
    partido_id_base     = 100

    with sync_playwright() as pw:
        navegador = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]
        )
        ctx  = navegador.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120"
        )
        page = ctx.new_page()

        try:
            # ── 1. LIGA PROFESIONAL — posiciones + partidos ─
            log("PASO 1 — Liga Profesional (posiciones + partidos)")
            page.goto(LIGA_URL, wait_until="domcontentloaded", timeout=GOTO_TIMEOUT)
            page.wait_for_timeout(ESPERA_MS)
            texto = page.inner_text("body")

            zona_a, zona_b = parsear_tabla_texto(texto)
            if zona_a:
                zona_a = asignar_zonas(zona_a, "primera")
                guardar_json("primera-zona-a.json", {"actualizado": datetime.now().isoformat(), "posiciones": zona_a})
                log(f"  Zona A: {len(zona_a)} equipos")
            if zona_b:
                zona_b = asignar_zonas(zona_b, "primera")
                guardar_json("primera-zona-b.json", {"actualizado": datetime.now().isoformat(), "posiciones": zona_b})
                log(f"  Zona B: {len(zona_b)} equipos")
            if zona_a or zona_b:
                todos = zona_a + zona_b
                todos_ord = sorted(todos, key=lambda x: (-x["pts"], -(x["gf"] - x["gc"])))
                for idx, e in enumerate(todos_ord): e["pos"] = idx + 1
                asignar_zonas(todos_ord, "primera")
                guardar_json("primera.json", {"actualizado": datetime.now().isoformat(), "posiciones": todos_ord})

            partidos_lp = parsear_partidos(texto)
            # Asignar liga a los partidos de LP
            for p in partidos_lp:
                p["liga"] = "primera"
                p["ligaNombre"] = "Liga Profesional"
                p["id"] = partido_id_base
                partido_id_base += 1
            todos_partidos_hoy  += [p for p in partidos_lp if p["esHoy"] or p["estado"] in ("vivo", "finalizado")]
            todos_partidos_vivo += [p for p in partidos_lp if p["estado"] == "vivo"]
            todos_proximos      += [p for p in partidos_lp if not p["esHoy"] and p["estado"] == "programado"]
            log(f"  LP partidos hoy: {len([p for p in partidos_lp if p['esHoy']])}")

            # ── 2. LIGAS EXTRA ─────────────────────────────
            for liga in LIGAS_EXTRA:
                log(f"PASO 2 — {liga['nombre']}")
                try:
                    page.goto(liga["url"], wait_until="domcontentloaded", timeout=GOTO_TIMEOUT)
                    page.wait_for_timeout(ESPERA_MS)
                    texto_liga = page.inner_text("body")

                    # Posiciones
                    zona_a_l, zona_b_l = parsear_tabla_texto(texto_liga)
                    posiciones_liga = zona_a_l + zona_b_l
                    if posiciones_liga:
                        posiciones_liga = asignar_zonas(posiciones_liga, "normal")
                        guardar_json(liga["json"], {"actualizado": datetime.now().isoformat(), "posiciones": posiciones_liga})
                        log(f"  {liga['nombre']}: {len(posiciones_liga)} equipos")
                    else:
                        log(f"  WARN: {liga['nombre']} sin posiciones")

                    # Partidos
                    partidos_liga = parsear_partidos(texto_liga)
                    for p in partidos_liga:
                        p["liga"] = liga["key"]
                        p["ligaNombre"] = liga["nombre"]
                        p["id"] = partido_id_base
                        partido_id_base += 1
                    todos_partidos_hoy  += [p for p in partidos_liga if p["esHoy"] or p["estado"] in ("vivo", "finalizado")]
                    todos_partidos_vivo += [p for p in partidos_liga if p["estado"] == "vivo"]
                    todos_proximos      += [p for p in partidos_liga if not p["esHoy"] and p["estado"] == "programado"]
                    log(f"  {liga['nombre']} partidos hoy: {len([p for p in partidos_liga if p['esHoy']])}")

                except Exception as e:
                    log(f"  ERROR en {liga['nombre']}: {e}")

            # ── 3. COPA ARGENTINA ───────────────────────────
            log("PASO 3 — Copa Argentina (bracket + partidos)")
            try:
                page.goto(COPA_URL, wait_until="domcontentloaded", timeout=GOTO_TIMEOUT)
                page.wait_for_timeout(ESPERA_MS)
                texto_copa = page.inner_text("body")
                html_copa  = page.content()

                # Bracket
                bracket = parsear_copa_desde_texto(texto_copa)
                guardar_json("copa-argentina.json", {
                    "actualizado": datetime.now().isoformat(),
                    "bracket":     bracket,
                })
                total_cruces = sum(len(v) for v in bracket.values())
                log(f"  Copa bracket: {len(bracket)} rondas, {total_cruces} cruces")

                # Partidos del día de Copa
                partidos_copa = parsear_partidos(texto_copa)
                for p in partidos_copa:
                    p["liga"] = "copa"
                    p["ligaNombre"] = "Copa Argentina"
                    p["id"] = partido_id_base
                    partido_id_base += 1
                todos_partidos_hoy  += [p for p in partidos_copa if p["esHoy"] or p["estado"] in ("vivo", "finalizado")]
                todos_partidos_vivo += [p for p in partidos_copa if p["estado"] == "vivo"]
                todos_proximos      += [p for p in partidos_copa if not p["esHoy"] and p["estado"] == "programado"]
                log(f"  Copa partidos hoy: {len([p for p in partidos_copa if p['esHoy']])}")

            except Exception as e:
                log(f"  ERROR en Copa Argentina: {e}")

            # ── 4. GUARDAR JSONS COMBINADOS ─────────────────
            guardar_json("partidos-hoy.json",  {"actualizado": datetime.now().isoformat(), "partidos": todos_partidos_hoy})
            guardar_json("partidos-vivo.json", {"actualizado": datetime.now().isoformat(), "partidos": todos_partidos_vivo})
            guardar_json("proximos.json",      {"actualizado": datetime.now().isoformat(), "partidos": todos_proximos})
            log(f"  TOTAL partidos hoy: {len(todos_partidos_hoy)} | Vivos: {len(todos_partidos_vivo)} | Próximos: {len(todos_proximos)}")

        except Exception as e:
            log(f"ERROR GLOBAL: {e}")
            import traceback; traceback.print_exc()
        finally:
            navegador.close()

    log("Scraper finalizado ✓")
    log(f"JSONs en: {os.path.abspath(DATA_DIR)}")
    log("=" * 55)


# ══════════════════════════════════════════════════════════
#   ENTRY POINT
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CancharaNet — Scraper Promiedos")
    parser.add_argument("--loop",      action="store_true", help="Correr en loop continuo")
    parser.add_argument("--intervalo", type=int, default=60, help="Segundos entre actualizaciones (default: 60)")
    args = parser.parse_args()

    if args.loop:
        log(f"Modo loop: actualizando cada {args.intervalo}s — Ctrl+C para parar")
        while True:
            try:
                ejecutar_scraper()
                log(f"Próxima actualización en {args.intervalo}s...")
                time.sleep(args.intervalo)
            except KeyboardInterrupt:
                log("Detenido por el usuario.")
                break
            except Exception as e:
                log(f"Error: {e}. Reintentando en 30s...")
                time.sleep(30)
    else:
        ejecutar_scraper()
