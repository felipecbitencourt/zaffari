const fs = require('fs');
const content = require('./content.json');

const template = `
<div class="content-header">
    <h1>Em Construção</h1>
</div>
<div class="content-body">
    <!-- INICIO DO TEXTO EDITÁVEL -->
    <p>Esta página ainda está sendo desenvolvida.</p>
    <p>Conteúdo virá aqui.</p>
    <!-- FIM DO TEXTO EDITÁVEL -->
</div>
`;

content.modules.forEach(mod => {
    mod.pages.forEach(page => {
        const path = page.file;
        const fullPath = __dirname + '/' + path;

        // Ensure directory exists
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(fullPath)) {
            console.log("Creating placeholder for: " + path);
            fs.writeFileSync(fullPath, template.replace('Em Construção', page.title));
        } else {
            console.log("Exists: " + path);
        }
    });
});
