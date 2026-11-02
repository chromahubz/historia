"""Textures for the light table: python -I tools/prep.py <film_dir>
Reads assets/raw/*, writes assets/tex/<id>.jpg|png and assets/tex/items.json:
  {id: {file, w, h, mm}}  where mm = real millimetres per texture pixel (true scale on the table).
Papers are cropped to the page; objects (coins, dodecahedra) are cut out of their studio background
(colour distance from the border, largest component, holes filled, feathered edge) and saved with alpha."""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
RAW, TEX = os.path.join(D, 'assets/raw'), os.path.join(D, 'assets/tex')
os.makedirs(TEX, exist_ok=True)
items = {}


def paper(id_, src, box, height_mm, maxdim=3000):
    im = Image.open(os.path.join(RAW, src)).convert('RGB').crop(box)
    s = min(1, maxdim / max(im.size)); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.save(os.path.join(TEX, id_ + '.jpg'), quality=90)
    items[id_] = dict(file=id_ + '.jpg', w=im.width, h=im.height, mm=height_mm / im.height, scale=s, box=box)


def cutout(id_, src, size_mm, axis='w', thr=None, maxdim=2400, holes=True, chroma=None, circle=False):
    """size_mm: the object's real size along its mask's width ('w') or height ('h')."""
    im = Image.open(os.path.join(RAW, src)).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    b = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(b, 0); sd = np.percentile(np.linalg.norm(b - bg, axis=1), 99)
    dist = ndi.gaussian_filter(np.linalg.norm(a - bg, axis=2), 1.5)
    m = dist > (thr if thr is not None else max(0.06, sd * 2.2))
    if chroma is not None:                                    # coloured metal vs a neutral studio shadow
        m &= ndi.gaussian_filter(a.max(2) - a.min(2), 2) > chroma
    m = ndi.binary_opening(m, iterations=2)
    lab, n = ndi.label(m)
    if n == 0: raise SystemExit(f'{id_}: nothing found against the background')
    m = lab == (np.argmax(ndi.sum(m, lab, range(1, n + 1))) + 1)
    if holes: m = ndi.binary_fill_holes(m)
    if circle:                                                # a coin: the largest inscribed disc (drops the shadow crescent)
        e = ndi.distance_transform_edt(m); cy, cx = np.unravel_index(np.argmax(e), e.shape); r = e[cy, cx]
        yy, xx = np.ogrid[:m.shape[0], :m.shape[1]]; m = (yy - cy) ** 2 + (xx - cx) ** 2 <= (r * 1.01) ** 2
    m = ndi.binary_erosion(m, iterations=2)
    ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    pad = 12; x0, y0 = max(0, x0 - pad), max(0, y0 - pad); x1, y1 = min(a.shape[1], x1 + pad), min(a.shape[0], y1 + pad)
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
    rgba = im.copy(); rgba.putalpha(alpha); rgba = rgba.crop((x0, y0, x1, y1))
    s = min(1, maxdim / max(rgba.size)); rgba = rgba.resize((round(rgba.width * s), round(rgba.height * s)), Image.LANCZOS)
    obj_px = (xs.max() - xs.min() + 1) if axis == 'w' else (ys.max() - ys.min() + 1)
    rgba.save(os.path.join(TEX, id_ + '.png'))
    items[id_] = dict(file=id_ + '.png', w=rgba.width, h=rgba.height, mm=size_mm / (obj_px * s), scale=float(s))
    print(id_, rgba.size, f'{size_mm / (obj_px * s):.4f} mm/px')


# --- papers (Library of Congress, public domain); heights from the LoC records (leaf height)
paper('vitruvius', 'loc_vitruvius1521.jpg', (0, 0, 2140, 3230), 410)      # NA2515 .V8 1521, 41 cm (fol.); the table of chapters
paper('vegetius', 'loc_vegetius1475.jpg', (45, 120, 1740, 2690), 290)      # Incun. X .V37, 29 cm
paper('apicius', 'loc_apicius1498.jpg', (40, 0, 1690, 2593), 197)         # Incun. 1498 .A6, 19.7 cm
# --- coins (The Met, Open Access / public domain); diameters from the Met records
cutout('coin_trajan', 'met_248043.jpg', 34, chroma=0.10)                               # 08.170.121, 3.4 cm
cutout('coin_titus', 'met_248039.jpg', 34, circle=True)                                # 08.170.117, 3.4 cm
cutout('coin_gallus', 'met_247169.jpg', 27, axis='h', thr=0.18)                   # 05.47, H 2.7 cm
# --- dodecahedra (Wikimedia Commons: CC0 / CC0 / CC BY 2.0), when downloaded
OPT = [('dod_hunt', 'wm_hunt_hcm157.jpg', 49, 'h'),           # Hunt Museum HCM 157, H 4.9 cm
       ('dod_tongeren', 'wm_tongeren_4002.jpg', None, 'w'),    # Gallo-Roman Museum Tongeren 4002; size not on record
       ('dod_hadham', 'wm_muchhadham.jpg', 82, 'w')]           # PAS 941889, 82 mm
for id_, src, mm, ax in OPT:
    if os.path.exists(os.path.join(RAW, src)):
        cutout(id_, src, mm or 60, ax)                        # unknown size: placed at 60 mm, never labelled
        if mm is None: items[id_]['size_unknown'] = True
json.dump(items, open(os.path.join(TEX, 'items.json'), 'w'), indent=1)
print('items:', ', '.join(items))

# ---------------- v2: the three worlds (Archive Room, Orbit, Studio 3D) ----------------
def resized(src, out, maxdim, q=88):
    p = os.path.join(RAW, src)
    if not os.path.exists(p): return
    im = Image.open(p).convert('RGB'); s = min(1, maxdim / max(im.size))
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS); im.save(os.path.join(TEX, out), quality=q)
    return im.size
# Met paintings and reliefs (Open Access, CC0); the relief is cut out of its studio grey
items['fresco'] = dict(file='fresco.jpg', size=resized('met_247008.jpg', 'fresco.jpg', 3000), w_mm=2718, h_mm=1956)
cutout('relief', 'met_255013.jpg', 677, thr=0.08)                          # 59.11.19, L. 67.7 cm
# satellite plates (EPSG:4326 boxes: lon0, lat0, lon1, lat1) and surface textures, copied as they are
PLATES = {'europe': ('gibs_europe.jpg', [-14, 34, 32, 62]), 'england': ('s2_england.jpg', [-2.0, 50.8, 2.0, 53.0]),
          'herts': ('s2_herts.jpg', [-0.3, 51.65, 0.45, 52.1]), 'hadham': ('s2_hadham.jpg', [0.02, 51.83, 0.13, 51.895]),
          'limerick': ('s2_limerick.jpg', [-9.3, 52.4, -8.1, 52.95])}
for k, (src, box) in PLATES.items():
    sz = resized(src, f'sat_{k}.jpg', 4096, 90); items[f'sat_{k}'] = dict(file=f'sat_{k}.jpg', size=sz, box=box)
for t in ('wood_table_worn', 'velour_velvet', 'red_plaster_weathered', 'farm_soil'):
    for m in ('diff', 'nor_gl', 'rough', 'disp'):
        if os.path.exists(os.path.join(RAW, f'ph_{t}_{m}.jpg')): resized(f'ph_{t}_{m}.jpg', f'ph_{t}_{m}.jpg', 2048, 90)
# country outlines (Natural Earth 1:50m, public domain): the countries with finds, and Italy
gj = json.load(open(os.path.join(RAW, 'ne_countries.geojson')))
WANT = ['United Kingdom', 'France', 'Belgium', 'Netherlands', 'Germany', 'Luxembourg', 'Switzerland', 'Austria', 'Hungary', 'Italy']
out = {}
for f in gj['features']:
    n = f['properties']['NAME']
    if n not in WANT: continue
    g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    rings = [[[round(x, 3), round(y, 3)] for x, y in poly[0]] for poly in polys if any(-14 < x < 32 and 34 < y < 62 for x, y in poly[0])]
    out[n] = [r for r in rings if len(r) > 6]
json.dump(out, open(os.path.join(TEX, 'countries.json'), 'w'))
json.dump(items, open(os.path.join(TEX, 'items.json'), 'w'), indent=1)
print('v2 assets:', len(out), 'countries,', ', '.join(k for k in items if k.startswith('sat_') or k in ('fresco', 'relief')))
# the Tongeren photo: the white studio backdrop seen through its holes becomes transparent (bright, colourless,
# connected areas inside the outline), so the object can stand on dark velvet
p = os.path.join(TEX, 'dod_tongeren.png')
if os.path.exists(p):
    im = np.asarray(Image.open(p)).astype(np.float32) / 255
    rgb, al = im[..., :3], im[..., 3]
    bright = (rgb.min(2) > 0.95) & ((rgb.max(2) - rgb.min(2)) < 0.035) & (al > 0.5)
    lab, n = ndi.label(bright); sizes = ndi.sum(bright, lab, range(1, n + 1))
    HOLES = [(0.62, 0.46, 0.10), (0.23, 0.44, 0.14), (0.45, 0.80, 0.11), (0.72, 0.72, 0.07), (0.86, 0.42, 0.06)]   # hole centres (fractions, measured on the photo)
    com = ndi.center_of_mass(bright, lab, range(1, n + 1)); Hh, Ww = al.shape
    keep = [i + 1 for i, (s, (cy, cx)) in enumerate(zip(sizes, com)) if s > 400 and any((cx / Ww - u) ** 2 + (cy / Hh - v) ** 2 < r * r for u, v, r in HOLES)]
    holes = np.isin(lab, keep)
    holes = ndi.binary_dilation(holes, iterations=2)
    al = np.where(holes, 0, al); al = ndi.gaussian_filter(al, 0.8)
    out = np.dstack([rgb, al]); Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(TEX, 'dod_tongeren_holes.png'))
    print('tongeren: holes cleared,', int(holes.sum()), 'px')
