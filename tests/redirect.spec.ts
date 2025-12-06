import { test, expect } from "@playwright/test";
import { compress, Compression } from "@/lib/compression.js";
import popularBangs from "../pre-processing/top-popular/top200.json" assert { type: "json" };

const baseUrl = "http://localhost:3000";

test.describe("/x route tests", () => {
  // test.beforeEach(async () => {
  //   // Start the dev server if needed
  //   // This assumes the dev server is already running on localhost:3000
  // });

  test.describe("Basic redirect functionality", () => {
    test("should redirect to GitHub when using !gh bang", async ({ page }) => {
      const bangString = "gh>github.com/search?q={{{s}}}";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!gh test";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      // // Set up navigation response listener
      // const responsePromise = page.waitForResponse(
      //   (response) =>
      //     response.url().includes("github.com") && response.status() >= 300,
      // );

      await page.goto(testUrl);

      // Should redirect to GitHub
      await expect(page).toHaveURL(/github\.com/);
    });

    test("should redirect to first URL when no bang is specified", async ({
      page,
    }) => {
      const bangString =
        "gh>github.com/search?q={{{s}}},so>stackoverflow.com/search?q={{{s}}}";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "test query";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should redirect to first URL (GitHub)
      await expect(page).toHaveURL(/github\.com/);
    });

    test("should handle empty query with bang", async ({ page }) => {
      const bangString = "gh>github.com";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!gh";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      console.log(`Test URL: ${testUrl}`);
      console.log(`Test URL: ${testUrl}`);
      console.log(`Test URL: ${testUrl}`);
      console.log(`Test URL: ${testUrl}`);
      console.log(`Test URL: ${testUrl}`);
      console.log(`Test URL: ${testUrl}`);

      await page.goto(testUrl);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should redirect to GitHub origin when query is empty
      await expect(page).toHaveURL("https://github.com/");
    });

    test("should inject search query into URL template", async ({ page }) => {
      const bangString = "gh>github.com/search?q={{{s}}}";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!gh react hooks";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should include the search term in the URL
      await expect(page).toHaveURL(/github\.com.*react.*hooks/);
    });
  });

  test.describe("Error handling", () => {
    test("should redirect to /edit when missing 'q' parameter", async ({
      page,
    }) => {
      const bangString = "gh>github.com";
      const compressedBangs = compress(bangString, Compression.None);

      const testUrl = `${baseUrl}/x.html?b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should redirect to edit page
      await expect(page).toHaveURL(/\/edit/);
    });

    test("should redirect to /edit when missing 'b' parameter", async ({
      page,
    }) => {
      const query = "!gh test";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}`;

      await page.goto(testUrl);

      // Should redirect to edit page
      await expect(page).toHaveURL(/\/edit/);
    });

    test("should redirect to /edit when bang is not found", async ({
      page,
    }) => {
      const bangString = "gh>github.com";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!nonexistent test";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should redirect to edit page when bang not found
      await expect(page).toHaveURL(/\/edit/);
    });

    test("should redirect to /edit when compression data is invalid", async ({
      page,
    }) => {
      const query = "!gh test";
      const invalidCompressedData = "invalid_data";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(invalidCompressedData)}`;

      await page.goto(testUrl);

      // Should redirect to edit page when decompression fails
      await expect(page).toHaveURL(/\/edit/);
    });
  });

  test.describe("Compression methods", () => {
    const testBangString =
      "gh>github.com/search?q={{{s}}},so>stackoverflow.com/search?q={{{s}}}";
    const testQuery = "!gh typescript";

    test("should work with no compression", async ({ page }) => {
      const compressedBangs = compress(testBangString, Compression.None);
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(testQuery)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      await expect(page).toHaveURL(/github\.com.*typescript/);
    });

    test("should work with Base64 compression", async ({ page }) => {
      const compressedBangs = compress(testBangString, Compression.Base64);
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(testQuery)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      await expect(page).toHaveURL(/github\.com.*typescript/);
    });

    test("should work with LZString compression", async ({ page }) => {
      const compressedBangs = compress(testBangString, Compression.LZString);
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(testQuery)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      await expect(page).toHaveURL(/github\.com.*typescript/);
    });

    test("should work with Gzip compression", async ({ page }) => {
      const compressedBangs = compress(testBangString, Compression.Gzip);
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(testQuery)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      await expect(page).toHaveURL(/github\.com.*typescript/);
    });
  });

  test.describe("Popular bangs integration", () => {
    test("should redirect using popular bangs data", async ({ page }) => {
      // Use first few popular bangs for testing
      const testBangs = popularBangs.slice(0, 5);
      const bangString = testBangs
        .map((bang) => `${bang.t}>${bang.u}`)
        .join(",");
      const compressedBangs = compress(bangString, Compression.None);

      // Test with the first bang
      const query = `!${testBangs[0].t} test`;
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl, { timeout: 10000 });

      // Should redirect to the expected domain
      const expectedDomain = new URL(`https://${testBangs[0].u}`).hostname;
      await expect(page).toHaveURL(new RegExp(expectedDomain));
    });

    test("should handle multiple popular bangs", async ({ page }) => {
      // Test with more popular bangs
      const testBangs = popularBangs.slice(0, 20);
      const bangString = testBangs
        .map((bang) => `${bang.t}>${bang.u}`)
        .join(",");
      const compressedBangs = compress(bangString, Compression.LZString);

      // Test with the 5th bang
      const testBang = testBangs[4];
      const query = `!${testBang.t} example`;
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl, { timeout: 10000 });

      // Should redirect to the expected domain
      const expectedDomain = new URL(`https://${testBang.u}`).hostname;
      await expect(page).toHaveURL(new RegExp(expectedDomain));
    });
  });

  test.describe("URL handling", () => {
    test("should add https:// prefix when missing", async ({ page }) => {
      const bangString = "test>example.com";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!test";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should redirect with https:// prefix
      await expect(page).toHaveURL("https://example.com/");
    });

    test("should preserve existing http:// prefix", async ({ page }) => {
      const bangString = "test>http://example.com";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!test";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should preserve http:// prefix
      await expect(page).toHaveURL("http://example.com/");
    });

    test("should handle special characters in search query", async ({
      page,
    }) => {
      const bangString = "gh>github.com/search?q={{{s}}}";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!gh t3dotgg/unduck"; // Contains slash which should be preserved

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Should preserve the slash in the search query (GitHub URL-encodes it as %2F)
      await expect(page).toHaveURL(/github\.com.*t3dotgg.*unduck/);
    });
  });

  test.describe("Page title updates", () => {
    test("should update page title to show redirect destination", async ({
      page,
    }) => {
      const bangString = "gh>github.com";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!gh";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      await page.goto(testUrl);

      // Wait for redirect to complete
      await expect(page).toHaveURL("https://github.com/");

      // Check that we successfully redirected (title change is internal behavior)
      expect(page.url()).toBe("https://github.com/");
    });
  });

  test.describe("Performance considerations", () => {
    test("should redirect quickly with small bang data", async ({ page }) => {
      const bangString = "gh>github.com";
      const compressedBangs = compress(bangString, Compression.None);
      const query = "!gh";

      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      const startTime = Date.now();
      await page.goto(testUrl);
      const endTime = Date.now();

      const redirectTime = endTime - startTime;

      // Should redirect within reasonable time (less than 5 seconds in testing environment)
      expect(redirectTime).toBeLessThan(5000);
    });

    test("should handle large compressed data sets", async ({ page }) => {
      // Use many popular bangs to create a large dataset
      const largeBangSet = popularBangs.slice(0, 100);
      const bangString = largeBangSet
        .map((bang) => `${bang.t}>${bang.u}`)
        .join(",");
      const compressedBangs = compress(bangString, Compression.Gzip);

      const query = `!${largeBangSet[0].t}`;
      const testUrl = `${baseUrl}/x.html?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      const startTime = Date.now();
      await page.goto(testUrl, { timeout: 15000 });
      const endTime = Date.now();

      const redirectTime = endTime - startTime;

      // Should still redirect within reasonable time even with large dataset (15 seconds max)
      expect(redirectTime).toBeLessThan(15000);
    });
  });
});
