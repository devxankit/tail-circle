import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Setup Fonts
FONT_REGULAR = "scratch/fonts/Outfit.ttf"
if not os.path.exists(FONT_REGULAR):
    FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = FONT_REGULAR

def get_font(size, bold=False):
    try:
        return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, int(size))
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

def add_ambient_orb(img, cx, cy, radius, color_hex, alpha=70):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=hex_to_rgba(color_hex, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius // 2))
    img.alpha_composite(overlay)

def draw_pill(draw, bbox, fill, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    r = (y1 - y0) // 2
    draw.rounded_rectangle(bbox, radius=r, fill=fill, outline=outline, width=width)

def draw_badge_header(draw, cx, cy, text, tag_color="#F87B68", bg_color="#FFFFFF", border_color="#FFD6CE"):
    font = get_font(22, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw = tw + 40
    ph = 44
    x0 = cx - pw // 2
    y0 = cy - ph // 2
    draw.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], radius=ph // 2, fill=hex_to_rgba(bg_color, 240), outline=hex_to_rgb(border_color), width=2)
    draw.text((cx - tw // 2, cy - th // 2 - 2), text, font=font, fill=hex_to_rgb(tag_color))

def draw_headline(draw, cx, start_y, line1_text, line1_color, line2_text, line2_color):
    font = get_font(68, bold=True)
    
    b1 = draw.textbbox((0, 0), line1_text, font=font)
    w1 = b1[2] - b1[0]
    draw.text((cx - w1 // 2, start_y), line1_text, font=font, fill=hex_to_rgb(line1_color))
    
    b2 = draw.textbbox((0, 0), line2_text, font=font)
    w2 = b2[2] - b2[0]
    draw.text((cx - w2 // 2, start_y + 80), line2_text, font=font, fill=hex_to_rgb(line2_color))

def draw_subtitle(draw, cx, y, text, color="#5A5552"):
    font = get_font(30, bold=False)
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text((cx - w // 2, y), text, font=font, fill=hex_to_rgb(color))

def load_or_crop_image(path, target_w, target_h):
    if os.path.exists(path):
        try:
            im = Image.open(path).convert('RGBA')
            # Scale & center crop
            sw, sh = im.size
            scale = max(target_w / sw, target_h / sh)
            nw, nh = int(sw * scale), int(sh * scale)
            im = im.resize((nw, nh), Image.Resampling.LANCZOS)
            x_off = (nw - target_w) // 2
            y_off = (nh - target_h) // 2
            return im.crop((x_off, y_off, x_off + target_w, y_off + target_h))
        except Exception as e:
            print("Failed loading", path, e)
    # Fallback placeholder
    fb = Image.new('RGBA', (target_w, target_h), hex_to_rgba("#FFCCBC"))
    return fb

def create_phone_frame(screen_img):
    sw, sh = screen_img.size
    border = 18
    fw = sw + border * 2
    fh = sh + border * 2
    
    # Outer frame
    frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    
    # Titanium rim
    fdraw.rounded_rectangle([0, 0, fw, fh], radius=62, fill=hex_to_rgb("#1C1E21"), outline=hex_to_rgb("#3E4347"), width=3)
    fdraw.rounded_rectangle([4, 4, fw - 4, fh - 4], radius=58, fill=hex_to_rgb("#0E1113"))
    
    # Paste screen with rounded corners mask
    screen_mask = Image.new('L', (sw, sh), 0)
    sdraw = ImageDraw.Draw(screen_mask)
    sdraw.rounded_rectangle([0, 0, sw, sh], radius=48, fill=255)
    
    frame.paste(screen_img, (border, border), screen_mask)
    
    # Dynamic Island notch
    di_w, di_h = 170, 36
    di_x = (fw - di_w) // 2
    di_y = border + 14
    fdraw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=di_h // 2, fill=(0, 0, 0, 255))
    # Camera circle & sensor
    fdraw.ellipse([di_x + 22, di_y + 10, di_x + 38, di_y + 26], fill=(15, 20, 25, 255), outline=(30, 45, 60, 255))
    fdraw.ellipse([di_x + di_w - 36, di_y + 12, di_x + di_w - 24, di_y + 24], fill=(12, 16, 20, 255))
    
    # Glass reflection highlight on phone edge
    fdraw.arc([2, 2, fw - 2, fh - 2], start=180, end=270, fill=(255, 255, 255, 60), width=2)
    
    return frame

def apply_phone_with_shadow(canvas, frame_img, pos_x, pos_y):
    fw, fh = frame_img.size
    shadow_padding = 60
    shadow_layer = Image.new('RGBA', (fw + shadow_padding * 2, fh + shadow_padding * 2), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer)
    sdraw.rounded_rectangle([shadow_padding + 10, shadow_padding + 25, shadow_padding + fw - 10, shadow_padding + fh + 35], radius=64, fill=(20, 15, 10, 80))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(32))
    
    canvas.alpha_composite(shadow_layer, (pos_x - shadow_padding, pos_y - shadow_padding))
    canvas.alpha_composite(frame_img, (pos_x, pos_y))

def draw_status_bar(draw, w, dark_mode=False):
    font = get_font(18, bold=True)
    tc = (255, 255, 255) if dark_mode else (30, 30, 30)
    # Time
    draw.text((42, 22), "9:41", font=font, fill=tc)
    
    # Signal / WiFi / Battery
    # Signal bars
    for i in range(4):
        bx = w - 120 + i * 6
        by = 28 - i * 3
        draw.rectangle([bx, by, bx + 4, 32], fill=tc)
    # WiFi arc
    draw.text((w - 85, 18), "📶", font=get_font(14), fill=tc)
    # Battery icon
    draw.rounded_rectangle([w - 60, 21, w - 28, 33], radius=3, outline=tc, width=2)
    draw.rectangle([w - 56, 24, w - 36, 30], fill=tc)
    draw.rectangle([w - 26, 24, w - 24, 29], fill=tc)

def draw_bottom_home_bar(draw, w, h, dark_mode=False):
    bc = (255, 255, 255, 140) if dark_mode else (20, 20, 20, 140)
    bar_w, bar_h = 220, 6
    bx = (w - bar_w) // 2
    by = h - 16
    draw.rounded_rectangle([bx, by, bx + bar_w, by + bar_h], radius=3, fill=bc)

def draw_floating_badge(canvas, x, y, width, height, icon_char, title, sub, icon_bg="#F87B68"):
    card = Image.new('RGBA', (width + 60, height + 60), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    
    # Shadow
    cdraw.rounded_rectangle([30, 34, 30 + width, 34 + height], radius=22, fill=(20, 20, 25, 60))
    card = card.filter(ImageFilter.GaussianBlur(14))
    
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle([30, 30, 30 + width, 30 + height], radius=22, fill=(255, 255, 255, 245), outline=hex_to_rgb("#F0EAE1"), width=2)
    
    # Icon circle
    circ_size = 48
    cx = 30 + 16
    cy = 30 + (height - circ_size) // 2
    cdraw.ellipse([cx, cy, cx + circ_size, cy + circ_size], fill=hex_to_rgb(icon_bg))
    
    # Icon text/emoji
    ifile_font = get_font(24, bold=True)
    cdraw.text((cx + 12, cy + 8), icon_char, font=ifile_font, fill=(255, 255, 255))
    
    # Title & Subtitle
    tx = cx + circ_size + 14
    t_font = get_font(22, bold=True)
    s_font = get_font(17, bold=False)
    cdraw.text((tx, cy + 3), title, font=t_font, fill=hex_to_rgb("#151817"))
    cdraw.text((tx, cy + 28), sub, font=s_font, fill=hex_to_rgb("#6B7280"))
    
    canvas.alpha_composite(card, (x - 30, y - 30))

print("Graphic primitives verified!")
