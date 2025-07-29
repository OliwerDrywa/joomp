import { test, expect } from "@playwright/test";
import { compress, Compression } from "../src/lib/compression";
import top100Bangs from "../pre-processing/top-popular/top100.json" assert { type: "json" };

// Helper function to create evenly distributed bang selections from top100
function createBangSubsets() {
  const totalBangs = top100Bangs.length;

  const subsets = {
    10: [] as typeof top100Bangs,
    20: [] as typeof top100Bangs,
    50: [] as typeof top100Bangs,
    100: [] as typeof top100Bangs,
  };

  // Create evenly distributed selections from top100 bangs
  for (const [size, subset] of Object.entries(subsets)) {
    const sizeNum = parseInt(size);
    const step = Math.floor(totalBangs / sizeNum);

    for (let i = 0; i < sizeNum; i++) {
      const index = (i * step) % totalBangs;
      subset.push(top100Bangs[index]);
    }
  }

  return subsets;
}

// Convert bang subset to string format (using the bang format from top100)
function bangSubsetToString(bangEntries: typeof top100Bangs): string {
  return bangEntries.map((bang) => `${bang.t}>${bang.u}`).join(",");
}

const bangSubsets = createBangSubsets();
const compressionMethods = [
  Compression.None,
  Compression.Base64,
  Compression.LZString,
  Compression.Gzip,
] as const;

const testSizes = [10, 20, 50, 100] as const;
const baseUrl = "http://localhost:3000";

test.describe("Unified Browser Redirect Performance (Top 100 Bangs)", () => {
  test.describe.configure({ mode: "serial" }); // Run tests sequentially for accurate timing

  for (const size of testSizes) {
    for (const method of compressionMethods) {
      test(`Redirect ${size} bangs - ${method} compression`, async ({
        page,
      }) => {
        const bangEntries = bangSubsets[size];
        const bangString = bangSubsetToString(bangEntries);

        // Use a simple query that should redirect quickly with top100 bangs
        const query = `!${bangEntries[0].t} test`;

        // Compress the bang data
        const compressedBangs = compress(bangString, method);

        // Create the URL with compressed data
        const testUrl = `${baseUrl}/x?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

        let redirectTime = -1;
        let success = false;

        try {
          // Inject timing code to measure until location.replace is called
          await page.addInitScript(() => {
            // Store the original location.replace
            const originalReplace = window.location.replace;

            // Override location.replace to capture timing
            window.location.replace = function (url: string | URL) {
              // Calculate time from page load start
              const timing = performance.now();

              // Store the timing for retrieval
              (window as any).__redirectTiming = timing;

              // Call original replace to actually perform redirect
              return originalReplace.call(window.location, url);
            };
          });

          // Navigate to the test URL
          await page.goto(testUrl, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });

          // Wait for redirect timing to be captured or timeout
          redirectTime = await page.evaluate(() => {
            return new Promise<number>((resolve) => {
              // Check if timing was already captured
              if ((window as any).__redirectTiming) {
                resolve((window as any).__redirectTiming);
                return;
              }

              // Poll for timing with timeout
              let attempts = 0;
              const maxAttempts = 100; // 5 seconds max

              const checkTiming = () => {
                if ((window as any).__redirectTiming) {
                  resolve((window as any).__redirectTiming);
                } else if (attempts < maxAttempts) {
                  attempts++;
                  setTimeout(checkTiming, 50);
                } else {
                  resolve(-1); // Timeout
                }
              };

              checkTiming();
            });
          });

          success = redirectTime > 0;

          if (success) {
            // Calculate compression info
            const originalSize = bangString.length;
            const compressedSize = compressedBangs.length;
            const compressionRatio = originalSize / compressedSize;

            console.log(
              `✓ [${method}] ${size} top100 bangs | "${query}" → ${redirectTime.toFixed(1)}ms`,
            );
            console.log(
              `   Data: ${originalSize} → ${compressedSize} chars (${compressionRatio.toFixed(1)}x compression)`,
            );
            console.log(
              `   Bang: ${bangEntries[0].t} → ${bangEntries[0].s} (rank: ${bangEntries[0].r})`,
            );
            console.log(
              `   Throughput: ${(1000 / redirectTime).toFixed(1)} redirects/sec\n`,
            );
          } else {
            console.log(`✗ [${method}] ${size} bangs | "${query}" → TIMEOUT`);
          }
        } catch (error) {
          console.log(
            `✗ [${method}] ${size} bangs | "${query}" → ERROR: ${error}`,
          );
          success = false;
        }

        // Verify that timing measurement works
        expect(redirectTime).toBeGreaterThan(0);
      });
    }
  }

  test("Compression method comparison", async ({ page }) => {
    // This test provides a summary comparison of all methods
    const size = 20; // Use moderate dataset for comparison
    const bangEntries = bangSubsets[size];
    const bangString = bangSubsetToString(bangEntries);
    const query = `!${bangEntries[0].t} test`; // Simple test query using top100 bang

    const results: Array<{
      method: Compression;
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
      redirectTime: number;
      success: boolean;
    }> = [];

    for (const method of compressionMethods) {
      const compressedBangs = compress(bangString, method);
      const testUrl = `${baseUrl}/x?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      try {
        // Inject timing code to measure until location.replace is called
        await page.addInitScript(() => {
          // Store the original location.replace
          const originalReplace = window.location.replace;

          // Override location.replace to capture timing
          window.location.replace = function (url: string | URL) {
            // Calculate time from page load start
            const timing = performance.now();

            // Store the timing for retrieval
            (window as any).__redirectTiming = timing;

            // Call original replace to actually perform redirect
            return originalReplace.call(window.location, url);
          };
        });

        await page.goto(testUrl, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });

        // Wait for redirect timing to be captured
        const redirectTime = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            // Check if timing was already captured
            if ((window as any).__redirectTiming) {
              resolve((window as any).__redirectTiming);
              return;
            }

            // Poll for timing with timeout
            let attempts = 0;
            const maxAttempts = 100; // 5 seconds max

            const checkTiming = () => {
              if ((window as any).__redirectTiming) {
                resolve((window as any).__redirectTiming);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkTiming, 50);
              } else {
                resolve(-1); // Timeout
              }
            };

            checkTiming();
          });
        });

        const success = redirectTime > 0;

        results.push({
          method,
          originalSize: bangString.length,
          compressedSize: compressedBangs.length,
          compressionRatio: bangString.length / compressedBangs.length,
          redirectTime,
          success,
        });
      } catch (error) {
        results.push({
          method,
          originalSize: bangString.length,
          compressedSize: compressedBangs.length,
          compressionRatio: bangString.length / compressedBangs.length,
          redirectTime: -1,
          success: false,
        });
      }
    }

    // Print comparison table
    console.log(
      `\n🏆 COMPRESSION METHOD COMPARISON (${size} top100 bangs, "${query}"):`,
    );
    console.log("Method | Orig Size | Comp Size | Ratio | Time (ms) | Success");
    console.log("-------|-----------|-----------|-------|-----------|--------");

    for (const result of results) {
      const origSize = `${result.originalSize}ch`;
      const compSize = `${result.compressedSize}ch`;
      const ratio =
        result.compressionRatio > 0 ?
          `${result.compressionRatio.toFixed(1)}x`
        : "N/A";
      const time =
        result.redirectTime > 0 ? `${result.redirectTime.toFixed(1)}ms` : "N/A";
      const success = result.success ? "✓" : "✗";

      console.log(
        `${result.method.padEnd(6)} | ${origSize.padEnd(9)} | ${compSize.padEnd(9)} | ${ratio.padEnd(5)} | ${time.padEnd(9)} | ${success}`,
      );
    }

    // Calculate summary stats
    const successful = results.filter((r) => r.success);
    if (successful.length > 0) {
      const fastest = successful.reduce((prev, curr) =>
        (
          curr.redirectTime > 0 &&
          (prev.redirectTime < 0 || curr.redirectTime < prev.redirectTime)
        ) ?
          curr
        : prev,
      );
      const bestCompression = successful.reduce((prev, curr) =>
        curr.compressionRatio > prev.compressionRatio ? curr : prev,
      );

      console.log(`\n📈 SUMMARY:`);
      console.log(
        `   Fastest: ${fastest.method} (${fastest.redirectTime.toFixed(1)}ms)`,
      );
      console.log(
        `   Best Compression: ${bestCompression.method} (${bestCompression.compressionRatio.toFixed(1)}x)`,
      );
      console.log(
        `   Success Rate: ${successful.length}/${results.length} methods\n`,
      );
    }

    // Verify we got some results
    expect(results.length).toBe(compressionMethods.length);
    expect(successful.length).toBeGreaterThan(0);
  });

  test("Dataset size scaling", async ({ page }) => {
    // Test how performance scales with dataset size using None compression
    const method = Compression.None;
    const query = "test query";

    const scalingResults: Array<{
      size: number;
      dataSize: number;
      redirectTime: number;
      throughput: number;
    }> = [];

    for (const size of testSizes) {
      const bangEntries = bangSubsets[size];
      const bangString = bangSubsetToString(bangEntries);
      const compressedBangs = compress(bangString, method);
      const testUrl = `${baseUrl}/x?q=${encodeURIComponent(query)}&b=${encodeURIComponent(compressedBangs)}`;

      try {
        // Inject timing code
        await page.addInitScript(() => {
          const originalReplace = window.location.replace;
          window.location.replace = function (url: string | URL) {
            const timing = performance.now();
            (window as any).__redirectTiming = timing;
            return originalReplace.call(window.location, url);
          };
        });

        await page.goto(testUrl, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });

        const redirectTime = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            if ((window as any).__redirectTiming) {
              resolve((window as any).__redirectTiming);
              return;
            }

            let attempts = 0;
            const maxAttempts = 100;

            const checkTiming = () => {
              if ((window as any).__redirectTiming) {
                resolve((window as any).__redirectTiming);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkTiming, 50);
              } else {
                resolve(-1);
              }
            };

            checkTiming();
          });
        });

        if (redirectTime > 0) {
          const throughput = 1000 / redirectTime;
          scalingResults.push({
            size,
            dataSize: bangString.length,
            redirectTime,
            throughput,
          });
        }
      } catch (error) {
        console.log(`Error testing ${size} bangs: ${error}`);
      }
    }

    // Print scaling results
    console.log(`\n📊 DATASET SIZE SCALING (${method} compression):`);
    console.log("Size | Data Size | Time (ms) | Throughput (req/s)");
    console.log("-----|-----------|-----------|-------------------");

    for (const result of scalingResults) {
      console.log(
        `${result.size.toString().padEnd(4)} | ${result.dataSize.toString().padEnd(9)} | ${result.redirectTime.toFixed(1).padEnd(9)} | ${result.throughput.toFixed(1)}`,
      );
    }

    // Verify scaling works
    expect(scalingResults.length).toBeGreaterThan(0);
  });
});
