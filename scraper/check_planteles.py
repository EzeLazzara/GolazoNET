import json, os
ruta = os.path.join(os.path.dirname(__file__), '..', 'data', 'planteles.json')
d = json.load(open(ruta, encoding='utf-8'))
print(f"Actualizado: {d.get('actualizado','?')}")
print(f"Total equipos: {len(d['equipos'])}\n")
vacios = []
for k, v in d['equipos'].items():
    t = v.get('total', 0)
    estado = '✓' if t > 10 else ('⚠' if t > 0 else '✗')
    print(f"  {estado} {k}: {t} jugadores")
    if t == 0:
        vacios.append(k)
print(f"\nEquipos con 0 jugadores ({len(vacios)}): {', '.join(vacios)}")
