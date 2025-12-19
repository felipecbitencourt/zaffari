/**
 * Sistema de tradução automática usando Google Translate
 * Substitui o sistema baseado em JSON por tradução automática do navegador
 */

const I18nAuto = {
    currentLang: 'pt',
    availableLanguages: ['pt', 'en', 'es', 'fr'],
    isInitialized: false,

    // Inicializa o sistema
    init() {
        this.currentLang = localStorage.getItem('courseLanguage') || 'pt';
        this.setupGoogleTranslate();
        this.setupLanguageButtons();
        this.hideGoogleBanner();

        console.log(`[i18n-auto] Sistema inicializado em: ${this.currentLang}`);
    },

    // Configura Google Translate
    setupGoogleTranslate() {
        // Adiciona script do Google Translate
        const script = document.createElement('script');
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.head.appendChild(script);

        // Callback global
        window.googleTranslateElementInit = () => {
            new google.translate.TranslateElement({
                pageLanguage: 'pt',
                includedLanguages: 'en,es,fr,pt',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
                multilanguagePage: true
            }, 'google_translate_element');

            this.isInitialized = true;

            // Aplica idioma salvo após inicialização
            setTimeout(() => {
                if (this.currentLang !== 'pt') {
                    this.setLanguage(this.currentLang);
                }
            }, 1000);
        };
    },

    // Configura botões de idioma
    setupLanguageButtons() {
        const buttons = {
            'pt': document.getElementById('btn-lang-pt'),
            'en': document.getElementById('btn-lang-en'),
            'es': document.getElementById('btn-lang-es'),
            'fr': document.getElementById('btn-lang-fr')
        };

        Object.entries(buttons).forEach(([lang, btn]) => {
            if (btn) {
                btn.addEventListener('click', () => this.setLanguage(lang));

                // Marca botão ativo
                if (lang === this.currentLang) {
                    btn.classList.add('active');
                }
            }
        });
    },

    // Esconde banner do Google Translate
    hideGoogleBanner() {
        // Adiciona CSS para esconder elementos indesejados
        const style = document.createElement('style');
        style.textContent = `
            /* Esconder banner e balão do Google Translate */
            .goog-te-banner-frame,
            .goog-te-balloon-frame {
                display: none !important;
            }
            
            /* Remove espaço do topo adicionado pelo Google */
            body {
                top: 0 !important;
            }
            
            /* Esconder widget (usamos botões customizados) */
            #google_translate_element {
                display: none !important;
            }
            
            /* Prevenir que o Google adicione estilos inline */
            .skiptranslate {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    },

    // Muda o idioma
    setLanguage(lang) {
        if (!this.availableLanguages.includes(lang)) {
            console.warn(`[i18n-auto] Idioma não suportado: ${lang}`);
            return;
        }

        if (lang === this.currentLang) {
            console.log(`[i18n-auto] Idioma já está em: ${lang}`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('courseLanguage', lang);

        // Atualiza botões
        this.updateLanguageButtons(lang);

        // Aciona tradução do Google
        this.triggerGoogleTranslate(lang);

        // Atualiza atributo lang do HTML
        document.documentElement.lang = this.getLangCode(lang);

        // Dispara evento para outros componentes
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { lang }
        }));

        console.log(`[i18n-auto] Idioma alterado para: ${lang}`);
    },

    // Atualiza estado visual dos botões
    updateLanguageButtons(lang) {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.getElementById(`btn-lang-${lang}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    },

    // Aciona tradução do Google Translate
    triggerGoogleTranslate(lang) {
        if (!this.isInitialized) {
            console.warn('[i18n-auto] Google Translate ainda não inicializado');
            // Tenta novamente após 500ms
            setTimeout(() => this.triggerGoogleTranslate(lang), 500);
            return;
        }

        // Encontra o select do Google Translate
        const selectElement = document.querySelector('.goog-te-combo');

        if (selectElement) {
            // Mapeia códigos de idioma
            const langMap = {
                'pt': '',      // Idioma original (vazio = sem tradução)
                'en': 'en',
                'es': 'es',
                'fr': 'fr'
            };

            selectElement.value = langMap[lang];
            selectElement.dispatchEvent(new Event('change'));
        } else {
            console.warn('[i18n-auto] Widget do Google Translate não encontrado');
        }
    },

    // Retorna código de idioma completo (para atributo lang)
    getLangCode(lang) {
        const langCodes = {
            'pt': 'pt-BR',
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR'
        };
        return langCodes[lang] || lang;
    },

    // Retorna idioma atual
    getCurrentLanguage() {
        return this.currentLang;
    },

    // Função de compatibilidade com sistema antigo
    t(key) {
        console.warn('[i18n-auto] Função t() não é necessária com tradução automática');
        return key;
    },

    // Traduz página (compatibilidade com sistema antigo)
    translatePage() {
        console.log('[i18n-auto] Tradução automática ativa - translatePage() não necessário');
    }
};

// Exporta para uso global
if (typeof window !== 'undefined') {
    window.I18nAuto = I18nAuto;
}
