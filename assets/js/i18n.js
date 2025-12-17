/**
 * Sistema de Internacionalização (i18n) simples
 * Carrega arquivos JSON e substitui textos na página
 */

const I18n = {
    currentLang: 'pt',
    translations: {},

    // Inicializa o sistema
    async init() {
        // Tenta pegar do localStorage ou usa 'pt' como padrão
        this.currentLang = localStorage.getItem('courseLanguage') || 'pt';

        // Carrega o arquivo de tradução do idioma atual
        await this.loadTranslations(this.currentLang);

        console.log(`[i18n] Sistema inicializado em: ${this.currentLang}`);

        // Aplica traduções na página atual
        this.translatePage();
    },

    // Carrega o JSON de tradução
    async loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) throw new Error(`Falha ao carregar locales/${lang}.json`);
            this.translations = await response.json();
            document.documentElement.lang = lang; // Atualiza lang do HTML
        } catch (error) {
            console.error('[i18n] Erro ao carregar traduções:', error);
        }
    },

    // Muda o idioma e recarrega a página
    async setLanguage(lang) {
        if (lang === this.currentLang) return;

        this.currentLang = lang;
        localStorage.setItem('courseLanguage', lang);

        // Recarrega traduções e aplica
        await this.loadTranslations(lang);
        this.translatePage();

        // Dispara evento para outros componentes se atualizarem
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    // Traduz a página atual procurando por elementos com data-i18n
    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');

        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.getNestedTranslation(key);

            if (translation) {
                // Se for input/textarea usa placeholder, imagem usa alt, senão innerHTML
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.hasAttribute('placeholder')) {
                        el.setAttribute('placeholder', translation);
                    }
                } else if (el.tagName === 'IMG') {
                    el.setAttribute('alt', translation);
                } else {
                    el.innerHTML = translation;
                }
            } else {
                console.warn(`[i18n] Chave não encontrada: ${key}`);
            }
        });

        // Traduz title da página se houver chave específica
        // const pageTitle = this.getNestedTranslation('global.page_title');
        // if (pageTitle) document.title = pageTitle;
    },

    // Função auxiliar para pegar valor de objeto aninhado "chave.subchave"
    getNestedTranslation(key) {
        return key.split('.').reduce((obj, k) => (obj && obj[k] !== 'undefined') ? obj[k] : null, this.translations);
    },

    // Retorna uma tradução específica (para uso via JS)
    t(key) {
        return this.getNestedTranslation(key) || key;
    }
};

// Auto-inicialização se carregado no browser (opcional, melhor controlar via app.js)
// document.addEventListener('DOMContentLoaded', () => I18n.init());
