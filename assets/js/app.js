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

        // 2. Initialize Audio
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

    // ... (keep usage of this.loadContent through this.updateMenuState unchanged) ...

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

    bindEvents: function () {
        // Navigation (with Click Sound)
        const playClick = () => {
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        };

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
                    b.disabled = true;
                });

                btn.classList.add('selected');

                if (isCorrect) {
                    btn.classList.add('correct');
                    btn.style.backgroundColor = '#dcedc8';
                    const feedback = parent.querySelector('.feedback');
                    if (feedback) feedback.style.display = 'block';

                    // Show Success Feedback
                    this.showFeedback("Resposta Correta! Você demonstrou conhecimento.", 'success');

                } else {
                    btn.classList.add('incorrect');
                    btn.style.backgroundColor = '#ffcdd2';

                    // Show Error Feedback with Retry logic
                    setTimeout(() => {
                        this.showFeedback("Resposta incorreta. Tente novamente!", 'error');

                        // Re-enable options after modal closes (conceptually, but here we just re-enable immediately for simplicity or attach to modal close if we wanted valid strictness)
                        // For a better UX, we re-enable them after a slight delay or when modal closes. 
                        // Let's re-enable them here so the user can interact after closing the modal.
                        parent.querySelectorAll('.quiz-option').forEach(b => b.disabled = false);
                        btn.classList.remove('selected', 'incorrect');
                        btn.style.backgroundColor = '';
                    }, 500);
                }
            }
        });
    },

    bindA11y: function () {
        // Contrast
        document.getElementById('btn-contrast').onclick = () => {
            document.body.classList.toggle('high-contrast');
            document.getElementById('btn-contrast').classList.toggle('active');
        };

        // Font Size - Ajusta o tamanho base do HTML (rem é relativo ao html)
        let fontSize = 16;
        document.getElementById('btn-increase-font').onclick = () => {
            if (fontSize < 24) {
                fontSize += 2;
                document.documentElement.style.fontSize = fontSize + "px";
                document.getElementById('btn-increase-font').classList.add('active');
                document.getElementById('btn-decrease-font').classList.add('active');
            }
        };
        document.getElementById('btn-decrease-font').onclick = () => {
            if (fontSize > 12) {
                fontSize -= 2;
                document.documentElement.style.fontSize = fontSize + "px";
                if (fontSize === 16) {
                    document.getElementById('btn-increase-font').classList.remove('active');
                    document.getElementById('btn-decrease-font').classList.remove('active');
                }
            }
        };

        // Dyslexia
        document.getElementById('btn-dyslexia').onclick = () => {
            document.body.classList.toggle('dyslexia-mode');
            document.getElementById('btn-dyslexia').classList.toggle('active');
        };

        // TTS (Simple implementation)
        const ttsBtn = document.getElementById('btn-tts');
        let speaking = false;

        ttsBtn.onclick = () => {
            if (speaking) {
                window.speechSynthesis.cancel();
                speaking = false;
                ttsBtn.classList.remove('active');
            } else {
                const text = document.getElementById('main-content').innerText;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = this.currentLang === 'pt' ? 'pt-BR' : 'es-ES';
                window.speechSynthesis.speak(utterance);
                speaking = true;
                ttsBtn.classList.add('active');

                utterance.onend = () => {
                    speaking = false;
                    ttsBtn.classList.remove('active');
                };
            }
        };

        // Language
        document.getElementById('btn-lang-pt').onclick = () => {
            if (this.currentLang !== 'pt') {
                this.currentLang = 'pt';
                document.getElementById('btn-lang-pt').classList.add('active');
                document.getElementById('btn-lang-es').classList.remove('active');
                this.loadPage(this.currentIndex);
                this.renderMenu(); // Re-render menu titles if we had translated JSON (TODO: translate menu titles)
            }
        };

        document.getElementById('btn-lang-es').onclick = () => {
            if (this.currentLang !== 'es') {
                this.currentLang = 'es';
                document.getElementById('btn-lang-es').classList.add('active');
                document.getElementById('btn-lang-pt').classList.remove('active');
                this.loadPage(this.currentIndex);
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
                    modal.querySelector('.modal-close')?.focus();
                }
            };
        });

        contentArea.querySelectorAll('.modal-overlay').forEach(overlay => {
            // Fechar ao clicar no overlay
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            };
            // Fechar com botão
            overlay.querySelector('.modal-close')?.addEventListener('click', () => {
                overlay.classList.remove('active');
            });
        });

        // Fechar modais com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => {
                    m.classList.remove('active');
                });
            }
        });

        // 2. SLIDERS
        contentArea.querySelectorAll('.content-slider').forEach(slider => {
            const slides = slider.querySelectorAll('.slider-slide');
            const dots = slider.querySelectorAll('.slider-dot');
            const prevBtn = slider.querySelector('.slider-prev');
            const nextBtn = slider.querySelector('.slider-next');
            let currentSlide = 0;

            const showSlide = (index) => {
                slides.forEach((s, i) => {
                    s.classList.toggle('hidden', i !== index);
                });
                dots.forEach((d, i) => {
                    d.classList.toggle('active', i === index);
                });
                if (prevBtn) prevBtn.disabled = index === 0;
                if (nextBtn) nextBtn.disabled = index === slides.length - 1;
                currentSlide = index;
            };

            showSlide(0);

            if (prevBtn) {
                prevBtn.onclick = () => {
                    if (currentSlide > 0) showSlide(currentSlide - 1);
                };
            }
            if (nextBtn) {
                nextBtn.onclick = () => {
                    if (currentSlide < slides.length - 1) showSlide(currentSlide + 1);
                };
            }
            dots.forEach((dot, i) => {
                dot.onclick = () => showSlide(i);
            });
        });

        // 3. CARDS INTERATIVOS
        contentArea.querySelectorAll('.interactive-card').forEach(card => {
            card.onclick = () => {
                card.classList.toggle('expanded');
            };
            card.onkeypress = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.classList.toggle('expanded');
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
                }
            };
        });
    }
};

// Start
window.onload = function () {
    App.init();
};

window.onunload = function () {
    scorm.finish();
}
