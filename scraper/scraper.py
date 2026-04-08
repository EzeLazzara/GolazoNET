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
BASE_URL    = "https://www.promiedos.com.ar"
LIGA_URL    = f"{BASE_URL}/league/liga-profesional/hc"
DATA_DIR    = os.path.join(os.path.dirname(__file__), "..", "data")
ESPERA_MS   = 8000   # ms para que cargue el JS
GOTO_TIMEOUT = 60000  # 60s — necesario en GitHub Actions

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
#   FUNCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════
def ejecutar_scraper():
    log("=" * 55)
    log("CancharaNet Scraper — iniciando")
    log("=" * 55)

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
            # ── 1. POSICIONES ──────────────────────────────
            log("PASO 1 — Scrapeando posiciones Liga Profesional")
            page.goto(LIGA_URL, wait_until="domcontentloaded", timeout=GOTO_TIMEOUT)
            page.wait_for_timeout(ESPERA_MS)

            texto  = page.inner_text("body")
            soup   = BeautifulSoup(page.content(), "html.parser")

            zona_a, zona_b = parsear_tabla_texto(texto)

            if zona_a:
                zona_a = asignar_zonas(zona_a, "primera")
                guardar_json("primera-zona-a.json", {
                    "actualizado": datetime.now().isoformat(),
                    "posiciones":  zona_a
                })
                log(f"  Zona A: {len(zona_a)} equipos")
            else:
                log("  WARN: Zona A vacía — usando fallback de data.js")

            if zona_b:
                zona_b = asignar_zonas(zona_b, "primera")
                guardar_json("primera-zona-b.json", {
                    "actualizado": datetime.now().isoformat(),
                    "posiciones":  zona_b
                })
                log(f"  Zona B: {len(zona_b)} equipos")
            else:
                log("  WARN: Zona B vacía — usando fallback de data.js")

            # Tabla anual combinada
            if zona_a or zona_b:
                todos = zona_a + zona_b
                todos_ord = sorted(todos, key=lambda x: (-x["pts"], -(x["gf"]-x["gc"])))
                for i, e in enumerate(todos_ord):
                    e["pos"] = i + 1
                asignar_zonas(todos_ord, "primera")
                guardar_json("primera.json", {
                    "actualizado": datetime.now().isoformat(),
                    "posiciones":  todos_ord
                })

            # ── 2. PARTIDOS DEL DÍA ────────────────────────
            log("PASO 2 — Scrapeando partidos del día")
            partidos = parsear_partidos(texto)
            hoy_str  = datetime.now().strftime("%d/%m")
            vivos    = [p for p in partidos if p["estado"] == "vivo"]
            hoy      = [p for p in partidos if p["esHoy"] or p["estado"] in ("vivo", "finalizado")]
            proximos = [p for p in partidos if not p["esHoy"] and p["estado"] == "programado"]

            guardar_json("partidos-hoy.json", {
                "actualizado": datetime.now().isoformat(),
                "partidos":    hoy
            })
            guardar_json("partidos-vivo.json", {
                "actualizado": datetime.now().isoformat(),
                "partidos":    vivos
            })
            guardar_json("proximos.json", {
                "actualizado": datetime.now().isoformat(),
                "partidos":    proximos
            })
            log(f"  Partidos hoy: {len(hoy)} | Vivos: {len(vivos)} | Próximos: {len(proximos)}")

        except Exception as e:
            log(f"ERROR: {e}")
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
