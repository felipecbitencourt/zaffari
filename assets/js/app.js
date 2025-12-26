/**
 * app.js - Core Application
 * Módulo principal que orquestra todos os outros módulos
 * 
 * Dependências (ordem de carregamento):
 * 1. scorm-api.js
 * 2. i18n.js
 * 3. audio-manager.js
 * 4. feedback.js
 * 5. gamification.js
 * 6. interactive.js
 * 7. accessibility.js
 * 8. navigation.js
 * 9. app.js (este arquivo)
 * 10. tutorial.js
 */

const App = {
    data: null, // content.json
    flatPages: [], // Flattened list of pages for linear navigation
    currentIndex: 0,
    maxIndexReached: 0,
    currentLang: 'pt',

    /**
     * Inicializa a aplicação
     */
    init: async function () {
        console.log("Initializing App...");

        // 1. Initialize I18n
        await I18n.init();
        this.currentLang = I18n.currentLang;

        // 2. Initialize SCORM
        scorm.init();

        // 3. Initialize Audio (if available)
        if (typeof AudioManager !== 'undefined') {
            AudioManager.init();
        }

        // 4. Load Content Structure
        await this.loadContent();

        // 5. Initialize Navigation Manager
        NavigationManager.init(this);

        // 6. Restore Progress
        NavigationManager.restoreProgress();

        // 7. Render Interface
        NavigationManager.renderMenu();
        this.loadPage(this.currentIndex);

        // 8. Initialize Feedback Manager
        FeedbackManager.init();
        FeedbackManager.bindQuizHandler(document.getElementById('content-area'));

        // 9. Initialize Accessibility Manager
        AccessibilityManager.init();

        // 10. Initialize Analytics
        if (typeof Analytics !== 'undefined') {
            Analytics.init();
        }

        console.log("App initialized successfully!");
    },

    /**
     * Carrega estrutura de conteúdo do content.json
     */
    loadContent: async function () {
        try {
            const response = await fetch('content.json');
            this.data = await response.json();

            // Flatten pages for easy linear navigation
            this.flatPages = [];
            this.data.modules.forEach(mod => {
                mod.pages.forEach(page => {
                    this.flatPages.push({
                        ...page,
                        moduleId: mod.id,
                        moduleTitle: mod.title
                    });
                });
            });

            console.log("Content loaded. Total pages:", this.flatPages.length);
        } catch (error) {
            console.error("Failed to load content.json", error);
            document.getElementById('content-area').innerHTML = "<p class='error'>Erro ao carregar conteúdo.</p>";
        }
    },

    /**
     * Carrega uma página específica
     * @param {number} index - Índice da página no flatPages
     */
    loadPage: async function (index) {
        const pageData = this.flatPages[index];
        const contentArea = document.getElementById('content-area');

        // Usar sempre o mesmo template (i18n cuida da tradução via JSON)
        let fileUrl = pageData.file;

        // Cleanup de páginas anteriores (ex: parar música do roleplay)
        if (typeof window.roleplayCleanup === 'function') {
            window.roleplayCleanup();
            window.roleplayCleanup = null; // Limpar referência
        }

        // Analytics: rastrear entrada na página
        if (typeof Analytics !== 'undefined') {
            Analytics.trackPageEnter(pageData.id, index, this.flatPages.length);
        }

        // Fetch HTML content
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                let html = await res.text();

                // Check for Markdown
                if (fileUrl.toLowerCase().endsWith('.md')) {
                    if (typeof SimpleMarkdown !== 'undefined') {
                        html = SimpleMarkdown.parse(html);
                    } else {
                        console.warn('SimpleMarkdown not found, rendering raw text');
                        html = `<pre>${html}</pre>`;
                    }
                }

                // Inject
                contentArea.innerHTML = html;

                // Carregar traduções modulares para esta página (se disponível)
                await this.loadPageTranslations(pageData);

                // Traduzir a página carregada
                I18n.translatePage();

                // Execute inline scripts only if it was HTML originally or if we want to support scripts in MD (usually not safe/standard)
                // For now, keep ensuring scripts run for legacy HTML pages
                if (!fileUrl.toLowerCase().endsWith('.md')) {
                    const scripts = contentArea.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        if (oldScript.src) {
                            newScript.src = oldScript.src;
                        } else {
                            newScript.textContent = oldScript.textContent;
                        }
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                }

                // Scroll to top
                document.getElementById('main-content').scrollTop = 0;

                // Animate
                contentArea.classList.remove('fade-in');
                void contentArea.offsetWidth; // Trigger reflow
                contentArea.classList.add('fade-in');

                // Inicializar componentes interativos
                InteractiveComponents.init();

                // Atualizar cards de Fixação (se estiver na intro)
                GamificationManager.updateFixacaoCards();

                // Iniciar leitura automática se habilitada
                if (AccessibilityManager.autoReadEnabled) {
                    setTimeout(() => AccessibilityManager.startAutoRead(), 500);
                }

            } else {
                contentArea.innerHTML = `<h2>Erro 404</h2><p>Página não encontrada: ${fileUrl}</p>`;
            }
        } catch (e) {
            contentArea.innerHTML = `<h2>Erro</h2><p>Falha ao carregar conteúdo.</p>`;
        }

        NavigationManager.updateMenuState();
    },

    /**
     * Renderiza o menu (delega para NavigationManager)
     */
    renderMenu: function () {
        NavigationManager.renderMenu();
    },

    /**
     * Exibe feedback (delega para FeedbackManager)
     * @param {string} message 
     * @param {string} type 
     */
    showFeedback: function (message, type = 'info') {
        FeedbackManager.show(message, type);
    },

    /**
     * Carrega traduções modulares para uma página específica
     * Mapeamento: pageId -> caminho do JSON modular
     * @param {object} pageData - Dados da página (id, moduleId, etc)
     */
    loadPageTranslations: async function (pageData) {
        const lang = I18n.currentLang;
        const pageId = pageData.id;

        // Mapeamento de pageId para arquivo JSON modular e mountPoint
        const translationMap = {
            // Intro
            'intro': { path: 'intro.json', mount: 'intro' },
            'intro-p1': { path: 'intro.json', mount: 'intro' },

            // Módulo 1
            'm1-abertura': { path: 'm1/abertura.json', mount: 'm1.abertura' },
            'm1-p1': { path: 'm1/p1.json', mount: 'm1.p1' },
            'm1-p2': { path: 'm1/p2.json', mount: 'm1.p2' },
            'm1-p3': { path: 'm1/p3.json', mount: 'm1.p3' },
            'm1-p4': { path: 'm1/p4.json', mount: 'm1.p4' },
            'm1-p5': { path: 'm1/p6.json', mount: 'm1.p6' },
            'm1-p6': { path: 'm1/p6.json', mount: 'm1.p6' },
            'm1-conquistas': { path: 'm1/conquistas.json', mount: 'm1.conquistas' },

            // Módulo 2
            'm2-abertura': { path: 'm2/abertura.json', mount: 'm2.abertura' },
            'm2-p1': { path: 'm2/p1.json', mount: 'm2.p1' },
            'm2-p2': { path: 'm2/p2.json', mount: 'm2.p2' },
            'm2-p3': { path: 'm2/p3.json', mount: 'm2.p3' },
            'm2-p4': { path: 'm2/p4.json', mount: 'm2.p4' },
            'm2-p5': { path: 'm2/p5.json', mount: 'm2.p5' },
            'm2-p6': { path: 'm2/p6.json', mount: 'm2.p6' },
            'm2-conquistas': { path: 'm2/conquistas.json', mount: 'm2.conquistas' },

            // Módulo 3
            'm3-abertura': { path: 'm3/abertura.json', mount: 'm3.abertura' },
            'm3-p1': { path: 'm3/p1.json', mount: 'm3.p1' },
            'm3-p2': { path: 'm3/p2.json', mount: 'm3.p2' },
            'm3-p3': { path: 'm3/p3.json', mount: 'm3.p3' },
            'm3-p4': { path: 'm3/p4.json', mount: 'm3.p4' },
            'm3-p5': { path: 'm3/p5.json', mount: 'm3.p5' },
            'm3-p6': { path: 'm3/p6.json', mount: 'm3.p6' },
            'm3-p7': { path: 'm3/p7.json', mount: 'm3.p7' },
            'm3-p8': { path: 'm3/p8.json', mount: 'm3.p8' },
            'm3-conquistas': { path: 'm3/conquistas.json', mount: 'm3.conquistas' },
            'encerramento': { path: 'encerramento.json', mount: 'encerramento' },

            // Extras
            'extras-hub': { path: 'extras/hub.json', mount: 'extras.hub' },
            'extras-resumo': { path: 'extras/resumo.json', mount: 'extras.resumo' },
            'extras-flashcards': { path: 'extras/flashcards.json', mount: 'extras.flashcards' },
            'extras-questionarios': { path: 'extras/quiz.json', mount: 'extras.quiz' },
            'extras-metricas': { path: 'extras/metricas.json', mount: 'extras.metrics' },
            'extras-arraste': { path: 'extras/arraste.json', mount: 'extras.arraste' },
            'extras-ache-erro': { path: 'extras/ache-erro.json', mount: 'extras.ache-erro' },
            'extras-roleplay': { path: 'extras/roleplay.json', mount: 'extras.roleplay' }
        };

        // Carregar global.json sempre (se ainda não carregado)
        await I18n.loadPageTranslation(lang, 'global.json', 'global');

        // Carregar tradução específica da página
        const mapping = translationMap[pageId];
        if (mapping) {
            await I18n.loadPageTranslation(lang, mapping.path, mapping.mount);
        }
    }
};

// Expor para o escopo global
window.App = App;
window.onload = function () {
    App.init();
};

// Função global para navegação a partir do conteúdo das páginas
window.navigateToPage = function (pageId) {
    const idx = App.flatPages.findIndex(p => p.id === pageId);
    if (idx >= 0) {
        App.currentIndex = idx;
        App.loadPage(idx);
        NavigationManager.updateMenuState();
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    } else {
        console.error('Page not found:', pageId);
    }
};

window.onunload = function () {
    scorm.finish();
};
