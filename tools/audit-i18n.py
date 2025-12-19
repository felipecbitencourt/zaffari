#!/usr/bin/env python3
"""
i18n Audit Script
Checks all HTML files for data-i18n attributes and verifies they exist in corresponding JSON files
"""

import json
import re
import os
from pathlib import Path
from collections import defaultdict

def extract_i18n_keys_from_html(html_file):
    """Extract all data-i18n keys from an HTML file"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all data-i18n="key" attributes
    pattern = r'data-i18n="([^"]+)"'
    keys = re.findall(pattern, content)
    return keys

def load_json_file(json_file):
    """Load a JSON file and return its content"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {json_file}: {e}")
        return {}

def check_key_exists(data, key_path):
    """Check if a nested key exists in JSON data"""
    keys = key_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return False
    return True

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    html_dir = base_dir / 'paginas' / 'pt'
    locale_dir = base_dir / 'locales' / 'pt'
    manifest_file = base_dir / 'pages-manifest.json'
    
    # Load pages manifest to get mountPoints
    with open(manifest_file, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # Create mapping of page IDs to mountPoints
    page_to_mount = {}
    for page in manifest['pages']:
        page_id = page['id']
        mount_point = page.get('mountPoint', '')
        translation_file = page.get('translation', '')
        page_to_mount[page_id] = {
            'mountPoint': mount_point,
            'translation': translation_file
        }
    
    # Find all HTML files
    html_files = list(html_dir.rglob('*.html'))
    
    issues = []
    total_keys_checked = 0
    
    for html_file in html_files:
        # Extract i18n keys from HTML
        keys = extract_i18n_keys_from_html(html_file)
        if not keys:
            continue
        
        # Try to find corresponding page in manifest
        relative_path = html_file.relative_to(html_dir)
        page_id = None
        
        # Try to match by file path
        for pid, info in page_to_mount.items():
            if info['translation']:
                # Extract expected path from translation file
                expected_path = info['translation'].replace('.json', '.html')
                if str(relative_path) == expected_path or str(relative_path).endswith(expected_path.split('/')[-1]):
                    page_id = pid
                    break
        
        if not page_id:
            print(f"⚠️  No manifest entry found for: {relative_path}")
            continue
        
        # Load corresponding JSON file
        translation_file = page_to_mount[page_id]['translation']
        json_file = locale_dir / translation_file
        
        if not json_file.exists():
            print(f"❌ JSON file not found: {json_file}")
            continue
        
        json_data = load_json_file(json_file)
        mount_point = page_to_mount[page_id]['mountPoint']
        
        # Check each key
        for key in keys:
            total_keys_checked += 1
            
            # Remove mountPoint prefix if present
            if key.startswith(mount_point + '.'):
                check_key = key[len(mount_point) + 1:]
            else:
                check_key = key
            
            if not check_key_exists(json_data, check_key):
                issues.append({
                    'file': str(relative_path),
                    'key': key,
                    'json': str(translation_file),
                    'expected_key': check_key
                })
    
    # Print results
    print(f"\n{'='*80}")
    print(f"i18n Audit Results")
    print(f"{'='*80}")
    print(f"Total keys checked: {total_keys_checked}")
    print(f"Issues found: {len(issues)}")
    print(f"{'='*80}\n")
    
    if issues:
        print("❌ ISSUES FOUND:\n")
        for issue in issues:
            print(f"File: {issue['file']}")
            print(f"  Key in HTML: {issue['key']}")
            print(f"  Expected in JSON ({issue['json']}): {issue['expected_key']}")
            print()
    else:
        print("✅ No issues found! All i18n keys are properly mapped.")

if __name__ == '__main__':
    main()
