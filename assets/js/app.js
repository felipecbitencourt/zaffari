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
    }
};

// Start
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
