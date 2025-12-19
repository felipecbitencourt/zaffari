#!/usr/bin/env python3
"""
Quick summary table generator
"""

import json
from pathlib import Path

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    report_file = base_dir / 'tools' / 'i18n-all-languages-report.json'
    
    with open(report_file, 'r', encoding='utf-8') as f:
        all_results = json.load(f)
    
    print("\n" + "="*80)
    print("RESUMO RÁPIDO - CHAVES FALTANDO POR LÍNGUA E ARQUIVO")
    print("="*80 + "\n")
    
    # Get all unique JSON files
    all_files = set()
    for lang in ['pt', 'en', 'es', 'fr']:
        if all_results[lang]['exists']:
            for issue in all_results[lang]['issues']:
                all_files.add(issue['json'])
    
    # Create table
    print(f"{'Arquivo JSON':<40} {'PT':>6} {'EN':>6} {'ES':>6} {'FR':>6} {'TOTAL':>8}")
    print("-"*80)
    
    totals = {'pt': 0, 'en': 0, 'es': 0, 'fr': 0, 'total': 0}
    
    for json_file in sorted(all_files):
        counts = {'pt': 0, 'en': 0, 'es': 0, 'fr': 0}
        
        for lang in ['pt', 'en', 'es', 'fr']:
            if all_results[lang]['exists']:
                for issue in all_results[lang]['issues']:
                    if issue['json'] == json_file:
                        count = len(issue['missing'])
                        counts[lang] = count
                        totals[lang] += count
        
        row_total = sum(counts.values())
        totals['total'] += row_total
        
        if row_total > 0:
            print(f"{json_file:<40} {counts['pt']:>6} {counts['en']:>6} {counts['es']:>6} {counts['fr']:>6} {row_total:>8}")
    
    print("-"*80)
    print(f"{'TOTAL':<40} {totals['pt']:>6} {totals['en']:>6} {totals['es']:>6} {totals['fr']:>6} {totals['total']:>8}")
    print("\n" + "="*80 + "\n")
    
    # Summary
    print("RESUMO:")
    print(f"  PT: {totals['pt']} chaves faltando em {all_results['pt']['pages_with_issues']} páginas")
    print(f"  EN: {totals['en']} chaves faltando em {all_results['en']['pages_with_issues']} páginas")
    print(f"  ES: {totals['es']} chaves faltando em {all_results['es']['pages_with_issues']} páginas")
    print(f"  FR: {totals['fr']} chaves faltando em {all_results['fr']['pages_with_issues']} páginas")
    print(f"\n  TOTAL GERAL: {totals['total']} chaves faltando\n")

if __name__ == '__main__':
    main()
