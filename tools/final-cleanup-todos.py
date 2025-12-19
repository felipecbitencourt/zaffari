#!/usr/bin/env python3
"""
Final cleanup - use pt.json to fill ALL remaining TODOs
"""

import json
from pathlib import Path

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_nested_value(data, path):
    """Get value from nested dict using dot notation"""
    keys = path.split('.')
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    return current

def set_nested_value(data, path, value):
    """Set value in nested dict using dot notation"""
    keys = path.split('.')
    current = data
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value

def find_and_replace_todos(data, pt_data, prefix="", stats=None):
    """Recursively find TODOs and replace with content from pt.json"""
    if stats is None:
        stats = {'replaced': 0}
    
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{prefix}.{key}" if prefix else key
            
            if value == "TODO: Adicionar tradução":
                # Try to find in pt.json
                pt_value = get_nested_value(pt_data, current_path)
                if pt_value and pt_value != "TODO: Adicionar tradução":
                    data[key] = pt_value
                    stats['replaced'] += 1
                    print(f"  ✅ {current_path}")
            elif isinstance(value, (dict, list)):
                find_and_replace_todos(value, pt_data, current_path, stats)
    
    elif isinstance(data, list):
        for i, item in enumerate(data):
            current_path = f"{prefix}[{i}]"
            if isinstance(item, (dict, list)):
                find_and_replace_todos(item, pt_data, current_path, stats)
    
    return stats

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    locale_dir = base_dir / 'locales' / 'pt'
    pt_json_file = locale_dir / 'pt.json'
    
    print("="*80)
    print("🎯 FINAL CLEANUP - USING PT.JSON TO FILL ALL TODOs")
    print("="*80)
    print()
    
    # Load pt.json
    print("📖 Loading pt.json...")
    pt_data = load_json(pt_json_file)
    
    # Find all JSON files with TODOs
    json_files = []
    for json_file in locale_dir.rglob('*.json'):
        if json_file.name == 'pt.json':
            continue
        try:
            data = load_json(json_file)
            content_str = json.dumps(data)
            if 'TODO: Adicionar tradução' in content_str:
                json_files.append(json_file)
        except:
            pass
    
    print(f"Found {len(json_files)} files with TODOs\n")
    
    total_replaced = 0
    
    for json_file in json_files:
        print(f"📝 Processing {json_file.relative_to(locale_dir)}...")
        data = load_json(json_file)
        
        stats = find_and_replace_todos(data, pt_data)
        
        if stats['replaced'] > 0:
            save_json(json_file, data)
            total_replaced += stats['replaced']
            print(f"   💾 Saved {stats['replaced']} replacements\n")
        else:
            print(f"   ⚠️  No matches found in pt.json\n")
    
    print("="*80)
    print(f"✅ Total TODOs replaced: {total_replaced}")
    print("="*80)

if __name__ == '__main__':
    main()
