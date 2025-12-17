/**
 * analytics.js - Sistema de Analytics do Curso
 * Coleta métricas de uso para análise e melhoria do conteúdo
 * 
 * Métricas coletadas:
 * - Tempo por página
 * - Taxa de erro por quiz
 * - Ponto de abandono
 * - Cliques em elementos interativos
 */

const Analytics = {
    // Armazenamento local das métricas
    data: {
        pageTime: {},        // { pageId: totalSeconds }
        quizErrors: {},      // { pageId_quizIndex: { total: n, errors: n } }
        lastPageVisited: '', // Última página alcançada
        maxProgress: 0,      // Progresso máximo (%)
        clicks: {},          // { elementType: count }
        sessionStart: null,  // Início da sessão
        sessions: 0          // Total de sessões
    },

    // Estado atual
    currentPage: null,
    pageStartTime: null,

    /**
     * Inicializa o sistema de analytics
     */
    init: function () {
        // Carregar dados salvos
        this.loadData();

        // Registrar nova sessão
        this.data.sessions++;
        this.data.sessionStart = new Date().toISOString();

        // Salvar periodicamente
        setInterval(() => this.saveData(), 30000); // A cada 30s

        // Salvar ao sair
        window.addEventListener('beforeunload', () => {
            this.trackPageTime(); // Salvar tempo da página atual
            this.saveData();
        });

        console.log('Analytics initialized. Sessions:', this.data.sessions);
    },

    /**
     * Carrega dados do localStorage
     */
    loadData: function () {
        try {
            const saved = localStorage.getItem('curso_analytics');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge com estrutura padrão
                this.data = { ...this.data, ...parsed };
            }
        } catch (e) {
            console.warn('Analytics: Could not load saved data', e);
        }
    },

    /**
     * Salva dados no localStorage
     */
    saveData: function () {
        try {
            localStorage.setItem('curso_analytics', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Analytics: Could not save data', e);
        }
    },

    /**
     * Registra entrada em uma página
     * @param {string} pageId - ID da página
     * @param {number} pageIndex - Índice da página
     * @param {number} totalPages - Total de páginas
     */
    trackPageEnter: function (pageId, pageIndex, totalPages) {
        // Salvar tempo da página anterior
        if (this.currentPage && this.pageStartTime) {
            this.trackPageTime();
        }

        // Iniciar tracking da nova página
        this.currentPage = pageId;
        this.pageStartTime = Date.now();

        // Atualizar última página visitada
        this.data.lastPageVisited = pageId;

        // Atualizar progresso máximo
        const progress = Math.round((pageIndex / totalPages) * 100);
        if (progress > this.data.maxProgress) {
            this.data.maxProgress = progress;
        }

        // Inicializar contador de tempo se não existir
        if (!this.data.pageTime[pageId]) {
            this.data.pageTime[pageId] = 0;
        }
    },

    /**
     * Registra tempo gasto na página atual
     */
    trackPageTime: function () {
        if (this.currentPage && this.pageStartTime) {
            const elapsed = Math.round((Date.now() - this.pageStartTime) / 1000);
            this.data.pageTime[this.currentPage] =
                (this.data.pageTime[this.currentPage] || 0) + elapsed;
        }
    },

    /**
     * Registra tentativa de quiz
     * @param {string} pageId - ID da página
     * @param {number} quizIndex - Índice do quiz na página
     * @param {boolean} isCorrect - Se a resposta foi correta
     * @param {string} optionText - Texto da opção selecionada
     */
    trackQuizAttempt: function (pageId, quizIndex, isCorrect, optionText) {
        const key = `${pageId}_quiz${quizIndex}`;

        if (!this.data.quizErrors[key]) {
            this.data.quizErrors[key] = {
                total: 0,
                errors: 0,
                errorOptions: {}
            };
        }

        this.data.quizErrors[key].total++;

        if (!isCorrect) {
            this.data.quizErrors[key].errors++;
            // Registrar qual opção foi escolhida erroneamente
            const shortOption = optionText.substring(0, 50);
            this.data.quizErrors[key].errorOptions[shortOption] =
                (this.data.quizErrors[key].errorOptions[shortOption] || 0) + 1;
        }
    },

    /**
     * Registra clique em elemento interativo
     * @param {string} elementType - Tipo do elemento (accordion, card, modal, etc)
     */
    trackClick: function (elementType) {
        if (!this.data.clicks[elementType]) {
            this.data.clicks[elementType] = 0;
        }
        this.data.clicks[elementType]++;
    },

    /**
     * Retorna relatório de analytics
     * @returns {Object} Relatório formatado
     */
    getReport: function () {
        // Páginas com mais tempo (possíveis dificuldades)
        const sortedPageTime = Object.entries(this.data.pageTime)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Quiz com mais erros
        const quizErrorRate = Object.entries(this.data.quizErrors)
            .map(([key, data]) => ({
                quiz: key,
                total: data.total,
                errors: data.errors,
                errorRate: data.total > 0 ? Math.round((data.errors / data.total) * 100) : 0,
                topErrorOptions: Object.entries(data.errorOptions || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
            }))
            .sort((a, b) => b.errorRate - a.errorRate);

        // Elementos mais clicados
        const sortedClicks = Object.entries(this.data.clicks)
            .sort((a, b) => b[1] - a[1]);

        return {
            summary: {
                totalSessions: this.data.sessions,
                maxProgress: this.data.maxProgress + '%',
                lastPage: this.data.lastPageVisited,
                totalTimeSeconds: Object.values(this.data.pageTime).reduce((a, b) => a + b, 0)
            },
            pageTime: sortedPageTime,
            quizErrors: quizErrorRate,
            clicks: sortedClicks
        };
    },

    /**
     * Exibe relatório no console
     */
    printReport: function () {
        const report = this.getReport();

        console.log('=== ANALYTICS REPORT ===');
        console.log('\n📊 RESUMO:');
        console.log('  Sessões:', report.summary.totalSessions);
        console.log('  Progresso máximo:', report.summary.maxProgress);
        console.log('  Última página:', report.summary.lastPage);
        console.log('  Tempo total:', Math.round(report.summary.totalTimeSeconds / 60), 'min');

        console.log('\n⏱️ TEMPO POR PÁGINA (Top 10):');
        report.pageTime.forEach(([page, seconds]) => {
            console.log(`  ${page}: ${Math.round(seconds / 60)}min ${seconds % 60}s`);
        });

        console.log('\n❌ TAXA DE ERRO POR QUIZ:');
        report.quizErrors.forEach(q => {
            if (q.total > 0) {
                console.log(`  ${q.quiz}: ${q.errorRate}% de erro (${q.errors}/${q.total})`);
            }
        });

        console.log('\n👆 CLIQUES POR ELEMENTO:');
        report.clicks.forEach(([element, count]) => {
            console.log(`  ${element}: ${count} cliques`);
        });

        console.log('========================');

        return report;
    },

    /**
     * Limpa todos os dados de analytics
     */
    clearData: function () {
        this.data = {
            pageTime: {},
            quizErrors: {},
            lastPageVisited: '',
            maxProgress: 0,
            clicks: {},
            sessionStart: null,
            sessions: 0
        };
        localStorage.removeItem('curso_analytics');
        console.log('Analytics data cleared');
    }
};

// Expor globalmente para debug
window.Analytics = Analytics;
