#!/usr/bin/env python3
"""
Final i18n cleanup - Copy content from main/locales/pt.json to fill ALL TODOs
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

def find_and_replace_todos(data, source_data, prefix="", stats=None):
    """Recursively find TODOs and replace with content from source"""
    if stats is None:
        stats = {'replaced': 0, 'not_found': 0}
    
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{prefix}.{key}" if prefix else key
            
            if value == "TODO: Adicionar tradução":
                # Try to find in source
                source_value = get_nested_value(source_data, current_path)
                if source_value and source_value != "TODO: Adicionar tradução":
                    data[key] = source_value
                    stats['replaced'] += 1
                    print(f"    ✅ {current_path}")
                else:
                    stats['not_found'] += 1
                    print(f"    ⚠️  {current_path} - NOT FOUND IN SOURCE")
            elif isinstance(value, (dict, list)):
                find_and_replace_todos(value, source_data, current_path, stats)
    
    elif isinstance(data, list):
        for i, item in enumerate(data):
            current_path = f"{prefix}[{i}]"
            if isinstance(item, (dict, list)):
                find_and_replace_todos(item, source_data, current_path, stats)
    
    return stats

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    locale_dir = base_dir / 'locales' / 'pt'
    main_pt_json = base_dir / 'main' / 'locales' / 'pt.json'
    
    print("="*80)
    print("🎯 FINAL i18n CLEANUP - USING MAIN/LOCALES/PT.JSON")
    print("="*80)
    print()
    
    # Load main pt.json
    print(f"📖 Loading source: {main_pt_json.name}...")
    source_data = load_json(main_pt_json)
    print(f"✅ Loaded {len(json.dumps(source_data))} characters of content\n")
    
    # Find all JSON files with TODOs
    print("🔍 Finding files with TODOs...")
    json_files = []
    for json_file in locale_dir.rglob('*.json'):
        try:
            data = load_json(json_file)
            content_str = json.dumps(data)
            todo_count = content_str.count('TODO: Adicionar tradução')
            if todo_count > 0:
                json_files.append((json_file, todo_count))
        except:
            pass
    
    print(f"Found {len(json_files)} files with TODOs:\n")
    for f, count in json_files:
        print(f"  📄 {f.relative_to(locale_dir)}: {count} TODOs")
    print()
    
    total_replaced = 0
    total_not_found = 0
    
    for json_file, _ in json_files:
        rel_path = json_file.relative_to(locale_dir)
        print(f"📝 Processing {rel_path}...")
        data = load_json(json_file)
        
        stats = find_and_replace_todos(data, source_data)
        
        if stats['replaced'] > 0:
            save_json(json_file, data)
            total_replaced += stats['replaced']
            total_not_found += stats['not_found']
            print(f"  💾 Saved: {stats['replaced']} replaced, {stats['not_found']} not found\n")
        else:
            print(f"  ⚠️  No TODOs replaced\n")
    
    print("="*80)
    print(f"✅ Total TODOs replaced: {total_replaced}")
    print(f"⚠️  Total not found in source: {total_not_found}")
    print("="*80)

if __name__ == '__main__':
    main()
