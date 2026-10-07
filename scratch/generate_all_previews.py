import os
import sys
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_EMOJI = "C:/Windows/Fonts/seguiemj.ttf"

def get_font(size, bold=False):
    fp = FONT_BOLD if bold else FONT_REG
    try:
        return ImageFont.truetype(fp, int(size))
    except Exception:
        return ImageFont.load_default()

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def hex_to_rgba(h, alpha=255):
    r, g, b = hex_to_rgb(h)
    return (r, g, b, alpha)

def create_gradient(width, height, color_top, color_bot):
    base = Image.new('RGBA', (width, height))
    top_rgb = hex_to_rgb(color_top)
    bot_rgb = hex_to_rgb(color_bot)
    draw = ImageDraw.Draw(base)
    for y in range(height):
        r = y / height
        red = int(top_rgb[0] * (1 - r) + bot_rgb[0] * r)
        grn = int(top_rgb[1] * (1 - r) + bot_rgb[1] * r)
        blu = int(top_rgb[2] * (1 - r) + bot_rgb[2] * r)
        draw.line([(0, y), (width, y)], fill=(red, grn, blu, 255))
    return base

def add_ambient_orb(img, cx, cy, radius, color_hex, alpha=65):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=hex_to_rgba(color_hex, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius // 2))
    img.alpha_composite(overlay)

def draw_vector_icon(draw, icon_name, cx, cy, size, color):
    s = size / 2.0
    if icon_name == "home":
        draw.polygon([(cx, cy - s), (cx - s, cy), (cx + s, cy)], fill=color)
        draw.rectangle([cx - s * 0.75, cy, cx + s * 0.75, cy + s], fill=color)
        draw.rectangle([cx - s * 0.25, cy + s * 0.3, cx + s * 0.25, cy + s], fill=(255, 255, 255, 220))
    elif icon_name == "heart":
        draw.ellipse([cx - s, cy - s * 0.8, cx, cy + s * 0.2], fill=color)
        draw.ellipse([cx, cy - s * 0.8, cx + s, cy + s * 0.2], fill=color)
        draw.polygon([(cx - s * 0.95, cy - s * 0.1), (cx + s * 0.95, cy - s * 0.1), (cx, cy + s * 0.95)], fill=color)
    elif icon_name == "star":
        pts = []
        for i in range(10):
            angle = i * math.pi / 5 - math.pi / 2
            rad = s if i % 2 == 0 else s * 0.45
            pts.append((cx + rad * math.cos(angle), cy + rad * math.sin(angle)))
        draw.polygon(pts, fill=color)
    elif icon_name == "paw":
        draw.ellipse([cx - s * 0.65, cy - s * 0.2, cx + s * 0.65, cy + s * 0.8], fill=color)
        toes = [(-0.55, -0.65), (-0.2, -0.9), (0.2, -0.9), (0.55, -0.65)]
        tr = s * 0.28
        for dx, dy in toes:
            tx, ty = cx + dx * s, cy + dy * s
            draw.ellipse([tx - tr, ty - tr, tx + tr, ty + tr], fill=color)
    elif icon_name == "sparkle":
        draw.polygon([(cx, cy - s), (cx + s * 0.25, cy - s * 0.25), (cx + s, cy), (cx + s * 0.25, cy + s * 0.25),
                      (cx, cy + s), (cx - s * 0.25, cy + s * 0.25), (cx - s, cy), (cx - s * 0.25, cy - s * 0.25)], fill=color)
    elif icon_name == "services":
        qw = s * 0.75
        gap = s * 0.15
        draw.rounded_rectangle([cx - qw - gap, cy - qw - gap, cx - gap, cy - gap], radius=3, fill=color)
        draw.rounded_rectangle([cx + gap, cy - qw - gap, cx + qw + gap, cy - gap], radius=3, fill=color)
        draw.rounded_rectangle([cx - qw - gap, cy + gap, cx - gap, cy + qw + gap], radius=3, fill=color)
        draw.rounded_rectangle([cx + gap, cy + gap, cx + qw + gap, cy + qw + gap], radius=3, fill=color)
    elif icon_name == "feed":
        draw.rounded_rectangle([cx - s, cy - s * 0.8, cx + s, cy + s * 0.6], radius=int(s * 0.4), fill=color)
        draw.polygon([(cx - s * 0.5, cy + s * 0.4), (cx - s * 0.2, cy + s * 0.4), (cx - s * 0.6, cy + s * 0.9)], fill=color)
    elif icon_name == "profile":
        draw.ellipse([cx - s * 0.45, cy - s * 0.95, cx + s * 0.45, cy - s * 0.05], fill=color)
        draw.chord([cx - s * 0.95, cy - s * 0.1, cx + s * 0.95, cy + s * 1.3], start=180, end=360, fill=color)
    elif icon_name == "bookings":
        draw.rounded_rectangle([cx - s * 0.75, cy - s * 0.85, cx + s * 0.75, cy + s * 0.95], radius=4, fill=color)
        draw.rectangle([cx - s * 0.35, cy - s, cx + s * 0.35, cy - s * 0.7], fill=color)
        draw.line([(cx - s * 0.45, cy - s * 0.3), (cx + s * 0.45, cy - s * 0.3)], fill=(255, 255, 255), width=2)
        draw.line([(cx - s * 0.45, cy), (cx + s * 0.45, cy)], fill=(255, 255, 255), width=2)
        draw.line([(cx - s * 0.45, cy + s * 0.3), (cx + s * 0.2, cy + s * 0.3)], fill=(255, 255, 255), width=2)
    elif icon_name == "earnings":
        draw.rounded_rectangle([cx - s, cy - s * 0.65, cx + s, cy + s * 0.65], radius=6, fill=color)
        draw.rounded_rectangle([cx + s * 0.3, cy - s * 0.25, cx + s, cy + s * 0.25], radius=3, fill=(255, 255, 255, 180))
        draw.ellipse([cx + s * 0.55, cy - s * 0.1, cx + s * 0.75, cy + s * 0.1], fill=color)
    elif icon_name == "more":
        w = s * 0.8
        h = max(2, int(s * 0.18))
        draw.rounded_rectangle([cx - w, cy - s * 0.6, cx + w, cy - s * 0.6 + h], radius=2, fill=color)
        draw.rounded_rectangle([cx - w, cy - h // 2, cx + w, cy + h // 2], radius=2, fill=color)
        draw.rounded_rectangle([cx - w, cy + s * 0.6 - h, cx + w, cy + s * 0.6], radius=2, fill=color)
    elif icon_name == "shield":
        draw.polygon([(cx, cy - s), (cx + s * 0.85, cy - s * 0.6), (cx + s * 0.75, cy + s * 0.3), (cx, cy + s), (cx - s * 0.75, cy + s * 0.3), (cx - s * 0.85, cy - s * 0.6)], fill=color)
        draw.line([(cx - s * 0.3, cy), (cx - s * 0.05, cy + s * 0.25), (cx + s * 0.35, cy - s * 0.25)], fill=(255, 255, 255), width=3)
    elif icon_name == "check":
        draw.line([(cx - s * 0.5, cy), (cx - s * 0.1, cy + s * 0.4), (cx + s * 0.5, cy - s * 0.4)], fill=color, width=max(2, int(s * 0.3)))
    elif icon_name == "cross":
        draw.line([(cx - s * 0.5, cy - s * 0.5), (cx + s * 0.5, cy + s * 0.5)], fill=color, width=max(2, int(s * 0.3)))
        draw.line([(cx - s * 0.5, cy + s * 0.5), (cx + s * 0.5, cy - s * 0.5)], fill=color, width=max(2, int(s * 0.3)))
    elif icon_name == "video":
        draw.rounded_rectangle([cx - s * 0.85, cy - s * 0.55, cx + s * 0.3, cy + s * 0.55], radius=4, fill=color)
        draw.polygon([(cx + s * 0.35, cy - s * 0.35), (cx + s * 0.95, cy - s * 0.65), (cx + s * 0.95, cy + s * 0.65), (cx + s * 0.35, cy + s * 0.35)], fill=color)
    elif icon_name == "chat":
        draw.rounded_rectangle([cx - s * 0.8, cy - s * 0.6, cx + s * 0.8, cy + s * 0.4], radius=6, fill=color)
        draw.polygon([(cx - s * 0.4, cy + s * 0.3), (cx - s * 0.1, cy + s * 0.3), (cx - s * 0.5, cy + s * 0.8)], fill=color)
        draw.ellipse([cx - s * 0.4, cy - s * 0.15, cx - s * 0.2, cy + s * 0.05], fill=(255, 255, 255))
        draw.ellipse([cx - s * 0.1, cy - s * 0.15, cx + s * 0.1, cy + s * 0.05], fill=(255, 255, 255))
        draw.ellipse([cx + s * 0.2, cy - s * 0.15, cx + s * 0.4, cy + s * 0.05], fill=(255, 255, 255))
    elif icon_name == "trend":
        draw.line([(cx - s * 0.8, cy + s * 0.6), (cx - s * 0.2, cy), (cx + s * 0.2, cy + s * 0.3), (cx + s * 0.8, cy - s * 0.6)], fill=color, width=4)
        draw.polygon([(cx + s * 0.8, cy - s * 0.6), (cx + s * 0.4, cy - s * 0.6), (cx + s * 0.8, cy - s * 0.2)], fill=color)
    elif icon_name == "bell":
        draw.chord([cx - s * 0.6, cy - s * 0.6, cx + s * 0.6, cy + s * 0.6], start=180, end=360, fill=color)
        draw.rounded_rectangle([cx - s * 0.8, cy + s * 0.3, cx + s * 0.8, cy + s * 0.55], radius=3, fill=color)
        draw.ellipse([cx - s * 0.2, cy + s * 0.55, cx + s * 0.2, cy + s * 0.85], fill=color)
    elif icon_name == "van":
        draw.rounded_rectangle([cx - s, cy - s * 0.4, cx + s * 0.3, cy + s * 0.5], radius=4, fill=color)
        draw.polygon([(cx + s * 0.3, cy - s * 0.2), (cx + s * 0.8, cy), (cx + s * 0.8, cy + s * 0.5), (cx + s * 0.3, cy + s * 0.5)], fill=color)
        draw.ellipse([cx - s * 0.6, cy + s * 0.4, cx - s * 0.2, cy + s * 0.8], fill=(30, 30, 30))
        draw.ellipse([cx + s * 0.3, cy + s * 0.4, cx + s * 0.7, cy + s * 0.8], fill=(30, 30, 30))
    elif icon_name == "bowl":
        draw.chord([cx - s * 0.8, cy - s * 0.4, cx + s * 0.8, cy + s * 0.8], start=0, end=180, fill=color)
        draw.ellipse([cx - s * 0.8, cy - s * 0.4, cx + s * 0.8, cy], fill=color)
    elif icon_name == "rx":
        draw.rounded_rectangle([cx - s * 0.7, cy - s * 0.9, cx + s * 0.7, cy + s * 0.9], radius=4, fill=color)
        draw.line([(cx - s * 0.3, cy), (cx + s * 0.3, cy)], fill=(255, 255, 255), width=3)
        draw.line([(cx, cy - s * 0.3), (cx, cy + s * 0.3)], fill=(255, 255, 255), width=3)
    elif icon_name == "card":
        draw.rounded_rectangle([cx - s, cy - s * 0.6, cx + s, cy + s * 0.6], radius=4, fill=color)
        draw.rectangle([cx - s, cy - s * 0.2, cx + s, cy], fill=(255, 255, 255, 120))
    else:
        draw.ellipse([cx - s * 0.6, cy - s * 0.6, cx + s * 0.6, cy + s * 0.6], fill=color)

def load_or_crop_image(path, target_w, target_h, radius=0):
    if os.path.exists(path):
        try:
            im = Image.open(path).convert('RGBA')
            sw, sh = im.size
            scale = max(target_w / sw, target_h / sh)
            nw, nh = int(sw * scale), int(sh * scale)
            im = im.resize((nw, nh), Image.Resampling.LANCZOS)
            x_off = (nw - target_w) // 2
            y_off = (nh - target_h) // 2
            cropped = im.crop((x_off, y_off, x_off + target_w, y_off + target_h))
            if radius > 0:
                mask = Image.new('L', (target_w, target_h), 0)
                mdraw = ImageDraw.Draw(mask)
                mdraw.rounded_rectangle([0, 0, target_w, target_h], radius=radius, fill=255)
                res = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
                res.paste(cropped, (0, 0), mask)
                return res
            return cropped
        except Exception as e:
            print("Error loading image:", path, e)
    fb = Image.new('RGBA', (target_w, target_h), hex_to_rgba("#FFE5DF"))
    return fb

def create_phone_frame(screen_img):
    sw, sh = screen_img.size
    border = 18
    fw = sw + border * 2
    fh = sh + border * 2
    
    frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    
    fdraw.rounded_rectangle([0, 0, fw, fh], radius=62, fill=hex_to_rgb("#1C1E21"), outline=hex_to_rgb("#3E4347"), width=3)
    fdraw.rounded_rectangle([4, 4, fw - 4, fh - 4], radius=58, fill=hex_to_rgb("#0E1113"))
    
    screen_mask = Image.new('L', (sw, sh), 0)
    sdraw = ImageDraw.Draw(screen_mask)
    sdraw.rounded_rectangle([0, 0, sw, sh], radius=48, fill=255)
    frame.paste(screen_img, (border, border), screen_mask)
    
    di_w, di_h = 170, 36
    di_x = (fw - di_w) // 2
    di_y = border + 14
    fdraw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=di_h // 2, fill=(0, 0, 0, 255))
    fdraw.ellipse([di_x + 22, di_y + 10, di_x + 38, di_y + 26], fill=(15, 20, 25, 255), outline=(30, 45, 60, 255))
    fdraw.ellipse([di_x + di_w - 36, di_y + 12, di_x + di_w - 24, di_y + 24], fill=(12, 16, 20, 255))
    
    return frame

def apply_phone_with_shadow(canvas, frame_img, pos_x, pos_y):
    fw, fh = frame_img.size
    shadow_padding = 60
    shadow_layer = Image.new('RGBA', (fw + shadow_padding * 2, fh + shadow_padding * 2), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer)
    sdraw.rounded_rectangle([shadow_padding + 10, shadow_padding + 25, shadow_padding + fw - 10, shadow_padding + fh + 35], radius=64, fill=(20, 15, 10, 85))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(34))
    
    canvas.alpha_composite(shadow_layer, (pos_x - shadow_padding, pos_y - shadow_padding))
    canvas.alpha_composite(frame_img, (pos_x, pos_y))

def draw_status_bar(draw, w, dark_mode=False):
    font = get_font(18, bold=True)
    tc = (255, 255, 255) if dark_mode else (30, 30, 30)
    draw.text((42, 22), "9:41", font=font, fill=tc)
    for i in range(4):
        bx = w - 120 + i * 6
        by = 28 - i * 3
        draw.rectangle([bx, by, bx + 4, 32], fill=tc)
    draw.rounded_rectangle([w - 60, 21, w - 28, 33], radius=3, outline=tc, width=2)
    draw.rectangle([w - 56, 24, w - 36, 30], fill=tc)
    draw.rectangle([w - 26, 24, w - 24, 29], fill=tc)

def draw_bottom_home_bar(draw, w, h, dark_mode=False):
    bc = (255, 255, 255, 160) if dark_mode else (20, 20, 20, 160)
    bar_w, bar_h = 220, 6
    bx = (w - bar_w) // 2
    by = h - 16
    draw.rounded_rectangle([bx, by, bx + bar_w, by + bar_h], radius=3, fill=bc)

def draw_header_section(draw, cx, badge_text, badge_icon, badge_color, line1, color1, line2, color2, subtitle):
    b_font = get_font(21, bold=True)
    bbox = draw.textbbox((0, 0), badge_text, font=b_font)
    tw = bbox[2] - bbox[0]
    icon_space = 30 if badge_icon else 0
    pw = tw + icon_space + 46
    ph = 44
    by = 75
    draw.rounded_rectangle([cx - pw // 2, by, cx + pw // 2, by + ph], radius=ph // 2, fill=(255, 255, 255, 245), outline=hex_to_rgb(badge_color), width=2)
    
    start_x = cx - pw // 2 + 20
    if badge_icon:
        draw_vector_icon(draw, badge_icon, start_x + 10, by + ph // 2, 18, hex_to_rgb(badge_color))
        start_x += icon_space
    draw.text((start_x, by + 8), badge_text, font=b_font, fill=hex_to_rgb(badge_color))
    
    h_font = get_font(72, bold=True)
    b1 = draw.textbbox((0, 0), line1, font=h_font)
    draw.text((cx - (b1[2] - b1[0]) // 2, 138), line1, font=h_font, fill=hex_to_rgb(color1))
    
    b2 = draw.textbbox((0, 0), line2, font=h_font)
    draw.text((cx - (b2[2] - b2[0]) // 2, 224), line2, font=h_font, fill=hex_to_rgb(color2))
    
    s_font = get_font(31, bold=False)
    bs = draw.textbbox((0, 0), subtitle, font=s_font)
    draw.text((cx - (bs[2] - bs[0]) // 2, 318), subtitle, font=s_font, fill=hex_to_rgb("#475569"))

def draw_floating_badge(canvas, x, y, width, height, icon_name, title, sub, icon_bg="#F87B68"):
    card = Image.new('RGBA', (width + 60, height + 60), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle([30, 34, 30 + width, 34 + height], radius=22, fill=(20, 20, 25, 65))
    card = card.filter(ImageFilter.GaussianBlur(14))
    
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle([30, 30, 30 + width, 30 + height], radius=22, fill=(255, 255, 255, 248), outline=hex_to_rgb("#F0EAE1"), width=2)
    
    circ_size = 48
    cx = 30 + 16
    cy = 30 + (height - circ_size) // 2
    cdraw.ellipse([cx, cy, cx + circ_size, cy + circ_size], fill=hex_to_rgb(icon_bg))
    
    draw_vector_icon(cdraw, icon_name, cx + circ_size // 2, cy + circ_size // 2, 24, (255, 255, 255))
    
    tx = cx + circ_size + 14
    t_font = get_font(21, bold=True)
    s_font = get_font(16, bold=False)
    cdraw.text((tx, cy + 3), title, font=t_font, fill=hex_to_rgb("#0F172A"))
    cdraw.text((tx, cy + 27), sub, font=s_font, fill=hex_to_rgb("#64748B"))
    
    canvas.alpha_composite(card, (x - 30, y - 30))

def draw_user_bottom_nav(screen, active_tab="home"):
    sw, sh = screen.size
    ny = sh - 95
    nav = Image.new('RGBA', (sw, 95), (255, 255, 255, 255))
    ndraw = ImageDraw.Draw(nav)
    ndraw.line([(0, 0), (sw, 0)], fill=hex_to_rgb("#E5E7EB"), width=1)
    
    tabs = [
        ("home", "Home", "home"),
        ("match", "Matches", "heart"),
        ("services", "Services", "sparkle"),
        ("community", "Feed", "feed"),
        ("profile", "Profile", "profile")
    ]
    
    item_w = sw // len(tabs)
    for i, (k, label, icon_name) in enumerate(tabs):
        ix = i * item_w + item_w // 2
        is_active = (k == active_tab)
        color = hex_to_rgb("#F87B68" if is_active else "#94A3B8")
        
        draw_vector_icon(ndraw, icon_name, ix, 28, 22, color)
        f = get_font(15, bold=is_active)
        bbox = ndraw.textbbox((0, 0), label, font=f)
        tw = bbox[2] - bbox[0]
        ndraw.text((ix - tw // 2, 48), label, font=f, fill=color)
        if is_active:
            ndraw.ellipse([ix - 3, 72, ix + 3, 78], fill=color)
            
    screen.paste(nav, (0, ny))

def draw_vendor_bottom_nav(screen, active_tab="home"):
    sw, sh = screen.size
    ny = sh - 95
    nav = Image.new('RGBA', (sw, 95), (255, 255, 255, 255))
    ndraw = ImageDraw.Draw(nav)
    ndraw.line([(0, 0), (sw, 0)], fill=hex_to_rgb("#E2E8F0"), width=1)
    
    tabs = [
        ("home", "Dashboard", "services"),
        ("bookings", "Bookings", "bookings"),
        ("services", "Services", "sparkle"),
        ("earnings", "Earnings", "earnings"),
        ("more", "More", "more")
    ]
    
    item_w = sw // len(tabs)
    for i, (k, label, icon_name) in enumerate(tabs):
        ix = i * item_w + item_w // 2
        is_active = (k == active_tab)
        color = hex_to_rgb("#087F78" if is_active else "#94A3B8")
        
        draw_vector_icon(ndraw, icon_name, ix, 28, 22, color)
        f = get_font(15, bold=is_active)
        bbox = ndraw.textbbox((0, 0), label, font=f)
        tw = bbox[2] - bbox[0]
        ndraw.text((ix - tw // 2, 48), label, font=f, fill=color)
        if is_active:
            ndraw.ellipse([ix - 3, 72, ix + 3, 78], fill=color)
            
    screen.paste(nav, (0, ny))

# ==========================================
# SCREEN BUILDERS: USER MODULE
# ==========================================

def build_screen_user_01_home(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#FAF7F2"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Top Bar (Y: 65 - 130)
    logo_path = "frontend/public/tc-brand-mark.png"
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert('RGBA').resize((46, 46), Image.Resampling.LANCZOS)
        screen.paste(logo, (32, 68), logo)
    
    draw.text((88, 70), "Tail", font=get_font(28, bold=True), fill=hex_to_rgb("#F87B68"))
    draw.text((138, 70), "Circle", font=get_font(28, bold=True), fill=hex_to_rgb("#087F78"))
    
    # Location Pill
    draw.rounded_rectangle([sw - 280, 68, sw - 90, 114], radius=23, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw.text((sw - 265, 78), "South Delhi", font=get_font(18, bold=True), fill=hex_to_rgb("#374151"))
    draw.text((sw - 130, 80), "v", font=get_font(14, bold=True), fill=hex_to_rgb("#6B7280"))
    
    # Bell Notification icon
    draw.rounded_rectangle([sw - 74, 68, sw - 28, 114], radius=23, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw_vector_icon(draw, "bell", sw - 51, 91, 20, hex_to_rgb("#374151"))
    draw.ellipse([sw - 42, 72, sw - 32, 82], fill=hex_to_rgb("#EF4444"))
    
    # Search Bar (Y: 135 - 195)
    draw.rounded_rectangle([30, 135, sw - 30, 195], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#F0EAE1"), width=1)
    # Search icon
    draw.ellipse([54, 153, 68, 167], outline=hex_to_rgb("#9CA3AF"), width=2)
    draw.line([(65, 164), (73, 172)], fill=hex_to_rgb("#9CA3AF"), width=2)
    draw.text((82, 150), "Search vets, grooming, food, playdates...", font=get_font(20), fill=hex_to_rgb("#9CA3AF"))
    
    # Active Pet Selector Pill (Y: 210 - 295)
    draw.rounded_rectangle([30, 210, sw - 30, 295], radius=22, fill=(255, 255, 255), outline=hex_to_rgb("#FED7AA"), width=1)
    dog_icon = load_or_crop_image("frontend/public/assets/banners/best_matches.png", 62, 62, radius=31)
    screen.paste(dog_icon, (46, 222), dog_icon)
    draw.text((122, 222), "Bella", font=get_font(22, bold=True), fill=hex_to_rgb("#1F2937"))
    draw_vector_icon(draw, "paw", 188, 236, 16, hex_to_rgb("#F87B68"))
    draw.text((122, 254), "Golden Retriever • 2 yrs", font=get_font(16), fill=hex_to_rgb("#6B7280"))
    draw.rounded_rectangle([sw - 160, 230, sw - 50, 274], radius=15, fill=hex_to_rgba("#DCFCE7"), outline=hex_to_rgb("#86EFAC"), width=1)
    draw.text((sw - 146, 240), "Healthy ✓", font=get_font(16, bold=True), fill=hex_to_rgb("#166534"))
    
    # Hero Promo Banner (Y: 310 - 475)
    banner_bg = create_gradient(sw - 60, 165, "#FFE5DF", "#FFF5F2")
    bmask = Image.new('L', (sw - 60, 165), 0)
    bdraw = ImageDraw.Draw(bmask)
    bdraw.rounded_rectangle([0, 0, sw - 60, 165], radius=24, fill=255)
    screen.paste(banner_bg, (30, 310), bmask)
    
    bdraw2 = ImageDraw.Draw(screen)
    bdraw2.text((56, 328), "One place. Every tail.", font=get_font(28, bold=True), fill=hex_to_rgb("#111827"))
    bdraw2.text((56, 368), "20% OFF Your First Spa Session", font=get_font(18, bold=True), fill=hex_to_rgb("#F87B68"))
    bdraw2.text((56, 396), "Use code: FIRSTTAIL on checkout", font=get_font(15), fill=hex_to_rgb("#6B7280"))
    bdraw2.rounded_rectangle([56, 424, 210, 462], radius=18, fill=hex_to_rgb("#F87B68"))
    bdraw2.text((74, 432), "Book Now →", font=get_font(16, bold=True), fill=(255, 255, 255))
    
    # Clean transparent cut-out image of Golden Retriever & Pomeranian
    hero_img = load_or_crop_image("frontend/src/assets/dogImg-clean.png", 220, 150)
    screen.paste(hero_img, (sw - 250, 322), hero_img)
    
    # 8 Quick Service Tiles (Y: 495 - 805)
    tiles = [
        ("Grooming", "SPA", "frontend/public/assets/quick_links/grooming.png", "#599D9A", "#E6F4F3"),
        ("Find Vets", "VETS", "frontend/public/assets/quick_links/vet.png", "#087F78", "#E0F2FE"),
        ("Daycare", "STAY", "frontend/public/assets/quick_links/daycare.png", "#F87B68", "#FEF3C7"),
        ("Fresh Meals", "DIET", "frontend/public/assets/quick_links/meals.png", "#10B981", "#DCFCE7"),
        ("Meet & Match", "SOUL", "frontend/public/assets/quick_links/matches.png", "#EC4899", "#FCE7F3"),
        ("Pet Shop", "STORE", "frontend/public/assets/quick_links/shop.png", "#F59E0B", "#FEF9C3"),
        ("Community", "FEED", "frontend/public/assets/quick_links/community.png", "#8B5CF6", "#EDE9FE"),
        ("Adopt Pet", "LOVE", "frontend/public/assets/quick_links/adopt.png", "#3B82F6", "#DBEAFE")
    ]
    
    tile_w = (sw - 60 - 36) // 4
    tile_h = 142
    for i, (name, tag, img_p, accent, bg_c) in enumerate(tiles):
        col = i % 4
        row = i // 4
        tx = 30 + col * (tile_w + 12)
        ty = 495 + row * (tile_h + 14)
        
        draw.rounded_rectangle([tx, ty, tx + tile_w, ty + tile_h], radius=20, fill=hex_to_rgb(bg_c), outline=hex_to_rgb("#F0EAE1"), width=1)
        
        draw.rounded_rectangle([tx + 8, ty + 8, tx + 48, ty + 24], radius=8, fill=hex_to_rgb(accent))
        draw.text((tx + 12, ty + 9), tag, font=get_font(10, bold=True), fill=(255, 255, 255))
        
        q_img = load_or_crop_image(img_p, 56, 56, radius=12)
        screen.paste(q_img, (tx + (tile_w - 56) // 2, ty + 34), q_img)
        
        f_lbl = get_font(15, bold=True)
        b_l = draw.textbbox((0, 0), name, font=f_lbl)
        draw.text((tx + (tile_w - (b_l[2] - b_l[0])) // 2, ty + 104), name, font=f_lbl, fill=hex_to_rgb("#1F2937"))
    
    # Upcoming Appointment Card (Y: 825 - 955)
    draw.rounded_rectangle([30, 825, sw - 30, 955], radius=22, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw.text((52, 842), "UPCOMING BOOKING", font=get_font(13, bold=True), fill=hex_to_rgb("#F87B68"))
    draw.text((52, 868), "Full Bath & De-Shedding Spa Session", font=get_font(21, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((52, 902), "Tomorrow at 10:30 AM • Certified Groomer: Amit S. (4.9 ★)", font=get_font(16), fill=hex_to_rgb("#6B7280"))
    
    draw.rounded_rectangle([sw - 170, 840, sw - 52, 880], radius=15, fill=hex_to_rgba("#DCFCE7"), outline=hex_to_rgb("#86EFAC"), width=1)
    draw.text((sw - 156, 850), "Confirmed ✓", font=get_font(15, bold=True), fill=hex_to_rgb("#166534"))
    
    # Curated Treats & Shop Carousel (Y: 975 - 1280)
    draw.text((32, 975), "Popular Nutrition & Treats", font=get_font(22, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((sw - 120, 978), "View all →", font=get_font(16, bold=True), fill=hex_to_rgb("#F87B68"))
    
    pw = (sw - 60 - 20) // 2
    p1x = 30
    draw.rounded_rectangle([p1x, 1015, p1x + pw, 1270], radius=20, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    food_img1 = load_or_crop_image("frontend/public/assets/banners/banner_food.png", pw - 20, 130, radius=14)
    screen.paste(food_img1, (p1x + 10, 1025), food_img1)
    draw.text((p1x + 14, 1170), "TailMeal Grain-Free", font=get_font(18, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((p1x + 14, 1198), "Chicken & Pumpkin • 1.2kg", font=get_font(14), fill=hex_to_rgb("#6B7280"))
    draw.text((p1x + 14, 1228), "₹799", font=get_font(21, bold=True), fill=hex_to_rgb("#F87B68"))
    draw.text((p1x + pw - 60, 1226), "★ 4.9", font=get_font(16, bold=True), fill=hex_to_rgb("#F59E0B"))
    
    p2x = 30 + pw + 20
    draw.rounded_rectangle([p2x, 1015, p2x + pw, 1270], radius=20, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    groom_img2 = load_or_crop_image("frontend/public/assets/banners/banner_grooming.png", pw - 20, 130, radius=14)
    screen.paste(groom_img2, (p2x + 10, 1025), groom_img2)
    draw.text((p2x + 14, 1170), "Organic Puppy Spa Kit", font=get_font(18, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((p2x + 14, 1198), "Tearless Aloe & Coconut", font=get_font(14), fill=hex_to_rgb("#6B7280"))
    draw.text((p2x + 14, 1228), "₹1,249", font=get_font(21, bold=True), fill=hex_to_rgb("#F87B68"))
    draw.text((p2x + pw - 60, 1226), "★ 4.8", font=get_font(16, bold=True), fill=hex_to_rgb("#F59E0B"))
    
    draw_user_bottom_nav(screen, active_tab="home")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

def build_screen_user_02_matches(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#FAF7F2"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Top Bar (Y: 65 - 130)
    draw.text((32, 70), "Meet & Match", font=get_font(30, bold=True), fill=hex_to_rgb("#111827"))
    draw_vector_icon(draw, "heart", 235, 86, 22, hex_to_rgb("#F87B68"))
    
    draw.rounded_rectangle([sw - 270, 68, sw - 90, 114], radius=23, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw.text((sw - 255, 78), "Within 3 km", font=get_font(17, bold=True), fill=hex_to_rgb("#374151"))
    draw.text((sw - 128, 80), "v", font=get_font(14, bold=True), fill=hex_to_rgb("#6B7280"))
    
    draw.rounded_rectangle([sw - 74, 68, sw - 28, 114], radius=23, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw_vector_icon(draw, "sparkle", sw - 51, 91, 20, hex_to_rgb("#F87B68"))
    
    # Segmented Subtabs (Y: 135 - 185)
    draw.rounded_rectangle([30, 135, sw - 30, 185], radius=20, fill=hex_to_rgb("#E9ECEF"))
    tab_w = (sw - 60) // 3
    draw.rounded_rectangle([34, 139, 30 + tab_w, 181], radius=16, fill=(255, 255, 255))
    draw.text((34 + (tab_w - 70) // 2, 148), "Discover", font=get_font(18, bold=True), fill=hex_to_rgb("#F87B68"))
    draw.text((30 + tab_w + (tab_w - 95) // 2, 148), "Matches (12)", font=get_font(17, bold=True), fill=hex_to_rgb("#6B7280"))
    draw.text((30 + tab_w * 2 + (tab_w - 100) // 2, 148), "Playdates (4)", font=get_font(17, bold=True), fill=hex_to_rgb("#6B7280"))
    
    # Main Pet Profile Card (Y: 200 - 1060)
    cw, ch = sw - 60, 860
    card_img = load_or_crop_image("frontend/public/assets/banners/meet_match_dogs_banner_v2.png", cw, ch, radius=32)
    
    cdraw = ImageDraw.Draw(card_img)
    grad = Image.new('RGBA', (cw, 320))
    gdraw = ImageDraw.Draw(grad)
    for y in range(320):
        ratio = y / 320
        alpha = int(230 * (ratio ** 1.3))
        gdraw.line([(0, y), (cw, y)], fill=(15, 20, 25, alpha))
    card_img.paste(grad, (0, ch - 320), grad)
    
    cdraw.rounded_rectangle([cw - 220, 24, cw - 24, 72], radius=24, fill=(255, 255, 255, 240))
    draw_vector_icon(cdraw, "check", cw - 200, 48, 16, hex_to_rgb("#059669"))
    cdraw.text((cw - 180, 34), "96% Match", font=get_font(20, bold=True), fill=hex_to_rgb("#059669"))
    
    cdraw.rounded_rectangle([24, 24, 180, 70], radius=23, fill=(15, 20, 25, 180))
    cdraw.text((40, 34), "1.2 km away", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    cdraw.text((28, ch - 270), "Rocky, 2.5 yrs", font=get_font(38, bold=True), fill=(255, 255, 255))
    draw_vector_icon(cdraw, "paw", 290, ch - 248, 26, (255, 255, 255))
    cdraw.text((28, ch - 220), "Friendly Beagle • South Park Regular", font=get_font(20, bold=True), fill=hex_to_rgb("#E5E7EB"))
    
    traits = ["Loves Fetch", "High Energy", "Loves Dogs", "Vaccinated"]
    tx = 28
    for tr in traits:
        tb = cdraw.textbbox((0, 0), tr, font=get_font(15, bold=True))
        tw = tb[2] - tb[0] + 32
        cdraw.rounded_rectangle([tx, ch - 170, tx + tw, ch - 128], radius=21, fill=(255, 255, 255, 230))
        draw_vector_icon(cdraw, "check", tx + 14, ch - 149, 14, hex_to_rgb("#087F78"))
        cdraw.text((tx + 26, ch - 162), tr, font=get_font(15, bold=True), fill=hex_to_rgb("#1F2937"))
        tx += tw + 10
        
    cdraw.text((28, ch - 105), '"Looking for a fun weekend playdate buddy to run laps with!"', font=get_font(17), fill=(255, 255, 255))
    
    screen.paste(card_img, (30, 200), card_img)
    
    # Swipe Action Buttons (Y: 1090 - 1210)
    btn_y = 1095
    cx = sw // 2
    
    draw.ellipse([cx - 190, btn_y + 10, cx - 130, btn_y + 70], fill=(255, 255, 255), outline=hex_to_rgb("#F59E0B"), width=2)
    draw.text((cx - 170, btn_y + 20), "↺", font=get_font(32, bold=True), fill=hex_to_rgb("#F59E0B"))
    
    draw.ellipse([cx - 105, btn_y, cx - 30, btn_y + 75], fill=(255, 255, 255), outline=hex_to_rgb("#EF4444"), width=2)
    draw_vector_icon(draw, "cross", cx - 67, btn_y + 37, 28, hex_to_rgb("#EF4444"))
    
    draw.ellipse([cx + 30, btn_y, cx + 105, btn_y + 75], fill=(255, 255, 255), outline=hex_to_rgb("#06B6D4"), width=2)
    draw_vector_icon(draw, "star", cx + 67, btn_y + 37, 28, hex_to_rgb("#06B6D4"))
    
    draw.ellipse([cx + 130, btn_y + 5, cx + 200, btn_y + 75], fill=hex_to_rgb("#F87B68"))
    draw_vector_icon(draw, "heart", cx + 165, btn_y + 40, 28, (255, 255, 255))
    
    # Celebration Toast Bar (Y: 1220 - 1285)
    draw.rounded_rectangle([50, 1220, sw - 50, 1285], radius=24, fill=hex_to_rgba("#FEF2F2"), outline=hex_to_rgb("#FECDD3"), width=1)
    draw_vector_icon(draw, "heart", 76, 1252, 20, hex_to_rgb("#BE123C"))
    draw.text((96, 1238), "It's a Match! You and Rocky can now message!", font=get_font(18, bold=True), fill=hex_to_rgb("#BE123C"))
    
    draw_user_bottom_nav(screen, active_tab="match")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

def build_screen_user_03_vets(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#FAF7F2"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Top Bar (Y: 65 - 130)
    draw.text((32, 70), "Find Vets & Telehealth", font=get_font(28, bold=True), fill=hex_to_rgb("#111827"))
    draw_vector_icon(draw, "rx", 355, 86, 22, hex_to_rgb("#087F78"))
    
    draw.rounded_rectangle([sw - 220, 68, sw - 30, 114], radius=23, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw.text((sw - 205, 78), "South Delhi", font=get_font(17, bold=True), fill=hex_to_rgb("#374151"))
    draw.text((sw - 95, 80), "v", font=get_font(14, bold=True), fill=hex_to_rgb("#6B7280"))
    
    # Instant Video Consult Hero Card (Y: 135 - 335)
    tele_card = create_gradient(sw - 60, 200, "#087F78", "#0A5C57")
    tc_mask = Image.new('L', (sw - 60, 200), 0)
    tcdraw = ImageDraw.Draw(tc_mask)
    tcdraw.rounded_rectangle([0, 0, sw - 60, 200], radius=26, fill=255)
    screen.paste(tele_card, (30, 135), tc_mask)
    
    draw.text((54, 155), "24/7 INSTANT VET VIDEO CALL", font=get_font(15, bold=True), fill=hex_to_rgb("#A7F3D0"))
    draw.text((54, 185), "Connect with a Vet in 60s", font=get_font(28, bold=True), fill=(255, 255, 255))
    draw.text((54, 225), "Board-certified doctors ready for triage, advice & Rx", font=get_font(16), fill=hex_to_rgb("#D1FAE5"))
    
    draw.rounded_rectangle([54, 260, 260, 305], radius=18, fill=hex_to_rgba("#047857", 180))
    draw.ellipse([68, 276, 80, 288], fill=hex_to_rgb("#10B981"))
    draw.text((90, 272), "14 Doctors Online", font=get_font(16, bold=True), fill=(255, 255, 255))
    
    draw.rounded_rectangle([sw - 240, 260, sw - 54, 308], radius=22, fill=hex_to_rgb("#F87B68"))
    draw_vector_icon(draw, "video", sw - 215, 284, 18, (255, 255, 255))
    draw.text((sw - 195, 272), "Call Now • ₹499", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    draw.text((32, 355), "Verified Veterinary Specialists", font=get_font(23, bold=True), fill=hex_to_rgb("#111827"))
    
    # Doctor Card 1 (Y: 395 - 690)
    draw.rounded_rectangle([30, 395, sw - 30, 690], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    doc1 = load_or_crop_image("frontend/public/assets/banners/banner_vet.png", 90, 90, radius=45)
    screen.paste(doc1, (50, 415), doc1)
    
    draw.text((156, 415), "Dr. Sarah Jenkins, BVSc", font=get_font(22, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((156, 448), "Senior Physician & Surgeon • 12 Yrs Exp", font=get_font(16), fill=hex_to_rgb("#4B5563"))
    draw.text((156, 478), "★ 4.9 (420 reviews) • Defence Colony", font=get_font(16, bold=True), fill=hex_to_rgb("#D97706"))
    
    draw.rounded_rectangle([sw - 160, 415, sw - 50, 450], radius=15, fill=hex_to_rgba("#DCFCE7"), outline=hex_to_rgb("#86EFAC"), width=1)
    draw.text((sw - 146, 424), "Verified ✓", font=get_font(14, bold=True), fill=hex_to_rgb("#166534"))
    
    draw.text((50, 525), "Next Available Time Slots Today:", font=get_font(15, bold=True), fill=hex_to_rgb("#374151"))
    slots = ["3:30 PM (Video)", "4:45 PM (Clinic)", "6:00 PM (Video)"]
    sx = 50
    for s in slots:
        sb = draw.textbbox((0, 0), s, font=get_font(15))
        sw_btn = sb[2] - sb[0] + 28
        draw.rounded_rectangle([sx, 555, sx + sw_btn, 598], radius=18, fill=hex_to_rgba("#F0FDF4"), outline=hex_to_rgb("#6EE7B7"), width=1)
        draw.text((sx + 14, 567), s, font=get_font(15, bold=True), fill=hex_to_rgb("#065F46"))
        sx += sw_btn + 12
        
    draw.rounded_rectangle([50, 620, sw - 50, 668], radius=22, fill=hex_to_rgb("#087F78"))
    draw.text((sw // 2 - 130, 634), "Book Appointment with Dr. Sarah →", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    # Doctor Card 2 (Y: 710 - 1005)
    draw.rounded_rectangle([30, 710, sw - 30, 1005], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    doc2 = load_or_crop_image("frontend/public/assets/quick_links/vet.png", 90, 90, radius=45)
    screen.paste(doc2, (50, 730), doc2)
    
    draw.text((156, 730), "Dr. Rajesh Khanna, MVSc", font=get_font(22, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((156, 763), "Pet Dermatology & Allergies • 15 Yrs Exp", font=get_font(16), fill=hex_to_rgb("#4B5563"))
    draw.text((156, 793), "★ 4.8 (310 reviews) • Saket Central", font=get_font(16, bold=True), fill=hex_to_rgb("#D97706"))
    
    draw.text((50, 840), "Next Available Time Slots Tomorrow:", font=get_font(15, bold=True), fill=hex_to_rgb("#374151"))
    slots2 = ["10:00 AM (Clinic)", "11:30 AM (Video)", "02:15 PM (Clinic)"]
    sx = 50
    for s in slots2:
        sb = draw.textbbox((0, 0), s, font=get_font(15))
        sw_btn = sb[2] - sb[0] + 28
        draw.rounded_rectangle([sx, 870, sx + sw_btn, 913], radius=18, fill=hex_to_rgba("#EFF6FF"), outline=hex_to_rgb("#93C5FD"), width=1)
        draw.text((sx + 14, 882), s, font=get_font(15, bold=True), fill=hex_to_rgb("#1E40AF"))
        sx += sw_btn + 12
        
    draw.rounded_rectangle([50, 935, sw - 50, 983], radius=22, fill=hex_to_rgb("#087F78"))
    draw.text((sw // 2 - 130, 949), "Book Appointment with Dr. Rajesh →", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    # Pet Digital Health Passport (Y: 1025 - 1270)
    draw.rounded_rectangle([30, 1025, sw - 30, 1270], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    draw.text((50, 1045), "Bella's Digital Health Records", font=get_font(21, bold=True), fill=hex_to_rgb("#111827"))
    draw_vector_icon(draw, "shield", 330, 1058, 20, hex_to_rgb("#087F78"))
    
    draw.text((50, 1085), "• Rabies Booster: Up to Date (Valid till Dec 2026)", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((50, 1120), "• DHPPiL Vaccine: Completed on 14 Aug 2026", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((50, 1155), "• Deworming: Drontal Plus administered 2 weeks ago", font=get_font(16), fill=hex_to_rgb("#374151"))
    draw.text((50, 1190), "• Next Scheduled Checkup: Dental Exam in 3 weeks", font=get_font(16), fill=hex_to_rgb("#D97706"))
    draw.text((50, 1228), "Download Full PDF Medical Passport →", font=get_font(17, bold=True), fill=hex_to_rgb("#087F78"))
    
    draw_user_bottom_nav(screen, active_tab="services")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

def build_screen_user_04_grooming(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#FAF7F2"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Top Bar (Y: 65 - 130)
    draw.text((32, 70), "Grooming & Nutrition", font=get_font(28, bold=True), fill=hex_to_rgb("#111827"))
    draw_vector_icon(draw, "sparkle", 315, 86, 22, hex_to_rgb("#F87B68"))
    
    cats = ["All", "Grooming", "Daycare", "Fresh Meals"]
    cx = 30
    for c in cats:
        is_act = (c == "Grooming")
        bg = hex_to_rgb("#F87B68" if is_act else "#FFFFFF")
        tc = hex_to_rgb("#FFFFFF" if is_act else "#4B5563")
        f = get_font(16, bold=is_act)
        bb = draw.textbbox((0, 0), c, font=f)
        bw = bb[2] - bb[0] + 32
        draw.rounded_rectangle([cx, 130, cx + bw, 172], radius=21, fill=bg, outline=hex_to_rgb("#F0EAE1"), width=1)
        draw.text((cx + 16, 142), c, font=f, fill=tc)
        cx += bw + 12
        
    # Featured Royal Grooming Spa Card (Y: 190 - 640)
    draw.rounded_rectangle([30, 190, sw - 30, 640], radius=26, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    g_img = load_or_crop_image("frontend/public/assets/banners/banner_grooming.png", sw - 60, 210, radius=26)
    screen.paste(g_img, (30, 190), g_img)
    
    draw.rounded_rectangle([50, 210, 240, 255], radius=18, fill=hex_to_rgb("#EF4444"))
    draw.text((64, 222), "MOST POPULAR • 25% OFF", font=get_font(13, bold=True), fill=(255, 255, 255))
    
    draw.text((50, 420), "Full Royal Spa & De-Shedding Grooming", font=get_font(24, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((50, 458), "Doorstep Luxury Van • Performed by Certified Groomers", font=get_font(16), fill=hex_to_rgb("#6B7280"))
    
    draw.text((50, 492), "✓ Organic Bath & Blowout", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((sw // 2 + 10, 492), "✓ Nail Trimming & Buffing", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((50, 524), "✓ Ear & Eye Cleansing", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((sw // 2 + 10, 524), "✓ Paw Pad Lavender Balm", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    
    draw.text((50, 574), "₹1,499", font=get_font(32, bold=True), fill=hex_to_rgb("#F87B68"))
    draw.text((160, 584), "₹1,999", font=get_font(20), fill=hex_to_rgb("#9CA3AF"))
    draw.line([(158, 594), (225, 594)], fill=hex_to_rgb("#9CA3AF"), width=2)
    
    draw.rounded_rectangle([sw - 230, 565, sw - 50, 615], radius=22, fill=hex_to_rgb("#F87B68"))
    draw.text((sw - 206, 578), "Select Van Slot →", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    # Fresh Meals Subscription Card (Y: 660 - 1050)
    draw.rounded_rectangle([30, 660, sw - 30, 1050], radius=26, fill=(255, 255, 255), outline=hex_to_rgb("#E5E7EB"), width=1)
    f_img = load_or_crop_image("frontend/public/assets/banners/banner_food.png", sw - 60, 190, radius=26)
    screen.paste(f_img, (30, 660), f_img)
    
    draw.rounded_rectangle([50, 680, 240, 725], radius=18, fill=hex_to_rgb("#10B981"))
    draw.text((64, 692), "VET-APPROVED RECIPE", font=get_font(13, bold=True), fill=(255, 255, 255))
    
    draw.text((50, 870), "TailMeal Cooked Fresh Daily Bowls", font=get_font(24, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((50, 908), "Free-Range Chicken, Pumpkin, Quinoa & Omega-3", font=get_font(16), fill=hex_to_rgb("#6B7280"))
    draw.text((50, 938), "100% Human Grade • Zero Preservatives • Tailored for Bella", font=get_font(16, bold=True), fill=hex_to_rgb("#059669"))
    
    draw.text((50, 984), "₹169 / meal", font=get_font(28, bold=True), fill=hex_to_rgb("#087F78"))
    draw.rounded_rectangle([sw - 220, 975, sw - 50, 1025], radius=22, fill=hex_to_rgb("#087F78"))
    draw.text((sw - 195, 988), "Start Trial Plan →", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    # Live Service Tracking Stepper Card (Y: 1070 - 1270)
    draw.rounded_rectangle([30, 1070, sw - 30, 1270], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#FED7AA"), width=1)
    draw.text((50, 1090), "LIVE SERVICE TRACKER", font=get_font(14, bold=True), fill=hex_to_rgb("#EA580C"))
    draw_vector_icon(draw, "van", 230, 1098, 18, hex_to_rgb("#EA580C"))
    draw.text((50, 1118), "Grooming Van is On The Way!", font=get_font(22, bold=True), fill=hex_to_rgb("#111827"))
    draw.text((50, 1150), "Groomer Amit S. is 3.2 km away • ETA 14 Mins", font=get_font(16), fill=hex_to_rgb("#4B5563"))
    
    draw.rounded_rectangle([50, 1195, sw - 50, 1205], radius=5, fill=hex_to_rgb("#E5E7EB"))
    draw.rounded_rectangle([50, 1195, sw - 180, 1205], radius=5, fill=hex_to_rgb("#10B981"))
    draw.text((50, 1220), "Confirmed ✓", font=get_font(14, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((sw // 2 - 40, 1220), "Dispatched 🚐", font=get_font(14, bold=True), fill=hex_to_rgb("#059669"))
    draw.text((sw - 160, 1220), "Arriving Soon", font=get_font(14, bold=True), fill=hex_to_rgb("#6B7280"))
    
    draw_user_bottom_nav(screen, active_tab="services")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

# ==========================================
# SCREEN BUILDERS: VENDOR MODULE
# ==========================================

def build_screen_vendor_01_dashboard(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#F8FAFC"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Vendor App Top Bar (Y: 65 - 145)
    draw.text((32, 70), "Paws & Glow Studio", font=get_font(26, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((32, 104), "Partner ID: #TC-V9821 • Grooming & Spa", font=get_font(16), fill=hex_to_rgb("#64748B"))
    
    draw.rounded_rectangle([sw - 190, 72, sw - 30, 116], radius=22, fill=hex_to_rgba("#DCFCE7"), outline=hex_to_rgb("#86EFAC"), width=1)
    draw.ellipse([sw - 176, 88, sw - 164, 100], fill=hex_to_rgb("#16A34A"))
    draw.text((sw - 152, 82), "OPEN 🟢", font=get_font(16, bold=True), fill=hex_to_rgb("#166534"))
    
    # 4 KPI Stat Tiles (Y: 155 - 410)
    kpis = [
        ("Today's Bookings", "18", "+20% vs yesterday", "#087F78", "#F0FDFA"),
        ("Today's Revenue", "₹14,850", "Direct Bank IMPS", "#16A34A", "#F0FDF4"),
        ("Pending Actions", "3", "Requires Review", "#EA580C", "#FFF7ED"),
        ("Customer Rating", "4.9 ★", "128 Verified Reviews", "#D97706", "#FEFCE8")
    ]
    
    kw = (sw - 60 - 16) // 2
    kh = 118
    for i, (title, val, hint, color, bg) in enumerate(kpis):
        col = i % 2
        row = i // 2
        kx = 30 + col * (kw + 16)
        ky = 155 + row * (kh + 14)
        
        draw.rounded_rectangle([kx, ky, kx + kw, ky + kh], radius=20, fill=hex_to_rgb(bg), outline=hex_to_rgb("#E2E8F0"), width=1)
        draw.text((kx + 18, ky + 16), title, font=get_font(16, bold=True), fill=hex_to_rgb("#475569"))
        draw.text((kx + 18, ky + 44), val, font=get_font(30, bold=True), fill=hex_to_rgb(color))
        draw.text((kx + 18, ky + 86), hint, font=get_font(14), fill=hex_to_rgb("#64748B"))
        
    # Action Required Section (Y: 425 - 690)
    draw.text((32, 425), "Action Required: New Requests", font=get_font(22, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.rounded_rectangle([sw - 70, 426, sw - 30, 456], radius=15, fill=hex_to_rgb("#EF4444"))
    draw.text((sw - 56, 430), "3", font=get_font(16, bold=True), fill=(255, 255, 255))
    
    draw.rounded_rectangle([30, 465, sw - 30, 685], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#FED7AA"), width=1)
    draw.text((52, 485), "NEW BOOKING REQUEST", font=get_font(13, bold=True), fill=hex_to_rgb("#EA580C"))
    draw_vector_icon(draw, "bell", 220, 492, 16, hex_to_rgb("#EA580C"))
    draw.text((52, 510), "Vikram Malhotra • Greater Kailash 1", font=get_font(21, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((52, 542), "Pet: Bruno • Labrador Retriever (3 yrs)", font=get_font(16), fill=hex_to_rgb("#475569"))
    draw.text((52, 570), "Service: Full De-Shedding & Bath • Today, 2:30 PM", font=get_font(16, bold=True), fill=hex_to_rgb("#087F78"))
    draw.text((52, 598), "Fee: ₹1,499 (Online Payment Confirmed)", font=get_font(15), fill=hex_to_rgb("#16A34A"))
    
    draw.rounded_rectangle([52, 630, 240, 672], radius=18, fill=hex_to_rgb("#087F78"))
    draw.text((75, 642), "✓ Accept Booking", font=get_font(16, bold=True), fill=(255, 255, 255))
    
    draw.rounded_rectangle([255, 630, 410, 672], radius=18, fill=(255, 255, 255), outline=hex_to_rgb("#CBD5E1"), width=1)
    draw.text((275, 642), "Reschedule", font=get_font(16, bold=True), fill=hex_to_rgb("#475569"))
    
    # Today's Queue Timeline (Y: 710 - 1100)
    draw.text((32, 710), "Today's Service Schedule (18 Total)", font=get_font(22, bold=True), fill=hex_to_rgb("#0F172A"))
    
    queue_items = [
        ("10:00 AM", "Simba (Shih Tzu)", "Full Haircut & Bath", "Completed ✓", "#16A34A", "#DCFCE7"),
        ("11:30 AM", "Milo (Persian Cat)", "Medicated Spa", "In Progress", "#D97706", "#FEF3C7"),
        ("02:30 PM", "Bruno (Labrador)", "De-Shedding Spa", "Confirmed", "#087F78", "#CCFBF1"),
        ("04:15 PM", "Coco (Poodle)", "Nail & Teeth Clean", "Confirmed", "#087F78", "#CCFBF1")
    ]
    
    qy = 745
    for time_str, pet, serv, stat, sc, sbg in queue_items:
        draw.rounded_rectangle([30, qy, sw - 30, qy + 78], radius=18, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
        draw.text((48, qy + 16), time_str, font=get_font(17, bold=True), fill=hex_to_rgb("#0F172A"))
        draw.text((150, qy + 16), pet, font=get_font(18, bold=True), fill=hex_to_rgb("#0F172A"))
        draw.text((150, qy + 44), serv, font=get_font(14), fill=hex_to_rgb("#64748B"))
        
        draw.rounded_rectangle([sw - 165, qy + 20, sw - 48, qy + 58], radius=14, fill=hex_to_rgba(sbg), outline=hex_to_rgb(sc), width=1)
        draw.text((sw - 152, qy + 28), stat, font=get_font(14, bold=True), fill=hex_to_rgb(sc))
        qy += 90
        
    # Monthly Target Card (Y: 1120 - 1270)
    draw.rounded_rectangle([30, 1120, sw - 30, 1270], radius=22, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((50, 1140), "Monthly Business Goal Progress", font=get_font(18, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((50, 1170), "Revenue: ₹1,42,850 of ₹1,50,000 Target (95%)", font=get_font(16, bold=True), fill=hex_to_rgb("#087F78"))
    
    draw.rounded_rectangle([50, 1205, sw - 50, 1222], radius=8, fill=hex_to_rgb("#E2E8F0"))
    draw.rounded_rectangle([50, 1205, sw - 80, 1222], radius=8, fill=hex_to_rgb("#087F78"))
    draw.text((50, 1234), "Only 6 more bookings needed to hit monthly bonus! 🚀", font=get_font(14), fill=hex_to_rgb("#64748B"))
    
    draw_vendor_bottom_nav(screen, active_tab="home")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

def build_screen_vendor_02_clinic(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#F8FAFC"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Doctor App Top Bar (Y: 65 - 140)
    draw.text((32, 70), "Dr. Ananya Rao, BVSc", font=get_font(26, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((32, 104), "TailCircle Central Hospital • Doctor Suite", font=get_font(16), fill=hex_to_rgb("#64748B"))
    
    draw.rounded_rectangle([sw - 230, 72, sw - 30, 116], radius=22, fill=hex_to_rgba("#DCFCE7"), outline=hex_to_rgb("#86EFAC"), width=1)
    draw.text((sw - 212, 82), "Online for Calls 🟢", font=get_font(16, bold=True), fill=hex_to_rgb("#166534"))
    
    # Incoming Telehealth Alert Card (Y: 155 - 410)
    alert_card = create_gradient(sw - 60, 240, "#087F78", "#0A5C57")
    ac_mask = Image.new('L', (sw - 60, 240), 0)
    acdraw = ImageDraw.Draw(ac_mask)
    acdraw.rounded_rectangle([0, 0, sw - 60, 240], radius=26, fill=255)
    screen.paste(alert_card, (30, 155), ac_mask)
    
    draw.text((54, 175), "INCOMING TELEHEALTH CALL", font=get_font(14, bold=True), fill=hex_to_rgb("#A7F3D0"))
    draw_vector_icon(draw, "video", 270, 182, 16, hex_to_rgb("#A7F3D0"))
    draw.text((54, 205), "Charlie • Golden Retriever (3 yrs)", font=get_font(26, bold=True), fill=(255, 255, 255))
    draw.text((54, 245), "Pet Parent: Neha Kapoor (Ringing now...)", font=get_font(16), fill=hex_to_rgb("#D1FAE5"))
    draw.text((54, 275), "Complaint: Ear scratching & redness after swimming", font=get_font(16, bold=True), fill=(255, 255, 255))
    
    draw.rounded_rectangle([54, 320, 260, 368], radius=22, fill=hex_to_rgb("#10B981"))
    draw_vector_icon(draw, "video", 80, 344, 18, (255, 255, 255))
    draw.text((98, 332), "Accept Video Call", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    draw.rounded_rectangle([275, 320, 480, 368], radius=22, fill=(255, 255, 255, 40), outline=(255, 255, 255), width=1)
    draw.text((295, 332), "View Records", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    # Search Bar
    draw.rounded_rectangle([30, 425, sw - 30, 475], radius=22, fill=(255, 255, 255), outline=hex_to_rgb("#CBD5E1"), width=1)
    draw.ellipse([54, 442, 68, 456], outline=hex_to_rgb("#94A3B8"), width=2)
    draw.line([(65, 453), (73, 461)], fill=hex_to_rgb("#94A3B8"), width=2)
    draw.text((82, 440), "Search patient by Pet Name, Microchip, or Parent...", font=get_font(17), fill=hex_to_rgb("#94A3B8"))
    
    tabs = ["Appointments (6)", "Patients (142)", "Rx Generator", "Lab Tests"]
    tx = 30
    for t in tabs:
        is_a = "Appointments" in t
        f = get_font(15, bold=is_a)
        tb = draw.textbbox((0, 0), t, font=f)
        tw = tb[2] - tb[0] + 28
        draw.rounded_rectangle([tx, 495, tx + tw, 535], radius=18, fill=hex_to_rgb("#087F78" if is_a else "#FFFFFF"), outline=hex_to_rgb("#CBD5E1"), width=1)
        draw.text((tx + 14, 505), t, font=f, fill=hex_to_rgb("#FFFFFF" if is_a else "#475569"))
        tx += tw + 10
        
    draw.text((32, 555), "Today's Clinical OPD Queue", font=get_font(21, bold=True), fill=hex_to_rgb("#0F172A"))
    
    patients = [
        ("11:45 AM", "Max (German Shepherd)", "Annual Rabies Booster & Checkup", "In Waiting Room", "#D97706", "#FEF3C7"),
        ("01:15 PM", "Simba (Shih Tzu)", "Eye Discharge & Allergy", "Confirmed", "#087F78", "#CCFBF1"),
        ("03:30 PM", "Milo (Persian Cat)", "Follow-up Post Antibiotics", "Confirmed", "#087F78", "#CCFBF1")
    ]
    
    py = 590
    for time_str, p_name, reason, st, sc, sbg in patients:
        draw.rounded_rectangle([30, py, sw - 30, py + 95], radius=20, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
        draw.text((50, py + 16), time_str, font=get_font(18, bold=True), fill=hex_to_rgb("#0F172A"))
        draw.text((160, py + 16), p_name, font=get_font(19, bold=True), fill=hex_to_rgb("#0F172A"))
        draw.text((160, py + 46), reason, font=get_font(15), fill=hex_to_rgb("#64748B"))
        
        draw.rounded_rectangle([sw - 170, py + 18, sw - 48, py + 56], radius=14, fill=hex_to_rgba(sbg), outline=hex_to_rgb(sc), width=1)
        draw.text((sw - 156, py + 26), st, font=get_font(14, bold=True), fill=hex_to_rgb(sc))
        py += 110
        
    # Digital Rx Card
    draw.rounded_rectangle([30, 940, sw - 30, 1270], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#CBD5E1"), width=1)
    draw.text((50, 960), "Recent Digital Prescription Generated", font=get_font(20, bold=True), fill=hex_to_rgb("#0F172A"))
    draw_vector_icon(draw, "rx", 440, 972, 20, hex_to_rgb("#087F78"))
    draw.text((50, 995), "Patient: Rocky • Beagle (2.5 yrs) • Parent: Amit Verma", font=get_font(16, bold=True), fill=hex_to_rgb("#087F78"))
    
    draw.text((50, 1030), "Diagnosis: Acute Gastrointestinal Upset", font=get_font(15), fill=hex_to_rgb("#334155"))
    draw.text((50, 1060), "Rx 1: Metronidazole 200mg (1 tablet twice daily x 5 days)", font=get_font(15), fill=hex_to_rgb("#334155"))
    draw.text((50, 1090), "Rx 2: Probiotic Synbiotic Sachet (1 sachet with meal x 7 days)", font=get_font(15), fill=hex_to_rgb("#334155"))
    draw.text((50, 1120), "Status: Automatically Dispatched to Parent WhatsApp & App ✓", font=get_font(15, bold=True), fill=hex_to_rgb("#16A34A"))
    
    draw.rounded_rectangle([50, 1170, sw - 50, 1220], radius=20, fill=hex_to_rgb("#087F78"))
    draw.text((sw // 2 - 130, 1184), "+ Create New Digital Prescription", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    draw_vendor_bottom_nav(screen, active_tab="bookings")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

def build_screen_vendor_03_services(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#F8FAFC"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Top Bar (Y: 65 - 140)
    draw.text((32, 70), "Services & Capacity Manager", font=get_font(26, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((32, 104), "Happy Paws Daycare & Boarding", font=get_font(16), fill=hex_to_rgb("#64748B"))
    
    draw.rounded_rectangle([sw - 180, 72, sw - 30, 116], radius=22, fill=hex_to_rgb("#F1F5F9"), outline=hex_to_rgb("#CBD5E1"), width=1)
    draw.text((sw - 164, 82), "Daycare Suite ▾", font=get_font(16, bold=True), fill=hex_to_rgb("#334155"))
    
    # Live Capacity Meter
    draw.rounded_rectangle([30, 150, sw - 30, 365], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#CBD5E1"), width=1)
    draw.text((50, 172), "LIVE DAYCARE OCCUPANCY", font=get_font(14, bold=True), fill=hex_to_rgb("#087F78"))
    draw.text((50, 202), "16 / 20 Kennels Occupied (80% Full)", font=get_font(26, bold=True), fill=hex_to_rgb("#0F172A"))
    
    draw.rounded_rectangle([50, 245, sw - 50, 265], radius=10, fill=hex_to_rgb("#E2E8F0"))
    draw.rounded_rectangle([50, 245, 50 + int((sw - 100) * 0.8), 265], radius=10, fill=hex_to_rgb("#087F78"))
    
    draw.text((50, 280), "• 16 Dogs checked in for full-day stay", font=get_font(16), fill=hex_to_rgb("#475569"))
    draw.text((50, 310), "• 4 Slots remaining for afternoon drop-offs", font=get_font(16, bold=True), fill=hex_to_rgb("#16A34A"))
    
    draw.text((32, 390), "Service Packages & Pricing Catalog", font=get_font(22, bold=True), fill=hex_to_rgb("#0F172A"))
    
    # Package 1 Card
    draw.rounded_rectangle([30, 425, sw - 30, 645], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((50, 445), "Full Day Puppy Social Daycare", font=get_font(22, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((50, 478), "Supervised cage-free agility, midday meal & nap room", font=get_font(16), fill=hex_to_rgb("#64748B"))
    draw.text((50, 515), "Rate: ₹800 / day", font=get_font(22, bold=True), fill=hex_to_rgb("#087F78"))
    
    draw.rounded_rectangle([sw - 150, 445, sw - 50, 485], radius=20, fill=hex_to_rgb("#16A34A"))
    draw.ellipse([sw - 85, 450, sw - 55, 480], fill=(255, 255, 255))
    draw.text((sw - 138, 455), "ACTIVE", font=get_font(13, bold=True), fill=(255, 255, 255))
    
    draw.text((50, 560), "Check-in: 8:00 AM - 10:00 AM • Check-out: 6:00 PM - 8:30 PM", font=get_font(15), fill=hex_to_rgb("#475569"))
    draw.text((50, 595), "✎ Edit Package Details & Custom Requirements", font=get_font(16, bold=True), fill=hex_to_rgb("#087F78"))
    
    # Package 2 Card
    draw.rounded_rectangle([30, 665, sw - 30, 885], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((50, 685), "Overnight Luxury Boarding Suite", font=get_font(22, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((50, 718), "Climate-controlled private room, CCTV stream & meals", font=get_font(16), fill=hex_to_rgb("#64748B"))
    draw.text((50, 755), "Rate: ₹1,600 / night", font=get_font(22, bold=True), fill=hex_to_rgb("#087F78"))
    
    draw.rounded_rectangle([sw - 150, 685, sw - 50, 725], radius=20, fill=hex_to_rgb("#16A34A"))
    draw.ellipse([sw - 85, 690, sw - 55, 720], fill=(255, 255, 255))
    draw.text((sw - 138, 695), "ACTIVE", font=get_font(13, bold=True), fill=(255, 255, 255))
    
    draw.text((50, 800), "24/7 Caretaker on premises • Evening garden walk included", font=get_font(15), fill=hex_to_rgb("#475569"))
    draw.text((50, 835), "✎ Edit Package Details & Custom Requirements", font=get_font(16, bold=True), fill=hex_to_rgb("#087F78"))
    
    # Add-ons
    draw.text((32, 910), "Available Add-on Services", font=get_font(21, bold=True), fill=hex_to_rgb("#0F172A"))
    
    addons = [
        ("30-Min Neighborhood Park Agility Walk", "+₹250", True),
        ("Medication & Special Dietary Feed", "+₹150", True),
        ("Departure Bubble Bath & Blow-dry", "+₹599", True)
    ]
    
    ay = 945
    for a_title, a_price, a_act in addons:
        draw.rounded_rectangle([30, ay, sw - 30, ay + 80], radius=18, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
        draw.text((50, ay + 18), a_title, font=get_font(17, bold=True), fill=hex_to_rgb("#0F172A"))
        draw.text((50, ay + 46), f"Price: {a_price}", font=get_font(16, bold=True), fill=hex_to_rgb("#087F78"))
        
        draw.rounded_rectangle([sw - 110, ay + 22, sw - 50, ay + 58], radius=18, fill=hex_to_rgb("#16A34A"))
        draw.ellipse([sw - 80, ay + 26, sw - 54, ay + 54], fill=(255, 255, 255))
        ay += 95
        
    draw.rounded_rectangle([30, 1245, sw - 30, 1295], radius=22, fill=hex_to_rgb("#087F78"))
    draw.text((sw // 2 - 110, 1260), "+ Add New Service Package", font=get_font(17, bold=True), fill=(255, 255, 255))
    
    draw_vendor_bottom_nav(screen, active_tab="services")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

def build_screen_vendor_04_earnings(sw, sh):
    screen = Image.new('RGBA', (sw, sh), hex_to_rgba("#F8FAFC"))
    draw = ImageDraw.Draw(screen)
    draw_status_bar(draw, sw, dark_mode=False)
    
    # Top Bar (Y: 65 - 140)
    draw.text((32, 70), "Earnings & Finance Center", font=get_font(26, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((32, 104), "Direct IMPS Bank Settlements", font=get_font(16), fill=hex_to_rgb("#64748B"))
    
    draw.rounded_rectangle([sw - 200, 72, sw - 30, 116], radius=22, fill=(255, 255, 255), outline=hex_to_rgb("#CBD5E1"), width=1)
    draw.text((sw - 182, 82), "Oct 2026 ▾", font=get_font(16, bold=True), fill=hex_to_rgb("#334155"))
    
    # Total Revenue Card
    rev_card = create_gradient(sw - 60, 245, "#087F78", "#064E48")
    rc_mask = Image.new('L', (sw - 60, 245), 0)
    rcdraw = ImageDraw.Draw(rc_mask)
    rcdraw.rounded_rectangle([0, 0, sw - 60, 245], radius=26, fill=255)
    screen.paste(rev_card, (30, 150), rc_mask)
    
    draw.text((54, 172), "TOTAL NET REVENUE (THIS MONTH)", font=get_font(14, bold=True), fill=hex_to_rgb("#A7F3D0"))
    draw.text((54, 202), "₹1,42,850", font=get_font(42, bold=True), fill=(255, 255, 255))
    
    draw.rounded_rectangle([270, 210, 420, 248], radius=16, fill=hex_to_rgba("#065F46", 180))
    draw.text((284, 218), "▲ +28.4% growth", font=get_font(15, bold=True), fill=hex_to_rgb("#A7F3D0"))
    
    draw.text((54, 268), "Next Scheduled Payout:", font=get_font(16), fill=hex_to_rgb("#D1FAE5"))
    draw.text((230, 268), "₹24,600 • Tomorrow 10:00 AM", font=get_font(17, bold=True), fill=(255, 255, 255))
    draw.text((54, 305), "Settlement Account: HDFC Bank ••••••4012 (Verified ✓)", font=get_font(15), fill=hex_to_rgb("#A7F3D0"))
    
    draw.rounded_rectangle([sw - 230, 335, sw - 54, 378], radius=18, fill=hex_to_rgb("#F87B68"))
    draw.text((sw - 208, 345), "Instant Withdraw ⚡", font=get_font(15, bold=True), fill=(255, 255, 255))
    
    # Weekly Revenue Velocity Bar Chart
    draw.rounded_rectangle([30, 420, sw - 30, 690], radius=24, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((50, 440), "Weekly Revenue Velocity (INR)", font=get_font(20, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((50, 470), "Peak day: Saturday (₹32,400 earned)", font=get_font(15), fill=hex_to_rgb("#059669"))
    
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    amounts = [14, 18, 16, 22, 26, 32, 29]
    max_amt = 35
    bar_area_w = sw - 120
    col_w = bar_area_w // len(days)
    chart_base_y = 640
    max_bar_h = 120
    
    for i, (d, amt) in enumerate(zip(days, amounts)):
        bx = 60 + i * col_w
        bh = int((amt / max_amt) * max_bar_h)
        by = chart_base_y - bh
        is_peak = (amt == max(amounts))
        color = hex_to_rgb("#087F78" if not is_peak else "#F87B68")
        
        draw.rounded_rectangle([bx + 12, by, bx + col_w - 12, chart_base_y], radius=8, fill=color)
        draw.text((bx + 14, by - 22), f"₹{amt}k", font=get_font(13, bold=True), fill=hex_to_rgb("#475569"))
        draw.text((bx + 16, chart_base_y + 10), d, font=get_font(14, bold=is_peak), fill=hex_to_rgb("#0F172A" if is_peak else "#64748B"))
        
    # Recent Settled Bookings
    draw.text((32, 715), "Recent Settled Transactions", font=get_font(21, bold=True), fill=hex_to_rgb("#0F172A"))
    
    txs = [
        ("Booking #TC-9281", "Full Royal Bath & Spa", "+₹1,499", "Settled ✓"),
        ("Telehealth #TC-9275", "15-Min Video Consultation", "+₹599", "Settled ✓"),
        ("Boarding #TC-9260", "4-Day Daycare Stay", "+₹3,200", "Settled ✓"),
        ("Store Order #TC-9240", "Puppy Organic Treats (2x)", "+₹850", "Settled ✓")
    ]
    
    ty = 750
    for tid, desc, amt_str, st in txs:
        draw.rounded_rectangle([30, ty, sw - 30, ty + 74], radius=18, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
        draw.text((50, ty + 16), tid, font=get_font(17, bold=True), fill=hex_to_rgb("#0F172A"))
        draw.text((50, ty + 42), desc, font=get_font(14), fill=hex_to_rgb("#64748B"))
        
        draw.text((sw - 190, ty + 16), amt_str, font=get_font(18, bold=True), fill=hex_to_rgb("#16A34A"))
        draw.text((sw - 190, ty + 42), st, font=get_font(14, bold=True), fill=hex_to_rgb("#087F78"))
        ty += 84
        
    # Order Fulfillment Section
    draw.rounded_rectangle([30, 1100, sw - 30, 1270], radius=22, fill=(255, 255, 255), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((50, 1120), "Pet Store Orders Ready for Dispatch 📦", font=get_font(19, bold=True), fill=hex_to_rgb("#0F172A"))
    draw.text((50, 1152), "3 Shipments Ready • Courier Pick-up Scheduled Today, 4:00 PM", font=get_font(15), fill=hex_to_rgb("#64748B"))
    
    draw.rounded_rectangle([50, 1195, sw - 50, 1245], radius=18, fill=hex_to_rgb("#087F78"))
    draw.text((sw // 2 - 130, 1208), "Download Tax Reports & GST Invoices", font=get_font(16, bold=True), fill=(255, 255, 255))
    
    draw_vendor_bottom_nav(screen, active_tab="earnings")
    draw_bottom_home_bar(draw, sw, sh, dark_mode=False)
    return screen

# ==========================================
# MASTER COMPOSITOR & EXPORT
# ==========================================

PREVIEW_CONFIGS = [
    # ── User Module (4 Images) ─────────────────────────
    {
        "filename": "user_01_home_super_app.png",
        "bg_top": "#FFF7F4",
        "bg_bot": "#FFE7E0",
        "orbs": [
            (920, 260, 320, "#F87B68", 60),
            (140, 1500, 300, "#66B4B1", 45),
            (880, 1650, 260, "#FFD54F", 35)
        ],
        "badge": "TAIL CIRCLE • PET SUPER APP",
        "badge_icon": "paw",
        "badge_color": "#F87B68",
        "line1": "One Place.",
        "color1": "#0F172A",
        "line2": "Every Tail.",
        "color2": "#F87B68",
        "subtitle": "Grooming, Vets, Daycare, Meals & Pet Dating in One Place",
        "builder": build_screen_user_01_home,
        "badge1": (680, 400, 345, 86, "star", "4.9 Rated App", "Over 25,000+ Happy Tails", "#F59E0B"),
        "badge2": (50, 1680, 340, 86, "shield", "100% Verified", "Certified Pet Care Experts", "#10B981")
    },
    {
        "filename": "user_02_matches_playdates.png",
        "bg_top": "#FFF0F5",
        "bg_bot": "#FFE2E8",
        "orbs": [
            (920, 260, 320, "#EC4899", 55),
            (140, 1480, 300, "#F87B68", 50),
            (880, 1680, 250, "#8B5CF6", 35)
        ],
        "badge": "MEET & MATCH • PET DATING",
        "badge_icon": "heart",
        "badge_color": "#EC4899",
        "line1": "Find Pet Pals",
        "color1": "#0F172A",
        "line2": "& Playdates.",
        "color2": "#F87B68",
        "subtitle": "Swipes, Sniffs, and Soulmates in Your Neighborhood",
        "builder": build_screen_user_02_matches,
        "badge1": (50, 400, 345, 86, "paw", "50,000+ Matches", "Active Daily Playdates", "#EC4899"),
        "badge2": (680, 1680, 345, 86, "chat", "Instant Chat", "Verified Loving Pet Parents", "#06B6D4")
    },
    {
        "filename": "user_03_vet_video_consult.png",
        "bg_top": "#F0FAF8",
        "bg_bot": "#DCF5F0",
        "orbs": [
            (920, 260, 320, "#087F78", 55),
            (140, 1500, 300, "#10B981", 45),
            (900, 1680, 260, "#3B82F6", 35)
        ],
        "badge": "24/7 VET CARE • TELEHEALTH",
        "badge_icon": "rx",
        "badge_color": "#087F78",
        "line1": "Expert Vets,",
        "color1": "#0F172A",
        "line2": "On Demand.",
        "color2": "#087F78",
        "subtitle": "Instant Video Consultations in 60s & Clinic Bookings",
        "builder": build_screen_user_03_vets,
        "badge1": (680, 400, 345, 86, "video", "Connect in 60s", "24/7 Emergency Support", "#087F78"),
        "badge2": (50, 1680, 345, 86, "shield", "Digital Health Rx", "Auto-Saved to Your Phone", "#10B981")
    },
    {
        "filename": "user_04_grooming_meals_daycare.png",
        "bg_top": "#FFFBF0",
        "bg_bot": "#FEF3D6",
        "orbs": [
            (920, 260, 320, "#F87B68", 55),
            (140, 1500, 300, "#F59E0B", 45),
            (880, 1680, 260, "#10B981", 35)
        ],
        "badge": "SPA & NUTRITION • DOORSTEP CARE",
        "badge_icon": "sparkle",
        "badge_color": "#F87B68",
        "line1": "Luxury Spa &",
        "color1": "#0F172A",
        "line2": "Fresh Meals.",
        "color2": "#F87B68",
        "subtitle": "Professional Grooming at Home & Vet-Crafted Diets",
        "builder": build_screen_user_04_grooming,
        "badge1": (50, 400, 345, 86, "van", "Doorstep Vans", "Zero Stress Spa at Home", "#F87B68"),
        "badge2": (680, 1680, 345, 86, "bowl", "Fresh Cooked Daily", "100% Human-Grade Nutrition", "#10B981")
    },

    # ── Vendor Module (4 Images) ───────────────────────
    {
        "filename": "vendor_01_business_dashboard.png",
        "bg_top": "#F1F5F9",
        "bg_bot": "#E2E8F0",
        "orbs": [
            (920, 260, 320, "#087F78", 55),
            (140, 1500, 300, "#3B82F6", 45),
            (880, 1680, 260, "#10B981", 40)
        ],
        "badge": "PARTNER APP • VENDOR HUB",
        "badge_icon": "services",
        "badge_color": "#087F78",
        "line1": "Grow Your",
        "color1": "#0F172A",
        "line2": "Pet Business.",
        "color2": "#087F78",
        "subtitle": "Live Bookings, Automated Schedules & Direct Payouts",
        "builder": build_screen_vendor_01_dashboard,
        "badge1": (680, 400, 345, 86, "trend", "3.5x More Bookings", "High-Intent Pet Owners", "#087F78"),
        "badge2": (50, 1680, 345, 86, "check", "Instant Bookings", "Zero Double Scheduling", "#16A34A")
    },
    {
        "filename": "vendor_02_clinic_vet_telehealth.png",
        "bg_top": "#F0FDF4",
        "bg_bot": "#DCFCE7",
        "orbs": [
            (920, 260, 320, "#087F78", 55),
            (140, 1500, 300, "#10B981", 45),
            (880, 1680, 260, "#06B6D4", 40)
        ],
        "badge": "CLINIC & VET SUITE",
        "badge_icon": "rx",
        "badge_color": "#087F78",
        "line1": "Seamless Tele-Vet",
        "color1": "#0F172A",
        "line2": "& Clinic Queue.",
        "color2": "#087F78",
        "subtitle": "HD Video Calls, Digital Prescriptions & Patient History",
        "builder": build_screen_vendor_02_clinic,
        "badge1": (50, 400, 345, 86, "video", "HD Tele-Consults", "Encrypted Patient Calls", "#087F78"),
        "badge2": (680, 1680, 345, 86, "shield", "1-Click Digital Rx", "Auto WhatsApp Dispatch", "#10B981")
    },
    {
        "filename": "vendor_03_services_slots_capacity.png",
        "bg_top": "#F5F5F4",
        "bg_bot": "#E7E5E4",
        "orbs": [
            (920, 260, 320, "#F87B68", 50),
            (140, 1500, 300, "#087F78", 45),
            (880, 1680, 260, "#F59E0B", 35)
        ],
        "badge": "SERVICES & CAPACITY",
        "badge_icon": "services",
        "badge_color": "#F87B68",
        "line1": "Smart Slots &",
        "color1": "#0F172A",
        "line2": "Live Capacity.",
        "color2": "#F87B68",
        "subtitle": "Custom Service Packages, Rates, Add-ons & Boarding",
        "builder": build_screen_vendor_03_services,
        "badge1": (680, 400, 345, 86, "cross", "Zero Overbooking", "Live Kennel Occupancy", "#F87B68"),
        "badge2": (50, 1680, 345, 86, "check", "Flexible Pricing", "Custom Add-ons & Times", "#087F78")
    },
    {
        "filename": "vendor_04_earnings_payouts_orders.png",
        "bg_top": "#F8FAFC",
        "bg_bot": "#FEF9C3",
        "orbs": [
            (920, 260, 320, "#087F78", 55),
            (140, 1500, 300, "#EAB308", 45),
            (880, 1680, 260, "#10B981", 40)
        ],
        "badge": "EARNINGS & OPERATIONS",
        "badge_icon": "earnings",
        "badge_color": "#087F78",
        "line1": "Track Revenue &",
        "color1": "#0F172A",
        "line2": "Fast Payouts.",
        "color2": "#087F78",
        "subtitle": "Transparent IMPS Payouts, Analytics & Store Orders",
        "builder": build_screen_vendor_04_earnings,
        "badge1": (50, 400, 345, 86, "card", "Next-Day Payouts", "Direct IMPS Bank Transfer", "#087F78"),
        "badge2": (680, 1680, 345, 86, "trend", "0% Hidden Fees", "Automated GST Reports", "#EAB308")
    }
]

def generate_all():
    CANVAS_W, CANVAS_H = 1080, 1920
    SCREEN_W, SCREEN_H = 730, 1420
    
    out_dir_1 = "e:/Appzeto Projects/TailCircle/preview_images"
    out_dir_2 = "e:/Appzeto Projects/TailCircle/preview image"
    os.makedirs(out_dir_1, exist_ok=True)
    os.makedirs(out_dir_2, exist_ok=True)
    
    print(f"Starting Play Store preview image generation ({len(PREVIEW_CONFIGS)} images)...")
    
    for idx, cfg in enumerate(PREVIEW_CONFIGS):
        print(f"[{idx+1}/{len(PREVIEW_CONFIGS)}] Rendering {cfg['filename']}...")
        
        canvas = create_gradient(CANVAS_W, CANVAS_H, cfg["bg_top"], cfg["bg_bot"])
        
        for (ox, oy, orad, ocol, oalpha) in cfg["orbs"]:
            add_ambient_orb(canvas, ox, oy, orad, ocol, oalpha)
            
        cdraw = ImageDraw.Draw(canvas)
        
        draw_header_section(
            cdraw,
            cx=CANVAS_W // 2,
            badge_text=cfg["badge"],
            badge_icon=cfg.get("badge_icon", "paw"),
            badge_color=cfg["badge_color"],
            line1=cfg["line1"],
            color1=cfg["color1"],
            line2=cfg["line2"],
            color2=cfg["color2"],
            subtitle=cfg["subtitle"]
        )
        
        screen_content = cfg["builder"](SCREEN_W, SCREEN_H)
        phone_frame = create_phone_frame(screen_content)
        
        fw, fh = phone_frame.size
        phone_x = (CANVAS_W - fw) // 2
        phone_y = 425
        apply_phone_with_shadow(canvas, phone_frame, phone_x, phone_y)
        
        b1 = cfg["badge1"]
        draw_floating_badge(canvas, b1[0], b1[1], b1[2], b1[3], b1[4], b1[5], b1[6], b1[7])
        
        b2 = cfg["badge2"]
        draw_floating_badge(canvas, b2[0], b2[1], b2[2], b2[3], b2[4], b2[5], b2[6], b2[7])
        
        p1 = os.path.join(out_dir_1, cfg["filename"])
        p2 = os.path.join(out_dir_2, cfg["filename"])
        
        canvas.save(p1, "PNG", optimize=True)
        canvas.save(p2, "PNG", optimize=True)
        print(f"  Saved to: {p1}")
        
    print("\nALL 8 PLAY STORE PREVIEW IMAGES GENERATED SUCCESSFULLY!")

if __name__ == "__main__":
    generate_all()
