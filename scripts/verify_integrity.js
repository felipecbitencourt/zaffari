const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '../content.json');
const pagesManifestPath = path.join(__dirname, '../pages-manifest.json');
const localesDir = path.join(__dirname, '../locales');
const pagesDir = path.join(__dirname, '../paginas/pt');

const languages = ['pt', 'en', 'es', 'fr'];
let errors = 0;
const errorLog = [];

if (!fs.existsSync(contentPath)) {
    console.error('❌ content.json missing!');
    process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(pagesManifestPath, 'utf8'));
const manifestMap = new Map(manifest.pages.map(p => [p.id, p]));

console.log('🔍 Starting Integrity Check...');

content.modules.forEach(mod => {
    // console.log(`Checking Module: ${mod.id}`);

    mod.pages.forEach(page => {
        const manifestEntry = manifestMap.get(page.id);

        // 1. Check HTML File
        const htmlPath = path.join(__dirname, '../', page.file);
        if (!fs.existsSync(htmlPath)) {
            errorLog.push({ type: 'HTML_MISSING', file: page.file, pageId: page.id });
            errors++;
        }

        // 2. Check Translations
        if (!manifestEntry) {
            errorLog.push({ type: 'MANIFEST_ENTRY_MISSING', pageId: page.id });
            errors++;
            return;
        }

        const relativeJsonPath = manifestEntry.translation; // e.g., m1/p1.json

        languages.forEach(lang => {
            const langJsonPath = path.join(localesDir, lang, relativeJsonPath);
            if (!fs.existsSync(langJsonPath)) {
                errorLog.push({ type: 'JSON_MISSING', lang: lang, path: relativeJsonPath });
                errors++;
            }
        });
    });
});

fs.writeFileSync(path.join(__dirname, '../verification_errors.json'), JSON.stringify(errorLog, null, 4));

if (errors === 0) {
    console.log('✅ All checks passed! Structure is consistent across all languages.');
} else {
    console.log(`⚠️ Found ${errors} errors. See verification_errors.json`);
}
