#!/usr/bin/env python3
"""
Enhanced extraction - capture ALL remaining TODOs
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

def extract_all_i18n(html_file):
    """Extract ALL data-i18n content with improved patterns"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    extracted = {}
    
    # Pattern 1: Simple text content
    # <tag data-i18n="key">Text</tag>
    pattern1 = r'data-i18n="([^"]+)"[^>]*>([^<]+)</'
    for key, text in re.findall(pattern1, content):
        clean_key = key.replace('[html]', '').replace('[placeholder]', '').strip()
        extracted[clean_key] = text.strip()
    
    # Pattern 2: HTML content with [html] prefix
    # More aggressive - capture everything until closing tag
    pattern2 = r'data-i18n="\[html\]([^"]+)"[^>]*>(.*?)</(?:div|p|span|li|summary|details)>'
    for key, html_text in re.findall(pattern2, content, re.DOTALL):
        clean_key = key.strip()
        # Clean HTML but keep structure
        cleaned = html_text.strip()
        # Remove excessive whitespace but keep line breaks
        cleaned = re.sub(r'\n\s+', '\n', cleaned)
        cleaned = re.sub(r'  +', ' ', cleaned)
        extracted[clean_key] = cleaned
    
    # Pattern 3: Attributes without content (like summary tags)
    pattern3 = r'<summary[^>]*data-i18n="([^"]+)"[^>]*>([^<]+)</summary>'
    for key, text in re.findall(pattern3, content):
        clean_key = key.replace('[html]', '').replace('[placeholder]', '').strip()
        if clean_key not in extracted:
            extracted[clean_key] = text.strip()
    
    return extracted

def get_nested_value(data, path):
    """Get value from nested dict"""
    keys = path.split('.')
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    return current

def set_nested_value(data, path, value):
    """Set value in nested dict"""
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
    
    # Files that still have TODOs
    files_to_process = {
        'm3-p3-trocas-sem-defeito.html': 'locales/pt/m3/p3.json',
        'm3-p5-trocas-com-defeito.html': 'locales/pt/m3/p5.json',
        'm3-p6-reclamacoes.html': 'locales/pt/m3/p6.json',
        'm3-p7-desafio-final.html': 'locales/pt/m3/p7.json',
        'm3-p8-encerramento.html': 'locales/pt/m3/p8.json',
        'm2-p5-whatsapp.html': 'locales/pt/m2/p5.json',
        'extras-questionarios.html': 'locales/pt/extras/quiz.json',
    }
    
    print("="*80)
    print("🔧 ENHANCED EXTRACTION - FILLING REMAINING TODOs")
    print("="*80)
    print()
    
    total_filled = 0
    
    for html_name, json_path in files_to_process.items():
        html_file = html_dir / html_name
        json_file = base_dir / json_path
        
        if not html_file.exists() or not json_file.exists():
            continue
        
        # Extract
        extracted = extract_all_i18n(html_file)
        
        # Load JSON
        json_data = load_json(json_file)
        
        # Fill TODOs
        filled_count = 0
        for key, value in extracted.items():
            current_value = get_nested_value(json_data, key)
            
            if current_value == "TODO: Adicionar tradução":
                set_nested_value(json_data, key, value)
                filled_count += 1
                total_filled += 1
        
        if filled_count > 0:
            save_json(json_file, json_data)
            print(f"✅ {json_file.name}: {filled_count} TODOs filled")
    
    print()
    print("="*80)
    print(f"Total TODOs filled: {total_filled}")
    print("="*80)

if __name__ == '__main__':
    main()
