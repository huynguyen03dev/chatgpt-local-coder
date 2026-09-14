<div align="center">

# ChatGPT Local Coder — Slim Fork

**A small, skill-first local coding bridge for ChatGPT.**

Give ChatGPT access to your local files, shell, processes, images, and project instructions without exposing a huge MCP tool surface.

</div>

---

This fork keeps **ChatGPT Local Coder intentionally small**.

Instead of registering dozens of specialized MCP tools, the default `slim` profile exposes a compact set of primitives and lets the agent use normal CLI tools plus **Agent Skills** on demand.

```text
ChatGPT
  ↓
Local Coder MCP
  ↓
12 core tools
  ↓
files / shell / processes / images
  ↓
Agent Skills
  ↓
specialized CLIs when needed
```

## Why this fork

- **Small MCP surface** — less tool-schema/context overhead.
- **Skill-first workflows** — load specialized instructions only when relevant.
- **CLI over wrappers** — use `rg`, `find`, `git`, browser CLIs, test runners, etc. through `run_command`.
- **Native image reading** — `read_image` returns MCP image content directly.
- **Project-aware** — load each repo's `AGENTS.md` with `project_context`.
- **Full machine access** — work anywhere on the machine, not only inside one repo.

The original/full implementation is still available through the `full` profile when you need the larger legacy toolset.

## Default `slim` tools

The default profile exposes exactly 12 tools:

```text
read_text_file
read_image
write_file
apply_patch
run_command
shell_status
start_process
process_output
project_context
list_skills
load_skill
rewind
```

Use normal shell commands for search, Git, file management, and project tooling.

## Agent Skills

Skills are discovered from:

```text
<project>/.agents/skills/<skill>/SKILL.md
~/.agents/skills/<skill>/SKILL.md
```

Project-local skills override global skills with the same name.

The intended workflow is:

```text
list_skills → load_skill → run the CLI/tool described by that skill
```

This keeps specialized knowledge out of the MCP schema until it is actually needed.

### Browser automation example

Instead of loading a large browser MCP server, install a CLI-backed skill such as `agent-browser`:

```bash
npm install -g agent-browser
agent-browser install
npx skills add vercel-labs/agent-browser --global --skill agent-browser --agent codex --yes
```

Then ChatGPT can load the skill on demand and drive the browser through `run_command`.

## Quick start

### Requirements

- Node.js 18+
- npm
- Git

### Install

```bash
git clone https://github.com/huynguyen03dev/chatgpt-local-coder.git
cd chatgpt-local-coder
cp .env.example .env
npm install
npm run build
```

On Windows:

```powershell
copy .env.example .env
npm install
npm run build
```

Edit `.env` and set at least:

```env
WORKSPACE_PATH=/path/to/your/default/project
MCP_TOKEN=your-random-secret
CHATGPT_TOOL_PROFILE=slim
```

Generate a token with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Start the server:

```bash
npm start
```

Windows users can also use:

```powershell
.\start.ps1
```

Health check:

```text
http://127.0.0.1:3000/health
```

## Connect ChatGPT

Expose port `3000` through an HTTPS tunnel, then create a ChatGPT connector pointing to:

```text
https://<your-tunnel>/mcp/<MCP_TOKEN>
```

Treat this URL like a password because it contains your MCP token.

Supported tunnel approaches include:

- OpenAI Secure MCP Tunnel
- Cloudflare Tunnel
- Pinggy / another HTTPS reverse tunnel

After changing or restarting the server, refresh the connector before starting a new coding session.

## Working with projects

When switching repos, call:

```text
project_context(/absolute/path/to/repo)
```

This loads that project's `AGENTS.md` without pulling unrelated instruction files into context.

For long-running tasks use:

```text
start_process → process_output
```

For Git and search use the CLI directly through `run_command`:

```bash
git status --short
rg "TODO|FIXME" src
find . -name '*.ts'
```

## Full profile

Set:

```env
CHATGPT_TOOL_PROFILE=full
```

when you explicitly want the larger compatibility tool surface from the upstream-style implementation.

For normal ChatGPT coding, `slim` is the recommended profile.

## Development

```bash
npm run build
npm test
```

Main configuration lives in `.env`. See `.env.example` and `AGENTS.md` for advanced options and operational notes.

## Upstream

This repository is a slim, skill-first fork of:

- `hoangcoderr/chatgpt-local-coder`

The fork intentionally favors a smaller MCP schema and CLI-backed skills over adding more permanent MCP tools.

## License

MIT — see [LICENSE](LICENSE).
