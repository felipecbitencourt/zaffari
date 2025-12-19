const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '../content.json');
const baseDir = path.join(__dirname, '../paginas/pt');

if (!fs.existsSync(contentPath)) {
    console.error('❌ content.json missing!');
    process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
let changes = 0;

console.log('📦 Starting File Standardization...');

content.modules.forEach(mod => {
    mod.pages.forEach(page => {
        const currentPath = path.join(__dirname, '../', page.file);

        // Determine new path based on ID
        // e.g., m1-p1 -> paginas/pt/m1/p1.html
        // e.g., intro-p1 -> paginas/pt/intro/p1.html
        // e.g., extras-hub -> paginas/pt/extras/hub.html

        const parts = page.id.split('-');
        let newRelativePath;

        if (parts[0] === 'intro') {
            // intro-p1 -> intro/p1.html (or keeps intro-curso? let's standardise to intro/p1.html for consistency with ID)
            // But wait, existing ID is 'intro-p1', file is 'intro-curso.html'. 
            // json is 'intro.json'. 
            // Let's use the ID structure: [module]/[page].html
            // intro-p1 -> intro/p1.html
            newRelativePath = `paginas/pt/intro/${parts.slice(1).join('-')}.html`;
        } else {
            // m1-p1 -> m1/p1.html
            // extras-hub -> extras/hub.html
            newRelativePath = `paginas/pt/${parts[0]}/${parts.slice(1).join('-')}.html`;
        }

        const newFullPath = path.join(__dirname, '../', newRelativePath);

        // Normalize paths for comparison
        if (path.resolve(currentPath) === path.resolve(newFullPath)) {
            // Already standard
            return;
        }

        if (fs.existsSync(currentPath)) {
            // Ensure target dir exists
            const targetDir = path.dirname(newFullPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // Move file
            fs.renameSync(currentPath, newFullPath);
            console.log(`✅ Moved: ${path.basename(currentPath)} -> ${newRelativePath}`);

            // Update content.json
            page.file = newRelativePath;
            changes++;
        } else {
            console.error(`⚠️ File not found (skipping): ${page.file}`);
        }
    });
});

if (changes > 0) {
    fs.writeFileSync(contentPath, JSON.stringify(content, null, 4));
    console.log(`\n🎉 Updated content.json with ${changes} new paths.`);
} else {
    console.log('\n✨ No changes needed.');
}
