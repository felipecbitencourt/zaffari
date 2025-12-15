// App Context
const App = {
    data: null, // content.json
    flatPages: [], // Flattened list of pages for linear navigation
    currentIndex: 0,
    maxIndexReached: 0,
    currentLang: 'pt',

    init: async function () {
        console.log("Initializing App...");

        // 1. Initialize SCORM
        scorm.init();

        // 2. Initialize Audio (if available)
        if (typeof AudioManager !== 'undefined') {
            AudioManager.init();
        }

        // 3. Load Content Structure
        await this.loadContent();

        // 4. Restore Progress
        this.restoreProgres();

        // 5. Render Interface
        this.renderMenu();
        this.loadPage(this.currentIndex);

        // 6. Bind Events
        this.bindEvents();
    },

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

    restoreProgres: function () {
        const location = scorm.getValue("cmi.core.lesson_location");
        console.log("Restoring location:", location);

        if (location) {
            // Find index of the page ID
            const idx = this.flatPages.findIndex(p => p.id === location);
            if (idx >= 0) {
                this.currentIndex = idx;
                this.maxIndexReached = idx; // Simplified resume behavior
            }
        }

        // Update Progress Bar
        this.updateProgress();
    },

    saveProgress: function () {
        // Save current page
        const currentPage = this.flatPages[this.currentIndex];
        scorm.setValue("cmi.core.lesson_location", currentPage.id);

        // Update max index
        if (this.currentIndex > this.maxIndexReached) {
            this.maxIndexReached = this.currentIndex;
        }

        // Check completion
        if (this.currentIndex === this.flatPages.length - 1) {
            scorm.setValue("cmi.core.lesson_status", "completed");
        }

        // Commit happens in wrapper
        this.updateProgress();
        this.updateMenuState();
    },

    updateProgress: function () {
        const percent = Math.round(((this.currentIndex + 1) / this.flatPages.length) * 100);
        document.getElementById('course-progress').value = percent;
        document.getElementById('progress-text').innerText = percent + "%";
    },

    renderMenu: function () {
        const menuEl = document.getElementById('menu-content');
        menuEl.innerHTML = "";

        this.data.modules.forEach((mod, modIndex) => {
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
                    const idx = this.flatPages.findIndex(p => p.id === page.id);
                    const isExtras = mod.id === 'extras';
                    // Extras são sempre acessíveis (mas não alteram o progresso)
                    if (idx <= this.maxIndexReached || isExtras) {
                        this.currentIndex = idx;
                        this.loadPage(idx);
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

    updateMenuState: function () {
        const links = document.querySelectorAll('.menu-link');
        links.forEach(link => {
            const pageId = link.dataset.id;
            const idx = this.flatPages.findIndex(p => p.id === pageId);
            const pageData = this.flatPages[idx];

            link.classList.remove('active', 'locked', 'completed');

            if (idx === this.currentIndex) {
                link.classList.add('active');
            }

            // Extras são sempre desbloqueados
            const isExtras = pageData && pageData.moduleId === 'extras';

            if (idx <= this.maxIndexReached || isExtras) {
                // Unlocked
            } else {
                link.classList.add('locked');
            }

            if (idx < this.currentIndex && !isExtras) {
                link.classList.add('completed');
            }
        });

        // Navigation Buttons
        document.getElementById('btn-prev').disabled = (this.currentIndex === 0);
        document.getElementById('btn-next').disabled = (this.currentIndex === this.flatPages.length - 1);
    },

    loadPage: async function (index) {
        const pageData = this.flatPages[index];
        const contentArea = document.getElementById('content-area');

        // Handle Language swap path
        let fileUrl = pageData.file;
        if (this.currentLang === 'es') {
            fileUrl = fileUrl.replace('/pt/', '/es/');
        }

        // Fetch HTML content
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                const html = await res.text();
                // Inject
                contentArea.innerHTML = html;

                // Enhance content (Accessibility descriptions handling could go here)

                // Scroll to top
                document.getElementById('main-content').scrollTop = 0;

                // Animate
                contentArea.classList.remove('fade-in');
                void contentArea.offsetWidth; // Trigger reflow
                contentArea.classList.add('fade-in');

                // Inicializar componentes interativos
                this.initInteractiveComponents();

            } else {
                contentArea.innerHTML = `<h2>Erro 404</h2><p>Página não encontrada: ${fileUrl}</p>`;
            }
        } catch (e) {
            contentArea.innerHTML = `<h2>Erro</h2><p>Falha ao carregar conteúdo.</p>`;
        }

        this.updateMenuState();
    },

    bindEvents: function () {
        // Navigation (with Click Sound)
        const playClick = () => {
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        // Navigation
        const btnNext = document.getElementById('btn-next');
        const btnPrev = document.getElementById('btn-prev');

        btnNext.onclick = () => {
            playClick();
            if (this.currentIndex < this.flatPages.length - 1) {
                this.currentIndex++;
                this.saveProgress();
                this.loadPage(this.currentIndex);
            }
        };

        btnPrev.onclick = () => {
            playClick();
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.saveProgress();
                this.loadPage(this.currentIndex);
            }
        };

        // Sidebar Toggle
        const sidebar = document.getElementById('sidebar');
        const toggleSidebar = () => {
            playClick();
            sidebar.classList.toggle('collapsed');
            const btnMenu = document.getElementById('btn-menu');
            if (sidebar.classList.contains('collapsed')) {
                btnMenu.classList.add('active');
                btnMenu.setAttribute('aria-label', 'Abrir Menu');
            } else {
                btnMenu.classList.remove('active');
                btnMenu.setAttribute('aria-label', 'Fechar Menu');
            }
        };

        document.getElementById('toggle-sidebar').onclick = toggleSidebar;
        document.getElementById('btn-menu').onclick = toggleSidebar;

        // Accessibility
        this.bindA11y();

        // Global Interactive Elements (Quiz)
        document.getElementById('content-area').addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-option')) {
                const btn = e.target;
                const parent = btn.closest('.quiz-block');
                const isCorrect = btn.dataset.correct === 'true';

                // Play click sound on selection
                playClick();

                // Reset siblings
                parent.querySelectorAll('.quiz-option').forEach(b => {
                    b.classList.remove('selected', 'correct', 'incorrect');
                    b.disabled = true; // keep disabled until validation or reset
                });

                btn.classList.add('selected');

                if (isCorrect) {
                    btn.classList.add('correct');
                    btn.style.backgroundColor = '#dcedc8';
                    const feedback = parent.querySelector('.feedback');
                    if (feedback) feedback.style.display = 'block';

                    // Show Success Feedback with sound
                    this.showFeedback("Resposta Correta! Você demonstrou conhecimento.", 'success');

                } else {
                    btn.classList.add('incorrect');
                    btn.style.backgroundColor = '#ffcdd2';

                    // Show Error Feedback with Retry logic
                    setTimeout(() => {
                        this.showFeedback("Resposta incorreta. Tente novamente!", 'error');

                        // Re-enable options after modal closes
                        parent.querySelectorAll('.quiz-option').forEach(b => b.disabled = false);
                        btn.classList.remove('selected', 'incorrect');
                        btn.style.backgroundColor = '';
                    }, 500);
                }
            }
        });
    },

    showFeedback: function (message, type = 'info') {
        const modal = document.getElementById('modal-feedback');
        const titleEl = document.getElementById('feedback-title');
        const msgEl = document.getElementById('feedback-message');
        const btn = document.getElementById('feedback-btn');

        if (!modal) return;

        // Reset classes
        modal.classList.remove('success', 'error', 'info');
        modal.classList.add(type);

        // Set Content
        msgEl.textContent = message;

        if (type === 'success') {
            titleEl.textContent = '🎉 Muito Bem!';
            if (typeof AudioManager !== 'undefined') AudioManager.playSuccess();
        } else if (type === 'error') {
            titleEl.textContent = '❌ Atenção';
            if (typeof AudioManager !== 'undefined') AudioManager.playError();
        } else {
            titleEl.textContent = 'ℹ️ Informação';
        }

        // Show
        modal.classList.add('active');
        btn.focus();

        // Bind logic to close
        btn.onclick = () => {
            modal.classList.remove('active');
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };
    },

    bindA11y: function () {
        // Settings Modal
        const settingsBtn = document.getElementById('btn-settings');
        const settingsModal = document.getElementById('modal-settings');
        const settingsClose = document.getElementById('btn-settings-close');

        settingsBtn.onclick = () => {
            settingsModal.classList.add('active');
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        settingsClose.onclick = () => {
            settingsModal.classList.remove('active');
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        // Close modal when clicking outside
        settingsModal.onclick = (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        };

        // Contrast (Dark Mode) - Toggle Button
        const contrastBtn = document.getElementById('btn-contrast');
        contrastBtn.onclick = () => {
            document.body.classList.toggle('high-contrast');
            contrastBtn.classList.toggle('active');
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        // Font Size
        let fontSize = 100; // percentage
        const fontSizeDisplay = document.getElementById('font-size-display');

        document.getElementById('btn-increase-font').onclick = () => {
            if (fontSize < 150) {
                fontSize += 10;
                document.documentElement.style.fontSize = (fontSize / 100 * 16) + "px";
                fontSizeDisplay.textContent = fontSize + '%';
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };

        document.getElementById('btn-decrease-font').onclick = () => {
            if (fontSize > 70) {
                fontSize -= 10;
                document.documentElement.style.fontSize = (fontSize / 100 * 16) + "px";
                fontSizeDisplay.textContent = fontSize + '%';
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };

        // Reading Assistance (ex-Dyslexia) - Toggle Button
        const dyslexiaBtn = document.getElementById('btn-dyslexia');
        dyslexiaBtn.onclick = () => {
            document.body.classList.toggle('dyslexia-mode');
            dyslexiaBtn.classList.toggle('active');
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

        // TTS
        const ttsBtn = document.getElementById('btn-tts');
        let speaking = false;
        let ttsSpeed = 1.0;
        let selectedVoice = null;
        let availableVoices = [];

        // Speed Buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                ttsSpeed = parseFloat(btn.dataset.speed);
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();

                // If speaking, restart with new speed
                if (speaking) {
                    window.speechSynthesis.cancel();
                    const text = document.getElementById('main-content').innerText;
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = this.currentLang === 'pt' ? 'pt-BR' : 'es-ES';
                    utterance.rate = ttsSpeed;
                    if (selectedVoice) utterance.voice = selectedVoice;
                    window.speechSynthesis.speak(utterance);
                    utterance.onend = () => {
                        speaking = false;
                        ttsBtn.classList.remove('active');
                    };
                }
            };
        });

        // Voice Selector
        const voiceSelect = document.getElementById('voice-select');
        const voicePreviewBtn = document.getElementById('btn-voice-preview');

        const loadVoices = () => {
            availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                voiceSelect.innerHTML = '';

                const langFilter = this.currentLang === 'pt' ? 'pt' : 'es';
                const filteredVoices = availableVoices.filter(v => v.lang.toLowerCase().startsWith(langFilter));
                const otherVoices = availableVoices.filter(v => !v.lang.toLowerCase().startsWith(langFilter));

                filteredVoices.forEach((voice) => {
                    const option = document.createElement('option');
                    option.value = voice.name;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    if (voice.name.includes('Google')) option.textContent += ' ⭐';
                    voiceSelect.appendChild(option);
                });

                if (filteredVoices.length > 0 && otherVoices.length > 0) {
                    const separator = document.createElement('option');
                    separator.disabled = true;
                    separator.textContent = '── Outras vozes ──';
                    voiceSelect.appendChild(separator);
                }

                otherVoices.forEach((voice) => {
                    const option = document.createElement('option');
                    option.value = voice.name;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    voiceSelect.appendChild(option);
                });

                const savedVoice = localStorage.getItem('tts-voice');
                if (savedVoice) {
                    voiceSelect.value = savedVoice;
                    selectedVoice = availableVoices.find(v => v.name === savedVoice);
                }
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        voiceSelect.onchange = () => {
            selectedVoice = availableVoices.find(v => v.name === voiceSelect.value);
            localStorage.setItem('tts-voice', voiceSelect.value);
        };

        voicePreviewBtn.onclick = () => {
            window.speechSynthesis.cancel();
            const testText = this.currentLang === 'pt'
                ? 'Olá! Esta é uma prévia da voz.'
                : 'Hola! Esta es una vista previa.';
            const utterance = new SpeechSynthesisUtterance(testText);
            const voice = availableVoices.find(v => v.name === voiceSelect.value);
            if (voice) utterance.voice = voice;
            utterance.rate = ttsSpeed;
            window.speechSynthesis.speak(utterance);
        };

        // TTS Button
        ttsBtn.onclick = () => {
            if (speaking) {
                window.speechSynthesis.cancel();
                speaking = false;
                ttsBtn.classList.remove('active');
            } else {
                const text = document.getElementById('main-content').innerText;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = this.currentLang === 'pt' ? 'pt-BR' : 'es-ES';
                utterance.rate = ttsSpeed;
                if (selectedVoice) utterance.voice = selectedVoice;
                window.speechSynthesis.speak(utterance);
                speaking = true;
                ttsBtn.classList.add('active');

                utterance.onend = () => {
                    speaking = false;
                    ttsBtn.classList.remove('active');
                };
            }
        };

        // Language Buttons
        document.getElementById('btn-lang-pt').onclick = () => {
            if (this.currentLang !== 'pt') {
                this.currentLang = 'pt';
                document.getElementById('btn-lang-pt').classList.add('active');
                document.getElementById('btn-lang-es').classList.remove('active');
                this.loadPage(this.currentIndex);
                this.renderMenu();
                loadVoices(); // Refresh voices for new language
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };

        document.getElementById('btn-lang-es').onclick = () => {
            if (this.currentLang !== 'es') {
                this.currentLang = 'es';
                document.getElementById('btn-lang-es').classList.add('active');
                document.getElementById('btn-lang-pt').classList.remove('active');
                this.loadPage(this.currentIndex);
                loadVoices();
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };
    },

    // Inicializa componentes interativos após carregar conteúdo
    initInteractiveComponents: function () {
        const contentArea = document.getElementById('content-area');

        // 1. MODAIS
        contentArea.querySelectorAll('.btn-modal-trigger').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const modalId = btn.dataset.modal;
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                }
            };
        });

        // 2. CARDS INTERATIVOS
        contentArea.querySelectorAll('.interactive-card').forEach(card => {
            card.onclick = () => {
                card.classList.toggle('expanded');
                if (typeof AudioManager !== 'undefined') AudioManager.playExpand();
            };
            card.onkeypress = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.classList.toggle('expanded');
                    if (typeof AudioManager !== 'undefined') AudioManager.playExpand();
                }
            };
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
        });

        // 4. REVELAR CONTEÚDO
        contentArea.querySelectorAll('.reveal-btn').forEach(btn => {
            btn.onclick = () => {
                const container = btn.closest('.reveal-container');
                const content = container?.querySelector('.reveal-content');
                if (content) {
                    content.classList.add('visible');
                    btn.classList.add('revealed');
                    btn.textContent = '✓ Revelado';
                    btn.disabled = true;
                    if (typeof AudioManager !== 'undefined') AudioManager.playExpand();
                }
            };
        });

        // 5. ACCORDIONS - Som ao expandir
        contentArea.querySelectorAll('.accordion details').forEach(details => {
            details.addEventListener('toggle', () => {
                if (details.open && typeof AudioManager !== 'undefined') {
                    AudioManager.playExpand();
                }
            });
        });

        // Iniciar animação de wiggle sincronizada
        this.startWiggleSync();
    },

    // Sincroniza animação de wiggle em todos os elementos interativos
    wiggleInterval: null,
    startWiggleSync: function () {
        // Limpar intervalo anterior se existir
        if (this.wiggleInterval) {
            clearInterval(this.wiggleInterval);
        }

        const triggerWiggle = () => {
            // Selecionar APENAS elementos que são realmente clicáveis e expandem/revelam conteúdo
            // NÃO incluir .module-card-intro que apenas têm efeitos de hover (sem ação de clique)
            const elements = document.querySelectorAll(
                '.interactive-card:not(.expanded), ' +  // Cards que expandem ao clicar
                '.accordion details:not([open]), ' +    // Accordions expandíveis
                '.reveal-btn:not(.revealed), ' +        // Botões de revelar conteúdo
                '#btn-start-tutorial'                   // Botão de iniciar tutorial
            );

            elements.forEach(el => {
                // Remover classe primeiro para reiniciar animação
                el.classList.remove('wiggle-animate');
                // Forçar reflow
                void el.offsetWidth;
                // Adicionar classe de animação
                el.classList.add('wiggle-animate');
            });

            // Remover classe após animação terminar (400ms)
            setTimeout(() => {
                elements.forEach(el => el.classList.remove('wiggle-animate'));
            }, 500);
        };

        // Primeira execução após 3 segundos
        setTimeout(() => {
            triggerWiggle();
            // Depois a cada 5 segundos
            this.wiggleInterval = setInterval(triggerWiggle, 5000);
        }, 3000);
    }
};

// Start
window.onload = function () {
    App.init();
};

window.onunload = function () {
    scorm.finish();
}
