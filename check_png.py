import sys
from PIL import Image

def check_transparency(image_path):
    img = Image.open(image_path)
    img = img.convert("RGBA")
    width, height = img.size
    print(f"Image {image_path}: {width}x{height}")
    
    # Check rows for transparency
    transparent_rows = 0
    data = img.getdata()
    
    for y in range(height):
        is_transparent = True
        for x in range(width):
            r, g, b, a = data[y * width + x]
            if a != 0:
                is_transparent = False
                break
        if is_transparent:
            transparent_rows += 1
            
    print(f"Total transparent rows: {transparent_rows} out of {height}")
    
    # Check top half vs bottom half
    top_transparent = 0
    for y in range(height // 2):
        is_transparent = True
        for x in range(width):
            r, g, b, a = data[y * width + x]
            if a != 0:
                is_transparent = False
                break
        if is_transparent:
            top_transparent += 1
            
    bottom_transparent = 0
    for y in range(height // 2, height):
        is_transparent = True
        for x in range(width):
            r, g, b, a = data[y * width + x]
            if a != 0:
                is_transparent = False
                break
        if is_transparent:
            bottom_transparent += 1
            
    print(f"Top half transparent rows: {top_transparent}")
    print(f"Bottom half transparent rows: {bottom_transparent}")

if __name__ == "__main__":
    check_transparency("test_tile1.png")
    check_transparency("test_tile2.png")
