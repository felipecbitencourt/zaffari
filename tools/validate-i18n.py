#!/usr/bin/env python3
"""
Complete i18n Validator
Checks every HTML file against its JSON to find missing translations
"""

import json
import re
from pathlib import Path
from collections import defaultdict

def extract_i18n_keys(html_content):
    """Extract all data-i18n keys from HTML content"""
    pattern = r'data-i18n="([^"]+)"'
    return re.findall(pattern, html_content)

def check_nested_key(data, key_path):
    """Check if nested key exists and return its value"""
    keys = key_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None, False
    return current, True

def load_json_safe(file_path):
    """Safely load JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return None

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    html_dir = base_dir / 'paginas' / 'pt'
    locale_dir = base_dir / 'locales' / 'pt'
    manifest_file = base_dir / 'pages-manifest.json'
    
    # Load manifest
    manifest_data = load_json_safe(manifest_file)
    if not manifest_data:
        print("❌ Erro ao carregar pages-manifest.json")
        return
    
    # Create page mapping
    page_map = {}
    for page in manifest_data['pages']:
        page_map[page['file']] = {
            'id': page['id'],
            'title': page['title'],
            'translation': page.get('translation', ''),
            'mountPoint': page.get('mountPoint', '')
        }
    
    # Scan all HTML files
    html_files = sorted(html_dir.rglob('*.html'))
    
    total_pages = 0
    pages_with_issues = 0
    total_missing_keys = 0
    all_issues = []
    
    print("="*80)
    print("🔍 VARREDURA COMPLETA DE i18n")
    print("="*80)
    print()
    
    for html_file in html_files:
        total_pages += 1
        relative_path = f"paginas/pt/{html_file.relative_to(html_dir)}"
        
        # Find page info
        page_info = page_map.get(relative_path)
        if not page_info:
            print(f"⚠️  Página não encontrada no manifest: {relative_path}")
            continue
        
        # Load HTML
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Extract i18n keys
        keys = extract_i18n_keys(html_content)
        if not keys:
            continue
        
        # Load JSON
        json_file = locale_dir / page_info['translation']
        if not json_file.exists():
            print(f"❌ {page_info['title']}")
            print(f"   JSON não encontrado: {page_info['translation']}")
            print()
            pages_with_issues += 1
            continue
        
        json_data = load_json_safe(json_file)
        if not json_data:
            print(f"❌ {page_info['title']}")
            print(f"   Erro ao ler JSON: {page_info['translation']}")
            print()
            pages_with_issues += 1
            continue
        
        # Check each key
        mount_point = page_info['mountPoint']
        missing_keys = []
        
        for key in keys:
            # Remove mount point prefix if present
            if mount_point and key.startswith(mount_point + '.'):
                check_key = key[len(mount_point) + 1:]
            else:
                check_key = key
            
            value, exists = check_nested_key(json_data, check_key)
            
            if not exists:
                missing_keys.append({
                    'html_key': key,
                    'json_key': check_key
                })
            elif value is None or (isinstance(value, str) and value.strip() == ''):
                missing_keys.append({
                    'html_key': key,
                    'json_key': check_key,
                    'empty': True
                })
        
        # Report results
        if missing_keys:
            pages_with_issues += 1
            total_missing_keys += len(missing_keys)
            
            issue_info = {
                'title': page_info['title'],
                'file': str(relative_path),
                'json': page_info['translation'],
                'missing': missing_keys
            }
            all_issues.append(issue_info)
            
            print(f"❌ {page_info['title']}")
            print(f"   Arquivo: {relative_path}")
            print(f"   JSON: {page_info['translation']}")
            print(f"   Chaves faltando: {len(missing_keys)}")
            for mk in missing_keys[:5]:  # Show first 5
                if mk.get('empty'):
                    print(f"      • {mk['html_key']} (vazio no JSON)")
                else:
                    print(f"      • {mk['html_key']} → esperado: {mk['json_key']}")
            if len(missing_keys) > 5:
                print(f"      ... e mais {len(missing_keys) - 5}")
            print()
        else:
            print(f"✅ {page_info['title']}")
    
    # Summary
    print("="*80)
    print("📊 RESUMO")
    print("="*80)
    print(f"Total de páginas verificadas: {total_pages}")
    print(f"Páginas OK: {total_pages - pages_with_issues}")
    print(f"Páginas com problemas: {pages_with_issues}")
    print(f"Total de chaves faltando: {total_missing_keys}")
    print("="*80)
    
    # Save detailed report
    if all_issues:
        report_file = base_dir / 'tools' / 'i18n-issues-report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump({
                'summary': {
                    'total_pages': total_pages,
                    'pages_ok': total_pages - pages_with_issues,
                    'pages_with_issues': pages_with_issues,
                    'total_missing_keys': total_missing_keys
                },
                'issues': all_issues
            }, f, ensure_ascii=False, indent=2)
        print(f"\n📄 Relatório detalhado salvo em: {report_file}")

if __name__ == '__main__':
    main()
