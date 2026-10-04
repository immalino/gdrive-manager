import { describe, expect, it, vi } from 'vitest';
import { safe } from '../index';

describe('worker safe runner', () => {
  it('mengeksekusi fungsi berhasil tanpa error', async () => {
    let executed = false;
    await safe('test-task', async () => {
      executed = true;
    });
    expect(executed).toBe(true);
  });

  it('menangkap error dan tidak melempar exception ke luar', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      safe('failing-task', async () => {
        throw new Error('boom');
      }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('[worker] failing-task gagal', 'boom');
    consoleSpy.mockRestore();
  });

  it('updateHeartbeat dapat dipanggil dan menangani eksekusi dengan aman', async () => {
    const { updateHeartbeat } = await import('../index');
    await expect(updateHeartbeat()).resolves.toBeUndefined();
  });
});
