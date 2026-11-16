# Gera os ícones do Android (launcher, round, foreground adaptativo) e a splash escura.
import os
from PIL import Image, ImageDraw
RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
PURPLE = (168, 85, 247, 255)

def glyph(draw, size, scale_box, offset):
    # desenho do favicon (viewBox 240) escalado para caber em "size"
    k = size / 240.0 * scale_box
    ox = offset
    def box(x, y, w, h):
        x0, y0 = ox + (60 + x * 5) * k, ox + (60 + y * 5) * k
        draw.rounded_rectangle((x0, y0, x0 + w * 5 * k, y0 + h * 5 * k), radius=int(5 * k), outline='white', width=max(2, int(10 * k)))
    box(3, 3, 7, 9); box(14, 3, 7, 5); box(14, 12, 7, 9); box(3, 16, 7, 5)

def full_icon(S, rounded_shape):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded_shape == 'circle':
        d.ellipse((0, 0, S - 1, S - 1), fill=PURPLE)
    else:
        d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.25), fill=PURPLE)
    glyph(d, S, 1.0, 0)
    return im

def foreground(S):
    # camada adaptativa 108dp: conteúdo na zona segura (66dp ≈ 61%)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    inner = 0.56
    glyph(d, S, inner, S * (1 - inner) / 2)
    return im

sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for dens, px in sizes.items():
    folder = os.path.join(RES, f'mipmap-{dens}')
    full_icon(px * 4, 'square').resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
    full_icon(px * 4, 'circle').resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_round.png'))
    fpx = int(px * 108 / 48)
    foreground(fpx * 2).resize((fpx, fpx), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'))

with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#A855F7</color>\n</resources>\n')

# splash: fundo escuro do app (#020617) com o ícone ao centro
for root, _, files in os.walk(RES):
    for name in files:
        if name == 'splash.png':
            p = os.path.join(root, name)
            w, h = Image.open(p).size
            im = Image.new('RGBA', (w, h), (2, 6, 23, 255))
            ic = full_icon(512, 'square').resize((int(min(w, h) * 0.28),) * 2, Image.LANCZOS)
            im.paste(ic, ((w - ic.width) // 2, (h - ic.height) // 2), ic)
            im.convert('RGB').save(p)
print('icones android ok')
