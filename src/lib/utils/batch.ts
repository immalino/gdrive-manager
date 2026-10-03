export interface BatchResult<T, R> {
  item: T;
  success: boolean;
  result?: R;
  error?: string;
}

export async function runBatchPool<T, R>(
  items: T[],
  concurrency: number,
  workerFn: (item: T) => Promise<R>,
): Promise<Array<BatchResult<T, R>>> {
  const results: Array<BatchResult<T, R>> = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx]!;
      try {
        const res = await workerFn(item);
        results[idx] = { item, success: true, result: res };
      } catch (err: unknown) {
        results[idx] = {
          item,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(pool);
  return results;
}
