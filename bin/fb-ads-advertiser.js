#!/usr/bin/env node

const { chromium } = require('playwright');
const OpenAI = require('openai');

function showHelp() {
  console.log('Facebook Ads Library Advertiser Search Tool');
  console.log('');
  console.log('USAGE:');
  console.log('  fb-ads-advertiser [OPTIONS] "search term"');
  console.log('');
  console.log('OPTIONS:');
  console.log('  -c, --country COUNTRY    Search within specific country (default: All)');
  console.log('  -h, --help              Show this help message');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  fb-ads-advertiser "nike"');
  console.log('  fb-ads-advertiser -c Australia "nike"');
  console.log('  fb-ads-advertiser --country "United States" "nike"');
  console.log('');
  console.log('ENVIRONMENT:');
  console.log('  OPENAI_API_KEY    Required for AI-powered advertiser selection');
  console.log('  DEBUG=1           Enable debug mode (saves screenshots)');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    country: 'All',
    help: false
  };
  const positionalArgs = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-c' || arg === '--country') {
      if (i + 1 >= args.length) {
        console.error('Error: -c/--country flag requires a value');
        process.exit(1);
      }
      options.country = args[i + 1];
      i++; // Skip the next argument as it's the country value
    } else if (arg.startsWith('-')) {
      console.error(`Error: Unknown option '${arg}'`);
      console.error('Use --help to see available options');
      process.exit(1);
    } else {
      positionalArgs.push(arg);
    }
  }
  
  return {
    searchTerm: positionalArgs[0] || null,
    ...options
  };
}

async function main() {
  const { searchTerm, country, help } = parseArgs();
  
  if (help) {
    showHelp();
    process.exit(0);
  }
  
  if (!searchTerm) {
    console.error('Error: Search term is required');
    console.error('Use --help to see usage information');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let browser;
  try {
    // Try to connect to existing Chrome browser, if it fails, launch with user data
    try {
      browser = await chromium.connectOverCDP('http://localhost:9222');
      console.log('Connected to existing Chrome browser');
    } catch (connectError) {
      console.log('Could not connect to existing Chrome, launching with user data...');
      // Launch Chrome with user data directory to preserve session
      browser = await chromium.launchPersistentContext('/Users/drnic/Library/Application Support/Google/Chrome/Default', {
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
      });
    }
    
    // Get the first page or create a new one
    let page;
    if (browser.contexts) {
      // Connected to existing Chrome browser
      const contexts = browser.contexts();
      let context = contexts[0];
      if (!context) {
        context = await browser.newContext();
      }
      
      const pages = context.pages();
      page = pages[0];
      if (!page) {
        page = await context.newPage();
      }
    } else {
      // Using persistent context (browser is actually a context)
      const context = browser;
      const pages = context.pages();
      page = pages[0];
      if (!page) {
        page = await context.newPage();
      }
    }

    // Navigate to Facebook Ads Library
    console.log('Navigating to Facebook Ads Library...');
    await page.goto('https://www.facebook.com/ads/library');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Debug: Take screenshot to see the actual UI
    if (process.env.DEBUG) {
      await page.screenshot({ path: 'debug-facebook-ads.png', fullPage: true });
      console.log('Debug screenshot saved to debug-facebook-ads.png');
    }
    
    // Try to set location and category to "All ads" but don't block if it fails
    console.log(`Setting location to ${country} and category to All ads...`);
    
    // Look for country selector and set to specified country (with timeout)
    try {
      console.log('Looking for country selector...');
      
      // Find the country combobox - look for role="combobox" that contains country text
      const countryButton = page.locator('[role="combobox"]').filter({ hasText: /Australia|All|Country|United States|Canada|United Kingdom/ }).first();
      await countryButton.waitFor({ state: 'visible', timeout: 3000 });
      
      // Check if it already shows the target country/setting
      const buttonText = await countryButton.innerText();
      const isCorrectSetting = (country === 'All' && buttonText.includes('All')) || 
                               (country !== 'All' && buttonText.includes(country));
      
      if (isCorrectSetting) {
        console.log(`Country already set to ${country}`);
      } else {
        console.log('Clicking country selector...');
        await countryButton.click();
        await page.waitForTimeout(500);
        
        // Look for the target option in the dropdown
        let targetOption;
        if (country === 'All') {
          // For "All", look for role="gridcell" with "All" text
          targetOption = page.locator('[role="gridcell"]').filter({ hasText: 'All' }).first();
        } else {
          // For specific countries, look for the country name
          targetOption = page.locator(`[role="gridcell"]:has-text("${country}"), [role="option"]:has-text("${country}")`).first();
        }
        
        await targetOption.waitFor({ state: 'visible', timeout: 3000 });
        await targetOption.click();
        console.log(`Set country to ${country}`);
      }
    } catch (e) {
      console.log('Could not set country selector:', e.message);
    }

    // Click on "Ad category" dropdown and select "All ads"
    try {
      console.log('Looking for Ad category dropdown...');
      
      // Find the combobox element that contains "Ad category"
      const categoryButton = page.locator('[role="combobox"]:has-text("Ad category")');
      await categoryButton.waitFor({ state: 'visible', timeout: 5000 });
      
      console.log('Found Ad category combobox, clicking...');
      await categoryButton.click();
      await page.waitForTimeout(1000);
      
      // Look for "All ads" option in the dropdown that appears
      console.log('Looking for All ads option...');
      const allAdsOption = page.locator('[role="gridcell"]:has-text("All ads"), span:has-text("All ads")').first();
      await allAdsOption.waitFor({ state: 'visible', timeout: 3000 });
      await allAdsOption.click();
      
      console.log('Set category to All ads');
      await page.waitForTimeout(500);
      
    } catch (e) {
      console.log('Could not set category to All ads:', e.message);
    }

    // Debug: Take another screenshot after setting category
    if (process.env.DEBUG) {
      await page.screenshot({ path: 'debug-after-category.png', fullPage: true });
      console.log('Debug screenshot after category saved to debug-after-category.png');
    }

    // Search for the advertiser
    console.log(`Searching for "${searchTerm}"...`);
    
    // Find the search input - try specific selectors based on the DOM
    let searchInput;
    const selectors = [
      'input[placeholder="Search by keyword or advertiser"]',
      'input[type="search"]',
      'input[placeholder*="keyword"]',
      'input[placeholder*="advertiser"]'
    ];
    
    for (const selector of selectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        searchInput = page.locator(selector).first();
        await searchInput.waitFor({ state: 'visible', timeout: 3000 });
        console.log(`Found input with selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`Failed with selector: ${selector}`);
        continue;
      }
    }
    
    if (!searchInput) {
      throw new Error('Could not find search input');
    }
    
    console.log('Found search input, focusing and filling with search term...');
    
    // Focus on the input first to trigger dropdown behavior
    await searchInput.focus();
    await page.waitForTimeout(500);
    
    // Clear any existing text and type the search term
    await searchInput.fill('');
    await searchInput.type(searchTerm);
    await page.waitForTimeout(2000);

    // Look for advertiser suggestions - they're in li elements with role="option"
    console.log('Looking for advertiser suggestions...');
    
    // Wait for suggestions to appear
    await page.waitForTimeout(1000);
    
    const suggestions = await page.locator('li[role="option"]').all();
    
    if (suggestions.length === 0) {
      console.log('No advertiser suggestions found');
      return;
    }

    // Get suggestion texts for OpenAI to choose from
    const suggestionTexts = [];
    for (const suggestion of suggestions) {
      try {
        // Look for the heading element which contains the advertiser name
        const heading = suggestion.locator('[role="heading"]').first();
        const headingExists = await heading.count() > 0;
        
        if (headingExists) {
          const text = await heading.innerText();
          if (text.trim()) {
            suggestionTexts.push(text.trim());
            console.log(`Found advertiser: "${text.trim()}"`);
          }
        } else {
          // Fallback to full text if no heading found
          const text = await suggestion.innerText();
          if (text.trim()) {
            suggestionTexts.push(text.trim());
          }
        }
      } catch (e) {
        // Skip if can't get text
      }
    }

    if (suggestionTexts.length === 0) {
      console.log('No valid advertiser suggestions found');
      return;
    }

    console.log(`Found ${suggestionTexts.length} advertiser suggestions`);

    // Use OpenAI to select the most appropriate advertiser
    const prompt = `Given the search term "${searchTerm}" and the following list of Facebook advertiser suggestions, select the most appropriate advertiser business (not just a text match). Return only the exact text of the selected suggestion:

${suggestionTexts.map((text, i) => `${i + 1}. ${text}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const selectedAdvertiser = completion.choices[0].message.content.trim();
    console.log(`OpenAI selected: ${selectedAdvertiser}`);

    // Find and click the selected advertiser
    let found = false;
    for (const suggestion of suggestions) {
      try {
        // Check if this suggestion's heading matches the selected advertiser
        const heading = suggestion.locator('[role="heading"]').first();
        const headingExists = await heading.count() > 0;
        
        let matchText = '';
        if (headingExists) {
          matchText = await heading.innerText();
        } else {
          matchText = await suggestion.innerText();
        }
        
        if (matchText.trim() === selectedAdvertiser) {
          console.log(`Clicking on advertiser: "${matchText.trim()}"`);
          await suggestion.click();
          found = true;
          break;
        }
      } catch (e) {
        // Skip if can't interact
      }
    }

    if (!found) {
      console.log('Could not find the selected advertiser to click');
      return;
    }

    // Wait for search results to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get the current URL
    const resultUrl = page.url();
    console.log(`Search URL: ${resultUrl}`);

  } catch (error) {
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('Error: Could not connect to Chrome browser.');
      console.error('Please start Chrome with remote debugging enabled:');
      console.error('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
      console.error('  Or on Windows: chrome.exe --remote-debugging-port=9222');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  } finally {
    // Close browser if we launched it, but don't close if we connected to existing one
    if (browser && !browser.contexts) {
      // This is a persistent context we launched
      await browser.close();
    }
    // If we connected to existing Chrome, don't close it
  }
}

main().catch(console.error);