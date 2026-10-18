import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { VersionProvider } from '../src/context/VersionContext';
import { VERSION_STORAGE_KEY } from '../src/context/VersionContext.types';
import { GameVersionSelector } from '../src/components/Header/GameVersionSelector';

describe('GameVersionSelector component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <VersionProvider>{children}</VersionProvider>
    </QueryClientProvider>
  );

  it('renders trigger button with default All Games', async () => {
    render(<GameVersionSelector />, { wrapper });

    const trigger = screen.getByRole('button', { name: /select game version/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent(/All Games/i);
  });

  it('opens on click and displays generation grouping', async () => {
    render(<GameVersionSelector />, { wrapper });

    const trigger = screen.getByRole('button', { name: /select game version/i });
    fireEvent.click(trigger);

    // Generation headers should appear
    await waitFor(() => {
      expect(screen.getByText(/Gen I \(Kanto\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Gen II \(Johto\)/i)).toBeInTheDocument();
    });

    // Default option present
    expect(screen.getByText(/All Games \(Default\)/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation: ArrowDown opens dropdown, Escape closes it', async () => {
    render(<GameVersionSelector />, { wrapper });

    const trigger = screen.getByRole('button', { name: /select game version/i });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Arrow down opens menu
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Escape closes menu
    fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('selecting a version persists to localStorage and updates button label', async () => {
    render(<GameVersionSelector />, { wrapper });

    const trigger = screen.getByRole('button', { name: /select game version/i });
    fireEvent.click(trigger);

    // Wait for options including Yellow to load and appear
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const yellowOption = options.find((opt) => opt.textContent?.trim() === 'Yellow');
      expect(yellowOption).toBeDefined();
    });

    const options = screen.getAllByRole('option');
    const yellowOption = options.find((opt) => opt.textContent?.trim() === 'Yellow')!;
    fireEvent.click(yellowOption);

    // Dropdown closes and trigger label reflects Yellow
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select game version/i })).toHaveTextContent(/Yellow/i);
      expect(localStorage.getItem(VERSION_STORAGE_KEY)).toBe('3');
    });
  });

  it('is accessible in closed and open states and passes axe checks', async () => {
    const user = userEvent.setup();
    const { container } = render(<GameVersionSelector />, { wrapper });

    const trigger = screen.getByRole('button', { name: /select game version/i });
    expect(trigger).toBeInTheDocument();

    // Open dropdown and ensure versions query resolves
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
    });

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    // Close and verify closed state passes axe
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
