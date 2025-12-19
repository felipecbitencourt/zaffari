#!/usr/bin/env python3
"""
Auto-fix i18n Issues (No external dependencies)
Automatically adds missing keys to JSON files by extracting content from HTML using regex
"""

import json
import re
from pathlib import Path

def load_json(file_path):
    """Load JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    """Save JSON file with proper formatting"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def set_nested_key(data, key_path, value):
    """Set a nested key in dictionary"""
    # Remove special prefixes
    key_path = key_path.replace('[html]', '').replace('[placeholder]', '')
    
    keys = key_path.split('.')
    current = data
    
    for i, key in enumerate(keys[:-1]):
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value

def extract_content_from_html(html_file, key):
    """Extract content from HTML element with data-i18n attribute"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove [html], [placeholder] prefixes for searching
    search_key = key.replace('[html]', '').replace('[placeholder]', '')
    search_key_escaped = re.escape(search_key)
    
    # Try to find the element with this data-i18n attribute
    if '[placeholder]' in key:
        # Look for placeholder attribute
        pattern = rf'data-i18n="{search_key_escaped}"[^>]*placeholder="([^"]*)"'
        match = re.search(pattern, content)
        if match:
            return match.group(1)
    
    # Look for content between tags
    # Pattern: data-i18n="key">content</tag>
    pattern = rf'data-i18n="{search_key_escaped}"[^>]*>(.*?)</[^>]+>'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        text = match.group(1).strip()
        # If [html] prefix, keep HTML tags, otherwise strip them
        if '[html]' not in key:
            # Remove HTML tags
            text = re.sub(r'<[^>]+>', '', text)
            text = text.strip()
        return text
    
    return None

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    locale_dir = base_dir / 'locales' / 'pt'
    html_dir = base_dir / 'paginas' / 'pt'
    report_file = base_dir / 'tools' / 'i18n-issues-report.json'
    
    # Load report
    with open(report_file, 'r', encoding='utf-8') as f:
        report = json.load(f)
    
    total_fixed = 0
    total_failed = 0
    files_modified = set()
    
    print("="*80)
    print("🔧 AUTO-FIXING i18n ISSUES")
    print("="*80)
    print()
    
    for issue in report['issues']:
        title = issue['title']
        html_file = base_dir / issue['file']
        json_file = locale_dir / issue['json']
        missing_keys = issue['missing']
        
        print(f"📄 {title}")
        print(f"   JSON: {issue['json']}")
        print(f"   Fixing {len(missing_keys)} keys...")
        
        # Load JSON
        json_data = load_json(json_file)
        
        # Fix each missing key
        fixed_count = 0
        failed_count = 0
        for mk in missing_keys:
            json_key = mk['json_key']
            html_key = mk['html_key']
            
            # Extract content from HTML
            content = extract_content_from_html(html_file, html_key)
            
            if content:
                # Add to JSON
                set_nested_key(json_data, json_key, content)
                fixed_count += 1
                total_fixed += 1
            else:
                failed_count += 1
                total_failed += 1
                print(f"   ⚠️  Could not extract: {html_key}")
        
        # Save JSON
        if fixed_count > 0:
            save_json(json_file, json_data)
            files_modified.add(str(json_file))
            print(f"   ✅ Fixed {fixed_count}/{len(missing_keys)} keys", end="")
            if failed_count > 0:
                print(f" ({failed_count} failed)")
            else:
                print()
        
        print()
    
    print("="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Total keys fixed: {total_fixed}")
    print(f"Total keys failed: {total_failed}")
    print(f"Files modified: {len(files_modified)}")
    print("="*80)
    
    if files_modified:
        print("\n📝 Modified files:")
        for f in sorted(files_modified):
            rel_path = Path(f).relative_to(locale_dir)
            print(f"   • {rel_path}")

if __name__ == '__main__':
    main()
