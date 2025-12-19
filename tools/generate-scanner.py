#!/usr/bin/env python3
"""
Browser-based i18n Scanner
Opens each page in the course and checks for i18n warnings in console
"""

import json
import time
from pathlib import Path

def generate_test_html():
    """Generate an HTML file that will test all pages"""
    
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    content_file = base_dir / 'content.json'
    
    with open(content_file, 'r', encoding='utf-8') as f:
        content = json.load(f)
    
    # Collect all page IDs
    page_ids = []
    for module in content['modules']:
        for page in module['pages']:
            page_ids.append({
                'id': page['id'],
                'title': page['title'],
                'module': module['title']
            })
    
    # Generate HTML test page
    html = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>i18n Scanner</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #E53935;
            padding-bottom: 10px;
        }
        .controls {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button {
            background: #E53935;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
        }
        button:hover {
            background: #c62828;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        #status {
            margin-top: 15px;
            padding: 10px;
            background: #e3f2fd;
            border-left: 4px solid #2196F3;
            border-radius: 4px;
        }
        #results {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .page-result {
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 4px solid #4CAF50;
        }
        .page-result.has-issues {
            border-left-color: #f44336;
            background: #ffebee;
        }
        .page-result.ok {
            border-left-color: #4CAF50;
            background: #e8f5e9;
        }
        .page-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .page-module {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
        }
        .issues {
            margin-top: 10px;
            padding: 10px;
            background: white;
            border-radius: 4px;
        }
        .issue-item {
            padding: 5px 0;
            color: #d32f2f;
            font-family: monospace;
            font-size: 0.9em;
        }
        .summary {
            background: #fff3e0;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #ff9800;
        }
        .summary h3 {
            margin-top: 0;
        }
        iframe {
            display: none;
        }
    </style>
</head>
<body>
    <h1>🔍 Varredura Completa de i18n</h1>
    
    <div class="controls">
        <button id="startBtn" onclick="startScan()">▶ Iniciar Varredura</button>
        <button id="stopBtn" onclick="stopScan()" disabled>⏹ Parar</button>
        <button onclick="exportResults()">📥 Exportar Resultados</button>
        <div id="status">Pronto para iniciar. Total de páginas: ''' + str(len(page_ids)) + '''</div>
    </div>
    
    <div id="summary" class="summary" style="display:none;">
        <h3>📊 Resumo</h3>
        <p><strong>Total de páginas:</strong> <span id="totalPages">0</span></p>
        <p><strong>Páginas OK:</strong> <span id="okPages">0</span></p>
        <p><strong>Páginas com problemas:</strong> <span id="issuePages">0</span></p>
        <p><strong>Total de avisos i18n:</strong> <span id="totalWarnings">0</span></p>
    </div>
    
    <div id="results"></div>
    
    <iframe id="testFrame"></iframe>
    
    <script>
        const pages = ''' + json.dumps(page_ids, ensure_ascii=False) + ''';
        let currentIndex = 0;
        let scanning = false;
        let results = [];
        let consoleWarnings = [];
        
        // Intercept console warnings
        const originalWarn = console.warn;
        console.warn = function(...args) {
            const message = args.join(' ');
            if (message.includes('[i18n]')) {
                consoleWarnings.push(message);
            }
            originalWarn.apply(console, args);
        };
        
        function startScan() {
            scanning = true;
            currentIndex = 0;
            results = [];
            document.getElementById('results').innerHTML = '';
            document.getElementById('summary').style.display = 'none';
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            scanNextPage();
        }
        
        function stopScan() {
            scanning = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            document.getElementById('status').textContent = 'Varredura interrompida pelo usuário.';
            showSummary();
        }
        
        function scanNextPage() {
            if (!scanning || currentIndex >= pages.length) {
                if (scanning) {
                    document.getElementById('status').textContent = '✅ Varredura completa!';
                    document.getElementById('startBtn').disabled = false;
                    document.getElementById('stopBtn').disabled = true;
                    showSummary();
                }
                return;
            }
            
            const page = pages[currentIndex];
            consoleWarnings = [];
            
            document.getElementById('status').textContent = 
                `Verificando ${currentIndex + 1}/${pages.length}: ${page.title}...`;
            
            const iframe = document.getElementById('testFrame');
            
            // Set up listener for page load
            iframe.onload = function() {
                // Wait a bit for i18n to process
                setTimeout(() => {
                    const pageResult = {
                        id: page.id,
                        title: page.title,
                        module: page.module,
                        warnings: [...consoleWarnings]
                    };
                    
                    results.push(pageResult);
                    displayResult(pageResult);
                    
                    currentIndex++;
                    setTimeout(scanNextPage, 500); // Small delay between pages
                }, 1000);
            };
            
            // Navigate to page by simulating click
            iframe.src = `index.html#page-${page.id}`;
        }
        
        function displayResult(result) {
            const resultsDiv = document.getElementById('results');
            const hasIssues = result.warnings.length > 0;
            
            const resultDiv = document.createElement('div');
            resultDiv.className = `page-result ${hasIssues ? 'has-issues' : 'ok'}`;
            
            let html = `
                <div class="page-title">${hasIssues ? '❌' : '✅'} ${result.title}</div>
                <div class="page-module">${result.module}</div>
            `;
            
            if (hasIssues) {
                html += '<div class="issues">';
                html += `<strong>${result.warnings.length} aviso(s) encontrado(s):</strong>`;
                result.warnings.forEach(warning => {
                    html += `<div class="issue-item">${warning}</div>`;
                });
                html += '</div>';
            } else {
                html += '<div style="color: #4CAF50;">Nenhum problema encontrado</div>';
            }
            
            resultDiv.innerHTML = html;
            resultsDiv.appendChild(resultDiv);
            
            // Scroll to bottom
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        
        function showSummary() {
            const totalPages = results.length;
            const issuePages = results.filter(r => r.warnings.length > 0).length;
            const okPages = totalPages - issuePages;
            const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
            
            document.getElementById('totalPages').textContent = totalPages;
            document.getElementById('okPages').textContent = okPages;
            document.getElementById('issuePages').textContent = issuePages;
            document.getElementById('totalWarnings').textContent = totalWarnings;
            document.getElementById('summary').style.display = 'block';
        }
        
        function exportResults() {
            const report = {
                timestamp: new Date().toISOString(),
                summary: {
                    total: results.length,
                    ok: results.filter(r => r.warnings.length === 0).length,
                    issues: results.filter(r => r.warnings.length > 0).length,
                    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
                },
                results: results
            };
            
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'i18n-scan-report.json';
            a.click();
        }
    </script>
</body>
</html>'''
    
    output_file = base_dir / 'tools' / 'i18n-scanner.html'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ Scanner HTML gerado: {output_file}")
    print(f"📄 Total de páginas a serem verificadas: {len(page_ids)}")
    print(f"\n🌐 Abra no navegador: http://localhost:8080/tools/i18n-scanner.html")

if __name__ == '__main__':
    generate_test_html()
