#!/usr/bin/env python3
"""
Generate detailed summary from all languages report
"""

import json
from pathlib import Path
from collections import defaultdict

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    report_file = base_dir / 'tools' / 'i18n-all-languages-report.json'
    
    # Load report
    with open(report_file, 'r', encoding='utf-8') as f:
        all_results = json.load(f)
    
    languages = ['pt', 'en', 'es', 'fr']
    
    print("=" * 100)
    print("📊 RELATÓRIO DETALHADO i18n - TODAS AS LÍNGUAS")
    print("=" * 100)
    print()
    
    # Summary table
    print("┌" + "─" * 98 + "┐")
    print(f"│ {'RESUMO GERAL':<96} │")
    print("├" + "─" * 98 + "┤")
    print(f"│ {'Língua':<10} │ {'Páginas':<10} │ {'OK':<10} │ {'Problemas':<12} │ {'Chaves Faltando':<20} │ {'% OK':<10} │")
    print("├" + "─" * 98 + "┤")
    
    total_missing = 0
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            pct_ok = (result['pages_ok'] / result['total_pages'] * 100) if result['total_pages'] > 0 else 0
            total_missing += result['total_missing_keys']
            print(f"│ {lang.upper():<10} │ {result['total_pages']:<10} │ {result['pages_ok']:<10} │ {result['pages_with_issues']:<12} │ {result['total_missing_keys']:<20} │ {pct_ok:>6.1f}%   │")
    
    print("└" + "─" * 98 + "┘")
    print()
    print(f"🔑 TOTAL DE CHAVES FALTANDO EM TODAS AS LÍNGUAS: {total_missing}")
    print()
    
    # Files with most issues across all languages
    print("=" * 100)
    print("📋 ARQUIVOS JSON COM MAIS PROBLEMAS (TODAS AS LÍNGUAS)")
    print("=" * 100)
    print()
    
    json_file_issues = defaultdict(lambda: {'pt': 0, 'en': 0, 'es': 0, 'fr': 0, 'total': 0, 'title': ''})
    
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            for issue in result['issues']:
                json_file = issue['json']
                missing_count = len(issue['missing'])
                json_file_issues[json_file][lang] = missing_count
                json_file_issues[json_file]['total'] += missing_count
                if not json_file_issues[json_file]['title']:
                    json_file_issues[json_file]['title'] = issue['title']
    
    # Sort by total
    sorted_files = sorted(json_file_issues.items(), key=lambda x: x[1]['total'], reverse=True)
    
    print(f"{'#':<4} {'Arquivo JSON':<35} {'PT':<8} {'EN':<8} {'ES':<8} {'FR':<8} {'TOTAL':<10}")
    print("-" * 100)
    
    for i, (json_file, counts) in enumerate(sorted_files[:20], 1):
        print(f"{i:<4} {json_file:<35} {counts['pt']:<8} {counts['en']:<8} {counts['es']:<8} {counts['fr']:<8} {counts['total']:<10}")
    
    print()
    
    # Pages that are OK in all languages
    print("=" * 100)
    print("✅ PÁGINAS OK EM TODAS AS LÍNGUAS")
    print("=" * 100)
    print()
    
    # Find pages that appear in all languages
    all_pages = set()
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            for issue in result['issues']:
                all_pages.add(issue['json'])
    
    # Find pages with no issues in any language
    ok_pages = []
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            # Get all JSON files from manifest
            manifest_file = base_dir / 'pages-manifest.json'
            with open(manifest_file, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            all_json_files = set(page.get('translation', '') for page in manifest['pages'] if page.get('translation'))
            issue_files = set(issue['json'] for issue in result['issues'])
            lang_ok_files = all_json_files - issue_files
            
            if not ok_pages:
                ok_pages = list(lang_ok_files)
            else:
                ok_pages = [f for f in ok_pages if f in lang_ok_files]
    
    if ok_pages:
        for i, page in enumerate(sorted(ok_pages), 1):
            print(f"   {i}. {page}")
    else:
        print("   ⚠️  Nenhuma página está OK em todas as línguas")
    
    print()
    
    # Language-specific issues
    print("=" * 100)
    print("🔍 PROBLEMAS ESPECÍFICOS POR LÍNGUA")
    print("=" * 100)
    print()
    
    for lang in languages:
        result = all_results[lang]
        if result['exists']:
            print(f"🌐 {lang.upper()}")
            
            # Find issues unique to this language
            other_langs = [l for l in languages if l != lang]
            
            unique_issues = []
            for issue in result['issues']:
                json_file = issue['json']
                missing_count = len(issue['missing'])
                
                # Check if other languages have fewer issues with this file
                is_unique = True
                for other_lang in other_langs:
                    other_result = all_results[other_lang]
                    if other_result['exists']:
                        other_issue = next((i for i in other_result['issues'] if i['json'] == json_file), None)
                        if other_issue and len(other_issue['missing']) >= missing_count:
                            is_unique = False
                            break
                
                if is_unique and missing_count > 5:
                    unique_issues.append((issue['title'], json_file, missing_count))
            
            if unique_issues:
                for title, json_file, count in sorted(unique_issues, key=lambda x: x[2], reverse=True)[:5]:
                    print(f"   • {title}: {count} chaves ({json_file})")
            else:
                print(f"   ✓ Sem problemas únicos significativos")
            print()
    
    print("=" * 100)

if __name__ == '__main__':
    main()
