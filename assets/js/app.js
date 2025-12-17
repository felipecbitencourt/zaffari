// App Context
const App = {
    data: null, // content.json
    flatPages: [], // Flattened list of pages for linear navigation
    currentIndex: 0,
    maxIndexReached: 0,
    currentLang: 'pt',

    init: async function () {
        console.log("Initializing App...");

        // 0. Initialize I18n
        await I18n.init();

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
        // Contar apenas páginas de módulos (não extras)
        const modulePages = this.flatPages.filter(p => p.type !== 'extras');
        const currentModuleIndex = modulePages.findIndex(p => p.id === this.flatPages[this.currentIndex].id);

        // Se página atual é extras, usar a última posição de módulo conhecida
        const effectiveIndex = currentModuleIndex >= 0 ? currentModuleIndex :
            modulePages.findIndex(p => this.flatPages.indexOf(p) <= this.currentIndex);

        const percent = modulePages.length > 0 ?
            Math.round(((Math.max(0, effectiveIndex) + 1) / modulePages.length) * 100) : 0;

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

                    // Se for página de extras, verificar se está desbloqueada
                    if (isExtras && page.id !== 'extras-hub') {
                        const isUnlocked = this.checkExtrasUnlocked(page.id);
                        if (!isUnlocked) {
                            // Mostrar feedback de bloqueio
                            if (typeof AudioManager !== 'undefined') AudioManager.playError();
                            link.classList.add('shake');
                            setTimeout(() => link.classList.remove('shake'), 500);
                            return;
                        }
                    }

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

            link.classList.remove('active', 'locked', 'completed', 'extras-locked');

            if (idx === this.currentIndex) {
                link.classList.add('active');
            }

            // Extras são sempre desbloqueados por navegação, MAS podem ter bloqueio de insígnias
            const isExtras = pageData && pageData.moduleId === 'extras';

            if (idx <= this.maxIndexReached || isExtras) {
                // Unlocked por progresso
                // Mas verificar se extras está bloqueado por insígnias
                if (isExtras && pageId !== 'extras-hub') {
                    if (!this.checkExtrasUnlocked(pageId)) {
                        link.classList.add('extras-locked');
                    }
                }
            } else {
                link.classList.add('locked');
            }

            if (idx < this.currentIndex && !isExtras) {
                link.classList.add('completed');
            }
        });

        // Navigation Buttons
        const currentPage = this.flatPages[this.currentIndex];
        const isExtras = currentPage && currentPage.moduleId === 'extras';
        const navFooter = document.querySelector('.content-nav');

        // Esconder navegação nas páginas de extras
        if (isExtras) {
            navFooter.style.display = 'none';
        } else {
            navFooter.style.display = '';
            document.getElementById('btn-prev').disabled = (this.currentIndex === 0);

            // Bloquear próximo na página intro até tutorial ser concluído
            const isIntroPage = this.currentIndex === 0;
            const tutorialCompleted = localStorage.getItem('tutorial-completed') === 'true';

            if (isIntroPage && !tutorialCompleted) {
                document.getElementById('btn-next').disabled = true;
            } else {
                document.getElementById('btn-next').disabled = (this.currentIndex === this.flatPages.length - 1);
            }
        }
    },

    loadPage: async function (index) {
        const pageData = this.flatPages[index];
        const contentArea = document.getElementById('content-area');

        // Usar sempre o mesmo template (i18n cuida da tradução via JSON)
        let fileUrl = pageData.file;

        // Fetch HTML content
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                const html = await res.text();
                // Inject
                contentArea.innerHTML = html;

                // Traduzir a página carregada
                I18n.translatePage();

                // Execute inline scripts (scripts inside innerHTML don't run automatically)
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

                // Enhance content (Accessibility descriptions handling could go here)

                // Scroll to top
                document.getElementById('main-content').scrollTop = 0;

                // Animate
                contentArea.classList.remove('fade-in');
                void contentArea.offsetWidth; // Trigger reflow
                contentArea.classList.add('fade-in');

                // Inicializar componentes interativos
                this.initInteractiveComponents();

                // Atualizar cards de Fixação (se estiver na intro)
                this.updateFixacaoCards();

                // Iniciar leitura automática se habilitada
                if (this.startAutoRead) {
                    setTimeout(() => this.startAutoRead(), 500);
                }

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
            // Verificar se está na página intro (index 0) e tutorial não foi feito
            const isIntroPage = this.currentIndex === 0;
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

        // Feedback Modal close bindings
        const feedbackModal = document.getElementById('modal-feedback');
        const feedbackClose = document.getElementById('btn-feedback-close');
        const feedbackBtn = document.getElementById('feedback-btn');

        if (feedbackClose) {
            feedbackClose.onclick = () => {
                feedbackModal.classList.remove('active');
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }

        if (feedbackBtn) {
            feedbackBtn.onclick = () => {
                feedbackModal.classList.remove('active');
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }

        // Close feedback modal when clicking outside
        if (feedbackModal) {
            feedbackModal.onclick = (e) => {
                if (e.target === feedbackModal) {
                    feedbackModal.classList.remove('active');
                }
            };
        }

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
        const ttsControls = document.getElementById('tts-controls');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeRange = document.getElementById('volume-range');
        let speaking = false;
        let ttsSpeed = 1.0;
        let ttsVolume = 1.0;
        let selectedVoice = null;
        let availableVoices = [];
        let autoReadEnabled = localStorage.getItem('auto-read') === 'true';

        // Auto-read toggle
        const autoReadBtn = document.getElementById('btn-auto-read');
        if (autoReadEnabled) {
            autoReadBtn.classList.add('active');
            ttsControls.classList.add('auto-read-mode');
            ttsBtn.textContent = '▶️';
            ttsBtn.title = 'Pausar/Continuar Leitura';
        }

        autoReadBtn.onclick = () => {
            autoReadEnabled = !autoReadEnabled;
            autoReadBtn.classList.toggle('active');
            localStorage.setItem('auto-read', autoReadEnabled);
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();

            if (autoReadEnabled) {
                ttsControls.classList.add('auto-read-mode');
                ttsBtn.textContent = '▶️';
                ttsBtn.title = 'Pausar/Continuar Leitura';
                // Iniciar leitura da página atual
                this.startAutoRead();
            } else {
                ttsControls.classList.remove('auto-read-mode');
                ttsBtn.textContent = '🔊';
                ttsBtn.title = 'Ler Página';
                window.speechSynthesis.cancel();
                speaking = false;
                ttsBtn.classList.remove('active', 'tts-playing');
            }
        };

        // Volume control
        if (volumeRange) {
            volumeRange.oninput = () => {
                ttsVolume = volumeRange.value / 100;
                // Se estiver falando, reiniciar com novo volume
                if (speaking) {
                    window.speechSynthesis.cancel();
                    const text = document.getElementById('main-content').innerText;
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = this.currentLang === 'pt' ? 'pt-BR' : 'es-ES';
                    utterance.rate = ttsSpeed;
                    utterance.volume = ttsVolume;
                    if (selectedVoice) utterance.voice = selectedVoice;
                    window.speechSynthesis.speak(utterance);
                    utterance.onend = () => {
                        speaking = false;
                        ttsBtn.classList.remove('active', 'tts-playing');
                        if (autoReadEnabled) ttsBtn.textContent = '▶️';
                    };
                }
            };
        }

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
                    utterance.volume = ttsVolume;
                    if (selectedVoice) utterance.voice = selectedVoice;
                    window.speechSynthesis.speak(utterance);
                    utterance.onend = () => {
                        speaking = false;
                        ttsBtn.classList.remove('active', 'tts-playing');
                        if (autoReadEnabled) ttsBtn.textContent = '▶️';
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

                // Verificar se há voz salva
                const savedVoice = localStorage.getItem('tts-voice');
                if (savedVoice && availableVoices.find(v => v.name === savedVoice)) {
                    voiceSelect.value = savedVoice;
                    selectedVoice = availableVoices.find(v => v.name === savedVoice);
                } else {
                    // Auto-selecionar voz Google (⭐) como preset se disponível
                    const googleVoice = filteredVoices.find(v => v.name.includes('Google'));
                    if (googleVoice) {
                        voiceSelect.value = googleVoice.name;
                        selectedVoice = googleVoice;
                        localStorage.setItem('tts-voice', googleVoice.name);
                    } else if (filteredVoices.length > 0) {
                        // Fallback para primeira voz do idioma
                        voiceSelect.value = filteredVoices[0].name;
                        selectedVoice = filteredVoices[0];
                    }
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
            utterance.volume = ttsVolume;
            window.speechSynthesis.speak(utterance);
        };

        // Função para iniciar leitura automática
        this.startAutoRead = () => {
            if (!autoReadEnabled) return;

            window.speechSynthesis.cancel();
            const text = document.getElementById('main-content').innerText;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.currentLang === 'pt' ? 'pt-BR' : 'es-ES';
            utterance.rate = ttsSpeed;
            utterance.volume = ttsVolume;
            if (selectedVoice) utterance.voice = selectedVoice;

            window.speechSynthesis.speak(utterance);
            speaking = true;
            ttsBtn.classList.add('active', 'tts-playing');
            ttsBtn.textContent = '⏸️';

            utterance.onend = () => {
                speaking = false;
                ttsBtn.classList.remove('active', 'tts-playing');
                if (autoReadEnabled) ttsBtn.textContent = '▶️';
            };
        };

        // TTS Button - Muda comportamento baseado no modo auto-read
        ttsBtn.onclick = () => {
            if (autoReadEnabled) {
                // Modo auto-read: play/pause
                if (speaking) {
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                        ttsBtn.textContent = '⏸️';
                        ttsBtn.classList.add('tts-playing');
                    } else {
                        window.speechSynthesis.pause();
                        ttsBtn.textContent = '▶️';
                        ttsBtn.classList.remove('tts-playing');
                    }
                } else {
                    this.startAutoRead();
                }
            } else {
                // Modo manual: toggle leitura
                if (speaking) {
                    window.speechSynthesis.cancel();
                    speaking = false;
                    ttsBtn.classList.remove('active');
                } else {
                    const text = document.getElementById('main-content').innerText;
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = this.currentLang === 'pt' ? 'pt-BR' : 'es-ES';
                    utterance.rate = ttsSpeed;
                    utterance.volume = ttsVolume;
                    if (selectedVoice) utterance.voice = selectedVoice;
                    window.speechSynthesis.speak(utterance);
                    speaking = true;
                    ttsBtn.classList.add('active');

                    utterance.onend = () => {
                        speaking = false;
                        ttsBtn.classList.remove('active');
                    };
                }
            }
        };

        // Language Buttons
        document.getElementById('btn-lang-pt').onclick = async () => {
            if (this.currentLang !== 'pt') {
                this.currentLang = 'pt';
                await I18n.setLanguage('pt');
                this.updateLangButtons('pt');
                this.loadPage(this.currentIndex);
                this.renderMenu();
                loadVoices(); // Refresh voices for new language
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };

        document.getElementById('btn-lang-es').onclick = async () => {
            if (this.currentLang !== 'es') {
                this.currentLang = 'es';
                await I18n.setLanguage('es');
                this.updateLangButtons('es');
                this.loadPage(this.currentIndex);
                this.renderMenu();
                loadVoices();
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };

        document.getElementById('btn-lang-fr').onclick = async () => {
            if (this.currentLang !== 'fr') {
                this.currentLang = 'fr';
                await I18n.setLanguage('fr');
                this.updateLangButtons('fr');
                this.loadPage(this.currentIndex);
                this.renderMenu();
                loadVoices();
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };

        document.getElementById('btn-lang-en').onclick = async () => {
            if (this.currentLang !== 'en') {
                this.currentLang = 'en';
                await I18n.setLanguage('en');
                this.updateLangButtons('en');
                this.loadPage(this.currentIndex);
                this.renderMenu();
                loadVoices();
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            }
        };
    },

    // Helper to update language button states
    updateLangButtons: function (activeLang) {
        ['pt', 'es', 'fr', 'en'].forEach(lang => {
            const btn = document.getElementById(`btn-lang-${lang}`);
            if (btn) {
                if (lang === activeLang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
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
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                }
            };
        });

        // Fechar modais com botão X
        contentArea.querySelectorAll('.modal-close').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const modal = btn.closest('.modal-overlay');
                if (modal) {
                    modal.classList.remove('active');
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                }
            };
        });

        // Fechar modais clicando fora
        contentArea.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
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

        // 6. SLIDERS (Content Slider)
        contentArea.querySelectorAll('.content-slider').forEach(slider => {
            const slides = slider.querySelectorAll('.slider-slide');
            const prevBtn = slider.querySelector('.slider-prev');
            const nextBtn = slider.querySelector('.slider-next');
            const dots = slider.querySelectorAll('.slider-dot');
            let currentSlide = 0;

            const showSlide = (index) => {
                slides.forEach((slide, i) => {
                    slide.classList.toggle('hidden', i !== index);
                });
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
                prevBtn.disabled = index === 0;
                nextBtn.disabled = index === slides.length - 1;
                currentSlide = index;
            };

            prevBtn.onclick = () => {
                if (currentSlide > 0) {
                    showSlide(currentSlide - 1);
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                }
            };

            nextBtn.onclick = () => {
                if (currentSlide < slides.length - 1) {
                    showSlide(currentSlide + 1);
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                }
            };

            dots.forEach((dot, i) => {
                dot.onclick = () => {
                    showSlide(i);
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                };
            });

            // Inicializar no primeiro slide
            showSlide(0);
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
    },

    // Atualiza estado dos cards de Fixação baseado nas insígnias conquistadas
    updateFixacaoCards: function () {
        const badges = JSON.parse(localStorage.getItem('badges') || '{}');
        const fixacaoCards = document.querySelectorAll('.fixacao-card');

        if (fixacaoCards.length === 0) return;

        // Contar insígnias por tipo
        const count = {
            resumo: 0,
            video: 0,
            quiz: 0,
            flashcard: 0,
            'drag-drop': 0,
            'find-error': 0,
            'roleplay': 0
        };

        // Contar quantas insígnias de cada tipo o usuário tem
        Object.values(badges).forEach(moduleBadges => {
            if (Array.isArray(moduleBadges)) {
                moduleBadges.forEach(badge => {
                    if (count.hasOwnProperty(badge)) {
                        count[badge]++;
                    }
                });
            }
        });

        // Atualizar cada card
        fixacaoCards.forEach(card => {
            const type = card.dataset.type;
            const required = parseInt(card.dataset.required) || 1;
            const currentCount = count[type] || 0;

            // Atualizar ícones individuais
            const badgeIcons = card.querySelectorAll('.badge-icon');
            badgeIcons.forEach(icon => {
                const moduleNum = parseInt(icon.dataset.module);
                if (badges['m' + moduleNum] && badges['m' + moduleNum].includes(type)) {
                    icon.classList.add('earned');
                }
            });

            // Verificar se está desbloqueado
            if (currentCount >= required) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
            }
        });
    },

    // Verifica se uma página de extras está desbloqueada baseado nas medalhas
    checkExtrasUnlocked: function (pageId) {
        const badges = JSON.parse(localStorage.getItem('badges') || '{}');

        // Contar módulos completos
        const modulosCompletos = {
            m1: badges.m1 && badges.m1.length > 0,
            m2: badges.m2 && badges.m2.length > 0,
            m3: badges.m3 && badges.m3.length > 0
        };
        const numModulosCompletos = (modulosCompletos.m1 ? 1 : 0) + (modulosCompletos.m2 ? 1 : 0) + (modulosCompletos.m3 ? 1 : 0);

        // Acompanhamento: liberado se pelo menos 1 módulo completo
        const acompanhamento = ['extras-resumo', 'extras-videos', 'extras-flashcards', 'extras-questionarios'];
        if (acompanhamento.includes(pageId)) {
            return numModulosCompletos >= 1;
        }

        // Especiais: liberado por módulo específico
        const especiais = {
            'extras-arraste': 'm1',
            'extras-ache-erro': 'm2',
            'extras-roleplay': 'm3'
        };
        if (especiais[pageId]) {
            return modulosCompletos[especiais[pageId]];
        }

        return true; // Se não tiver requisito, está desbloqueado
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
        App.updateMenuState();
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    } else {
        console.error('Page not found:', pageId);
    }
};

window.onunload = function () {
    scorm.finish();
}
