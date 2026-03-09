# AI Water Usage

`ai-water-usage` launches a local dashboard that reads your Codex usage artifacts and estimates the water impact of your coding-agent usage.

## Run

```bash
npx ai-water-usage@latest
```

That command starts a local server, opens the dashboard in your browser, and reads usage data from your machine.

You can also install a reusable command:

```bash
npm install -g ai-water-usage
ai-water-usage
```

## Useful flags

```bash
ai-water-usage --port 3001
ai-water-usage --host 127.0.0.1
ai-water-usage --codex-home /path/to/.codex
ai-water-usage --no-open
```

## Data source

By default the app reads local Codex artifacts from:

- `~/.codex/sessions`
- `~/.codex/archived_sessions`
- `~/.codex/log/codex-tui.log`

Override that location with `--codex-home` or `CODEX_HOME=/path/to/.codex`.

## Repository

- Source: https://github.com/max-stoddard/AIWaterUsage
- Issues: https://github.com/max-stoddard/AIWaterUsage/issues
