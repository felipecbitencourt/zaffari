#!/usr/bin/env python3
"""
Simple verification script to check if my audit is correct
"""

import json
import re
from pathlib import Path

def extract_i18n_keys_from_html(html_file):
    """Extract all data-i18n keys from an HTML file"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = r'data-i18n=\"([^\"]+)\"'
    keys = re.findall(pattern, content)
    return keys

def check_key_exists(data, key_path):
    """Check if a nested key exists in JSON data"""
    key_path = key_path.replace('[html]', '').replace('[placeholder]', '')
    keys = key_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return False
    return True

# Test with m1/p1
base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
html_file = base_dir / 'paginas/pt/m1/p1.html'
json_file_pt = base_dir / 'locales/pt/m1/p1.json'
json_file_en = base_dir / 'locales/en/m1/p1.json'

print("="*80)
print("VERIFICAÇÃO: m1/p1.html vs m1/p1.json")
print("="*80)
print()

# Extract keys from HTML
html_keys = extract_i18n_keys_from_html(html_file)
print(f"Chaves encontradas no HTML: {len(html_keys)}")
print("Primeiras 10 chaves:")
for i, key in enumerate(html_keys[:10], 1):
    print(f"  {i}. {key}")
print()

# Load JSONs
with open(json_file_pt) as f:
    json_pt = json.load(f)

with open(json_file_en) as f:
    json_en = json.load(f)

# Check PT
print("PORTUGUÊS (PT):")
missing_pt = []
for key in html_keys:
    # Remove mount point prefix if present
    check_key = key.replace('m1.p1.', '')
    if not check_key_exists(json_pt, check_key):
        missing_pt.append(key)

if missing_pt:
    print(f"  ❌ {len(missing_pt)} chaves faltando:")
    for key in missing_pt[:5]:
        print(f"     - {key}")
else:
    print(f"  ✅ Todas as chaves presentes!")
print()

# Check EN
print("INGLÊS (EN):")
missing_en = []
for key in html_keys:
    check_key = key.replace('m1.p1.', '')
    if not check_key_exists(json_en, check_key):
        missing_en.append(key)

if missing_en:
    print(f"  ❌ {len(missing_en)} chaves faltando:")
    for key in missing_en[:5]:
        print(f"     - {key}")
else:
    print(f"  ✅ Todas as chaves presentes!")
print()

print("="*80)
