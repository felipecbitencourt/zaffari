/**
 * navigation.js - Navegação e Menu
 * Gerencia sidebar, menu, progresso e navegação entre páginas
 */

const NavigationManager = {
    app: null, // Referência ao App

    /**
     * Inicializa o gerenciador de navegação
     * @param {Object} appContext - Referência ao objeto App
     */
    init: function (appContext) {
        this.app = appContext;
        this.bindNavigationEvents();
        this.bindSidebarEvents();
    },

    /**
     * Vincula eventos de navegação (prev/next)
     */
    bindNavigationEvents: function () {
        const playClick = () => {
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        const btnNext = document.getElementById('btn-next');
        const btnPrev = document.getElementById('btn-prev');

        if (btnNext) {
            btnNext.onclick = () => {
                // Verificar se está na página intro (index 0) e tutorial não foi feito
                const isIntroPage = this.app.currentIndex === 0;
                const tutorialCompleted = localStorage.getItem('tutorial-completed') === 'true';

                if (isIntroPage && !tutorialCompleted) {
                    // Não permitir avançar - mostrar feedback
                    if (typeof AudioManager !== 'undefined') AudioManager.playError();
                    const startMsg = document.querySelector('.start-message');
                    if (startMsg) {
                        startMsg.style.animation = 'shake 0.5s ease-in-out';
                        setTimeout(() => startMsg.style.animation = '', 500);
                    }
                    return;
                }

                playClick();
                if (this.app.currentIndex < this.app.flatPages.length - 1) {
                    this.app.currentIndex++;
                    this.saveProgress();
                    this.app.loadPage(this.app.currentIndex);
                }
            };
        }

        if (btnPrev) {
            btnPrev.onclick = () => {
                playClick();
                if (this.app.currentIndex > 0) {
                    this.app.currentIndex--;
                    this.saveProgress();
                    this.app.loadPage(this.app.currentIndex);
                }
            };
        }
    },

    /**
     * Vincula eventos do sidebar
     */
    bindSidebarEvents: function () {
        const playClick = () => {
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        const sidebar = document.getElementById('sidebar');
        const toggleSidebar = () => {
            playClick();
            sidebar.classList.toggle('collapsed');
            const btnMenu = document.getElementById('btn-menu');
            if (sidebar.classList.contains('collapsed')) {
                btnMenu.classList.add('active');
                btnMenu.setAttribute('aria-label', I18n.t('ui.sidebar.toggle_expand'));
            } else {
                btnMenu.classList.remove('active');
                btnMenu.setAttribute('aria-label', I18n.t('ui.sidebar.toggle_collapse'));
            }
        };

        const toggleBtn = document.getElementById('toggle-sidebar');
        const menuBtn = document.getElementById('btn-menu');

        if (toggleBtn) toggleBtn.onclick = toggleSidebar;
        if (menuBtn) menuBtn.onclick = toggleSidebar;
    },

    /**
     * Renderiza o menu lateral
     */
    renderMenu: function () {
        const menuEl = document.getElementById('menu-content');
        if (!menuEl) return;

        menuEl.innerHTML = "";

        this.app.data.modules.forEach((mod, modIndex) => {
            const group = document.createElement('div');
            group.className = 'module-group';
            group.dataset.moduleId = mod.id;

            // Container for pages (collapsible)
            const pagesContainer = document.createElement('div');
            pagesContainer.className = 'module-pages';

            const title = document.createElement('button');
            title.className = 'module-title';
            title.setAttribute('type', 'button');
            title.setAttribute('aria-expanded', 'true');
            title.innerHTML = `
                <span class="module-title-text">${mod.title}</span>
                <span class="module-toggle-icon">▼</span>
            `;

            // Toggle collapse/expand on click
            title.onclick = () => {
                const isExpanded = title.getAttribute('aria-expanded') === 'true';
                title.setAttribute('aria-expanded', !isExpanded);
                pagesContainer.classList.toggle('collapsed');
                group.classList.toggle('collapsed');
            };

            group.appendChild(title);

            mod.pages.forEach(page => {
                const link = document.createElement('a');
                link.href = "#";
                link.className = 'menu-link locked';
                link.dataset.id = page.id;
                link.dataset.moduleId = mod.id;
                link.textContent = page.title;
                link.onclick = (e) => {
                    e.preventDefault();
                    // Find global index
                    const idx = this.app.flatPages.findIndex(p => p.id === page.id);
                    const isExtras = mod.id === 'extras';

                    // Se for página de extras, verificar se está desbloqueada
                    if (isExtras && page.id !== 'extras-hub') {
                        const isUnlocked = GamificationManager.checkExtrasUnlocked(page.id);
                        if (!isUnlocked) {
                            // Mostrar feedback de bloqueio
                            if (typeof AudioManager !== 'undefined') AudioManager.playError();
                            link.classList.add('shake');
                            setTimeout(() => link.classList.remove('shake'), 500);
                            return;
                        }
                    }

                    // Extras são sempre acessíveis (mas não alteram o progresso)
                    if (idx <= this.app.maxIndexReached || isExtras) {
                        this.app.currentIndex = idx;
                        this.app.loadPage(idx);
                        // Só salva progresso se NÃO for extras
                        if (!isExtras) {
                            this.saveProgress();
                        } else {
                            // Apenas atualiza menu visual sem salvar progresso
                            this.updateMenuState();
                        }
                    }
                };
                pagesContainer.appendChild(link);
            });

            group.appendChild(pagesContainer);
            menuEl.appendChild(group);
        });

        this.updateMenuState();
    },

    /**
     * Atualiza estado visual do menu
     */
    updateMenuState: function () {
        const links = document.querySelectorAll('.menu-link');
        links.forEach(link => {
            const pageId = link.dataset.id;
            const idx = this.app.flatPages.findIndex(p => p.id === pageId);
            const pageData = this.app.flatPages[idx];

            link.classList.remove('active', 'locked', 'completed', 'extras-locked');

            if (idx === this.app.currentIndex) {
                link.classList.add('active');
            }

            // Extras são sempre desbloqueados por navegação, MAS podem ter bloqueio de insígnias
            const isExtras = pageData && pageData.moduleId === 'extras';

            if (idx <= this.app.maxIndexReached || isExtras) {
                // Unlocked por progresso
                // Mas verificar se extras está bloqueado por insígnias
                if (isExtras && pageId !== 'extras-hub') {
                    if (!GamificationManager.checkExtrasUnlocked(pageId)) {
                        link.classList.add('extras-locked');
                    }
                }
            } else {
                link.classList.add('locked');
            }

            if (idx < this.app.currentIndex && !isExtras) {
                link.classList.add('completed');
            }
        });

        // Navigation Buttons
        const currentPage = this.app.flatPages[this.app.currentIndex];
        const isExtras = currentPage && currentPage.moduleId === 'extras';
        const navFooter = document.querySelector('.content-nav');

        // Esconder navegação nas páginas de extras
        if (navFooter) {
            if (isExtras) {
                navFooter.style.display = 'none';
            } else {
                navFooter.style.display = '';
                const btnPrev = document.getElementById('btn-prev');
                const btnNext = document.getElementById('btn-next');

                if (btnPrev) btnPrev.disabled = (this.app.currentIndex === 0);

                // Bloquear próximo na página intro até tutorial ser concluído
                const isIntroPage = this.app.currentIndex === 0;
                const tutorialCompleted = localStorage.getItem('tutorial-completed') === 'true';

                if (btnNext) {
                    if (isIntroPage && !tutorialCompleted) {
                        btnNext.disabled = true;
                    } else {
                        btnNext.disabled = (this.app.currentIndex === this.app.flatPages.length - 1);
                    }
                }
            }
        }
    },

    /**
     * Restaura progresso do SCORM
     */
    restoreProgress: function () {
        const location = scorm.getValue("cmi.core.lesson_location");
        console.log("Restoring location:", location);

        if (location) {
            // Find index of the page ID
            const idx = this.app.flatPages.findIndex(p => p.id === location);
            if (idx >= 0) {
                this.app.currentIndex = idx;
                this.app.maxIndexReached = idx;
            }
        }

        // Update Progress Bar
        this.updateProgress();
    },

    /**
     * Salva progresso no SCORM
     */
    saveProgress: function () {
        // Save current page
        const currentPage = this.app.flatPages[this.app.currentIndex];
        scorm.setValue("cmi.core.lesson_location", currentPage.id);

        // Update max index
        if (this.app.currentIndex > this.app.maxIndexReached) {
            this.app.maxIndexReached = this.app.currentIndex;
        }

        // Check completion
        if (this.app.currentIndex === this.app.flatPages.length - 1) {
            scorm.setValue("cmi.core.lesson_status", "completed");
        }

        // Commit happens in wrapper
        this.updateProgress();
        this.updateMenuState();
    },

    /**
     * Atualiza barra de progresso
     */
    updateProgress: function () {
        // Contar apenas páginas de módulos (não extras)
        const modulePages = this.app.flatPages.filter(p => p.type !== 'extras');
        const currentModuleIndex = modulePages.findIndex(p => p.id === this.app.flatPages[this.app.currentIndex].id);

        // Se página atual é extras, usar a última posição de módulo conhecida
        const effectiveIndex = currentModuleIndex >= 0 ? currentModuleIndex :
            modulePages.findIndex(p => this.app.flatPages.indexOf(p) <= this.app.currentIndex);

        const percent = modulePages.length > 0 ?
            Math.round(((Math.max(0, effectiveIndex) + 1) / modulePages.length) * 100) : 0;

        const progressBar = document.getElementById('course-progress');
        const progressText = document.getElementById('progress-text');

        if (progressBar) progressBar.value = percent;
        if (progressText) progressText.innerText = percent + "%";
    }
};
