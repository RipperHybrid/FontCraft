import os
import json
import logging

REPO_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_JSON = os.path.join(REPO_DIR, "fonts.json")
PREVIEW_FILE = os.path.join(REPO_DIR, "Preview.md")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
data = {}

allowed_extensions = {".ttf", ".otf"}

preview_content = "## Emojis and Fonts Images\n\n"

categories = ["Emoji", "Fonts"]

for category in sorted(categories):
    category_path = os.path.join(REPO_DIR, category)
    if os.path.isdir(category_path):
        data[category] = {}
        logging.info(f"Processing category: {category}")
        for folder in sorted(os.listdir(category_path), key=str.lower):
            folder_path = os.path.join(category_path, folder)
            if os.path.isdir(folder_path):
                files = [
                    f for f in sorted(os.listdir(folder_path), key=str.lower)
                    if os.path.isfile(os.path.join(folder_path, f)) and f.endswith(tuple(allowed_extensions))
                ]
                if files:
                    data[category][folder] = files
                    logging.info(f"Found {len(files)} valid files in folder: {folder}")
                else:
                    logging.info(f"No valid font files found in folder: {folder}")
                
                png_files = [
                    f for f in sorted(os.listdir(folder_path), key=str.lower)
                    if os.path.isfile(os.path.join(folder_path, f)) and f.endswith(".png")
                ]
                if png_files:
                    preview_content += f"### {folder}\n"
                    for png in png_files:
                        png_path = f"{category}/{folder}/{png}"
                        preview_content += f'- <img src="{png_path}" width="200px">\n'
                    preview_content += "\n"

with open(OUTPUT_JSON, "w") as json_file:
    json.dump(data, json_file, indent=2)

logging.info(f"Generated JSON: {OUTPUT_JSON}")

with open(PREVIEW_FILE, "w") as preview_file:
    preview_file.write(preview_content)

logging.info(f"Generated Preview.md: {PREVIEW_FILE}")