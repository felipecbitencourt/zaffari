/**
 * accessibility.js - Recursos de Acessibilidade
 * Gerencia dark mode, fonte, dislexia, TTS e idioma
 */

const AccessibilityManager = {
    // TTS State
    speaking: false,
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    selectedVoice: null,
    availableVoices: [],
    autoReadEnabled: false,

    // Font State
    fontSize: 100,

    // References
    ttsBtn: null,
    ttsControls: null,

    /**
     * Inicializa todos os recursos de acessibilidade
     */
    init: function () {
        this.autoReadEnabled = localStorage.getItem('auto-read') === 'true';

        this.initSettingsModal();
        this.initDarkMode();
        this.initFontSize();
        this.initDyslexiaMode();
        this.initTTS();
        this.initLanguage();
    },

    /**
     * Inicializa modal de configurações
     */
    initSettingsModal: function () {
        const settingsBtn = document.getElementById('btn-settings');
        const settingsModal = document.getElementById('modal-settings');
        const settingsClose = document.getElementById('btn-settings-close');

        if (settingsBtn) {
            settingsBtn.onclick = () => {
                settingsModal.classList.add('active');
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }

        if (settingsClose) {
            settingsClose.onclick = () => {
                settingsModal.classList.remove('active');
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }

        // Close modal when clicking outside
        if (settingsModal) {
            settingsModal.onclick = (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.remove('active');
                }
            };
        }
    },

    /**
     * Inicializa modo escuro (dark mode)
     */
    initDarkMode: function () {
        const contrastBtn = document.getElementById('btn-contrast');
        if (contrastBtn) {
            contrastBtn.onclick = () => {
                document.body.classList.toggle('high-contrast');
                contrastBtn.classList.toggle('active');
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }
    },

    /**
     * Inicializa controle de tamanho de fonte
     */
    initFontSize: function () {
        const fontSizeDisplay = document.getElementById('font-size-display');
        const increaseBtn = document.getElementById('btn-increase-font');
        const decreaseBtn = document.getElementById('btn-decrease-font');

        if (increaseBtn) {
            increaseBtn.onclick = () => {
                if (this.fontSize < 150) {
                    this.fontSize += 10;
                    document.documentElement.style.fontSize = (this.fontSize / 100 * 16) + "px";
                    if (fontSizeDisplay) fontSizeDisplay.textContent = this.fontSize + '%';
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                }
            };
        }

        if (decreaseBtn) {
            decreaseBtn.onclick = () => {
                if (this.fontSize > 70) {
                    this.fontSize -= 10;
                    document.documentElement.style.fontSize = (this.fontSize / 100 * 16) + "px";
                    if (fontSizeDisplay) fontSizeDisplay.textContent = this.fontSize + '%';
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                }
            };
        }
    },

    /**
     * Inicializa modo de assistência à leitura (dislexia)
     */
    initDyslexiaMode: function () {
        const dyslexiaBtn = document.getElementById('btn-dyslexia');
        if (dyslexiaBtn) {
            dyslexiaBtn.onclick = () => {
                document.body.classList.toggle('dyslexia-mode');
                dyslexiaBtn.classList.toggle('active');
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            };
        }
    },

    /**
     * Inicializa Text-to-Speech
     */
    initTTS: function () {
        this.ttsBtn = document.getElementById('btn-tts');
        this.ttsControls = document.getElementById('tts-controls');
        const volumeRange = document.getElementById('volume-range');
        const autoReadBtn = document.getElementById('btn-auto-read');
        const voiceSelect = document.getElementById('voice-select');
        const voicePreviewBtn = document.getElementById('btn-voice-preview');

        // Restaurar estado do auto-read
        if (this.autoReadEnabled && autoReadBtn) {
            autoReadBtn.classList.add('active');
            if (this.ttsControls) this.ttsControls.classList.add('auto-read-mode');
            if (this.ttsBtn) {
                this.ttsBtn.textContent = '▶️';
                this.ttsBtn.title = 'Pausar/Continuar Leitura';
            }
        }

        // Auto-read toggle
        if (autoReadBtn) {
            autoReadBtn.onclick = () => {
                this.autoReadEnabled = !this.autoReadEnabled;
                autoReadBtn.classList.toggle('active');
                localStorage.setItem('auto-read', this.autoReadEnabled);
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();

                if (this.autoReadEnabled) {
                    if (this.ttsControls) this.ttsControls.classList.add('auto-read-mode');
                    if (this.ttsBtn) {
                        this.ttsBtn.textContent = '▶️';
                        this.ttsBtn.title = 'Pausar/Continuar Leitura';
                    }
                    this.startAutoRead();
                } else {
                    if (this.ttsControls) this.ttsControls.classList.remove('auto-read-mode');
                    if (this.ttsBtn) {
                        this.ttsBtn.textContent = '🔊';
                        this.ttsBtn.title = 'Ler Página';
                    }
                    window.speechSynthesis.cancel();
                    this.speaking = false;
                    if (this.ttsBtn) this.ttsBtn.classList.remove('active', 'tts-playing');
                }
            };
        }

        // Volume control
        if (volumeRange) {
            volumeRange.oninput = () => {
                this.ttsVolume = volumeRange.value / 100;
                if (this.speaking) {
                    this.restartSpeech();
                }
            };
        }

        // Speed Buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.ttsSpeed = parseFloat(btn.dataset.speed);
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();

                if (this.speaking) {
                    this.restartSpeech();
                }
            };
        });

        // Voice Selector
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();

        if (voiceSelect) {
            voiceSelect.onchange = () => {
                this.selectedVoice = this.availableVoices.find(v => v.name === voiceSelect.value);
                localStorage.setItem('tts-voice', voiceSelect.value);
            };
        }

        if (voicePreviewBtn) {
            voicePreviewBtn.onclick = () => {
                this.previewVoice();
            };
        }

        // TTS Button
        if (this.ttsBtn) {
            this.ttsBtn.onclick = () => {
                this.handleTTSButtonClick();
            };
        }
    },

    /**
     * Carrega vozes disponíveis
     */
    loadVoices: function () {
        const voiceSelect = document.getElementById('voice-select');
        if (!voiceSelect) return;

        this.availableVoices = window.speechSynthesis.getVoices();
        if (this.availableVoices.length > 0) {
            voiceSelect.innerHTML = '';

            const currentLang = typeof App !== 'undefined' ? App.currentLang : 'pt';
            const langFilter = currentLang === 'pt' ? 'pt' : currentLang === 'es' ? 'es' : currentLang === 'fr' ? 'fr' : 'en';

            const filteredVoices = this.availableVoices.filter(v => v.lang.toLowerCase().startsWith(langFilter));
            const otherVoices = this.availableVoices.filter(v => !v.lang.toLowerCase().startsWith(langFilter));

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
            if (savedVoice && this.availableVoices.find(v => v.name === savedVoice)) {
                voiceSelect.value = savedVoice;
                this.selectedVoice = this.availableVoices.find(v => v.name === savedVoice);
            } else {
                // Auto-selecionar voz Google como preset se disponível
                const googleVoice = filteredVoices.find(v => v.name.includes('Google'));
                if (googleVoice) {
                    voiceSelect.value = googleVoice.name;
                    this.selectedVoice = googleVoice;
                    localStorage.setItem('tts-voice', googleVoice.name);
                } else if (filteredVoices.length > 0) {
                    voiceSelect.value = filteredVoices[0].name;
                    this.selectedVoice = filteredVoices[0];
                }
            }
        }
    },

    /**
     * Preview da voz selecionada
     */
    previewVoice: function () {
        const voiceSelect = document.getElementById('voice-select');
        const currentLang = typeof App !== 'undefined' ? App.currentLang : 'pt';

        window.speechSynthesis.cancel();
        const testText = currentLang === 'pt'
            ? 'Olá! Esta é uma prévia da voz.'
            : currentLang === 'es'
                ? 'Hola! Esta es una vista previa.'
                : currentLang === 'fr'
                    ? 'Bonjour! Ceci est un aperçu de la voix.'
                    : 'Hello! This is a voice preview.';

        const utterance = new SpeechSynthesisUtterance(testText);
        const voice = this.availableVoices.find(v => v.name === voiceSelect.value);
        if (voice) utterance.voice = voice;
        utterance.rate = this.ttsSpeed;
        utterance.volume = this.ttsVolume;
        window.speechSynthesis.speak(utterance);
    },

    /**
     * Limpa o texto para leitura (remove emojis e símbolos gráficos)
     * @param {string} text 
     * @returns {string} 
     */
    getReadableText: function (text) {
        if (!text) return "";

        // Regex para remover emojis e símbolos diversos
        // Faixas Unicode comuns para Emojis e Símbolos
        return text
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '')
            .replace(/[►◀▶️⏸️🔊✎✅❌⚠️💡🏆🧩🔍🎭📋🛡️⚡⭐]/g, '') // Emojis específicos usados na interface
            .replace(/\s+/g, ' ') // Normalizar espaços extra
            .trim();
    },

    /**
     * Inicia leitura automática da página
     */
    startAutoRead: function () {
        if (!this.autoReadEnabled) return;

        const currentLang = typeof App !== 'undefined' ? App.currentLang : 'pt';

        window.speechSynthesis.cancel();

        const rawText = document.getElementById('main-content').innerText;
        const text = this.getReadableText(rawText);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === 'pt' ? 'pt-BR' : currentLang === 'es' ? 'es-ES' : currentLang === 'fr' ? 'fr-FR' : 'en-US';
        utterance.rate = this.ttsSpeed;
        utterance.volume = this.ttsVolume;
        if (this.selectedVoice) utterance.voice = this.selectedVoice;

        window.speechSynthesis.speak(utterance);
        this.speaking = true;
        if (this.ttsBtn) {
            this.ttsBtn.classList.add('active', 'tts-playing');
            this.ttsBtn.textContent = '⏸️';
        }

        utterance.onend = () => {
            this.speaking = false;
            if (this.ttsBtn) {
                this.ttsBtn.classList.remove('active', 'tts-playing');
                if (this.autoReadEnabled) this.ttsBtn.textContent = '▶️';
            }
        };
    },

    /**
     * Reinicia speech com configurações atuais
     */
    restartSpeech: function () {
        const currentLang = typeof App !== 'undefined' ? App.currentLang : 'pt';

        window.speechSynthesis.cancel();

        const rawText = document.getElementById('main-content').innerText;
        const text = this.getReadableText(rawText);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === 'pt' ? 'pt-BR' : currentLang === 'es' ? 'es-ES' : currentLang === 'fr' ? 'fr-FR' : 'en-US';
        utterance.rate = this.ttsSpeed;
        utterance.volume = this.ttsVolume;
        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        window.speechSynthesis.speak(utterance);

        utterance.onend = () => {
            this.speaking = false;
            if (this.ttsBtn) {
                this.ttsBtn.classList.remove('active', 'tts-playing');
                if (this.autoReadEnabled) this.ttsBtn.textContent = '▶️';
            }
        };
    },

    /**
     * Handler do botão TTS principal
     */
    handleTTSButtonClick: function () {
        const currentLang = typeof App !== 'undefined' ? App.currentLang : 'pt';

        if (this.autoReadEnabled) {
            // Modo auto-read: play/pause
            if (this.speaking) {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                    if (this.ttsBtn) {
                        this.ttsBtn.textContent = '⏸️';
                        this.ttsBtn.classList.add('tts-playing');
                    }
                } else {
                    window.speechSynthesis.pause();
                    if (this.ttsBtn) {
                        this.ttsBtn.textContent = '▶️';
                        this.ttsBtn.classList.remove('tts-playing');
                    }
                }
            } else {
                this.startAutoRead();
            }
        } else {
            // Modo manual: toggle leitura
            if (this.speaking) {
                window.speechSynthesis.cancel();
                this.speaking = false;
                if (this.ttsBtn) this.ttsBtn.classList.remove('active');
            } else {
                const rawText = document.getElementById('main-content').innerText;
                const text = this.getReadableText(rawText);

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = currentLang === 'pt' ? 'pt-BR' : currentLang === 'es' ? 'es-ES' : currentLang === 'fr' ? 'fr-FR' : 'en-US';
                utterance.rate = this.ttsSpeed;
                utterance.volume = this.ttsVolume;
                if (this.selectedVoice) utterance.voice = this.selectedVoice;
                window.speechSynthesis.speak(utterance);
                this.speaking = true;
                if (this.ttsBtn) this.ttsBtn.classList.add('active');

                utterance.onend = () => {
                    this.speaking = false;
                    if (this.ttsBtn) this.ttsBtn.classList.remove('active');
                };
            }
        }
    },

    /**
     * Inicializa seletor de idioma
     */
    initLanguage: function () {
        const languages = ['pt', 'es', 'fr', 'en'];

        languages.forEach(lang => {
            const btn = document.getElementById(`btn-lang-${lang}`);
            if (btn) {
                btn.onclick = async () => {
                    if (typeof App !== 'undefined' && App.currentLang !== lang) {
                        App.currentLang = lang;
                        await I18n.setLanguage(lang);
                        this.updateLangButtons(lang);
                        App.loadPage(App.currentIndex);
                        App.renderMenu();
                        this.loadVoices();
                        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                    }
                };
            }
        });

        // Set initial active button
        const currentLang = typeof App !== 'undefined' ? App.currentLang : 'pt';
        this.updateLangButtons(currentLang);
    },

    /**
     * Atualiza estado dos botões de idioma
     */
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
    }
};
