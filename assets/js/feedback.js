/**
 * feedback.js - Sistema de Feedback Modal
 * Gerencia modais de feedback para quiz e mensagens ao usuário
 */

const FeedbackManager = {
    modal: null,
    titleEl: null,
    msgEl: null,
    btn: null,

    /**
     * Inicializa as referências do DOM
     */
    init: function () {
        this.modal = document.getElementById('modal-feedback');
        this.titleEl = document.getElementById('feedback-title');
        this.msgEl = document.getElementById('feedback-message');
        this.btn = document.getElementById('feedback-btn');

        this.bindEvents();
    },

    /**
     * Vincula eventos de fechamento do modal
     */
    bindEvents: function () {
        const feedbackClose = document.getElementById('btn-feedback-close');

        if (feedbackClose) {
            feedbackClose.onclick = () => {
                this.hide();
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }

        if (this.btn) {
            this.btn.onclick = () => {
                this.hide();
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }

        // Fechar clicando fora
        if (this.modal) {
            this.modal.onclick = (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            };
        }
    },

    /**
     * Exibe o modal de feedback
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo: 'success', 'error', ou 'info'
     */
    show: function (message, type = 'info') {
        if (!this.modal) return;

        // Reset classes
        this.modal.classList.remove('success', 'error', 'info');
        this.modal.classList.add(type);

        // Set Content
        this.msgEl.textContent = message;

        if (type === 'success') {
            this.titleEl.textContent = '🎉 Muito Bem!';
            if (typeof AudioManager !== 'undefined') AudioManager.playSuccess();
        } else if (type === 'error') {
            this.titleEl.textContent = '❌ Atenção';
            if (typeof AudioManager !== 'undefined') AudioManager.playError();
        } else {
            this.titleEl.textContent = 'ℹ️ Informação';
        }

        // Show
        this.modal.classList.add('active');
        this.btn.focus();
    },

    /**
     * Esconde o modal de feedback
     */
    hide: function () {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    },

    /**
     * Handler global para quiz options
     * @param {HTMLElement} contentArea - Área de conteúdo para delegar eventos
     */
    bindQuizHandler: function (contentArea) {
        contentArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-option')) {
                const btn = e.target;
                const parent = btn.closest('.quiz-block');
                const isCorrect = btn.dataset.correct === 'true';

                // Play click sound on selection
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();

                // Reset siblings
                parent.querySelectorAll('.quiz-option').forEach(b => {
                    b.classList.remove('selected', 'correct', 'incorrect');
                    b.disabled = true;
                });

                btn.classList.add('selected');

                // Analytics: rastrear tentativa de quiz
                if (typeof Analytics !== 'undefined' && typeof App !== 'undefined') {
                    const quizBlocks = contentArea.querySelectorAll('.quiz-block');
                    const quizIndex = Array.from(quizBlocks).indexOf(parent);
                    const pageId = App.flatPages[App.currentIndex]?.id || 'unknown';
                    Analytics.trackQuizAttempt(pageId, quizIndex, isCorrect, btn.textContent.trim());
                }

                if (isCorrect) {
                    btn.classList.add('correct');
                    btn.style.backgroundColor = '#dcedc8';
                    const feedback = parent.querySelector('.feedback');
                    if (feedback) feedback.style.display = 'block';

                    // Show Success Feedback with sound
                    this.show("Resposta Correta! Você demonstrou conhecimento.", 'success');

                } else {
                    btn.classList.add('incorrect');
                    btn.style.backgroundColor = '#ffcdd2';

                    // Obter feedback detalhado do atributo data-feedback-wrong
                    const detailedFeedback = btn.dataset.feedbackWrong ||
                        "Esta não é a resposta correta. Pense novamente sobre o conceito apresentado.";

                    // Show Error Feedback with detailed explanation
                    setTimeout(() => {
                        this.show(detailedFeedback, 'error');

                        // Re-enable options after modal closes
                        parent.querySelectorAll('.quiz-option').forEach(b => b.disabled = false);
                        btn.classList.remove('selected', 'incorrect');
                        btn.style.backgroundColor = '';
                    }, 500);
                }
            }
        });
    }
};
