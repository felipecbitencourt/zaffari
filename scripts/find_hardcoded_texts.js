/**
 * Script para identificar textos hardcoded nos HTMLs
 * que não estão usando data-i18n
 */

const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..');
const pagesDir = path.join(basePath, 'paginas', 'pt');

// Regex para encontrar textos visíveis em elementos HTML
const textPatterns = [
    // Textos dentro de tags (excluindo atributos e scripts)
    /<(h[1-6]|p|span|li|button|label|a|td|th|strong|em|b|i|summary)[^>]*>([^<]+)</gi,
];

// Tags a ignorar (contêm código, não texto)
const ignoreTags = ['script', 'style', 'code', 'pre'];

// Padrões que indicam hardcoded text (em português)
const portuguesePatterns = [
    /[áàâãéèêíìîóòôõúùûç]/i, // Caracteres acentuados
    /\b(você|cliente|produto|loja|troca|prazo|atendimento)\b/i, // Palavras comuns
    /\b(módulo|página|curso|empresa)\b/i,
    /\b(clique|veja|confira|saiba)\b/i,
];

function extractTextNodes(html) {
    const results = [];

    // Remove scripts e styles
    let cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[\s\S]*?<\/style>/gi, '');
    cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/gi, ''); // Remove comentários

    // Encontra elementos com texto que NÃO têm data-i18n
    const elementRegex = /<(h[1-6]|p|span|li|button|label|a|td|th|strong|em|b|i|summary|div)([^>]*)>([^<]*)</gi;

    let match;
    while ((match = elementRegex.exec(cleanHtml)) !== null) {
        const tag = match[1];
        const attrs = match[2];
        const text = match[3].trim();

        // Pular se já tem data-i18n ou está vazio
        if (attrs.includes('data-i18n') || !text) continue;

        // Pular se é só espaços, números ou símbolos
        if (/^[\s\d\W]+$/.test(text)) continue;

        // Verificar se parece ser texto em português
        const isPortuguese = portuguesePatterns.some(p => p.test(text));

        if (isPortuguese || text.length > 3) {
            results.push({
                tag,
                text: text.substring(0, 80) + (text.length > 80 ? '...' : '')
            });
        }
    }

    return results;
}

function analyzeFile(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const hardcodedTexts = extractTextNodes(html);
    return hardcodedTexts;
}

// Analisar todos os HTMLs
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
const report = {};
let totalHardcoded = 0;

files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    const hardcoded = analyzeFile(filePath);

    if (hardcoded.length > 0) {
        report[file] = hardcoded;
        totalHardcoded += hardcoded.length;
    }
});

console.log('🔍 Análise de Textos Hardcoded');
console.log('='.repeat(50));
console.log(`\n📊 Resumo: ${Object.keys(report).length} arquivos com textos hardcoded`);
console.log(`📝 Total de textos encontrados: ${totalHardcoded}\n`);

Object.entries(report).forEach(([file, texts]) => {
    console.log(`\n📄 ${file} (${texts.length} textos)`);
    texts.forEach((t, i) => {
        console.log(`   ${i + 1}. <${t.tag}> "${t.text}"`);
    });
});

// Salvar relatório
const reportPath = path.join(basePath, 'hardcoded_texts_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Relatório salvo em: hardcoded_texts_report.json`);
