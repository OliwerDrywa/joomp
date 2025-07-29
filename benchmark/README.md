# Benchmarking Guide

This project uses [Playwright](https://playwright.dev/) for browser-based performance testing.

## Unified Benchmark

**File:** `benchmark/browser.ts`  
**Command:** `bun run benchmark`

Tests real browser performance by launching the actual application with compressed bang data from the **top 100 most popular bangs** and measuring the time until `window.location.replace` is called.

### What It Tests

- **Uses top100.json**: Tests with the 100 most popular and reliable bang shortcuts
- **Measures redirect initiation time**: Captures timing until `window.location.replace` is called, not full redirect completion
- **Multiple dataset sizes**: 10, 20, 50, 100 bangs from the top100 list
- **All compression methods**: None, Base64, LZString, Gzip
- **Real browser environment**: Uses Playwright with Chromium for accurate performance testing

### Test Configuration

#### Dataset Sizes

- **10 bangs**: Small dataset for quick testing
- **20 bangs**: Medium dataset for comparison analysis
- **50 bangs**: Typical configuration size
- **100 bangs**: Full top100 dataset

#### Compression Methods

- **None (`>`)**: No compression baseline
- **Base64 (`B`)**: Simple encoding with Unicode support
- **LZString (`L`)**: LZ-based compression
- **Gzip (`G`)**: Gzip compression via pako

#### Performance Measurement

Instead of waiting for full redirects (which can be slow and unreliable), the benchmark measures:

1. **Page load time**: From navigation start to DOMContentLoaded
2. **Processing time**: Time to decompress data and process bang lookup
3. **Redirect initiation**: Time until `window.location.replace()` is called

This provides consistent, fast measurements while still testing the complete application pipeline.

### Key Benefits

1. **Consistent Results**: Using top100 bangs ensures reliable, fast-responding destinations
2. **Accurate Timing**: Measures actual application performance, not network latency
3. **Comprehensive Coverage**: Tests all compression methods and dataset sizes
4. **Fast Execution**: Completes quickly by not waiting for full redirects

## Usage

### Running the Benchmark

```bash
# Start the development server (required)
bun run dev &

# Run the unified benchmark
bun run benchmark
```

### Understanding Results

The benchmark provides three types of analysis:

1. **Individual Tests**: Performance for each compression method and dataset size
2. **Compression Comparison**: Side-by-side comparison of all methods
3. **Dataset Scaling**: How performance scales with bang data size

#### Performance Metrics

- **Redirect Time**: Milliseconds until `window.location.replace()` is called
- **Compression Ratio**: Original size / compressed size
- **Throughput**: Redirects per second (1000 / redirect time)
- **Success Rate**: Percentage of successful measurements

#### Sample Output

```
✓ [None] 20 top100 bangs | "!g test" → 15.2ms
   Data: 1024 → 1024 chars (1.0x compression)
   Bang: g → Google (rank: 1942262)
   Throughput: 65.8 redirects/sec

🏆 COMPRESSION METHOD COMPARISON (20 top100 bangs, "!g test"):
Method | Orig Size | Comp Size | Ratio | Time (ms) | Success
-------|-----------|-----------|-------|-----------|--------
None   | 1024ch    | 1024ch    | 1.0x  | 15.2ms    | ✓
Base64 | 1024ch    | 1368ch    | 0.7x  | 18.5ms    | ✓
LZStr  | 1024ch    | 512ch     | 2.0x  | 45.8ms    | ✓
Gzip   | 1024ch    | 448ch     | 2.3x  | 52.1ms    | ✓

📈 SUMMARY:
   Fastest: None (15.2ms)
   Best Compression: Gzip (2.3x)
   Success Rate: 4/4 methods
```

## Recommendations

### For Maximum Speed

Use **None compression** for fastest redirect times (~15ms), ideal for performance-critical applications.

### For Bandwidth Efficiency

Use **Gzip compression** for best size reduction (~2-3x compression), good for bandwidth-limited scenarios.

### For Balanced Performance

Use **Base64 compression** for moderate compression with good speed, suitable for most applications.

## Technical Implementation

The benchmark uses several techniques for accurate measurement:

1. **Script Injection**: Overrides `window.location.replace` to capture timing
2. **Performance API**: Uses `performance.now()` for high-resolution timing
3. **Promise-based Polling**: Waits for redirect initiation with timeout handling
4. **Sequential Execution**: Runs tests serially to avoid interference

This approach provides reliable, repeatable performance measurements that accurately reflect real-world application behavior.
