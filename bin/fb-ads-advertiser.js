#!/usr/bin/env node

const { chromium } = require('playwright');
const OpenAI = require('openai');

async function main() {
  const searchTerm = process.argv[2];
  
  if (!searchTerm) {
    console.error('Usage: fb-ads-advertiser "search term"');
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
    
    // Try to set location to Australia and category to "All ads" but don't block if it fails
    console.log('Setting location to Australia and category to All ads...');
    
    // Look for country selector and set to Australia (with timeout)
    try {
      console.log('Looking for country selector...');
      
      // Try to find the country combobox
      const countryButton = page.locator('[role="combobox"]:has-text("Australia"), [role="combobox"]:has-text("Country"), button:has-text("Australia")').first();
      await countryButton.waitFor({ state: 'visible', timeout: 3000 });
      
      // Check if it already says "Australia" - if so, we're good
      const buttonText = await countryButton.innerText();
      if (buttonText.includes('Australia')) {
        console.log('Country already set to Australia');
      } else {
        console.log('Clicking country selector...');
        await countryButton.click();
        await page.waitForTimeout(500);
        
        const australiaOption = page.locator('[role="option"]:has-text("Australia")').first();
        await australiaOption.waitFor({ state: 'visible', timeout: 2000 });
        await australiaOption.click();
        console.log('Set country to Australia');
      }
    } catch (e) {
      console.log('Skipping country selector (may already be set):', e.message);
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