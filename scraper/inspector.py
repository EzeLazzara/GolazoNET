"""
=============================================================
  CANCHARANET - INSPECTOR DE PROMIEDOS
=============================================================
  Herramienta de diagnóstico. Abre Promiedos y guarda el
  HTML renderizado para que puedas ver la estructura real
  y ajustar el parser del scraper.

  Uso:
      python inspector.py

  Genera:
      scraper/debug/promiedos_html.txt   → HTML completo renderizado
      scraper/debug/promiedos_texto.txt  → Solo el texto visible
      scraper/debug/clases_css.txt       → Todas las clases CSS usadas
=============================================================
"""

import os
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from datetime import datetime

BASE_URL  = "https://www.promiedos.com.ar/league/liga-profesional/hc"
DEBUG_DIR = os.path.join(os.path.dirname(__file__), "debug")

def guardar(nombre, contenido):
    os.makedirs(DEBUG_DIR, exist_ok=True)
    ruta = os.path.join(DEBUG_DIR, nombre)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(contenido)
    print(f"Guardado: {ruta}")

def inspeccionar():
    print(f"[Inspector] Abriendo {BASE_URL} ...")
    print("[Inspector] Esperando que cargue el JavaScript...")

    with sync_playwright() as pw:
        navegador = pw.chromium.launch(headless=True)
        page = navegador.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page.goto(BASE_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)  # 5 segundos para que cargue todo

        html = page.content()
        navegador.close()

    print("[Inspector] Página cargada. Analizando...")
    soup = BeautifulSoup(html, "html.parser")

    # 1. HTML completo
    guardar("promiedos_html.txt", soup.prettify())

    # 2. Solo texto visible
    texto_visible = soup.get_text(separator="\n", strip=True)
    guardar("promiedos_texto.txt", texto_visible)

    # 3. Todas las clases CSS encontradas
    clases = set()
    for tag in soup.find_all(True):
        for clase in tag.get("class", []):
            clases.add(clase)
    guardar("clases_css.txt", "\n".join(sorted(clases)))

    # 4. Mostrar preview del texto en consola
    print("\n" + "="*60)
    print("PREVIEW DEL TEXTO EXTRAÍDO (primeras 100 líneas):")
    print("="*60)
    lineas = texto_visible.split("\n")
    lineas_limpias = [l for l in lineas if l.strip()]
    for linea in lineas_limpias[:100]:
        print(linea)

    print("\n" + "="*60)
    print(f"Total clases CSS encontradas: {len(clases)}")
    print("="*60)
    print("\nAbrí los archivos en scraper/debug/ para ver la estructura completa.")

if __name__ == "__main__":
    inspeccionar()
