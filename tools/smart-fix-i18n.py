#!/usr/bin/env python3
"""
Smart i18n Auto-Fixer
Analyzes patterns and intelligently fixes missing i18n keys
"""

import json
import re
from pathlib import Path
from collections import defaultdict

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def set_nested_key(data, key_path, value):
    """Set a nested key, removing special prefixes"""
    key_path = key_path.replace('[html]', '').replace('[placeholder]', '')
    keys = key_path.split('.')
    current = data
    
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value

def get_nested_key(data, key_path):
    """Get a nested key value"""
    key_path = key_path.replace('[html]', '').replace('[placeholder]', '')
    keys = key_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    return current

def analyze_patterns(report):
    """Analyze patterns in missing keys"""
    patterns = {
        'wrong_prefix': [],  # Keys with wrong module prefix
        'simple_copy': [],   # Keys that might exist elsewhere
        'hub_metrics': [],   # Special case: hub metrics card
        'global_keys': [],   # Keys that should be in global.json
    }
    
    for issue in report['issues']:
        for mk in issue['missing']:
            html_key = mk['html_key']
            json_key = mk['json_key']
            
            # Check for wrong prefix (e.g., m3.p1 in m3/p4.json)
            if 'm1.p' in html_key or 'm2.p' in html_key or 'm3.p' in html_key:
                json_file = issue['json']
                expected_prefix = json_file.replace('.json', '').replace('/', '.p')
                if not html_key.startswith(expected_prefix):
                    patterns['wrong_prefix'].append({
                        'issue': issue,
                        'key': mk,
                        'expected_prefix': expected_prefix
                    })
            
            # Check for global keys
            if 'global.' in html_key:
                patterns['global_keys'].append({
                    'issue': issue,
                    'key': mk
                })
            
            # Check for hub metrics
            if 'extras.hub.cards.metrics' in html_key:
                patterns['hub_metrics'].append({
                    'issue': issue,
                    'key': mk
                })
    
    return patterns

def fix_wrong_prefixes(base_dir, patterns):
    """Fix keys with wrong module prefixes by copying from correct files"""
    locale_dir = base_dir / 'locales' / 'pt'
    fixed = 0
    
    for item in patterns['wrong_prefix']:
        issue = item['issue']
        mk = item['key']
        html_key = mk['html_key']
        
        # Extract the actual module/page from HTML key
        match = re.match(r'(m\d\.p\d+)\.(.*)', html_key)
        if not match:
            continue
        
        source_prefix = match.group(1)
        content_key = match.group(2)
        
        # Try to find source JSON
        source_json_path = locale_dir / (source_prefix.replace('.p', '/p') + '.json')
        
        if source_json_path.exists():
            source_data = load_json(source_json_path)
            
            # Try to get the value from source
            value = get_nested_key(source_data, content_key)
            
            if value:
                # Add to target JSON
                target_json_path = locale_dir / issue['json']
                target_data = load_json(target_json_path)
                
                # Use the correct key path (without wrong prefix)
                set_nested_key(target_data, mk['json_key'], value)
                save_json(target_json_path, target_data)
                fixed += 1
                print(f"   ✅ Copied from {source_prefix}: {content_key}")
    
    return fixed

def fix_hub_metrics(base_dir, patterns):
    """Fix hub metrics card keys"""
    locale_dir = base_dir / 'locales' / 'pt'
    fixed = 0
    
    if patterns['hub_metrics']:
        hub_json = locale_dir / 'extras' / 'hub.json'
        hub_data = load_json(hub_json)
        
        # Add metrics card
        if 'cards' not in hub_data:
            hub_data['cards'] = {}
        
        hub_data['cards']['metrics'] = {
            'title': 'Meu Desempenho',
            'desc': 'Acompanhe seu progresso e métricas de aprendizado'
        }
        
        save_json(hub_json, hub_data)
        fixed += len(patterns['hub_metrics'])
        print(f"   ✅ Added metrics card to hub.json")
    
    return fixed

def fix_global_keys(base_dir, patterns):
    """Add missing global keys"""
    locale_dir = base_dir / 'locales' / 'pt'
    fixed = 0
    
    if patterns['global_keys']:
        global_json = locale_dir / 'global.json'
        global_data = load_json(global_json)
        
        # Check what's missing
        for item in patterns['global_keys']:
            mk = item['key']
            key_name = mk['html_key'].replace('global.', '')
            
            if key_name not in global_data:
                # Add common global keys
                if key_name == 'btn_anterior':
                    global_data[key_name] = 'Anterior'
                    fixed += 1
                elif key_name == 'btn_proximo':
                    global_data[key_name] = 'Próximo'
                    fixed += 1
        
        if fixed > 0:
            save_json(global_json, global_data)
            print(f"   ✅ Added {fixed} keys to global.json")
    
    return fixed

def add_placeholders_for_remaining(base_dir, report, fixed_count):
    """Add placeholder text for remaining missing keys"""
    locale_dir = base_dir / 'locales' / 'pt'
    added = 0
    
    for issue in report['issues']:
        json_file = locale_dir / issue['json']
        json_data = load_json(json_file)
        modified = False
        
        for mk in issue['missing']:
            json_key = mk['json_key']
            
            # Check if key still doesn't exist
            if get_nested_key(json_data, json_key) is None:
                # Add placeholder
                set_nested_key(json_data, json_key, "TODO: Adicionar tradução")
                added += 1
                modified = True
        
        if modified:
            save_json(json_file, json_data)
    
    return added

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    report_file = base_dir / 'tools' / 'i18n-issues-report.json'
    
    # Load report
    with open(report_file, 'r', encoding='utf-8') as f:
        report = json.load(f)
    
    print("="*80)
    print("🤖 SMART i18n AUTO-FIXER")
    print("="*80)
    print()
    
    # Analyze patterns
    print("📊 Analyzing patterns...")
    patterns = analyze_patterns(report)
    
    print(f"   • Wrong prefixes: {len(patterns['wrong_prefix'])}")
    print(f"   • Hub metrics: {len(patterns['hub_metrics'])}")
    print(f"   • Global keys: {len(patterns['global_keys'])}")
    print()
    
    total_fixed = 0
    
    # Fix wrong prefixes
    if patterns['wrong_prefix']:
        print("🔧 Fixing wrong prefixes...")
        fixed = fix_wrong_prefixes(base_dir, patterns)
        total_fixed += fixed
        print()
    
    # Fix hub metrics
    if patterns['hub_metrics']:
        print("🔧 Fixing hub metrics...")
        fixed = fix_hub_metrics(base_dir, patterns)
        total_fixed += fixed
        print()
    
    # Fix global keys
    if patterns['global_keys']:
        print("🔧 Fixing global keys...")
        fixed = fix_global_keys(base_dir, patterns)
        total_fixed += fixed
        print()
    
    # Add placeholders for remaining
    print("📝 Adding placeholders for remaining keys...")
    added = add_placeholders_for_remaining(base_dir, report, total_fixed)
    print(f"   ✅ Added {added} placeholder entries")
    print()
    
    print("="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Intelligently fixed: {total_fixed}")
    print(f"Placeholders added: {added}")
    print(f"Total processed: {total_fixed + added}")
    print(f"Remaining to manually fill: {added}")
    print("="*80)
    print()
    print("💡 Next steps:")
    print("   1. Run validation again to confirm fixes")
    print("   2. Search for 'TODO: Adicionar tradução' in JSON files")
    print("   3. Replace placeholders with actual content")

if __name__ == '__main__':
    main()
