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

        // 2. Load Content Structure
        await this.loadContent();

        // 3. Restore Progress
        this.restoreProgres();

        // 4. Render Interface
        this.renderMenu();
        this.loadPage(this.currentIndex);

        // 5. Bind Events
        this.bindEvents();
    },

    loadContent: async function () {
        try {
            const response = await fetch('content.json');
            this.data = await response.json();

            // Flatten pages for easy linear navigation
            this.flatPages = [];
            this.data.modules.forEach(mod => {
                mod.pages.forEach(page => {
                    this.flatPages.push({
                        ...page,
                        moduleId: mod.id,
                        moduleTitle: mod.title
                    });
                });
            });

            console.log("Content loaded. Total pages:", this.flatPages.length);
        } catch (error) {
            console.error("Failed to load content.json", error);
            document.getElementById('content-area').innerHTML = "<p class='error'>Erro ao carregar conteúdo.</p>";
        }
    },

    restoreProgres: function () {
        const location = scorm.getValue("cmi.core.lesson_location");
        console.log("Restoring location:", location);

        if (location) {
            // Find index of the page ID
            const idx = this.flatPages.findIndex(p => p.id === location);
            if (idx >= 0) {
                this.currentIndex = idx;
                this.maxIndexReached = idx; // Assuming if they are at X, they reached X (strict mode might differ but this is standard resume)
                // In strict mode, we might want to store 'max_visited' separate if they go back.
                // But simplified: restore to where they were implies that is their max.
            }
        }

        // Update Progress Bar
        this.updateProgress();
    },

    saveProgress: function () {
        // Save current page
        const currentPage = this.flatPages[this.currentIndex];
        scorm.setValue("cmi.core.lesson_location", currentPage.id);

        // Update max index
        if (this.currentIndex > this.maxIndexReached) {
            this.maxIndexReached = this.currentIndex;
        }

        // Check completion
        if (this.currentIndex === this.flatPages.length - 1) {
            scorm.setValue("cmi.core.lesson_status", "completed");
        }

        // Commit happens in wrapper
        this.updateProgress();
        this.updateMenuState();
    },

    updateProgress: function () {
        const percent = Math.round(((this.currentIndex + 1) / this.flatPages.length) * 100);
        document.getElementById('course-progress').value = percent;
        document.getElementById('progress-text').innerText = percent + "%";
    },

    renderMenu: function () {
        const menuEl = document.getElementById('menu-content');
        menuEl.innerHTML = "";

        this.data.modules.forEach(mod => {
            const group = document.createElement('div');
            group.className = 'module-group';

            const title = document.createElement('span');
            title.className = 'module-title';
            title.textContent = mod.title;
            group.appendChild(title);

            mod.pages.forEach(page => {
                const link = document.createElement('a');
                link.href = "#";
                link.className = 'menu-link locked';
                link.dataset.id = page.id;
                link.textContent = page.title;
                link.onclick = (e) => {
                    e.preventDefault();
                    // Find global index
                    const idx = this.flatPages.findIndex(p => p.id === page.id);
                    if (idx <= this.maxIndexReached) {
                        this.currentIndex = idx;
                        this.loadPage(idx);
                        this.saveProgress(); // Ensure location updates if they jumped back
                    }
                };
                group.appendChild(link);
            });

            menuEl.appendChild(group);
        });

        this.updateMenuState();
    },

    updateMenuState: function () {
        const links = document.querySelectorAll('.menu-link');
        links.forEach(link => {
            const pageId = link.dataset.id;
            const idx = this.flatPages.findIndex(p => p.id === pageId);

            link.classList.remove('active', 'locked', 'completed');

            if (idx === this.currentIndex) {
                link.classList.add('active');
            }

            if (idx <= this.maxIndexReached) {
                // Unlocked
            } else {
                link.classList.add('locked');
            }

            if (idx < this.currentIndex) {
                link.classList.add('completed');
            }
        });

        // Navigation Buttons
        document.getElementById('btn-prev').disabled = (this.currentIndex === 0);
        document.getElementById('btn-next').disabled = (this.currentIndex === this.flatPages.length - 1);
    },

    loadPage: async function (index) {
        const pageData = this.flatPages[index];
        const contentArea = document.getElementById('content-area');

        // Handle Language swap path
        let fileUrl = pageData.file;
        if (this.currentLang === 'es') {
            fileUrl = fileUrl.replace('/pt/', '/es/');
        }

        // Fetch HTML content
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                const html = await res.text();
                // Inject
                contentArea.innerHTML = html;

                // Enhance content (Accessibility descriptions handling could go here)

                // Scroll to top
                document.getElementById('main-content').scrollTop = 0;

                // Animate
                contentArea.classList.remove('fade-in');
                void contentArea.offsetWidth; // Trigger reflow
                contentArea.classList.add('fade-in');

            } else {
                contentArea.innerHTML = `<h2>Erro 404</h2><p>Página não encontrada: ${fileUrl}</p>`;
            }
        } catch (e) {
            contentArea.innerHTML = `<h2>Erro</h2><p>Falha ao carregar conteúdo.</p>`;
        }

        this.updateMenuState();
    },

    bindEvents: function () {
        // Navigation
        document.getElementById('btn-next').onclick = () => {
            if (this.currentIndex < this.flatPages.length - 1) {
                this.currentIndex++;
                this.saveProgress();
                this.loadPage(this.currentIndex);
            }
        };

        document.getElementById('btn-prev').onclick = () => {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.saveProgress();
                this.loadPage(this.currentIndex);
            }
        };

        // Sidebar Toggle
        const sidebar = document.getElementById('sidebar');
        document.getElementById('toggle-sidebar').onclick = () => {
            sidebar.classList.toggle('collapsed');
        };

        // Accessibility
        this.bindA11y();

        // Global Interactive Elements (Quiz)
        document.getElementById('content-area').addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-option')) {
                const btn = e.target;
                const parent = btn.closest('.quiz-block');
                const isCorrect = btn.dataset.correct === 'true';

                // Reset siblings
                parent.querySelectorAll('.quiz-option').forEach(b => {
                    b.classList.remove('selected', 'correct', 'incorrect');
                    b.disabled = true; // Lock after choice? Or let validation decide. User said "formative".
                });

                btn.classList.add('selected');

                if (isCorrect) {
                    btn.classList.add('correct');
                    btn.style.backgroundColor = '#dcedc8';
                    const feedback = parent.querySelector('.feedback');
                    if (feedback) feedback.style.display = 'block';
                } else {
                    btn.classList.add('incorrect');
                    btn.style.backgroundColor = '#ffcdd2';
                    // Show try again or hint?
                    setTimeout(() => {
                        parent.querySelectorAll('.quiz-option').forEach(b => b.disabled = false);
                        btn.classList.remove('selected', 'incorrect');
                        btn.style.backgroundColor = '';
                        alert("Resposta incorreta. Tente novamente!");
                    }, 1000);
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

        // Font Size (Simple Zoom approach or class approach? Class is better strictly but zoom is easier)
        let fontSize = 100;
        document.getElementById('btn-increase-font').onclick = () => {
            if (fontSize < 150) { fontSize += 10; document.body.style.fontSize = fontSize + "%"; }
        };
        document.getElementById('btn-decrease-font').onclick = () => {
            if (fontSize > 80) { fontSize -= 10; document.body.style.fontSize = fontSize + "%"; }
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
    }
};

// Start
window.onload = function () {
    App.init();
};

window.onunload = function () {
    scorm.finish();
}
