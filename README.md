# claude-sessions

<img width="1159" height="551" alt="Screenshot 2026-05-09 at 5 20 56 PM" src="https://github.com/user-attachments/assets/e89a82f1-26e2-4203-bd27-e60fe9f1f736" />
<img width="409" height="137" alt="Screenshot 2026-05-09 at 5 21 14 PM" src="https://github.com/user-attachments/assets/487e2180-5f9b-4b63-a29a-ed65ad700065" />

<img width="1191" height="242" alt="Screenshot 2026-05-09 at 5 21 34 PM" src="https://github.com/user-attachments/assets/54169ed7-e8ed-4c5a-bcff-18033b076628" />

A terminal UI for browsing, searching, and resuming Claude Code sessions.

## The Problem

Claude Code's built-in `/resume` command shows cryptic session IDs with truncated summaries. When you have hundreds of sessions across dozens of projects, finding the right one is painful.

## What This Does

A keyboard-driven TUI that indexes all your Claude Code sessions and lets you:

- **Browse** sessions with full context -- project name, first prompt, message count, git branch, model, timestamps
- **Search** with AI-powered semantic search (uses `claude --print` under the hood) or fuzzy text matching
- **Resume** any session instantly -- drops you right into `claude --resume` in the correct project directory
- **View memory** files across all projects with a tree browser and preview panel

## Install

```bash
git clone https://github.com/madmecodes/claude-sessions.git
cd claude-sessions
npm install
npm run build
npm link
```

## Usage

```bash
claude-sessions
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j/k` | Navigate rows |
| `Enter` | Resume selected session |
| `i` | Session detail panel |
| `/` | Open search bar |
| `Enter` (in search) | Execute search |
| `Ctrl+A` | Toggle AI / fuzzy search |
| `Esc` | Clear search / close panel |
| `s` | Cycle sort (recent / messages / project) |
| `f` | Refresh data |
| `Tab` | Switch between Sessions and Memory tabs |
| `?` | Help overlay |
| `q` | Quit |

### Search Modes

- **AI search** (default): Sends your query + session summaries to Claude for semantic ranking. Finds sessions by meaning, not just keywords.
- **Fuzzy search**: Fast local text matching via fuse.js across prompts, project names, and branches.

Toggle between them with `Ctrl+A` while in the search bar.

## Requirements

- Node.js 20+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and used at least once (`~/.claude` must exist)

## Tech Stack

TypeScript, React 19, Ink 6, fuse.js, tsup
