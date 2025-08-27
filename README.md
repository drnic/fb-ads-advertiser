# FB Ads Advertiser CLI

A Node.js CLI tool to search Facebook Ads Library for specific advertisers using your existing Chrome browser session and OpenAI for intelligent advertiser selection.

## Prerequisites

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
2. **Chrome with Remote Debugging**: Start Chrome with remote debugging enabled

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set OpenAI API Key
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### 3. Chrome Setup (Optional)
The tool will automatically use your Chrome user data to preserve login sessions. You can optionally start Chrome with remote debugging for better performance:

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Windows:**
```bash
chrome.exe --remote-debugging-port=9222
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222
```

If Chrome remote debugging is not available, the tool will automatically launch Chrome with your user profile.

## Usage

### Using npm script:
```bash
# Default (All countries)
npm run fb-ads-advertiser "search term"

# With country selection (note the -- separator)
npm run fb-ads-advertiser -- -c Australia "search term"
npm run fb-ads-advertiser -- --country "United States" "search term"
```

### Using npx (if published):
```bash
npx fb-ads-advertiser "search term"
```

### Direct execution:
```bash
# Default (All countries)
node bin/fb-ads-advertiser.js "search term"

# With country selection
node bin/fb-ads-advertiser.js -c Australia "search term"
node bin/fb-ads-advertiser.js --country "United States" "search term"

# Show help
node bin/fb-ads-advertiser.js --help
```

## How it works

1. Connects to your existing Chrome browser session (preserving login state)
2. Navigates to Facebook Ads Library
3. Sets location to Australia and category to "All ads"
4. Searches for the provided term
5. Uses OpenAI GPT-4o-mini to select the most appropriate advertiser from suggestions
6. Returns the resulting search URL

## Example

```bash
export OPENAI_API_KEY="sk-your-key-here"
npm run fb-ads-advertiser -- -c Australia "Tesla"
```

Output:
```
Navigating to Facebook Ads Library...
Setting location to Australia and category to All ads...
Searching for "Tesla"...
Found 3 advertiser suggestions
OpenAI selected: Tesla, Inc.
Search URL: https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=AU&q=Tesla%2C%20Inc.&search_type=page&media_type=all
```