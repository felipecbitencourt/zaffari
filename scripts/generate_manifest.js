const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '../content.json');
const manifestPath = path.join(__dirname, '../pages-manifest.json');

if (!fs.existsSync(contentPath)) {
    console.error('content.json not found!');
    process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const manifest = { pages: [] };

function getTranslationInfo(pageId) {
    const parts = pageId.split('-');
    const prefix = parts[0];
    const suffix = parts.slice(1).join('-');

    if (prefix === 'intro') {
        // Special case for intro
        return {
            path: 'intro.json',
            mountPoint: 'intro'
        };
    } else if (prefix.startsWith('m') || prefix === 'extras') {
        // Special mappings (fixes)
        if (pageId === 'm1-p5') {
            return { path: 'm1/p6.json', mountPoint: 'm1.p6' };
        }
        if (pageId === 'extras-questionarios') {
            return { path: 'extras/quiz.json', mountPoint: 'extras.quiz' };
        }

        // Standard modules and extras: m1-p1 -> m1/p1.json
        return {
            path: `${prefix}/${suffix}.json`,
            mountPoint: `${prefix}.${suffix}`
        };
    }

    // Default fallback
    return {
        path: `${pageId}.json`,
        mountPoint: pageId
    };
}

content.modules.forEach(mod => {
    mod.pages.forEach(page => {
        const info = getTranslationInfo(page.id);

        manifest.pages.push({
            id: page.id,
            file: page.file, // Keep the HTML file path
            translation: info.path,
            mountPoint: info.mountPoint,
            title: page.title,
            module: mod.id
        });
    });
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
console.log(`Generated pages-manifest.json with ${manifest.pages.length} pages.`);
