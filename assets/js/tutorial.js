/**
 * Tutorial interativo com efeito spotlight
 * Guia o usuário pelos elementos principais da interface
 */
const Tutorial = {
    currentStep: 0,
    isActive: false,

    // Passos do tutorial com seletor do elemento e texto explicativo
    steps: [], // Will be loaded from i18n

    /**
     * Load tutorial steps from i18n
     */
    async loadSteps() {
        // Load tutorial translations if not already loaded
        if (!I18n.translations.tutorial) {
            await I18n.loadPageTranslations('tutorial.json', 'tutorial');
        }

        // Build steps array from translations
        const tutorialData = I18n.t('tutorial.steps');
        if (Array.isArray(tutorialData)) {
            this.steps = [
                { selector: '#sidebar', text: tutorialData[0].text, position: 'right' },
                { selector: '[data-module-id="extras"] .module-title', text: tutorialData[1].text, position: 'right' },
                { selector: '#btn-menu', text: tutorialData[2].text, position: 'bottom' },
                { selector: '#btn-settings', text: tutorialData[3].text, position: 'bottom' },
                { selector: '.settings-row:has(#btn-dyslexia)', text: tutorialData[4].text, position: 'bottom', openSettings: true },
                { selector: '.settings-row:has(#btn-auto-read)', text: tutorialData[5].text, position: 'bottom', openSettings: true },
                { selector: '.settings-row-vertical:has(#voice-select)', text: tutorialData[6].text, position: 'bottom', openSettings: true },
                { selector: '#tts-controls', text: tutorialData[7].text, position: 'bottom', closeSettings: true },
                { selector: '#tutorial-interactive-demo', text: tutorialData[8].text, position: 'bottom', showInteractiveDemo: true },
                { selector: '.content-nav', text: tutorialData[9].text, position: 'top', hideInteractiveDemo: true },
                { selector: '.content-nav', text: tutorialData[10].text, position: 'top' }
            ];
        }
    },

    init: function () {
        // Bind do botão de iniciar tutorial (se existir na página carregada)
        this.bindStartButton();
    },

    bindStartButton: function () {
        // Usa event delegation para capturar cliques no botão de tutorial
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-start-tutorial' || e.target.closest('#btn-start-tutorial')) {
                e.preventDefault();
                this.start();
            }
        });

        // Bind dos botões do overlay
        document.getElementById('tutorial-next')?.addEventListener('click', () => this.next());
        document.getElementById('tutorial-skip')?.addEventListener('click', () => this.end());

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.end();
            }
        });
    },

    async start() {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();

        // Load tutorial steps if not loaded
        if (this.steps.length === 0) {
            await this.loadSteps();
        }

        this.currentStep = 0;
        this.isActive = true;
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-overlay').classList.add('active');
        document.getElementById('tutorial-tooltip').classList.add('active');
        this.showStep(0);
    },

    next: function () {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        // Remove highlight do elemento anterior
        this.clearHighlight();

        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.end();
        } else {
            this.showStep(this.currentStep);
        }
    },

    showStep: function (stepIndex) {
        const step = this.steps[stepIndex];
        const settingsModal = document.getElementById('modal-settings');
        const interactiveDemo = document.getElementById('tutorial-interactive-demo');

        // Abrir modal de configurações se necessário
        if (step.openSettings && settingsModal) {
            settingsModal.classList.add('active');
        }

        // Fechar modal de configurações se necessário
        if (step.closeSettings && settingsModal) {
            settingsModal.classList.remove('active');
        }

        // Mostrar demo de elemento interativo se necessário
        if (step.showInteractiveDemo && interactiveDemo) {
            interactiveDemo.classList.add('active');
            interactiveDemo.style.display = 'block';
            // Adicionar animação de tremor contínua
            const demoCard = interactiveDemo.querySelector('.tutorial-demo-card');
            if (demoCard) {
                demoCard.classList.add('wiggle-animate');
                // Reiniciar animação periodicamente
                this.demoInterval = setInterval(() => {
                    demoCard.classList.remove('wiggle-animate');
                    void demoCard.offsetWidth;
                    demoCard.classList.add('wiggle-animate');
                }, 2000);
            }
        }

        // Esconder demo de elemento interativo se necessário
        if (step.hideInteractiveDemo && interactiveDemo) {
            interactiveDemo.classList.remove('active');
            interactiveDemo.style.display = 'none';
            if (this.demoInterval) {
                clearInterval(this.demoInterval);
                this.demoInterval = null;
            }
        }

        // Pequeno delay para garantir que o modal/demo esteja aberto/fechado
        setTimeout(() => {
            const element = document.querySelector(step.selector);

            if (!element) {
                console.warn('Tutorial: Element not found:', step.selector);
                this.next();
                return;
            }

            // Highlight no elemento
            element.classList.add('tutorial-highlight');

            // Scroll suave para o elemento se necessário (não para demo popup)
            if (!step.showInteractiveDemo) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Posicionar tooltip
            setTimeout(() => {
                this.positionTooltip(element, step.position);
            }, 300);

            // Atualizar texto e indicador
            document.getElementById('tutorial-text').innerHTML = step.text;
            document.getElementById('tutorial-step-indicator').textContent =
                `${stepIndex + 1} ${I18n.t('tutorial.ui.step_indicator')} ${this.steps.length}`;

            // Botão de próximo ou finalizar
            const nextBtn = document.getElementById('tutorial-next');
            if (stepIndex === this.steps.length - 1) {
                nextBtn.textContent = I18n.t('tutorial.ui.btn_finish');
            } else {
                nextBtn.textContent = I18n.t('tutorial.ui.btn_next');
            }
        }, step.openSettings || step.closeSettings || step.showInteractiveDemo ? 300 : 0);
    },

    positionTooltip: function (element, position) {
        const tooltip = document.getElementById('tutorial-tooltip');
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;
        const margin = 20;

        switch (position) {
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + margin;
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - margin;
                break;
            case 'top':
                top = rect.top - tooltipRect.height - margin;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
            default:
                top = rect.bottom + margin;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                break;
        }

        // Garantir que não saia da tela
        top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
        left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
    },

    clearHighlight: function () {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    },

    end: function () {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        this.isActive = false;
        this.clearHighlight();
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-overlay').classList.remove('active');
        document.getElementById('tutorial-tooltip').classList.remove('active');

        // Fechar modal de configurações se estiver aberto
        const settingsModal = document.getElementById('modal-settings');
        if (settingsModal) {
            settingsModal.classList.remove('active');
        }

        // Esconder demo de elemento interativo
        const interactiveDemo = document.getElementById('tutorial-interactive-demo');
        if (interactiveDemo) {
            interactiveDemo.classList.remove('active');
            interactiveDemo.style.display = 'none';
        }
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }

        this.currentStep = 0;

        // Marcar tutorial como concluído e desbloquear navegação
        localStorage.setItem('tutorial-completed', 'true');
        const btnNext = document.getElementById('btn-next');
        if (btnNext) {
            btnNext.disabled = false;
        }
        // Remover mensagem de tutorial
        const startMsg = document.querySelector('.start-message');
        if (startMsg) {
            startMsg.style.display = 'none';
        }
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    Tutorial.init();
});
