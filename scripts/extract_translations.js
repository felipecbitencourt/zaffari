/**
 * Script para extrair traduções do pt.json monolítico
 * e criar arquivos JSON modulares por página
 */

const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..');
const sourceFile = path.join(basePath, 'locales', 'pt.json');
const outputDir = path.join(basePath, 'locales', 'pt');

// Carrega o JSON monolítico
const translations = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Função para salvar JSON
function saveJson(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Criado: ${path.relative(basePath, filePath)}`);
}

// 1. Extrair global
if (translations.global) {
    saveJson(path.join(outputDir, 'global.json'), translations.global);
}

// 2. Extrair intro
if (translations.intro) {
    saveJson(path.join(outputDir, 'intro.json'), translations.intro);
}

// 3. Extrair módulos (m1, m2, m3)
['m1', 'm2', 'm3'].forEach(modId => {
    if (translations[modId]) {
        const moduleData = translations[modId];

        Object.keys(moduleData).forEach(pageKey => {
            const pageData = moduleData[pageKey];
            const fileName = `${pageKey}.json`;
            saveJson(path.join(outputDir, modId, fileName), pageData);
        });
    }
});

// 4. Extrair extras
if (translations.extras) {
    Object.keys(translations.extras).forEach(extrasKey => {
        const extrasData = translations.extras[extrasKey];
        const fileName = `${extrasKey}.json`;
        saveJson(path.join(outputDir, 'extras', fileName), extrasData);
    });
}

// 5. Extrair UI, settings, tutorial (se existirem no nível raiz)
if (translations.ui) {
    saveJson(path.join(outputDir, 'ui.json'), translations.ui);
}

if (translations.settings) {
    saveJson(path.join(outputDir, 'settings.json'), translations.settings);
}

if (translations.tutorial) {
    saveJson(path.join(outputDir, 'tutorial.json'), translations.tutorial);
}

console.log('\n🎉 Extração concluída!');
console.log('Agora execute: node scripts/validate_i18n_keys.js para verificar.');
