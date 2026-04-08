"""
Inspector de partidos — guarda la estructura real del texto de Promiedos
para la sección de fixture/partidos
"""
import os
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(__file__), "debug", "partidos_debug.txt")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

with sync_playwright() as pw:
    nav = pw.chromium.launch(headless=True)
    ctx = nav.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    page = ctx.new_page()
    page.goto("https://www.promiedos.com.ar/league/liga-profesional/hc", wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    texto = page.inner_text("body")
    lineas = [l.strip() for l in texto.split("\n") if l.strip()]
    nav.close()

lines_out = []
lines_out.append(f"Total lineas: {len(lineas)}\n")

# Buscar secciones clave
lines_out.append("=== LINEAS CON FIXTURE / FECHA / APERTURA ===\n")
for idx, l in enumerate(lineas):
    if any(x in l.upper() for x in ["FIXTURE", "FECHA", "APERTURA", "CLAUSURA"]):
        lines_out.append(f"[{idx}]: {repr(l)}\n")

# Mostrar desde linea 250 al final
lines_out.append("\n=== LINEAS 250 AL FINAL ===\n")
for idx in range(250, len(lineas)):
    lines_out.append(f"[{idx}]: {repr(lineas[idx])}\n")

with open(OUT, "w", encoding="utf-8") as f:
    f.writelines(lines_out)

print(f"Guardado en: {OUT}")
print(f"Total lineas: {len(lineas)}")
# Imprimir las primeras 10 de la seccion de fixture
for idx, l in enumerate(lineas):
    if any(x in l.upper() for x in ["FIXTURE", "APERTURA"]):
        print(f"  ENCONTRADO [{idx}]: {repr(l)}")
        for j in range(idx, min(len(lineas), idx+30)):
            print(f"    [{j}]: {repr(lineas[j])}")
        break
