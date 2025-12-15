/**
 * Tutorial interativo com efeito spotlight
 * Guia o usuário pelos elementos principais da interface
 */
const Tutorial = {
    currentStep: 0,
    isActive: false,

    // Passos do tutorial com seletor do elemento e texto explicativo
    steps: [
        {
            selector: '#btn-menu',
            text: '☰ <strong>Menu Lateral</strong><br>Clique aqui para abrir o menu com todos os módulos e páginas do curso.',
            position: 'bottom'
        },
        {
            selector: '#sidebar',
            text: '📋 <strong>Navegação do Curso</strong><br>Aqui você encontra todos os módulos. Clique no título de um módulo para expandir ou recolher.',
            position: 'right'
        },
        {
            selector: '#btn-settings',
            text: '⚙️ <strong>Configurações</strong><br>Abra para personalizar: modo escuro, tamanho da fonte, assistência de leitura, velocidade de voz, e idioma.',
            position: 'bottom'
        },
        {
            selector: '#btn-tts',
            text: '🔊 <strong>Leitura em Voz Alta</strong><br>Clique para ouvir o conteúdo da página sendo lido. Clique novamente para parar.',
            position: 'bottom'
        },
        {
            selector: '.header-progress',
            text: '📊 <strong>Progresso do Curso</strong><br>Acompanhe seu avanço no treinamento. O progresso é salvo automaticamente!',
            position: 'bottom'
        },
        {
            selector: '.content-nav',
            text: '➡️ <strong>Navegação</strong><br>Use "Anterior" e "Próximo" para navegar entre as páginas do curso.',
            position: 'top'
        },
        {
            selector: '#btn-start-tutorial',
            text: '👆 <strong>Elementos Interativos</strong><br>Elementos que <em>tremem</em> são clicáveis! Clique neles para revelar conteúdo adicional.',
            position: 'top'
        }
    ],

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

    start: function () {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
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
        const element = document.querySelector(step.selector);

        if (!element) {
            console.warn('Tutorial: Element not found:', step.selector);
            this.next();
            return;
        }

        // Highlight no elemento
        element.classList.add('tutorial-highlight');

        // Scroll suave para o elemento se necessário
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Posicionar tooltip
        setTimeout(() => {
            this.positionTooltip(element, step.position);
        }, 300);

        // Atualizar texto e indicador
        document.getElementById('tutorial-text').innerHTML = step.text;
        document.getElementById('tutorial-step-indicator').textContent =
            `${stepIndex + 1} de ${this.steps.length}`;

        // Botão de próximo ou finalizar
        const nextBtn = document.getElementById('tutorial-next');
        if (stepIndex === this.steps.length - 1) {
            nextBtn.textContent = 'Finalizar ✓';
        } else {
            nextBtn.textContent = 'Próximo →';
        }
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
        this.currentStep = 0;
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    Tutorial.init();
});
