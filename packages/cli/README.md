# Agentic Insights

`agentic-insights` launches a local dashboard that reads your Codex usage artifacts and estimates the water impact of your coding-agent usage.

## Run

```bash
npx agentic-insights@latest
```

That command starts a local server, opens the dashboard in your browser, and reads usage data from your machine.

You can also install a reusable command:

```bash
npm install -g agentic-insights
agentic-insights
```

## Useful flags

```bash
agentic-insights --port 3001
agentic-insights --host 127.0.0.1
agentic-insights --codex-home /path/to/.codex
agentic-insights --no-open
```

## Data source

By default the app reads local Codex artifacts from:

- `~/.codex/sessions`
- `~/.codex/archived_sessions`
- `~/.codex/log/codex-tui.log`

Override that location with `--codex-home` or `CODEX_HOME=/path/to/.codex`.

## Repository

- Source: https://github.com/max-stoddard/AgenticInsights
- Issues: https://github.com/max-stoddard/AgenticInsights/issues
