# Bot Nullscape

Discord Bot with NovelAI image generation and LLM tag translation.

## Features

### Commands

- 🖌️ **`/draw`** - Generate images with tags directly
  - Input tags with optional emphasis syntax: `<tag:1.5>`
  - Select style presets (Anime, Realistic, Artistic, Furry, None)
  - Support for V3, V4, V4.5 models
  - Customizable size, sampler, steps, CFG scale, and seed

- ✨ **`/imagine`** - Natural language to image (one step)
  - Describe in any language, AI translates and generates
  - Automatic tag translation with emphasis
  - Same preset and model options as `/draw`

- 🔄 **`/translate`** - Translate natural language to tags only
  - Preview translated tags before generating
  - Shows both plain tags and emphasized version

### Preset System

Presets separate quality/style tags from scene content:

| Preset       | Description                        |
| ------------ | ---------------------------------- |
| 🎨 Anime     | Universal anime illustration style |
| 📷 Realistic | Photorealistic style               |
| 🖼️ Artistic  | Oil painting, watercolor, etc.     |
| 🦊 Furry     | Furry / Anthro style               |
| ⚪ None      | No preset tags (full control)      |

### Syntax Conversion

Unified emphasis syntax `<tag:weight>` automatically converts to:

- **V3 models**: Brace syntax `{{{tag}}}` / `[tag]`
- **V4+ models**: Numeric syntax `1.5::tag ::` / `0.7::tag ::`

## Setup

### Prerequisites

- Node.js >= 20.0.0
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- NovelAI API Key (requires active subscription)
- LLM API Key (OpenAI or compatible service)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/bot-nullscape.git
   cd bot-nullscape
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy `.env.example` to `.env` and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

4. Deploy slash commands to Discord:

   ```bash
   pnpm deploy
   ```

5. Start the bot:
   ```bash
   pnpm dev    # Development with hot reload
   pnpm build  # Build for production
   pnpm start  # Run production build
   ```

## Environment Variables

| Variable             | Required | Description                                              |
| -------------------- | -------- | -------------------------------------------------------- |
| `DISCORD_TOKEN`      | Yes      | Discord Bot Token                                        |
| `CLIENT_ID`          | Yes      | Discord Application ID                                   |
| `NAI_API_KEY`        | Yes      | NovelAI API Key                                          |
| `LLM_API_KEY`        | Yes      | LLM API Key (OpenAI compatible)                          |
| `LLM_BASE_URL`       | No       | LLM API Base URL (default: `https://api.openai.com/v1`)  |
| `LLM_MODEL`          | No       | LLM Model name (default: `gpt-4o-mini`)                  |
| `ADMIN_USER_IDS`     | No       | Comma-separated Discord user IDs that bypass rate limits |
| `RATE_LIMIT_PER_MIN` | No       | Global requests per minute (default: 15)                 |

## Docker Deployment

### Using Docker Compose

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Using Pre-built Image

```bash
docker pull ghcr.io/yourusername/bot-nullscape:latest

docker run -d \
  --name bot-nullscape \
  --env-file .env \
  ghcr.io/yourusername/bot-nullscape:latest
```

## Project Structure

```
src/
├── commands/           # Slash commands
│   └── image/
│       ├── draw.ts     # /draw command (direct tags)
│       ├── imagine.ts  # /imagine command (translate + generate)
|       └── translate.ts # /translate command
├── events/             # Discord event handlers
├── services/           # Business logic
│   ├── novelai.ts      # NovelAI API wrapper
│   ├── llm.ts          # LLM translation with tool calling
│   ├── prompt.ts       # Prompt assembly (preset + scene)
│   └── syntax.ts       # V3/V4 syntax conversion
├── types/              # TypeScript type definitions
│   ├── novelai.ts      # NAI API types and models
│   └── presets.ts      # Preset definitions
├── utils/              # Utilities (config, logger)
├── deploy-commands.ts  # Command deployment script
└── index.ts            # Entry point
```

## License

MIT
