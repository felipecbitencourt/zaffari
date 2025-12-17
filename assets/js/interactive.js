/**
 * interactive.js - Componentes Interativos
 * Gerencia modais, cards, accordions, sliders, glossário e animações
 */

const InteractiveComponents = {
    wiggleInterval: null,
    glossaryPopup: null,

    // Glossário de termos técnicos
    glossary: {
        'cdc': {
            term: 'CDC',
            definition: 'Código de Defesa do Consumidor (Lei nº 8.078/90) - Legislação brasileira que protege os direitos do consumidor em todas as relações de consumo.'
        },
        'sac': {
            term: 'SAC',
            definition: 'Serviço de Atendimento ao Cliente - Setor responsável por gerenciar os canais de relacionamento com clientes, incluindo atendimentos eletrônicos e telefônicos.'
        },
        'sla': {
            term: 'SLA',
            definition: 'Service Level Agreement (Acordo de Nível de Serviço) - Contrato que define os prazos e padrões de qualidade esperados no atendimento.'
        },
        'nps': {
            term: 'NPS',
            definition: 'Net Promoter Score - Métrica que mede a satisfação e lealdade dos clientes através de uma pergunta simples sobre recomendação.'
        },
        'procon': {
            term: 'PROCON',
            definition: 'Programa de Proteção e Defesa do Consumidor - Órgão público responsável por mediar conflitos entre consumidores e fornecedores.'
        },
        'reclame-aqui': {
            term: 'Reclame Aqui',
            definition: 'Plataforma online brasileira onde consumidores registram reclamações sobre empresas e avaliam o atendimento recebido.'
        },
        'omnichannel': {
            term: 'Omnichannel',
            definition: 'Estratégia de atendimento integrado que oferece experiência consistente em todos os canais (telefone, chat, e-mail, redes sociais).'
        },
        'chargeback': {
            term: 'Chargeback',
            definition: 'Contestação de compra feita pelo consumidor junto à operadora do cartão, resultando no estorno do valor.'
        }
    },

    /**
     * Inicializa todos os componentes interativos na área de conteúdo
     */
    init: function () {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        this.initModals(contentArea);
        this.initInteractiveCards(contentArea);
        this.initRevealButtons(contentArea);
        this.initAccordions(contentArea);
        this.initSliders(contentArea);
        this.initGlossary(contentArea);
        this.startWiggleSync();
    },

    /**
     * Inicializa modais de conteúdo
     */
    initModals: function (contentArea) {
        // Abrir modais
        contentArea.querySelectorAll('.btn-modal-trigger').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const modalId = btn.dataset.modal;
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                    if (typeof Analytics !== 'undefined') Analytics.trackClick('modal');
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
    },

    /**
     * Inicializa cards interativos expansíveis
     */
    initInteractiveCards: function (contentArea) {
        contentArea.querySelectorAll('.interactive-card').forEach(card => {
            card.onclick = () => {
                card.classList.toggle('expanded');
                if (typeof AudioManager !== 'undefined') AudioManager.playExpand();
                if (typeof Analytics !== 'undefined') Analytics.trackClick('interactive-card');
            };
            card.onkeypress = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.classList.toggle('expanded');
                    if (typeof AudioManager !== 'undefined') AudioManager.playExpand();
                    if (typeof Analytics !== 'undefined') Analytics.trackClick('interactive-card');
                }
            };
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
        });
    },

    /**
     * Inicializa botões de revelar conteúdo
     */
    initRevealButtons: function (contentArea) {
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
    },

    /**
     * Inicializa accordions com som
     */
    initAccordions: function (contentArea) {
        contentArea.querySelectorAll('.accordion details').forEach(details => {
            details.addEventListener('toggle', () => {
                if (details.open) {
                    if (typeof AudioManager !== 'undefined') AudioManager.playExpand();
                    if (typeof Analytics !== 'undefined') Analytics.trackClick('accordion');
                }
            });
        });
    },

    /**
     * Inicializa sliders de conteúdo
     */
    initSliders: function (contentArea) {
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
                if (prevBtn) prevBtn.disabled = index === 0;
                if (nextBtn) nextBtn.disabled = index === slides.length - 1;
                currentSlide = index;
            };

            if (prevBtn) {
                prevBtn.onclick = () => {
                    if (currentSlide > 0) {
                        showSlide(currentSlide - 1);
                        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                    }
                };
            }

            if (nextBtn) {
                nextBtn.onclick = () => {
                    if (currentSlide < slides.length - 1) {
                        showSlide(currentSlide + 1);
                        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                    }
                };
            }

            dots.forEach((dot, i) => {
                dot.onclick = () => {
                    showSlide(i);
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                };
            });

            // Inicializar no primeiro slide
            if (slides.length > 0) {
                showSlide(0);
            }
        });
    },

    /**
     * Inicializa glossário interativo
     */
    initGlossary: function (contentArea) {
        // Criar popup de glossário se não existir
        if (!this.glossaryPopup) {
            this.glossaryPopup = document.createElement('div');
            this.glossaryPopup.className = 'glossary-popup';
            this.glossaryPopup.innerHTML = `
                <div class="glossary-popup-header">
                    <strong class="glossary-popup-term"></strong>
                    <button class="glossary-popup-close" aria-label="Fechar">×</button>
                </div>
                <p class="glossary-popup-definition"></p>
            `;
            document.body.appendChild(this.glossaryPopup);

            // Fechar ao clicar no X
            this.glossaryPopup.querySelector('.glossary-popup-close').onclick = () => {
                this.hideGlossaryPopup();
            };

            // Fechar ao clicar fora
            document.addEventListener('click', (e) => {
                if (this.glossaryPopup.classList.contains('active') &&
                    !this.glossaryPopup.contains(e.target) &&
                    !e.target.classList.contains('glossary-term')) {
                    this.hideGlossaryPopup();
                }
            });

            // Fechar com Esc
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.glossaryPopup.classList.contains('active')) {
                    this.hideGlossaryPopup();
                }
            });
        }

        // Inicializar termos do glossário
        contentArea.querySelectorAll('.glossary-term').forEach(term => {
            term.setAttribute('tabindex', '0');
            term.setAttribute('role', 'button');
            term.setAttribute('aria-haspopup', 'dialog');

            term.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showGlossaryPopup(term);
            };

            term.onkeypress = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showGlossaryPopup(term);
                }
            };
        });
    },

    /**
     * Exibe popup do glossário
     */
    showGlossaryPopup: function (termElement) {
        const termId = termElement.dataset.term;
        const glossaryEntry = this.glossary[termId];

        if (!glossaryEntry) {
            // Fallback: usar o texto do próprio elemento e data-definition se existir
            const term = termElement.textContent;
            const definition = termElement.dataset.definition || 'Definição não encontrada.';
            this.glossaryPopup.querySelector('.glossary-popup-term').textContent = term;
            this.glossaryPopup.querySelector('.glossary-popup-definition').textContent = definition;
        } else {
            this.glossaryPopup.querySelector('.glossary-popup-term').textContent = glossaryEntry.term;
            this.glossaryPopup.querySelector('.glossary-popup-definition').textContent = glossaryEntry.definition;
        }

        // Posicionar popup
        const rect = termElement.getBoundingClientRect();
        const popup = this.glossaryPopup;

        popup.classList.add('active');

        // Calcular posição
        let top = rect.bottom + 10;
        let left = rect.left;

        // Ajustar se sair da tela
        const popupRect = popup.getBoundingClientRect();
        if (left + popupRect.width > window.innerWidth - 20) {
            left = window.innerWidth - popupRect.width - 20;
        }
        if (top + popupRect.height > window.innerHeight - 20) {
            top = rect.top - popupRect.height - 10;
        }

        popup.style.top = top + 'px';
        popup.style.left = Math.max(10, left) + 'px';

        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    },

    /**
     * Esconde popup do glossário
     */
    hideGlossaryPopup: function () {
        if (this.glossaryPopup) {
            this.glossaryPopup.classList.remove('active');
        }
    },

    /**
     * Sincroniza animação de wiggle em todos os elementos interativos
     */
    startWiggleSync: function () {
        // Limpar intervalo anterior se existir
        if (this.wiggleInterval) {
            clearInterval(this.wiggleInterval);
        }

        const triggerWiggle = () => {
            // Selecionar APENAS elementos que são realmente clicáveis e expandem/revelam conteúdo
            const elements = document.querySelectorAll(
                '.interactive-card:not(.expanded), ' +
                '.accordion details:not([open]), ' +
                '.reveal-btn:not(.revealed), ' +
                '#btn-start-tutorial'
            );

            elements.forEach(el => {
                // Remover classe primeiro para reiniciar animação
                el.classList.remove('wiggle-animate');
                // Forçar reflow
                void el.offsetWidth;
                // Adicionar classe de animação
                el.classList.add('wiggle-animate');
            });

            // Remover classe após animação terminar
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

    /**
     * Para a animação de wiggle
     */
    stopWiggleSync: function () {
        if (this.wiggleInterval) {
            clearInterval(this.wiggleInterval);
            this.wiggleInterval = null;
        }
    }
};
