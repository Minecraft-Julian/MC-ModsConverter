# MC Mods Converter v2 — AI-Powered

> 🤖 Convert Minecraft Java mods (.jar) to Bedrock addons (.mcaddon) using AI

## Architecture

- **Frontend**: Static HTML/CSS/JS served from `public/`
- **Backend**: Vercel Serverless Functions in `api/`
- **AI Engine**: Ollama (local LLM) with tool-calling
- **Plugin System**: Modular conversion tools in `lib/plugins/`
- **Web Scraper**: CurseForge reference scraper

## Quick Start

### Prerequisites
- Node.js 18+
- [Ollama](https://ollama.ai) running on a server
- A code-focused model: `ollama pull deepseek-coder:6.7b`

### Setup
```bash
npm install
```

### Environment
Create a `.env` file or set in Vercel:
```
OLLAMA_URL=http://your-server:11434
OLLAMA_MODEL=deepseek-coder:6.7b
```

### Development
```bash
npx vercel dev
```

### Deploy
```bash
npx vercel --prod
```

## Project Structure
```
├── api/                    Vercel Serverless Functions
│   ├── convert.js          Main conversion endpoint
│   └── health.js           Ollama health check
├── lib/                    Backend logic
│   ├── ollama-client.js    Ollama API wrapper
│   ├── plugin-system.js    Tool registry
│   ├── plugins/            10 conversion plugins
│   ├── validator.js        Bedrock validation
│   ├── scraper.js          CurseForge scraper
│   └── similarity-scorer.js
├── library/                Reference modpacks
├── public/                 Frontend
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── animation.js
└── scripts/                Utility scripts
```

## How It Works

1. **Upload** a Java mod (.jar)
2. **AI analyzes** the mod structure
3. **Tools execute** conversion steps (textures, models, recipes, etc.)
4. **AI validates** the result and iterates
5. **Score calculated** — similarity percentage to Java original
6. **Download** the converted .mcaddon
