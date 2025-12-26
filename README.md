# 📚 Por Dentro do SAC - Curso SCORM

Curso e-learning interativo desenvolvido para capacitar a equipe de Serviço de Atendimento ao Cliente (SAC) do Grupo Zaffari.

## 🎯 Sobre o Projeto

Este é um curso SCORM 1.2 completo, com foco em acessibilidade, gamificação e aprendizagem baseada em problemas (PBL). O curso aborda desde o papel estratégico do SAC até a aplicação prática do Código de Defesa do Consumidor (CDC).

### Características Principais

- ✅ **SCORM 1.2 Compatível** - Integração com LMS
- 🌐 **Multi-idioma (i18n)** - Português, Inglês, Espanhol e Francês
- ♿ **Acessibilidade WCAG 2.1 AA** - Alto contraste, modo dislexia, TTS
- 🎮 **Gamificação** - Medalhas, progresso, conquistas
- 📱 **Responsivo** - Desktop, tablet e mobile
- 🎭 **Atividades Interativas** - Quiz, flashcards, roleplay, arraste-e-solte

---

## 📁 Estrutura do Projeto

```
curso-scorm/
├── index.html              # Shell principal (SPA)
├── content.json            # Estrutura do curso (módulos e páginas)
├── imsmanifest.xml         # Manifesto SCORM
├── assets/
│   ├── css/style.css       # Estilos globais
│   ├── js/                 # Scripts modulares
│   │   ├── app.js          # Aplicação principal
│   │   ├── i18n.js         # Sistema de internacionalização
│   │   ├── navigation.js   # Navegação entre páginas
│   │   ├── accessibility.js # Recursos de acessibilidade
│   │   ├── gamification.js # Sistema de medalhas
│   │   ├── interactive.js  # Componentes interativos
│   │   ├── tutorial.js     # Tutorial interativo
│   │   └── scorm-api.js    # Comunicação SCORM
│   ├── images/             # Imagens do curso
│   └── marca/              # Logos e identidade visual
├── locales/                # Arquivos de tradução (i18n)
│   ├── pt/                 # Português (padrão)
│   │   ├── global.json     # Traduções globais (UI, menu, etc.)
│   │   ├── intro.json      # Página de introdução
│   │   ├── m1/             # Módulo 1
│   │   ├── m2/             # Módulo 2
│   │   ├── m3/             # Módulo 3
│   │   └── extras/         # Atividades extras
│   ├── en/                 # English
│   ├── es/                 # Español
│   └── fr/                 # Français
├── paginas/pt/             # Conteúdo HTML por página
│   ├── intro-curso.html
│   ├── m1-*.html           # Páginas do Módulo 1
│   ├── m2-*.html           # Páginas do Módulo 2
│   ├── m3-*.html           # Páginas do Módulo 3
│   └── extras-*.html       # Atividades de exercícios
└── relatório/              # Documentação técnico-pedagógica
```

---

## 📖 Conteúdo do Curso

### Módulo 1: Por que o SAC é estratégico?
- O que o cliente espera
- Papel estratégico do SAC
- Responsabilidades da equipe
- Importância dos prazos

### Módulo 2: Onde encontrar informações?
- Consulta na Intranet
- Dados das lojas
- Ofertas e encartes
- WhatsApp de ofertas

### Módulo 3: Como aplicar o CDC?
- Conceitos básicos do CDC
- Produto vs Serviço
- Trocas com e sem defeito
- Direito de Arrependimento
- Encaminhamento de reclamações

### Seção Extra: Exercícios
- 📊 Meu Desempenho
- 📖 Resumo do Curso
- 📝 Questionários
- 🃏 Flash Cards
- 🎯 Arraste e Solte
- 🔍 Ache o Erro
- 🎭 Roleplay

---

## 🚀 Como Executar

### Desenvolvimento Local
1. Clone o repositório
2. Abra com um servidor local (ex: Live Server do VS Code)
3. Acesse `index.html`

```bash
# Usando Python
python -m http.server 8000

# Ou usando Node.js
npx serve .
```

### Deploy em LMS
1. Crie um arquivo ZIP com todo o conteúdo da pasta
2. Faça upload no seu LMS compatível com SCORM 1.2
3. O ponto de entrada é `index.html`

---

## 🛠️ Tecnologias

- **HTML5** + **CSS3** (Vanilla)
- **JavaScript** (ES6+, sem frameworks)
- **SCORM 1.2** API
- **Web Speech API** (TTS)
- **LocalStorage** (persistência local)

---

## 📝 Sistema de Traduções (i18n)

O curso utiliza um sistema modular de traduções com arquivos JSON organizados por idioma e módulo:

```
locales/
├── pt/                 # Português
│   ├── global.json     # UI, menu, botões, acessibilidade
│   ├── intro.json      # Página de introdução
│   ├── m1/p1.json      # Módulo 1, Página 1
│   └── ...
├── en/                 # English
├── es/                 # Español
└── fr/                 # Français
```

### Uso no HTML
```html
<h1 data-i18n="title"></h1>
<p data-i18n="description"></p>
```

### Uso no JavaScript
```javascript
I18n.t('global.buttons.next')
```

**Idiomas suportados:** Português 🇧🇷, English 🇺🇸, Español 🇪🇸, Français 🇫🇷

---

## ♿ Acessibilidade

O curso segue as diretrizes WCAG 2.1 AA e oferece:

- **Alto Contraste** - Modo claro/escuro
- **Modo Dislexia** - Fonte OpenDyslexic
- **Leitor de Tela** - Compatível com NVDA, JAWS
- **Narração (TTS)** - Web Speech API
- **Navegação por Teclado** - Atalhos e foco visível
- **Textos Alternativos** - Todas as imagens descritas

---

## 👥 Contribuição

1. Crie uma branch para sua feature
2. Faça as alterações necessárias
3. Teste em diferentes navegadores e idiomas
4. Crie um Pull Request

---

## 📄 Licença

Projeto proprietário - Grupo Zaffari © 2025
