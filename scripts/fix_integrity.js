const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../pages-manifest.json');
const localesDir = path.join(__dirname, '../locales');
const languages = ['pt', 'en', 'es', 'fr'];

// 1. Fix Manifest Mappings
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let manifestModified = false;

manifest.pages.forEach(page => {
    if (page.id === 'm1-p5' && page.translation === 'm1/p5.json') {
        page.translation = 'm1/p6.json';
        page.mountPoint = 'm1.p6'; // Adjust mount point too? Or keep p5? Content uses p6.
        console.log('Fixed manifest: m1-p5 -> m1/p6.json');
        manifestModified = true;
    }
    if (page.id === 'extras-questionarios' && page.translation === 'extras/questionarios.json') {
        page.translation = 'extras/quiz.json';
        page.mountPoint = 'extras.quiz';
        console.log('Fixed manifest: extras-questionarios -> extras/quiz.json');
        manifestModified = true;
    }
});

if (manifestModified) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
}

// 2. Create Missing Placeholders (content missing in original)
const placeholders = [
    'm3/p4.json',
    'extras/arraste.json',
    'extras/ache-erro.json',
    'extras/roleplay.json',
    'extras/metricas.json'
];

const placeholderContent = {
    "title": "Page Title",
    "content": "Content pending..."
};

placeholders.forEach(relPath => {
    languages.forEach(lang => {
        const fullPath = path.join(localesDir, lang, relPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        if (!fs.existsSync(fullPath)) {
            fs.writeFileSync(fullPath, JSON.stringify(placeholderContent, null, 4));
            console.log(`Created placeholder: ${lang}/${relPath}`);
        }
    });
});

// 3. Copy missing language files from PT (content exists in PT but missing in others)
const toCopy = [
    'm2/p4.json',
    'm2/p5.json'
];

toCopy.forEach(relPath => {
    const ptPath = path.join(localesDir, 'pt', relPath);
    if (fs.existsSync(ptPath)) {
        const content = fs.readFileSync(ptPath);
        languages.forEach(lang => {
            if (lang === 'pt') return;
            const destPath = path.join(localesDir, lang, relPath);
            const dir = path.dirname(destPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            if (!fs.existsSync(destPath)) {
                fs.writeFileSync(destPath, content);
                console.log(`Copied from PT: ${lang}/${relPath}`);
            }
        });
    } else {
        console.warn(`Source PT file missing for copy: ${relPath}`);
    }
});
