const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');

// Ensure locales dir exists
if (!fs.existsSync(localesDir)) {
    console.error('Locales directory not found!');
    process.exit(1);
}

// Get all JSON files in locales root
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const lang = path.basename(file, '.json');
    const sourcePath = path.join(localesDir, file);
    const targetDir = path.join(localesDir, lang);

    console.log(`Processing ${lang}...`);

    let content;
    try {
        content = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    } catch (e) {
        console.error(`Error parsing ${file}:`, e);
        return;
    }

    // Create lang directory
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Iterate top-level keys
    for (const [key, value] of Object.entries(content)) {
        // Special logic for modules (m1, m2, etc) and extras to go deeper
        if ((key.startsWith('m') || key === 'extras') && typeof value === 'object') {
            const moduleDir = path.join(targetDir, key);
            if (!fs.existsSync(moduleDir)) {
                fs.mkdirSync(moduleDir, { recursive: true });
            }

            for (const [subKey, subValue] of Object.entries(value)) {
                const subFilePath = path.join(moduleDir, `${subKey}.json`);
                fs.writeFileSync(subFilePath, JSON.stringify(subValue, null, 4));
                console.log(`  Created ${lang}/${key}/${subKey}.json`);
            }
        } else {
            // "global", "intro", or any other top level key goes to direct file
            const filePath = path.join(targetDir, `${key}.json`);
            fs.writeFileSync(filePath, JSON.stringify(value, null, 4));
            console.log(`  Created ${lang}/${key}.json`);
        }
    }

    console.log(`Finished processing ${lang}.\n`);
});

console.log('All translations split successfully!');
