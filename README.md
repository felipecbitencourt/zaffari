# 📚 Por Dentro do SAC - Curso SCORM

Curso e-learning interativo desenvolvido para capacitar a equipe de Serviço de Atendimento ao Cliente (SAC) do Grupo Zaffari.

## 🎯 Sobre o Projeto

Este é um curso SCORM 1.2 completo, com foco em acessibilidade, gamificação e aprendizagem baseada em problemas (PBL). O curso aborda desde o papel estratégico do SAC até a aplicação prática do Código de Defesa do Consumidor (CDC).

### Características Principais

- ✅ **SCORM 1.2 Compatível** - Integração com LMS
- 🌐 **Multi-idioma (i18n)** - PT, ES, EN, FR
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
│   │   ├── scorm-api.js    # Comunicação SCORM
│   │   └── ...
│   ├── images/             # Imagens do curso
│   └── marca/              # Logos e identidade visual
├── locales/                # Arquivos de tradução
│   ├── pt.json             # Português (padrão)
│   ├── en.json             # Inglês
│   ├── es.json             # Espanhol
│   └── fr.json             # Francês
└── paginas/pt/             # Conteúdo HTML por página
    ├── intro-curso.html
    ├── m1/                 # Módulo 1: Papel Estratégico do SAC
    ├── m2/                 # Módulo 2: Onde encontrar informações
    ├── m3/                 # Módulo 3: CDC e Legislação
    └── extras/             # Atividades de fixação
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

### Seção Extra: Fixação
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
1. Crie um arquivo ZIP com todo o conteúdo
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

O curso utiliza arquivos JSON para internacionalização:

```javascript
// Uso no HTML
<h1 data-i18n="m1.p1.title"></h1>

// Uso no JavaScript
I18n.t('m1.p1.title')
```

**Idiomas suportados:** Português, Espanhol, Inglês, Francês

---

## 👥 Contribuição

1. Crie uma branch para sua feature
2. Faça as alterações necessárias
3. Teste em diferentes navegadores
4. Crie um Pull Request

---

## 📄 Licença

Projeto proprietário - Grupo Zaffari © 2024
