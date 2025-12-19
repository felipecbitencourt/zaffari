#!/usr/bin/env python3
"""
i18n Audit for All Languages
Checks PT HTML files against all language JSON files
"""

import json
import re
from pathlib import Path
from collections import defaultdict

def extract_i18n_keys_from_html(html_file):
    """Extract all data-i18n keys from an HTML file"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all data-i18n="key" attributes
    pattern = r'data-i18n=\"([^\"]+)\"'
    keys = re.findall(pattern, content)
    return keys

def load_json_file(json_file):
    """Load a JSON file and return its content"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return {}

def check_key_exists(data, key_path):
    """Check if a nested key exists in JSON data"""
    # Remove special prefixes for checking
    key_path = key_path.replace('[html]', '').replace('[placeholder]', '')
    
    keys = key_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return False
    return True

def get_page_info(manifest, html_path):
    """Get page info from manifest"""
    # Normalize the html_path to use forward slashes
    html_path_str = str(html_path).replace('\\', '/')
    
    for page in manifest['pages']:
        translation = page.get('translation', '')
        if translation:
            # Get the expected HTML path from the translation
            expected_html = translation.replace('.json', '.html')
            
            # Match the full relative path, not just the filename
            if html_path_str == expected_html or html_path_str.endswith('/' + expected_html):
                title = page.get('title', 'Unknown')
                # Handle both string and dict titles
                if isinstance(title, dict):
                    title = title.get('pt', 'Unknown')
                return {
                    'id': page['id'],
                    'title': title,
                    'mountPoint': page.get('mountPoint', ''),
                    'translation': translation
                }
    return None

def audit_language(base_dir, language):
    """Audit a specific language"""
    # HTML is always in PT
    html_dir = base_dir / 'paginas' / 'pt'
    locale_dir = base_dir / 'locales' / language
    manifest_file = base_dir / 'pages-manifest.json'
    
    # Check if locale directory exists
    if not locale_dir.exists():
        return {
            'language': language,
            'exists': False,
            'total_pages': 0,
            'pages_ok': 0,
            'pages_with_issues': 0,
            'total_missing_keys': 0,
            'issues': []
        }
    
    # Load manifest
    with open(manifest_file, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # Find all HTML files
    html_files = list(html_dir.rglob('*.html'))
    
    issues = []
    pages_ok = 0
    total_missing = 0
    
    for html_file in html_files:
        # Extract i18n keys from HTML
        keys = extract_i18n_keys_from_html(html_file)
        if not keys:
            continue
        
        # Get page info
        relative_path = html_file.relative_to(html_dir)
        page_info = get_page_info(manifest, relative_path)
        
        if not page_info:
            continue
        
        # Load corresponding JSON file
        json_file = locale_dir / page_info['translation']
        
        if not json_file.exists():
            issues.append({
                'title': page_info['title'],
                'file': str(relative_path),
                'json': page_info['translation'],
                'missing': [{'html_key': k, 'json_key': k} for k in keys],
                'json_missing': True
            })
            total_missing += len(keys)
            continue
        
        json_data = load_json_file(json_file)
        mount_point = page_info['mountPoint']
        
        # Check each key
        missing_keys = []
        for key in keys:
            # Remove mountPoint prefix if present
            if key.startswith(mount_point + '.'):
                check_key = key[len(mount_point) + 1:]
            else:
                check_key = key
            
            if not check_key_exists(json_data, check_key):
                missing_keys.append({
                    'html_key': key,
                    'json_key': check_key
                })
        
        if missing_keys:
            issues.append({
                'title': page_info['title'],
                'file': str(relative_path),
                'json': page_info['translation'],
                'missing': missing_keys,
                'json_missing': False
            })
            total_missing += len(missing_keys)
        else:
            pages_ok += 1
    
    return {
        'language': language,
        'exists': True,
        'total_pages': len(html_files),
        'pages_ok': pages_ok,
        'pages_with_issues': len(issues),
        'total_missing_keys': total_missing,
        'issues': issues
    }

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    languages = ['pt', 'en', 'es', 'fr']
    
    all_results = {}
    
    print("=" * 80)
    print("🌍 AUDITORIA i18n - TODAS AS LÍNGUAS")
    print("=" * 80)
    print()
    
    for lang in languages:
        print(f"Analisando {lang.upper()}...", end=" ")
        result = audit_language(base_dir, lang)
        all_results[lang] = result
        
        if result['exists']:
            print(f"✓ ({result['total_missing_keys']} chaves faltando)")
        else:
            print("✗ (não existe)")
    
    print()
    
    # Save results
    output_file = base_dir / 'tools' / 'i18n-all-languages-report.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Relatório salvo em: {output_file}")
    print()
    
    # Print summary
    print("=" * 80)
    print("📊 RESUMO POR LÍNGUA")
    print("=" * 80)
    print()
    
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            print(f"🌐 {lang.upper()}")
            print(f"   Total de páginas: {result['total_pages']}")
            print(f"   Páginas OK: {result['pages_ok']} ✅")
            print(f"   Páginas com problemas: {result['pages_with_issues']} ❌")
            print(f"   Total de chaves faltando: {result['total_missing_keys']} 🔑")
            print()
        else:
            print(f"🌐 {lang.upper()}")
            print(f"   ⚠️  Diretório não existe")
            print()
    
    # Comparison table
    print("=" * 80)
    print("📊 TABELA COMPARATIVA")
    print("=" * 80)
    print()
    print(f"{'Língua':<10} {'Páginas':<10} {'OK':<10} {'Problemas':<12} {'Chaves Faltando':<20}")
    print("-" * 80)
    
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            print(f"{lang.upper():<10} {result['total_pages']:<10} {result['pages_ok']:<10} {result['pages_with_issues']:<12} {result['total_missing_keys']:<20}")
        else:
            print(f"{lang.upper():<10} {'N/A':<10} {'N/A':<10} {'N/A':<12} {'N/A':<20}")
    
    print()
    
    # Top issues per language
    print("=" * 80)
    print("🔝 TOP 10 PÁGINAS COM MAIS PROBLEMAS POR LÍNGUA")
    print("=" * 80)
    print()
    
    for lang in languages:
        result = all_results[lang]
        if result['exists'] and result['issues']:
            print(f"🌐 {lang.upper()}")
            sorted_issues = sorted(result['issues'], key=lambda x: len(x['missing']), reverse=True)[:10]
            for i, issue in enumerate(sorted_issues, 1):
                print(f"   {i}. {issue['title']}: {len(issue['missing'])} chaves")
            print()
    
    print("=" * 80)

if __name__ == '__main__':
    main()
