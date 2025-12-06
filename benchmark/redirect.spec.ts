import { test } from "@playwright/test";
import { createTestUrls } from "./url-builder";

interface BenchmarkResult {
  url: string;
  query: string;
  compression: string;
  setSize: number;
  redirectTime: number;
  success: boolean;
  error?: string;
}

test.describe("Redirect Performance Benchmark", () => {
  let benchmarkResults: BenchmarkResult[] = [];

  test.afterAll(async () => {
    // Output results summary
    const successful = benchmarkResults.filter((r) => r.success);
    const failed = benchmarkResults.filter((r) => !r.success);

    console.log("\n=== BENCHMARK RESULTS ===");
    console.log(`Total tests: ${benchmarkResults.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (successful.length > 0) {
      const avgTime =
        successful.reduce((sum, r) => sum + r.redirectTime, 0) /
        successful.length;
      const minTime = Math.min(...successful.map((r) => r.redirectTime));
      const maxTime = Math.max(...successful.map((r) => r.redirectTime));

      console.log(`\nRedirect Times (ms):`);
      console.log(`  Average: ${avgTime.toFixed(2)}`);
      console.log(`  Min: ${minTime.toFixed(2)}`);
      console.log(`  Max: ${maxTime.toFixed(2)}`);

      // Group by compression type
      const byCompression = successful.reduce(
        (acc, r) => {
          acc[r.compression] = acc[r.compression] || [];
          acc[r.compression].push(r.redirectTime);
          return acc;
        },
        {} as Record<string, number[]>,
      );

      console.log(`\nBy Compression Type:`);
      Object.entries(byCompression).forEach(([compression, times]) => {
        const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        console.log(
          `  ${compression}: ${avg.toFixed(2)}ms avg (min: ${min.toFixed(2)}, max: ${max.toFixed(2)}, ${times.length} tests)`,
        );
      });

      // Group by set size
      const bySetSize = successful.reduce(
        (acc, r) => {
          acc[r.setSize] = acc[r.setSize] || [];
          acc[r.setSize].push(r.redirectTime);
          return acc;
        },
        {} as Record<number, number[]>,
      );

      console.log(`\nBy Set Size:`);
      Object.entries(bySetSize).forEach(([setSize, times]) => {
        const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        console.log(
          `  ${setSize} bangs: ${avg.toFixed(2)}ms avg (min: ${min.toFixed(2)}, max: ${max.toFixed(2)}, ${times.length} tests)`,
        );
      });

      // Performance summary similar to mitata
      console.log(`\n=== Performance Analysis ===`);

      // Find fastest compression method
      const compressionPerf = Object.entries(byCompression)
        .map(([name, times]) => ({
          name,
          avg: times.reduce((sum, t) => sum + t, 0) / times.length,
          count: times.length,
        }))
        .sort((a, b) => a.avg - b.avg);

      console.log(
        `Fastest compression: ${compressionPerf[0].name} (${compressionPerf[0].avg.toFixed(2)}ms avg)`,
      );
      console.log(
        `Slowest compression: ${compressionPerf[compressionPerf.length - 1].name} (${compressionPerf[compressionPerf.length - 1].avg.toFixed(2)}ms avg)`,
      );

      // Find optimal dataset size performance
      const sizePerf = Object.entries(bySetSize)
        .map(([size, times]) => ({
          size: parseInt(size),
          avg: times.reduce((sum, t) => sum + t, 0) / times.length,
          count: times.length,
        }))
        .sort((a, b) => a.avg - b.avg);

      console.log(
        `Fastest dataset size: ${sizePerf[0].size} bangs (${sizePerf[0].avg.toFixed(2)}ms avg)`,
      );
      console.log(
        `Slowest dataset size: ${sizePerf[sizePerf.length - 1].size} bangs (${sizePerf[sizePerf.length - 1].avg.toFixed(2)}ms avg)`,
      );
    }

    if (failed.length > 0) {
      console.log(`\nFailed tests:`);
      failed.forEach((r) => {
        console.log(`  ${r.query} (${r.compression}/${r.setSize}): ${r.error}`);
      });
    }
  });

  const testUrls = createTestUrls();

  // Sample tests across different dimensions for comprehensive benchmarking
  // Take a representative sample to avoid too many tests
  const sampleUrls = [
    // Get samples from each compression type
    ...Object.values(["E", "B", "L", "G"])
      .map((compression) =>
        testUrls.find((url) => url.compression === compression),
      )
      .filter((url): url is NonNullable<typeof url> => url !== undefined),
    // Get samples from each dataset size
    ...Object.values([10, 20, 50, 100])
      .map((setSize) => testUrls.find((url) => url.set === setSize))
      .filter((url): url is NonNullable<typeof url> => url !== undefined),
    // Add some random samples for variety
    ...testUrls.slice(0, 10).sort(() => Math.random() - 0.5),
  ].slice(0, 20); // Limit total tests

  sampleUrls.forEach((testData, index) => {
    test(`Redirect ${index + 1}: ${testData.query.slice(0, 30)}... (${testData.compression}/${testData.set})`, async ({
      page,
    }) => {
      const result: BenchmarkResult = {
        url: testData.url,
        query: testData.query,
        compression: testData.compression,
        setSize: testData.set,
        redirectTime: 0,
        success: false,
      };

      try {
        // Override window.location.replace to measure timing
        await page.addInitScript(() => {
          const startTime = performance.now();

          // Override with timing measurement
          window.location.replace = function (url: string) {
            const endTime = performance.now();
            (window as any).redirectTime = endTime - startTime;
            (window as any).redirectUrl = url;
            (window as any).redirectCalled = true;

            // Log the measurement for debugging
            console.log(
              `Redirect measured: ${(window as any).redirectTime.toFixed(2)}ms to ${url}`,
            );

            // Don't actually redirect during testing - just mark as complete
            return;
          };
        });

        // Navigate to the test URL and start timing
        await page.goto(testData.url, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });

        // Wait for redirect processing with timeout
        await page.waitForFunction(
          () => (window as any).redirectCalled === true,
          { timeout: 5000 },
        );

        // Get the measured redirect time
        const pageRedirectData = await page.evaluate(() => ({
          called: (window as any).redirectCalled || false,
          time: (window as any).redirectTime || 0,
          url: (window as any).redirectUrl || "",
        }));

        if (pageRedirectData.called && pageRedirectData.time > 0) {
          result.redirectTime = pageRedirectData.time;
          result.success = true;
          console.log(
            `✓ Redirect measured: ${result.redirectTime.toFixed(2)}ms to ${pageRedirectData.url.slice(0, 50)}...`,
          );
        } else {
          throw new Error("No redirect detected within timeout");
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        result.success = false;
        console.log(`✗ Failed: ${result.error}`);
      }

      benchmarkResults.push(result);

      // Don't fail the test, just log the result for benchmarking
      if (!result.success) {
        console.log(`Test ${index + 1} failed but continuing: ${result.error}`);
      }
    });
  });
});
