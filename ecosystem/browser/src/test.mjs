import puppeteer from 'puppeteer';

// This test aims to check if the SDK is correctly loaded in the browser.
// However, this runs in a Node.js environment.
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage();

    page
      .on('console', (message) => console.log(`spark-browser-test: ${message.text()}`))
      .on('pageerror', ({ message }) => console.error(`spark-browser-test: ${message}`));

    await page.goto('http://localhost:65432/test.html');
    await page.waitForSelector('#spark-browser-test', { timeout: 5000 }); // wait up to 5s for the tests to finish.

    const resultEl = await page.$('#results');
    if (!resultEl) throw new Error(`html element <#results> not found`);
    const text = await page.evaluate((el) => el.textContent, resultEl);
    const result = text ? JSON.parse(text) : undefined;

    if (result && result.passed) console.log('✅ All browser tests passed');
    else throw new Error(`Tests failed: ${result?.details}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
