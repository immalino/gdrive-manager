// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { UserMenu } from '../user-menu';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: vi.fn() },
}));

describe('UserMenu component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders trigger button and opens dropdown menu with user info and navigation options', async () => {
    const rootEl = document.createElement('div');
    document.body.appendChild(rootEl);
    const root = createRoot(rootEl);

    flushSync(() => {
      root.render(
        React.createElement(UserMenu, { user: { name: 'John Doe', email: 'john@example.com' } }),
      );
    });

    const trigger = document.querySelector(
      'button[data-slot="dropdown-menu-trigger"]',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('John Doe');

    // Click trigger to open menu
    flushSync(() => {
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    await new Promise((r) => setTimeout(r, 50));

    const content = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(content).not.toBeNull();
    expect(content?.textContent).toContain('John Doe');
    expect(content?.textContent).toContain('john@example.com');
    expect(content?.textContent).toContain('Accounts');
    expect(content?.textContent).toContain('Settings');
    expect(content?.textContent).toContain('Sign out');

    // Find and click Accounts item
    const items = document.querySelectorAll('[data-slot="dropdown-menu-item"]');
    const accountsItem = Array.from(items).find((el) =>
      el.textContent?.includes('Accounts'),
    ) as HTMLElement;
    expect(accountsItem).toBeDefined();

    flushSync(() => {
      accountsItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/accounts');
  });
});
