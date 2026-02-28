import os
import io
import re
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile
from django.conf import settings

def remove_emojis(text):
    return text.encode('ascii', 'ignore').decode('ascii')

def create_gradient(width, height, top_color, bottom_color):
    """
    Creates a simple vertical gradient image.
    """
    base = Image.new('RGB', (width, height), top_color)
    top = Image.new('RGB', (width, height), top_color)
    bottom = Image.new('RGB', (width, height), bottom_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    
    for y in range(height):
        # Linear interpolation
        mask_data.extend([int(255 * (y / height))] * width)
        
    mask.putdata(mask_data)
    base.paste(bottom, (0, 0), mask)
    return base

def generate_story_image(user, quests):
    """
    Generates a rich collage image for the user's completed daily quests.
    """
    # Canvas Settings
    width = 1080
    height = 1920
    
    # 1. Background Gradient (Violet to Deep Purple/Blue)
    # Violet-600: (124, 58, 237) -> Slate-900: (15, 23, 42)
    img = create_gradient(width, height, (124, 58, 237), (15, 23, 42))
    draw = ImageDraw.Draw(img, 'RGBA') # Enable RGBA for transparency
    
    # Load Fonts
    try:
        # Increased sizes for better visual hierarchy
        title_font = ImageFont.truetype("arial.ttf", 100)
        subtitle_font = ImageFont.truetype("arial.ttf", 45)
        header_font = ImageFont.truetype("arial.ttf", 60)
        text_font = ImageFont.truetype("arial.ttf", 50)
    except IOError:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        header_font = ImageFont.load_default()
        text_font = ImageFont.load_default()

    # 2. Draw "Glass" Card Background
    card_margin = 60
    card_top = 100
    card_height = height - (card_top * 2) 
    card_rect = [card_margin, card_top, width - card_margin, card_top + card_height]
    
    # Semi-transparent white
    draw.rectangle(card_rect, fill=(255, 255, 255, 25), outline=(255, 255, 255, 50), width=3)

    # 3. Header Section (Centered)
    title_text = "Daily Quest"
    # Calculate text width for center alignment
    try:
        title_w = draw.textlength(title_text, font=title_font)
    except:
        title_w = title_font.getlength(title_text)
        
    draw.text(((width - title_w) / 2, 200), title_text, font=title_font, fill=(255, 255, 255))
    
    subtitle = "Design your day. Conquer your goals."
    try:
        sub_w = draw.textlength(subtitle, font=subtitle_font)
    except:
        sub_w = subtitle_font.getlength(subtitle)
    draw.text(((width - sub_w) / 2, 320), subtitle, font=subtitle_font, fill=(230, 230, 250))

    # 4. Quest List
    # Deduplicate
    seen_titles = set()
    unique_quests = []
    for q in quests:
        if q.quest.title not in seen_titles:
            unique_quests.append(q)
            seen_titles.add(q.quest.title)
    
    start_y = 500
    draw.text((100, start_y), "Completed Targets:", font=header_font, fill=(255, 215, 0)) # Gold color
    y_text = start_y + 100
    
    for i, q in enumerate(unique_quests[:6]):
        quest_title = remove_emojis(q.quest.title)
        if len(quest_title) > 35:
            quest_title = quest_title[:32] + "..."
            
        # Draw Bullet
        draw.text((100, y_text), "•", font=text_font, fill=(167, 243, 208)) # Light Green
        # Draw Text
        draw.text((150, y_text), quest_title, font=text_font, fill=(255, 255, 255))
        y_text += 90

    # Draw Proof Collage area
    # Starting y for collage
    collage_y = y_text + 100
    
    # Calculate grid size
    # Let's say we put up to 4 images
    proofs = [q.proof_media for q in quests if q.proof_media]
    
    if proofs:
        grid_start_y = collage_y
        grid_cols = 2
        # Max image size
        cell_w = (width - 200) // grid_cols
        cell_h = cell_w 
        
        for i, proof in enumerate(proofs[:4]): # Max 4 proofs
            try:
                # Open image
                proof_path = proof.path
                if not os.path.exists(proof_path):
                    continue
                
                # Check media type by extension (simplistic)
                ext = os.path.splitext(proof_path)[1].lower()
                if ext in ['.jpg', '.jpeg', '.png', '.webp']:
                    with Image.open(proof_path) as p_img:
                        # Resize and center crop
                        p_img = p_img.convert('RGB')
                        
                        # Resize to cover
                        img_ratio = p_img.width / p_img.height
                        cell_ratio = cell_w / cell_h
                        
                        if img_ratio > cell_ratio:
                            # Image is wider
                            resize_h = cell_h
                            resize_w = int(cell_h * img_ratio)
                        else:
                            # Image is taller
                            resize_w = cell_w
                            resize_h = int(cell_w / img_ratio)
                            
                        p_img = p_img.resize((resize_w, resize_h), Image.Resampling.LANCZOS)
                        
                        # Crop center
                        left = (resize_w - cell_w) / 2
                        top = (resize_h - cell_h) / 2
                        p_img = p_img.crop((left, top, left + cell_w, top + cell_h))
                        
                        # Paste
                        row = i // grid_cols
                        col = i % grid_cols
                        
                        x_pos = 100 + (col * (cell_w + 20))
                        y_pos = grid_start_y + (row * (cell_h + 20))
                        
                        img.paste(p_img, (x_pos, y_pos))
                        
                        # Draw border
                        draw.rectangle([x_pos, y_pos, x_pos+cell_w, y_pos+cell_h], outline=(255,255,255), width=5)
                        
            except Exception as e:
                print(f"Error processing image {proof}: {e}")
                # Maybe draw a placeholder?
                pass

    # Save to BytesIO
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85)
    return ContentFile(output.getvalue())
