import { bench, boxplot, run } from "mitata";
import { createTestUrls } from "./url-builder";
import { getRedirectUrl, decompress } from "@/lib/redirect";
import { Compression } from "@/lib/compression";

// Generate test URLs
const testUrls = createTestUrls();

// Helper to get compression name
const getCompressionName = (compression: string) =>
  Object.entries(Compression).find(
    ([_, value]) => value === compression,
  )?.[0] || compression;

// Helper function to extract URL parameters and benchmark the redirect process
async function benchmarkRedirect(url: string): Promise<number | null> {
  try {
    const urlObj = new URL(url);
    const q = urlObj.searchParams.get("q");
    const b = urlObj.searchParams.get("b");

    if (!q || !b) {
      throw new Error("Missing required parameters");
    }

    // Measure the time for decompression and redirect lookup
    const start = performance.now();
    const decompressed = await decompress(b);
    getRedirectUrl(q, decompressed);
    const end = performance.now();

    return end - start;
  } catch (error) {
    // Failures are allowed, just return null
    return null;
  }
}

interface BenchmarkResult {
  compression: string;
  datasetSize: number;
  query: string;
  timing: number;
  url: string;
}

// Collect comprehensive performance data for all test cases
async function collectAllBenchmarkData(
  runsPerTest: number = 20,
): Promise<BenchmarkResult[]> {
  console.log(
    `Collecting benchmark data with ${runsPerTest} runs per test case...`,
  );
  console.log(`Total test cases: ${testUrls.length}`);
  console.log(`Total benchmark runs: ${testUrls.length * runsPerTest}`);

  const results: BenchmarkResult[] = [];
  let completedTests = 0;

  for (const testCase of testUrls) {
    const compressionName = getCompressionName(testCase.compression);

    // Run multiple iterations for each test case
    for (let run = 0; run < runsPerTest; run++) {
      const timing = await benchmarkRedirect(testCase.url);
      if (timing !== null) {
        results.push({
          compression: compressionName,
          datasetSize: testCase.set,
          query: testCase.query,
          timing,
          url: testCase.url,
        });
      }
    }

    completedTests++;
    if (completedTests % 10 === 0) {
      console.log(
        `Progress: ${completedTests}/${testUrls.length} test cases completed`,
      );
    }
  }

  console.log(
    `Data collection complete! Collected ${results.length} benchmark results\n`,
  );
  return results;
}

// Statistical analysis helpers
function calculateStats(timings: number[]) {
  if (timings.length === 0) return null;

  const sorted = [...timings].sort((a, b) => a - b);
  const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { avg, min, max, median, p75, p99, count: timings.length };
}

// Display results grouped by compression method
async function displayResultsByCompression(results: BenchmarkResult[]) {
  console.log("=".repeat(80));
  console.log("📊 RESULTS BY COMPRESSION METHOD");
  console.log("=".repeat(80));

  const compressionGroups = results.reduce(
    (acc, result) => {
      if (!acc[result.compression]) acc[result.compression] = [];
      acc[result.compression].push(result);
      return acc;
    },
    {} as Record<string, BenchmarkResult[]>,
  );

  // Overall compression comparison
  console.log("\n🔄 Overall Performance Comparison:");
  boxplot(() => {
    Object.entries(compressionGroups).forEach(([compression, compResults]) => {
      if (compResults.length > 0) {
        bench(`${compression} (${compResults.length} runs)`, async () => {
          const randomResult =
            compResults[Math.floor(Math.random() * compResults.length)];
          await benchmarkRedirect(randomResult.url);
        });
      }
    });
  });

  await run();

  // Detailed breakdown by compression and dataset size
  Object.entries(compressionGroups)
    .sort(([, a], [, b]) => {
      const avgA = a.reduce((sum, r) => sum + r.timing, 0) / a.length;
      const avgB = b.reduce((sum, r) => sum + r.timing, 0) / b.length;
      return avgA - avgB;
    })
    .forEach(([compression, compResults]) => {
      console.log(
        `\n📈 ${compression} Compression - Performance by Dataset Size:`,
      );

      const datasetGroups = compResults.reduce(
        (acc, result) => {
          if (!acc[result.datasetSize]) acc[result.datasetSize] = [];
          acc[result.datasetSize].push(result.timing);
          return acc;
        },
        {} as Record<number, number[]>,
      );

      // Boxplot for this compression across dataset sizes
      boxplot(() => {
        Object.entries(datasetGroups)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .forEach(([datasetSize, timings]) => {
            if (timings.length > 0) {
              bench(
                `${datasetSize} bangs (${timings.length} runs)`,
                async () => {
                  const testCasesForSize = compResults.filter(
                    (r) => r.datasetSize === parseInt(datasetSize),
                  );
                  const randomTest =
                    testCasesForSize[
                      Math.floor(Math.random() * testCasesForSize.length)
                    ];
                  await benchmarkRedirect(randomTest.url);
                },
              );
            }
          });
      });

      // Statistical summary
      console.log(`\nStatistical Summary for ${compression}:`);
      Object.entries(datasetGroups)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([datasetSize, timings]) => {
          const stats = calculateStats(timings);
          if (stats) {
            console.log(
              `  ${datasetSize} bangs (${stats.count} runs): avg=${stats.avg.toFixed(3)}ms, median=${stats.median.toFixed(3)}ms, p75=${stats.p75.toFixed(3)}ms, min=${stats.min.toFixed(3)}ms, max=${stats.max.toFixed(3)}ms`,
            );
          }
        });

      // Overall stats for this compression
      const allTimings = compResults.map((r) => r.timing);
      const overallStats = calculateStats(allTimings);
      if (overallStats) {
        console.log(
          `  Overall ${compression} (${overallStats.count} runs): avg=${overallStats.avg.toFixed(3)}ms, median=${overallStats.median.toFixed(3)}ms`,
        );
      }
    });
}

// Display results grouped by dataset size
async function displayResultsByDatasetSize(results: BenchmarkResult[]) {
  console.log("" + "=".repeat(80));
  console.log("� RESULTS BY DATASET SIZE");
  console.log("=".repeat(80));

  const sizeGroups = results.reduce(
    (acc, result) => {
      if (!acc[result.datasetSize]) acc[result.datasetSize] = [];
      acc[result.datasetSize].push(result);
      return acc;
    },
    {} as Record<number, BenchmarkResult[]>,
  );

  // Dataset size comparison
  console.log("� Performance by Dataset Size:");
  boxplot(() => {
    Object.entries(sizeGroups)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([size, sizeResults]) => {
        if (sizeResults.length > 0) {
          bench(`${size} bangs (${sizeResults.length} runs)`, async () => {
            const randomResult =
              sizeResults[Math.floor(Math.random() * sizeResults.length)];
            await benchmarkRedirect(randomResult.url);
          });
        }
      });
  });

  await run();

  // Additional analysis functions
  function displayOverallInsights(results: BenchmarkResult[]) {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 OVERALL PERFORMANCE INSIGHTS");
    console.log("=".repeat(80));

    // Overall compression performance
    const compressionGroups = results.reduce(
      (acc, result) => {
        if (!acc[result.compression]) acc[result.compression] = [];
        acc[result.compression].push(result.timing);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    const compressionStats = Object.entries(compressionGroups)
      .map(([compression, timings]) => ({
        compression,
        ...calculateStats(timings)!,
      }))
      .sort((a, b) => a.avg - b.avg);

    console.log(
      `\nOverall fastest compression: ${compressionStats[0].compression} (${compressionStats[0].avg.toFixed(3)}ms avg, ${compressionStats[0].count} runs)`,
    );
    console.log(
      `Overall slowest compression: ${compressionStats[compressionStats.length - 1].compression} (${compressionStats[compressionStats.length - 1].avg.toFixed(3)}ms avg, ${compressionStats[compressionStats.length - 1].count} runs)`,
    );

    // Scaling analysis
    console.log(`\nScaling Analysis:`);
    compressionStats.forEach(({ compression }) => {
      const datasetSizes = [
        ...new Set(
          results
            .filter((r) => r.compression === compression)
            .map((r) => r.datasetSize),
        ),
      ].sort((a, b) => a - b);

      if (datasetSizes.length > 1) {
        const smallestSizeTimings = results
          .filter(
            (r) =>
              r.compression === compression &&
              r.datasetSize === datasetSizes[0],
          )
          .map((r) => r.timing);
        const largestSizeTimings = results
          .filter(
            (r) =>
              r.compression === compression &&
              r.datasetSize === datasetSizes[datasetSizes.length - 1],
          )
          .map((r) => r.timing);

        const smallestAvg = calculateStats(smallestSizeTimings)?.avg || 0;
        const largestAvg = calculateStats(largestSizeTimings)?.avg || 0;
        const scalingFactor = largestAvg / smallestAvg;

        console.log(
          `  ${compression}: ${scalingFactor.toFixed(2)}x slower from ${datasetSizes[0]} to ${datasetSizes[datasetSizes.length - 1]} bangs`,
        );
      }
    });

    console.log(`\nTotal benchmark runs: ${results.length}`);
    console.log(`Unique test cases: ${testUrls.length}`);
    console.log(`Runs per test case: ${results.length / testUrls.length}`);
  }

  // Main benchmark execution
  async function runComprehensiveBenchmarks() {
    console.log("🚀 Starting Comprehensive Benchmark Analysis");
    console.log("=".repeat(80));

    // Collect all benchmark data first
    const results = await collectAllBenchmarkData(20); // 20 runs per test case

    // Display results organized by compression method
    displayResultsByCompression(results);

    // Display results organized by dataset size
    displayResultsByDatasetSize(results);

    // Display overall insights
    displayOverallInsights(results);

    console.log("\n" + "=".repeat(80));
    console.log("✅ Comprehensive Benchmark Analysis Complete!");
    console.log("=".repeat(80));
  }

  // Run the comprehensive benchmarks
  runComprehensiveBenchmarks().catch(console.error);
}
