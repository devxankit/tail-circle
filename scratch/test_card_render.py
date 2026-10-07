import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient(width, height, top_color, bottom_color):
    base = Image.new('RGBA', (width, height), top_color)
    top = Image.new('RGBA', (width, height), bottom_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        ratio = y / height
        val = int(255 * ratio)
        mask_data.extend([val] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

print("PIL test helper ready!")
