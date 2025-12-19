#!/usr/bin/env python3
"""
Extract content from ajustehtml folder and fill missing i18n keys
"""

import json
import re
from pathlib import Path

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_data_i18n_content(html_file):
    """Extract content from data-i18n attributes in HTML"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    extracted = {}
    
    # Pattern for data-i18n="key" with content
    # Matches: <tag data-i18n="key">Content</tag>
    pattern = r'data-i18n="([^"]+)"[^>]*>([^<]+)</'
    matches = re.findall(pattern, content)
    
    for key, text in matches:
        # Clean key (remove [html] prefix if present)
        clean_key = key.replace('[html]', '').replace('[placeholder]', '')
        extracted[clean_key] = text.strip()
    
    # Pattern for data-i18n="[html]key" with HTML content
    # Matches: <tag data-i18n="[html]key">...HTML...</tag>
    html_pattern = r'data-i18n="\[html\]([^"]+)"[^>]*>(.*?)</(?:div|p|span|summary|details)>'
    html_matches = re.findall(html_pattern, content, re.DOTALL)
    
    for key, html_content in html_matches:
        clean_key = key.strip()
        # Clean up the HTML content
        cleaned_html = html_content.strip()
        extracted[clean_key] = cleaned_html
    
    return extracted

def map_html_to_json(html_filename):
    """Map HTML filename to corresponding JSON file"""
    # Remove .html and pt/ prefix
    base = html_filename.replace('pt/', '').replace('.html', '')
    
    # Map to JSON structure
    mappings = {
        # Module 3
        'm3-p1-intro-cdc': 'locales/pt/m3/p1.json',
        'm3-p2-conceitos': 'locales/pt/m3/p2.json',
        'm3-p3-trocas-sem-defeito': 'locales/pt/m3/p3.json',
        'm3-p5-trocas-com-defeito': 'locales/pt/m3/p5.json',
        'm3-p6-reclamacoes': 'locales/pt/m3/p6.json',
        'm3-p7-desafio-final': 'locales/pt/m3/p7.json',
        'm3-p8-encerramento': 'locales/pt/m3/p8.json',
        # Module 2
        'm2-p2-intranet': 'locales/pt/m2/p2.json',
        'm2-p5-whatsapp': 'locales/pt/m2/p5.json',
        # Extras
        'extras-flashcards': 'locales/pt/extras/flashcards.json',
    }
    
    return mappings.get(base)

def set_nested_value(data, path, value):
    """Set value in nested dict using dot notation"""
    keys = path.split('.')
    current = data
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    html_dir = base_dir / 'ajustehtml' / 'pt'
    
    print("="*80)
    print("🔧 EXTRACTING CONTENT FROM AJUSTEHTML FOLDER")
    print("="*80)
    print()
    
    total_filled = 0
    files_processed = 0
    
    # Get all HTML files
    html_files = sorted(html_dir.glob('*.html'))
    
    for html_file in html_files:
        json_path = map_html_to_json(html_file.name)
        
        if not json_path:
            continue
        
        json_file = base_dir / json_path
        
        if not json_file.exists():
            print(f"⚠️  JSON not found: {json_path}")
            continue
        
        # Extract content from HTML
        extracted = extract_data_i18n_content(html_file)
        
        if not extracted:
            continue
        
        # Load JSON
        json_data = load_json(json_file)
        
        # Fill missing keys
        filled_count = 0
        for key, value in extracted.items():
            # Check if this key has a TODO placeholder
            current_value = None
            try:
                keys = key.split('.')
                current = json_data
                for k in keys:
                    if isinstance(current, dict) and k in current:
                        current = current[k]
                    else:
                        current = None
                        break
                current_value = current
            except:
                pass
            
            # Only fill if it's a TODO or missing
            if current_value == "TODO: Adicionar tradução" or current_value is None:
                set_nested_value(json_data, key, value)
                filled_count += 1
                total_filled += 1
        
        if filled_count > 0:
            save_json(json_file, json_data)
            files_processed += 1
            print(f"✅ {json_file.name}: {filled_count} keys filled")
    
    print()
    print("="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Files processed: {files_processed}")
    print(f"Total keys filled: {total_filled}")
    print("="*80)

if __name__ == '__main__':
    main()
