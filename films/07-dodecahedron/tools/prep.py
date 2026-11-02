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
paper('vitruvius', 'loc_vitruvius1521.jpg', (70, 0, 2270, 3284), 410)     # NA2515 .V8 1521, 41 cm (fol.)
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
