import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ServerStatusNotice } from '../src/components/common/ServerStatusNotice';

describe('ServerStatusNotice component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders offline indicator when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    render(
      <QueryClientProvider client={queryClient}>
        <ServerStatusNotice />
      </QueryClientProvider>
    );

    expect(
      screen.getByText(/You are currently offline\. Showing cached encyclopedia data\./i)
    ).toBeInTheDocument();
  });

  it('displays waking the server notice when request is pending > 3s', async () => {
    // Component that triggers a long pending query
    const SlowComponent = () => {
      useQuery({
        queryKey: ['slow-query'],
        queryFn: () => new Promise(() => {}), // never resolves
      });
      return <div>Slow Component</div>;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <SlowComponent />
        <ServerStatusNotice />
      </QueryClientProvider>
    );

    // Immediately, notice should NOT be visible
    expect(
      screen.queryByText(/Waking the server…/i)
    ).not.toBeInTheDocument();

    // Advance 2.9 seconds - still not visible
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(
      screen.queryByText(/Waking the server…/i)
    ).not.toBeInTheDocument();

    // Advance past 3 seconds - notice appears
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(
      screen.getByText(/Waking the server…/i)
    ).toBeInTheDocument();
  });
});
