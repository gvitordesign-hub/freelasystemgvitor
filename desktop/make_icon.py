# Gera build/icon.png (512) e build/icon.ico a partir do desenho do favicon.svg
from PIL import Image, ImageDraw
S = 1024
im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 60 / 240), fill=(168, 85, 247, 255))
k = S / 240.0
def box(x, y, w, h):
    # viewBox 240, grupo em translate(60,60) scale(5)
    x0, y0 = (60 + x * 5) * k, (60 + y * 5) * k
    d.rounded_rectangle((x0, y0, x0 + w * 5 * k, y0 + h * 5 * k), radius=int(5 * k), outline='white', width=int(10 * k))
box(3, 3, 7, 9); box(14, 3, 7, 5); box(14, 12, 7, 9); box(3, 16, 7, 5)
im.resize((512, 512), Image.LANCZOS).save('build/icon.png')
im.save('build/icon.ico', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
print('icones ok')
