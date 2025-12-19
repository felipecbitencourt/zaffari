#!/usr/bin/env python3
"""
i18n Issues Summary
Generates a clear summary of how many keys are broken, in which HTML files, and which JSON files
"""

import json
from pathlib import Path
from collections import defaultdict

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    report_file = base_dir / 'tools' / 'i18n-issues-report.json'
    
    # Load report
    with open(report_file, 'r', encoding='utf-8') as f:
        report = json.load(f)
    
    # Organize data
    html_issues = defaultdict(list)  # html_file -> list of missing keys
    json_issues = defaultdict(list)  # json_file -> list of missing keys
    
    for issue in report['issues']:
        html_file = issue['file']
        json_file = issue['json']
        missing_keys = issue['missing']
        
        for mk in missing_keys:
            html_key = mk['html_key']
            json_key = mk['json_key']
            
            html_issues[html_file].append({
                'html_key': html_key,
                'json_key': json_key,
                'json_file': json_file
            })
            
            json_issues[json_file].append({
                'html_key': html_key,
                'json_key': json_key,
                'html_file': html_file
            })
    
    # Print summary
    print("=" * 80)
    print("📊 RESUMO DE PROBLEMAS i18n")
    print("=" * 80)
    print()
    
    print(f"Total de páginas: {report['summary']['total_pages']}")
    print(f"Páginas OK: {report['summary']['pages_ok']}")
    print(f"Páginas com problemas: {report['summary']['pages_with_issues']}")
    print(f"Total de chaves faltando: {report['summary']['total_missing_keys']}")
    print()
    
    # Summary by HTML file
    print("=" * 80)
    print("📄 PROBLEMAS POR ARQUIVO HTML")
    print("=" * 80)
    print()
    
    sorted_html = sorted(html_issues.items(), key=lambda x: len(x[1]), reverse=True)
    
    for html_file, keys in sorted_html:
        print(f"📄 {html_file}")
        print(f"   Chaves faltando: {len(keys)}")
        
        # Group by JSON file
        json_groups = defaultdict(list)
        for k in keys:
            json_groups[k['json_file']].append(k)
        
        for json_file, json_keys in json_groups.items():
            print(f"   → {json_file}: {len(json_keys)} chaves")
        print()
    
    # Summary by JSON file
    print("=" * 80)
    print("📋 PROBLEMAS POR ARQUIVO JSON")
    print("=" * 80)
    print()
    
    sorted_json = sorted(json_issues.items(), key=lambda x: len(x[1]), reverse=True)
    
    for json_file, keys in sorted_json:
        print(f"📋 {json_file}")
        print(f"   Chaves faltando: {len(keys)}")
        
        # Group by HTML file
        html_groups = defaultdict(list)
        for k in keys:
            html_groups[k['html_file']].append(k)
        
        for html_file, html_keys in html_groups.items():
            print(f"   ← {html_file}: {len(html_keys)} chaves")
        print()
    
    # Detailed breakdown
    print("=" * 80)
    print("🔍 DETALHAMENTO COMPLETO")
    print("=" * 80)
    print()
    
    for issue in report['issues']:
        title = issue['title']
        html_file = issue['file']
        json_file = issue['json']
        missing = issue['missing']
        
        print(f"📌 {title}")
        print(f"   HTML: {html_file}")
        print(f"   JSON: {json_file}")
        print(f"   Chaves faltando: {len(missing)}")
        print()
        
        for i, mk in enumerate(missing, 1):
            print(f"   {i}. HTML: {mk['html_key']}")
            print(f"      JSON: {mk['json_key']}")
        print()
    
    # Generate simple table
    print("=" * 80)
    print("📊 TABELA RESUMIDA")
    print("=" * 80)
    print()
    print(f"{'Arquivo HTML':<50} {'Arquivo JSON':<30} {'Chaves':<10}")
    print("-" * 90)
    
    for issue in report['issues']:
        html_file = Path(issue['file']).name
        json_file = Path(issue['json']).name
        count = len(issue['missing'])
        print(f"{html_file:<50} {json_file:<30} {count:<10}")
    
    print()
    print("=" * 80)

if __name__ == '__main__':
    main()
