#!/usr/bin/env python3
"""
Remove duplicate structures with TODOs from JSON files
"""

import json
from pathlib import Path

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def remove_todo_keys(data, prefix=""):
    """Recursively remove keys that only contain TODO values"""
    if isinstance(data, dict):
        keys_to_remove = []
        for key, value in list(data.items()):
            current_path = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                # Check if ALL values in this dict are TODOs
                all_todos = all(
                    v == "TODO: Adicionar tradução" 
                    for v in value.values() 
                    if isinstance(v, str)
                )
                
                if all_todos and len(value) > 0:
                    keys_to_remove.append(key)
                    print(f"    🗑️  Removing duplicate structure: {current_path}")
                else:
                    # Recursively clean nested dicts
                    remove_todo_keys(value, current_path)
            elif isinstance(value, list):
                remove_todo_keys(value, current_path)
        
        # Remove identified keys
        for key in keys_to_remove:
            del data[key]
    
    elif isinstance(data, list):
        for i, item in enumerate(data):
            current_path = f"{prefix}[{i}]"
            if isinstance(item, (dict, list)):
                remove_todo_keys(item, current_path)

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    locale_dir = base_dir / 'locales' / 'pt'
    
    print("="*80)
    print("🧹 CLEANING DUPLICATE TODO STRUCTURES")
    print("="*80)
    print()
    
    # Find all JSON files with TODOs
    json_files = []
    for json_file in locale_dir.rglob('*.json'):
        try:
            data = load_json(json_file)
            content_str = json.dumps(data)
            if 'TODO: Adicionar tradução' in content_str:
                json_files.append(json_file)
        except:
            pass
    
    print(f"Found {len(json_files)} files with TODOs\n")
    
    total_cleaned = 0
    
    for json_file in json_files:
        rel_path = json_file.relative_to(locale_dir)
        print(f"📝 Processing {rel_path}...")
        
        data = load_json(json_file)
        original_str = json.dumps(data)
        
        remove_todo_keys(data)
        
        new_str = json.dumps(data)
        if original_str != new_str:
            save_json(json_file, data)
            total_cleaned += 1
            print(f"  ✅ Cleaned and saved\n")
        else:
            print(f"  ℹ️  No duplicate structures found\n")
    
    print("="*80)
    print(f"✅ Total files cleaned: {total_cleaned}")
    print("="*80)

if __name__ == '__main__':
    main()
