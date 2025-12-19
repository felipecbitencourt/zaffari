#!/usr/bin/env python3
"""
Use pt.json to fill missing i18n keys
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

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    locale_dir = base_dir / 'locales' / 'pt'
    pt_json_file = locale_dir / 'pt.json'
    report_file = base_dir / 'tools' / 'i18n-issues-report.json'
    
    # Load pt.json
    print("📖 Loading pt.json...")
    pt_data = load_json(pt_json_file)
    
    # Load report
    report = load_json(report_file)
    
    print("="*80)
    print("🔧 FILLING MISSING KEYS FROM pt.json")
    print("="*80)
    print()
    
    total_filled = 0
    files_modified = set()
    
    for issue in report['issues']:
        json_file = locale_dir / issue['json']
        json_data = load_json(json_file)
        
        filled_count = 0
        
        for mk in issue['missing']:
            html_key = mk['html_key']
            json_key = mk['json_key']
            
            # Remove special prefixes for lookup
            clean_key = html_key.replace('[html]', '').replace('[placeholder]', '')
            
            # Try to find value in pt.json
            value = get_nested_value(pt_data, clean_key)
            
            if value is not None:
                # Remove prefixes from json_key too
                clean_json_key = json_key.replace('[html]', '').replace('[placeholder]', '')
                set_nested_value(json_data, clean_json_key, value)
                filled_count += 1
                total_filled += 1
        
        if filled_count > 0:
            save_json(json_file, json_data)
            files_modified.add(str(json_file))
            print(f"✅ {issue['title']}: {filled_count} keys filled")
    
    print()
    print("="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Total keys filled: {total_filled}")
    print(f"Files modified: {len(files_modified)}")
    print("="*80)

if __name__ == '__main__':
    main()
