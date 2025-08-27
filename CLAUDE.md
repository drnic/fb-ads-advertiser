# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js CLI tool that searches Facebook Ads Library for specific advertisers using Playwright browser automation and OpenAI for intelligent advertiser selection. The tool preserves Chrome browser sessions by either connecting to an existing Chrome instance with remote debugging or launching Chrome with the user's profile data.

## Development Commands

```bash
# Run the CLI tool (defaults to All countries)
npm run fb-ads-advertiser "search term"

# Direct execution with country selection
node bin/fb-ads-advertiser.js -c Australia "search term"
node bin/fb-ads-advertiser.js --country "United States" "search term"

# Show help
node bin/fb-ads-advertiser.js --help

# Debug mode (saves screenshots)
DEBUG=1 node bin/fb-ads-advertiser.js "search term"
```

## Architecture

### Core Components

- **Main CLI script**: `bin/fb-ads-advertiser.js` - Single-file implementation containing all logic
- **Browser automation**: Uses Playwright with Chromium to interact with Facebook Ads Library
- **AI integration**: OpenAI GPT-4o-mini selects the most appropriate advertiser from Facebook's suggestions using verification status, follower counts, and metadata

### Browser Connection Strategy

The tool uses a dual-connection approach:
1. **Primary**: Connects to existing Chrome browser via CDP at `localhost:9222` (preserves existing sessions)
2. **Fallback**: Launches Chrome with persistent user data directory to maintain login state

### Key Implementation Details

- Hardcoded Chrome profile path: `/Users/drnic/Library/Application Support/Google/Chrome/Default`
- Supports country selection via `-c/--country` flag, defaults to "All" countries
- Uses DOM selectors to interact with Facebook's UI (role-based locators for reliability)
- Implements fallback selector strategies for finding search inputs
- OpenAI prompt engineering for intelligent advertiser selection with prioritized criteria:
  - Verified accounts (✓) get highest priority
  - Higher follower counts indicate official accounts
  - Position in list (Facebook's relevance ranking)
  - Appropriate business category matching

## Environment Requirements

- `OPENAI_API_KEY` environment variable required
- Chrome browser with optional remote debugging on port 9222
- Network access to Facebook Ads Library and OpenAI API

## Current Limitations

- Chrome profile path is macOS-specific and hardcoded
- No test suite implemented