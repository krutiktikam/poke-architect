import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { ItemBagDrawer } from '../src/components/Items/ItemBagDrawer';
import { getPocketMeta, getItemSpriteUrl } from '../src/components/Items/ItemBagDrawer.utils';
import { VersionProvider } from '../src/context/VersionContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <VersionProvider>{ui}</VersionProvider>
    </QueryClientProvider>
  );
};

describe('ItemBagDrawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('getPocketMeta returns correct labels and icons for all pocket types', () => {
    expect(getPocketMeta(1, 'Misc').label).toBe('Items');
    expect(getPocketMeta(2, 'Medicine').label).toBe('Medicine');
    expect(getPocketMeta(3, 'Pokeballs').label).toBe('Poké Balls');
    expect(getPocketMeta(4, 'Machines').label).toBe('TMs & HMs');
    expect(getPocketMeta(5, 'Berries').label).toBe('Berries');
    expect(getPocketMeta(6, 'Mail').label).toBe('Mail');
    expect(getPocketMeta(7, 'Battle').label).toBe('Battle Items');
    expect(getPocketMeta(8, 'Key').label).toBe('Key Items');
    expect(getPocketMeta(99, 'Custom Pocket').label).toBe('Custom Pocket');
  });

  it('getItemSpriteUrl formats PokéAPI item sprite URLs correctly', () => {
    expect(getItemSpriteUrl('potion', 'Potion')).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png'
    );
    expect(getItemSpriteUrl(null, 'Ultra Ball')).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png'
    );
  });

  it('renders the drawer when isOpen is true with pocket tabs and items', async () => {
    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /trainer bag/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument();

    // Pocket tabs should be rendered
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Items' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Medicine' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Poké Balls' })).toBeInTheDocument();
    });

    // Default pocket (Misc / Items) should show items
    await waitFor(() => {
      expect(screen.getByText(/shoal salt/i)).toBeInTheDocument();
    });
  });

  it('switches pockets when a pocket tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Medicine' })).toBeInTheDocument();
    });

    // Click Medicine pocket tab
    await user.click(screen.getByRole('tab', { name: 'Medicine' }));

    // Medicine items should now be visible (e.g. Hp Up or Protein)
    await waitFor(() => {
      expect(screen.getByText(/hp up/i)).toBeInTheDocument();
    });
  });

  it('filters items by search input query', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search items/i);
    await user.type(searchInput, 'Heart Scale');

    await waitFor(() => {
      expect(screen.getByText(/heart scale/i)).toBeInTheDocument();
      expect(screen.queryByText(/shoal salt/i)).not.toBeInTheDocument();
    });

    // Clear search
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText(/shoal salt/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no items match search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search items/i);
    await user.type(searchInput, 'nonexistentitemxyz');

    await waitFor(() => {
      expect(screen.getByText(/no items found/i)).toBeInTheDocument();
    });
  });

  it('calls onSelectItem and onClose when an item is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={handleClose}
        onSelectItem={handleSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/shoal salt/i)).toBeInTheDocument();
    });

    const itemButton = screen.getByRole('button', { name: /select shoal salt/i });
    await user.click(itemButton);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Shoal Salt',
      })
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it('highlights the selected item when selectedItemId is provided', async () => {
    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedItemId={70} // Shoal Salt is id 70
      />
    );

    await waitFor(() => {
      const selectedItem = screen.getByRole('button', { name: /select shoal salt/i });
      expect(selectedItem).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('is accessible in browse mode and passes axe accessibility checks', async () => {
    const { container } = renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/shoal salt/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('is accessible in select mode and passes axe accessibility checks', async () => {
    const { container } = renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
        onSelectItem={vi.fn()}
        selectedItemId={70}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/shoal salt/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('filters items when onlyHoldable is true', async () => {
    renderWithProviders(
      <ItemBagDrawer
        isOpen={true}
        onClose={vi.fn()}
        onlyHoldable={true}
      />
    );

    await waitFor(() => {
      // In item_pockets.json fixture, Shoal Salt has is_holdable: false or undefined
      // When onlyHoldable is true, non-holdable items should not be displayed
      expect(screen.queryByText(/^shoal salt$/i)).not.toBeInTheDocument();
    });
  });
});

