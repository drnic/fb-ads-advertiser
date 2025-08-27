# FB Ads Advertiser CLI

A Node.js CLI tool to search Facebook Ads Library for specific advertisers using Playwright browser automation and OpenAI for intelligent advertiser selection.

## Prerequisites

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set OpenAI API Key
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### 3. Browser Setup
The tool will automatically launch Chromium using Playwright. No additional browser setup is required.

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

1. Launches Chromium browser with Playwright
2. Navigates to Facebook Ads Library
3. Sets location and category to "All ads" (or specified country)
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