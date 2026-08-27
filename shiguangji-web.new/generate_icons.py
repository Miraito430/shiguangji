"""Generate PWA app icons: cream bg + green rounded square + white fork & knife.
Outputs icon-192, icon-512, icon-1024, apple-touch-icon (180)."""
import math, struct, zlib, os

def sdf_round_rect(px, py, cx, cy, hw, hh, r):
    """Signed distance to rounded rect. Negative = inside."""
    qx = abs(px - cx) - (hw - r)
    qy = abs(py - cy) - (hh - r)
    ax = max(qx, 0.0); ay = max(qy, 0.0)
    d = math.hypot(ax, ay) + min(max(qx, qy), 0.0) - r
    return d

def sdf_rounded_rect(px, py, x1, y1, x2, y2, r):
    return sdf_round_rect(px, py, (x1+x2)/2, (y1+y2)/2, (x2-x1)/2, (y2-y1)/2, r)

def make_icon(size):
    bg = (250, 247, 241)  # cream
    green = (107, 154, 123)
    white = (255, 255, 255)
    S = size
    m = int(S * 0.16)  # margin
    rr = int(S * 0.22)  # corner radius
    # fork
    cx_f = int(S * 0.402)
    # knife
    cx_k = int(S * 0.590)
    # center y offsets
    prong_top = int(S * 0.293)
    prong_bot = int(S * 0.386)
    neck_bot = int(S * 0.527)
    handle_bot = int(S * 0.781)
    pw = max(1, int(S * 0.0078))  # prong width ~8
    pg = max(1, int(S * 0.0059))  # prong gap ~6
    nw = max(1, int(S * 0.0078))  # neck width
    hw = max(1, int(S * 0.0234))  # handle width
    kw = max(1, int(S * 0.0312))  # knife width
    kh = max(1, int(S * 0.0234))  # knife handle width
    r = max(1, int(S * 0.014))   # general corner radius

    img = bytearray(bg * (S * S))
    for y in range(S):
        for x in range(S):
            # green rounded rect
            d = sdf_rounded_rect(x, y, m, m, S-m, S-m, rr)
            if d <= 0:
                # AA: inner = full color, edge = blend with bg
                a = max(0.0, min(1.0, 0.5 - d))
                r0, g0, b0 = green
                inside_fork = False
                # prong 1
                px1 = cx_f - 2*pw - pg - pw//2
                if sdf_rounded_rect(x, y, px1, prong_top, px1+pw, prong_bot, max(1,r-1)) <= 0: inside_fork = True
                # prong 2
                px2 = cx_f - pw//2
                if sdf_rounded_rect(x, y, px2, prong_top, px2+pw, prong_bot, max(1,r-1)) <= 0: inside_fork = True
                # prong 3
                px3 = cx_f + pw//2 + pg
                if sdf_rounded_rect(x, y, px3, prong_top, px3+pw, prong_bot, max(1,r-1)) <= 0: inside_fork = True
                # prong 4
                px4 = cx_f + 2*pw + pg + pw//2
                if sdf_rounded_rect(x, y, px4, prong_top, px4+pw, prong_bot, max(1,r-1)) <= 0: inside_fork = True
                # neck
                if sdf_rounded_rect(x, y, cx_f-nw//2, prong_bot, cx_f+nw//2, neck_bot, r) <= 0: inside_fork = True
                # handle
                if sdf_rounded_rect(x, y, cx_f-hw//2, neck_bot, cx_f+hw//2, handle_bot, r) <= 0: inside_fork = True

                inside_knife = False
                # blade
                if sdf_rounded_rect(x, y, cx_k-kw//2, prong_top, cx_k+kw//2, neck_bot, r) <= 0: inside_knife = True
                # handle
                if sdf_rounded_rect(x, y, cx_k-kh//2, neck_bot, cx_k+kh//2, handle_bot, r) <= 0: inside_knife = True

                if inside_fork or inside_knife:
                    r0, g0, b0 = white
                idx = (y * S + x) * 3
                img[idx] = int(r0 * a + bg[0] * (1 - a))
                img[idx+1] = int(g0 * a + bg[1] * (1 - a))
                img[idx+2] = int(b0 * a + bg[2] * (1 - a))
    return bytes(img)

def write_png(path, size):
    raw = make_icon(size)
    # RGBA conversion: RGB → RGBA (full opaque)
    rgba = bytearray()
    for i in range(0, len(raw), 3):
        rgba.extend(raw[i:i+3])
        rgba.append(255)
    # PNG header
    def chunk(ctype, data):
        c = ctype + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA, 6=RGBA
    # IDAT: filter byte 0 first, then raw zlib
    raw_rows = bytearray()
    for y in range(size):
        raw_rows.append(0)  # filter none
        raw_rows.extend(rgba[y*size*4:(y+1)*size*4])
    compressed = zlib.compress(raw_rows)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    print(f"  Created {path}  ({size}x{size})")

out_dir = os.path.join(os.path.dirname(__file__) or '.', 'icons')
os.makedirs(out_dir, exist_ok=True)
write_png(os.path.join(out_dir, 'icon-192.png'), 192)
write_png(os.path.join(out_dir, 'icon-512.png'), 512)
write_png(os.path.join(out_dir, 'icon-1024.png'), 1024)
write_png(os.path.join(out_dir, 'apple-touch-icon.png'), 180)
print("Done generating icons.")