"""
=============================================================
  CANCHARANET - SCRAPER DE PLANTELES
  Fuente: Transfermarkt
  Genera: ../data/planteles.json
=============================================================

  CÓMO CORRERLO:
      python scraper_planteles.py

  ESTRUCTURA DEL JSON GENERADO:
  {
    "actualizado": "2026-04-01T12:00:00",
    "equipos": {
      "Boca Juniors": {
        "nombre": "Boca Juniors",
        "transfermarkt_id": "...",
        "jugadores": [
          {
            "nombre": "Edinson Cavani",
            "posicion": "Delantero centro",
            "posicion_corta": "DC",
            "dorsal": 9,
            "edad": 38,
            "nacionalidad": "Uruguay",
            "bandera": "uy",
            "valor": "500 mil €",
            "pie": "Derecho"
          },
          ...
        ]
      },
      ...
    }
  }
=============================================================
"""

import json, os, time, re, argparse
from datetime import datetime
from playwright.sync_api import sync_playwright

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# ── Mapeo: nombre frontend → slug/id Transfermarkt ────────
EQUIPOS_TM = {
    "Velez Sarsfield":    ("velez-sarsfield",         "433"),
    "Estudiantes":        ("estudiantes-de-la-plata",  "20905"),
    "Defensa y Justicia": ("defensa-y-justicia",       "10795"),
    "Lanus":              ("ca-lanus",                 "2889"),
    "Talleres":           ("ca-talleres-de-cordoba",   "1838"),
    "Boca Juniors":       ("ca-boca-juniors",          "1068"),
    "Union Santa Fe":     ("ca-union",                 "10785"),
    "Independiente":      ("ca-independiente",         "428"),
    "San Lorenzo":        ("ca-san-lorenzo-de-almagro","435"),
    "Platense":           ("ca-platense",              "12039"),
    "Central Cordoba":    ("central-cordoba-santiago", "18082"),
    "Instituto":          ("instituto-atletico-central-cordoba","18082"),
    "Gimnasia Mendoza":   ("gimnasia-y-esgrima-mendoza","27157"),
    "Riestra":            ("club-deportivo-riestra",   "39575"),
    "Newells":            ("newells-old-boys",          "432"),
    "Ind. Rivadavia":     ("cs-independiente-rivadavia","15221"),
    "River Plate":        ("ca-river-plate",           "1449"),
    "Argentinos Juniors": ("aa-argentinos-juniors",    "4788"),
    "Belgrano":           ("ca-belgrano",              "13030"),
    "Racing Club":        ("racing-club",              "2786"),
    "Rosario Central":    ("ca-rosario-central",       "431"),
    "Tigre":              ("ca-tigre",                 "2788"),
    "Barracas Central":   ("ca-barracas-central",      "23624"),
    "Huracan":            ("ca-huracan",               "430"),
    "Gimnasia LP":        ("gimnasia-y-esgrima-lp",    "429"),
    "Banfield":           ("ca-banfield",              "13029"),
    "Sarmiento":          ("ca-sarmiento",             "9818"),
    "Atletico Tucuman":   ("atletico-tucuman",         "14274"),
    "Aldosivi":           ("ca-aldosivi",              "13031"),
    "Estudiantes RC":     ("estudiantes-de-rio-cuarto","27546"),
}

POSICIONES_MAP = {
    "Portero": "PO", "Goalkeeper": "PO",
    "Defensa central": "DC", "Defensa": "DF",
    "Lateral derecho": "LD", "Lateral izquierdo": "LI",
    "Mediocentro defensivo": "MCD", "Mediocentro": "MC",
    "Mediapunta": "MP", "Centrocampista": "MC",
    "Extremo derecho": "ED", "Extremo izquierdo": "EI",
    "Delantero centro": "DC2", "Delantero": "DL",
    "Segundo delantero": "SD",
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def guardar_json(nombre, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    ruta = os.path.join(DATA_DIR, nombre)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log(f"  ✓ Guardado: {nombre}")

def buscar_url_equipo(page, nombre_busqueda):
    """Busca el equipo en Transfermarkt y retorna la URL del plantel."""
    url_busqueda = f"https://www.transfermarkt.com.ar/schnellsuche/ergebnis/schnellsuche?query={nombre_busqueda.replace(' ', '+')}&Verein_page=0"
    try:
        page.goto(url_busqueda, wait_until="domcontentloaded", timeout=20000)
        page.wait_for_timeout(3000)

        # Obtener primer resultado de equipos
        primer_resultado = page.evaluate("""
        () => {
            // Buscar links de equipos en resultados
            const links = document.querySelectorAll('table.items a.vereinprofil_tooltip, table a[href*="/kader/verein/"], .items a[href*="startseite/verein"]');
            for (const a of links) {
                const href = a.getAttribute('href');
                if (href && href.includes('/verein/')) {
                    return 'https://www.transfermarkt.com.ar' + href.replace('startseite', 'kader') + '/saison_id/2025/plus/1';
                }
            }
            return null;
        }
        """)
        if primer_resultado:
            log(f"    Auto-URL encontrada: {primer_resultado}")
        return primer_resultado
    except Exception as e:
        log(f"    Error buscando URL: {e}")
        return None

def scrape_plantel(page, nombre_equipo, slug, tm_id):
    """Scrapea el plantel de un equipo desde Transfermarkt"""
    url = f"https://www.transfermarkt.com.ar/{slug}/kader/verein/{tm_id}/saison_id/2025/plus/1"
    log(f"  Cargando: {nombre_equipo} → {url}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(5000)

        # Intentar esperar a que aparezca la tabla
        try:
            page.wait_for_selector('table.items, #yw1 table, .responsive-table table', timeout=8000)
        except:
            pass

        # Scroll para activar lazy-load
        page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")

        jugadores = page.evaluate("""
        () => {
            // Intentar múltiples selectores de tabla (TM cambia estructura a veces)
            const tableSelectors = [
                'table.items tbody tr',
                '#yw1 table tbody tr',
                '.responsive-table table tbody tr',
                'div.responsive-table tbody tr'
            ];
            let rows = [];
            for (const sel of tableSelectors) {
                const found = document.querySelectorAll(sel);
                if (found.length > 2) { rows = Array.from(found); break; }
            }

            const result = [];
            rows.forEach(row => {
                // Saltar filas de separador/espacio
                if (row.classList.contains('spacer') || row.classList.contains('bg_Rahmen_hell2')) return;

                // Nombre del jugador — múltiples selectores
                const nombre_el = row.querySelector('.hauptlink a') ||
                                  row.querySelector('td.posrela + td a') ||
                                  row.querySelector('td:nth-child(2) .hauptlink a');
                if (!nombre_el) return;
                const nombre = nombre_el.textContent.trim();
                if (!nombre || nombre.length < 2) return;

                const tds = row.querySelectorAll('td');
                if (tds.length < 3) return;

                // Dorsal
                const dorsal_el = row.querySelector('.rn_nummer') || tds[0];
                const dorsal_txt = dorsal_el ? dorsal_el.textContent.trim() : '';
                const dorsal = /^\\d{1,2}$/.test(dorsal_txt) ? parseInt(dorsal_txt) : null;

                // Posición — buscar en tabla interna de posrela o en cualquier td
                const pos_el = row.querySelector('td.posrela table td:last-child') ||
                               row.querySelector('.posrela td') ||
                               row.querySelector('td[data-title="Posición"]');
                let posicion = pos_el ? pos_el.textContent.trim() : '';

                // Si no encontró posición, intentar adivinar desde otro td
                if (!posicion) {
                    const posTds = Array.from(tds).filter(td => {
                        const t = td.textContent.trim();
                        return t.includes('Portero') || t.includes('Defensa') || t.includes('Centrocampista') ||
                               t.includes('Delantero') || t.includes('Extremo') || t.includes('Mediapunta') ||
                               t.includes('Lateral') || t.includes('Mediocentro');
                    });
                    if (posTds.length) posicion = posTds[0].textContent.trim();
                }

                // Nacionalidad — imagen de bandera
                const flag_el = row.querySelector('.flaggenrahmen') || row.querySelector('img[title]');
                const nac = flag_el ? (flag_el.getAttribute('title') || '') : '';

                // Edad — buscar td con número de 2 dígitos que sea razonable (15-45)
                let edad = null;
                tds.forEach(td => {
                    const txt = td.textContent.trim();
                    const n = parseInt(txt);
                    if (/^\\d{2}$/.test(txt) && n >= 15 && n <= 45) edad = n;
                });

                // Valor de mercado
                const valor_el = row.querySelector('.rechts.hauptlink a') ||
                                 row.querySelector('td.rechts a') ||
                                 row.querySelector('[data-title="Valor de mercado"] a');
                const valor = valor_el ? valor_el.textContent.trim() : '-';

                // Foto
                const foto_el = row.querySelector('img.bilderrahmen-fixed') ||
                                row.querySelector('img[class*="bilderrahmen"]') ||
                                row.querySelector('td img:not(.flaggenrahmen)');
                const foto = foto_el ? (foto_el.getAttribute('data-src') || foto_el.getAttribute('src') || null) : null;

                if (nombre) result.push({ nombre, dorsal, posicion, nac, edad, valor, foto });
            });
            return result;
        }
        """)

        log(f"    → {len(jugadores)} jugadores encontrados")

        # Si da 0, intentar buscar URL automáticamente
        if len(jugadores) == 0:
            log(f"    → Intentando búsqueda automática...")
            url_auto = buscar_url_equipo(page, nombre_equipo)
            if url_auto and url_auto != url:
                page.goto(url_auto, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(5000)
                try:
                    page.wait_for_selector('table.items, .responsive-table table', timeout=8000)
                except:
                    pass
                jugadores = page.evaluate("""() => {
                    const tableSelectors = ['table.items tbody tr', '#yw1 table tbody tr', '.responsive-table table tbody tr'];
                    let rows = [];
                    for (const sel of tableSelectors) {
                        const found = document.querySelectorAll(sel);
                        if (found.length > 2) { rows = Array.from(found); break; }
                    }
                    const result = [];
                    rows.forEach(row => {
                        if (row.classList.contains('spacer') || row.classList.contains('bg_Rahmen_hell2')) return;
                        const nombre_el = row.querySelector('.hauptlink a');
                        if (!nombre_el) return;
                        const nombre = nombre_el.textContent.trim();
                        if (!nombre || nombre.length < 2) return;
                        const tds = row.querySelectorAll('td');
                        const dorsal_el = row.querySelector('.rn_nummer') || tds[0];
                        const dorsal_txt = dorsal_el ? dorsal_el.textContent.trim() : '';
                        const dorsal = /^\\d{1,2}$/.test(dorsal_txt) ? parseInt(dorsal_txt) : null;
                        const pos_el = row.querySelector('td.posrela table td:last-child') || row.querySelector('.posrela td');
                        const posicion = pos_el ? pos_el.textContent.trim() : '';
                        const flag_el = row.querySelector('.flaggenrahmen');
                        const nac = flag_el ? (flag_el.getAttribute('title') || '') : '';
                        let edad = null;
                        tds.forEach(td => { const n = parseInt(td.textContent.trim()); if (n >= 15 && n <= 45 && /^\\d{2}$/.test(td.textContent.trim())) edad = n; });
                        const valor_el = row.querySelector('.rechts.hauptlink a');
                        const valor = valor_el ? valor_el.textContent.trim() : '-';
                        const foto_el = row.querySelector('img.bilderrahmen-fixed') || row.querySelector('img[class*="bilderrahmen"]');
                        const foto = foto_el ? (foto_el.getAttribute('data-src') || foto_el.getAttribute('src') || null) : null;
                        result.push({ nombre, dorsal, posicion, nac, edad, valor, foto });
                    });
                    return result;
                }""")
                log(f"    → Auto-búsqueda: {len(jugadores)} jugadores")
        return jugadores

    except Exception as e:
        log(f"    ERROR scrapeando {nombre_equipo}: {e}")
        return []

def ejecutar(solo_vacios=False, visible=False):
    log("=" * 55)
    log("CancharaNet — Scraper de Planteles (Transfermarkt)")
    if visible:
        log("  Modo: browser VISIBLE (evita anti-bot)")
    log("=" * 55)

    # Si solo-vacios, cargar JSON existente y filtrar
    existente = {}
    if solo_vacios:
        ruta_json = os.path.join(DATA_DIR, "planteles.json")
        if os.path.exists(ruta_json):
            with open(ruta_json, encoding="utf-8") as f:
                data_prev = json.load(f)
                existente = data_prev.get("equipos", {})
            log(f"  Modo solo-vacíos: cargando {len(existente)} equipos previos")

    resultado = dict(existente)  # Empezar con los existentes
    total_ok = 0

    with sync_playwright() as pw:
        navegador = pw.chromium.launch(
            headless=not visible,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ]
        )
        ctx = navegador.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="es-AR",
            viewport={"width": 1366, "height": 768},
            java_script_enabled=True,
            extra_http_headers={
                "Accept-Language": "es-AR,es;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            }
        )
        # Ocultar señales de webdriver
        ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = ctx.new_page()

        equipos_lista = list(EQUIPOS_TM.items())
        for idx, (nombre, (slug, tm_id)) in enumerate(equipos_lista, 1):
            # En modo solo-vacios, saltar equipos que ya tienen datos
            if solo_vacios and nombre in existente and existente[nombre].get("total", 0) > 5:
                log(f"[{idx}/{len(equipos_lista)}] {nombre} — ya tiene {existente[nombre]['total']} jugadores, salteando")
                total_ok += 1
                continue

            log(f"[{idx}/{len(equipos_lista)}] {nombre}")
            jugadores = scrape_plantel(page, nombre, slug, tm_id)

            # Ordenar por posición y dorsal
            POS_ORDEN = {"PO": 0, "DC": 1, "DF": 2, "LD": 3, "LI": 4,
                         "MCD": 5, "MC": 6, "MP": 7, "ED": 8, "EI": 9,
                         "DC2": 10, "DL": 11, "SD": 12}

            def orden_jugador(j):
                pos_corta = POSICIONES_MAP.get(j.get("posicion", ""), "ZZ")
                return (POS_ORDEN.get(pos_corta, 99), j.get("dorsal") or 99)

            jugadores.sort(key=orden_jugador)

            resultado[nombre] = {
                "nombre": nombre,
                "jugadores": jugadores,
                "total": len(jugadores),
                "actualizado": datetime.now().isoformat()
            }

            if jugadores:
                total_ok += 1

            # Guardar progresivamente después de cada equipo
            guardar_json("planteles.json", {
                "actualizado": datetime.now().isoformat(),
                "temporada": "2025/2026",
                "equipos": resultado
            })

            # Pequeña pausa para no sobrecargar Transfermarkt
            time.sleep(2)

        navegador.close()

    guardar_json("planteles.json", {
        "actualizado": datetime.now().isoformat(),
        "temporada": "2025/2026",
        "equipos": resultado
    })

    log("=" * 55)
    log(f"✓ Planteles guardados: {total_ok}/{len(EQUIPOS_TM)} equipos")
    log(f"Archivo: {os.path.join(DATA_DIR, 'planteles.json')}")
    log("=" * 55)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CancharaNet — Scraper Planteles")
    parser.add_argument("--solo-vacios", action="store_true", help="Solo scraper equipos con 0 jugadores")
    parser.add_argument("--visible",     action="store_true", help="Abrir browser visible (evita anti-bot de Transfermarkt)")
    args = parser.parse_args()
    ejecutar(solo_vacios=args.solo_vacios, visible=args.visible)
