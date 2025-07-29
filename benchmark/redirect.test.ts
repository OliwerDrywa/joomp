import { compress, decompress, Compression } from "@/lib/compression";
import { getRedirectUrl } from "@/lib/redirect";
import { stringify, type RedirectData } from "@/lib/parsing";
import { run, bench, group } from "mitata";
import popularBangs from "../pre-processing/top-popular/top200.json" assert { type: "json" };

// Use popular bangs for more realistic performance testing
const totalBangs = popularBangs.length;

// Test scenarios with different data sizes
const testSizes = [10, 20, 50, 100, 200];

const compressionMethods = [
  Compression.None,
  Compression.Base64,
  Compression.LZString,
  Compression.Gzip,
];

// Test queries to simulate realistic usage with evenly distributed bang selection
function createTestQueries(redirectData: RedirectData[]): string[] {
  const allBangs = redirectData.map((r) => r.bangs[0]);

  // Create a deterministic but spread-out selection of bangs for testing
  // This ensures we test across the entire dataset, not just the first few bangs
  const selectedBangs: string[] = [];
  const totalBangs = allBangs.length;

  // Select 5 bangs with even distribution across the dataset
  for (let i = 0; i < 5 && i < totalBangs; i++) {
    const index = Math.floor((i * totalBangs) / 5);
    selectedBangs.push(allBangs[index]);
  }

  return [
    "test query", // no bang
    "javascript tutorial", // no bang
    `!${selectedBangs[0]} nodejs`, // use evenly distributed bang
    `!${selectedBangs[1]} macbook pro`, // use evenly distributed bang
    `!${selectedBangs[2]} quantum computing`, // use evenly distributed bang
    `!${selectedBangs[3] || selectedBangs[0]} funny cats`, // use evenly distributed bang
    `!${selectedBangs[4] || selectedBangs[0]} programming`, // use evenly distributed bang
    "search with spaces and symbols @#$", // no bang
    "very-long-search-query-with-many-words-and-hyphens-to-test-performance", // no bang
    `!${selectedBangs[0]}`, // empty query with bang
  ];
}

function formatLength(length: number): string {
  if (length < 1000) return `${length} chars`;
  if (length < 1000000) return `${(length / 1000).toFixed(1)}K chars`;
  return `${(length / 1000000).toFixed(1)}M chars`;
}

function createBangString(numBangs: number): string {
  // Use popular bangs and sample N entries with even distribution
  const redirectData: RedirectData[] = [];

  // Use a deterministic sampling to ensure consistent results
  const step = Math.floor(totalBangs / numBangs);
  for (let i = 0; i < numBangs && i < totalBangs; i++) {
    const index = (i * step) % totalBangs;
    const bang = popularBangs[index];
    redirectData.push({
      bangs: [bang.t],
      url: bang.u,
    });
  }

  // Use the stringify function to convert to the proper format
  return stringify(redirectData);
}

// Prepare test data and compressed versions
const testData: Record<string, Record<Compression, string>> = {};
const testQueries: Record<string, string[]> = {};

function setupRedirectBenchmarks() {
  // Prepare test data for each size
  for (const size of testSizes) {
    const bangString = createBangString(size);
    testData[size.toString()] = {} as Record<Compression, string>;

    // Create compressed versions for each method
    for (const method of compressionMethods) {
      try {
        testData[size.toString()][method] = compress(bangString, method);
      } catch (error) {
        console.warn(`Failed to compress ${size} bangs with ${method}:`, error);
      }
    }

    // Create test queries for this dataset
    const [decompressed] = decompress(
      testData[size.toString()][Compression.None],
    );
    const allDecompressedBangs = decompressed.split(",").map((row) => {
      const parts = row.split(">");
      return parts[0];
    });

    // Create evenly distributed selection of bangs for test queries
    const selectedBangs: string[] = [];
    const totalDecompressedBangs = allDecompressedBangs.length;

    for (let i = 0; i < 5 && i < totalDecompressedBangs; i++) {
      const index = Math.floor((i * totalDecompressedBangs) / 5);
      selectedBangs.push(allDecompressedBangs[index]);
    }

    testQueries[size.toString()] = createTestQueries(
      selectedBangs.map((bang) => ({ bangs: [bang], url: "test" })),
    );
  }

  // Create benchmark groups for each data size
  for (const size of testSizes) {
    const sizeKey = size.toString();
    const originalLength = createBangString(size).length;

    group(
      `Redirect workflow: ${size} bangs (${formatLength(originalLength)})`,
      () => {
        for (const method of compressionMethods) {
          if (!testData[sizeKey][method]) continue;

          const compressed = testData[sizeKey][method];
          const compressedLength = compressed.length;
          const ratio = originalLength / compressedLength;
          const queries = testQueries[sizeKey];

          bench(`${method} (${ratio.toFixed(1)}x)`, () => {
            // Decompress
            const [decompressed] = decompress(compressed);

            // Test redirect with a random query
            const query = queries[Math.floor(Math.random() * queries.length)];
            try {
              getRedirectUrl(query, decompressed);
            } catch (error) {
              // Some queries might not have valid bangs, that's ok
            }
          });
        }
      },
    );
  }
}

// Setup and run benchmarks
setupRedirectBenchmarks();
run();
