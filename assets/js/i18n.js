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

        // Carrega traduções globais
        await this.loadTranslations(this.currentLang, 'global.json');

        console.log(`[i18n] Sistema inicializado em: ${this.currentLang}`);

        // Aplica traduções na página atual
        this.translatePage();
    },

    /**
     * Carrega um arquivo JSON de tradução
     * @param {string} lang - Idioma (pt, es, etc)
     * @param {string} file - Caminho relativo dentro de locales/[lang]/ (ex: 'global.json', 'm1/p1.json')
     * @param {string} mountPoint - (Opcional) Caminho onde montar o JSON no objeto de traduções (ex: 'm1.p1')
     */
    async loadTranslations(lang, file, mountPoint = null) {
        try {
            const url = `locales/${lang}/${file}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Falha ao carregar ${url}`);

            const data = await response.json();

            if (mountPoint) {
                this.setNestedTranslation(mountPoint, data);
            } else {
                // Se não tiver mountPoint, faz merge na raiz (comportamento para global.json antigo, mas agora global é separado)
                // Para global.json, ideal é merge na raiz se ele tiver chaves 'globais'.
                // Se global.json tiver chaves diretas como "btn_proximo", merge na raiz está ok.
                Object.assign(this.translations, data);
            }

            document.documentElement.lang = lang;
        } catch (error) {
            console.error(`[i18n] Erro ao carregar traduções (${file}):`, error);
        }
    },

    // Carrega traduções específicas de uma página
    async loadPageTranslations(file, mountPoint) {
        if (!file) return;
        await this.loadTranslations(this.currentLang, file, mountPoint);
    },

    // Muda o idioma e recarrega tudo (TODO: idealmente recarregaria global + página atual)
    async setLanguage(lang) {
        if (lang === this.currentLang) return;

        this.currentLang = lang;
        localStorage.setItem('courseLanguage', lang);

        // Limpa traduções e recarrega global
        this.translations = {};
        await this.loadTranslations(lang, 'global.json');

        // Dispara evento para App recarregar tradução da página atual
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    // Helper para setar valor aninhado
    setNestedTranslation(path, value) {
        const keys = path.split('.');
        let current = this.translations;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }

        // Merge se já existir objeto, ou overwrite
        const lastKey = keys[keys.length - 1];
        if (typeof current[lastKey] === 'object' && typeof value === 'object') {
            Object.assign(current[lastKey], value);
        } else {
            current[lastKey] = value;
        }
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
