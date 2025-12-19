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
    manifest: null, // pages-manifest.json

    /**
     * Inicializa a aplicação
     */
    init: async function () {
        console.log("Initializing App...");

        // 1. Initialize I18n (Loads Global)
        await I18n.init();

        // 2. Initialize SCORM
        scorm.init();

        // 3. Initialize Audio
        if (typeof AudioManager !== 'undefined') AudioManager.init();

        // 4. Load Content & Manifest
        await Promise.all([
            this.loadContent(),
            this.loadManifest()
        ]);

        // 5. Initialize Navigation
        NavigationManager.init(this);

        // 6. Restore Progress
        NavigationManager.restoreProgress();

        // 7. Render Interface
        NavigationManager.renderMenu();

        // Load initial page (will trigger translation load)
        await this.loadPage(this.currentIndex);

        // 8-10. Other inits
        FeedbackManager.init();
        FeedbackManager.bindQuizHandler(document.getElementById('content-area'));
        AccessibilityManager.init();
        if (typeof Analytics !== 'undefined') Analytics.init();

        // Listen for language changes
        document.addEventListener('languageChanged', async () => {
            // Reload global is already done by i18n, we just need to reload current page translation
            const pageData = this.flatPages[this.currentIndex];
            const manifestEntry = this.getManifestEntry(pageData.id);
            if (manifestEntry) {
                await I18n.loadPageTranslations(manifestEntry.translation, manifestEntry.mountPoint);
            }
            I18n.translatePage();
        });

        console.log("App initialized successfully!");
    },

    /**
     * Carrega estrutura de conteúdo
     */
    loadContent: async function () {
        try {
            const response = await fetch('content.json');
            this.data = await response.json();

            // Flatten pages
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
        } catch (error) {
            console.error("Failed to load content.json", error);
        }
    },

    /**
     * Carrega manifesto de páginas
     */
    loadManifest: async function () {
        try {
            const response = await fetch('pages-manifest.json');
            const data = await response.json();
            // Map for quick lookup
            this.manifest = new Map(data.pages.map(p => [p.id, p]));
        } catch (e) {
            console.error("Failed to load pages-manifest.json", e);
        }
    },

    getManifestEntry: function (pageId) {
        if (!this.manifest) return null;
        return this.manifest.get(pageId);
    },

    /**
     * Carrega uma página específica
     * @param {number} index - Índice da página no flatPages
     */
    loadPage: async function (index) {
        const pageData = this.flatPages[index];
        const contentArea = document.getElementById('content-area');

        // Cleanup
        if (typeof window.roleplayCleanup === 'function') {
            window.roleplayCleanup();
            window.roleplayCleanup = null;
        }

        if (typeof Analytics !== 'undefined') {
            Analytics.trackPageEnter(pageData.id, index, this.flatPages.length);
        }

        // --- NEW: Load Page Specific Translations FIRST ---
        const manifestEntry = this.getManifestEntry(pageData.id);
        if (manifestEntry && manifestEntry.translation) {
            await I18n.loadPageTranslations(manifestEntry.translation, manifestEntry.mountPoint);
        }
        // --------------------------------------------------

        // Fetch HTML content
        let fileUrl = pageData.file;
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                let html = await res.text();

                // Markdown support
                if (fileUrl.toLowerCase().endsWith('.md') && typeof SimpleMarkdown !== 'undefined') {
                    html = SimpleMarkdown.parse(html);
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
