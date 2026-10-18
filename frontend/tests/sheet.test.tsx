import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Sheet } from '../src/components/ui/Sheet';

describe('Sheet primitive', () => {
  it('renders content and header when open', () => {
    const onClose = vi.fn();
    render(
      <Sheet isOpen={true} onClose={onClose} title="Test Title" description="Test Description">
        <div data-testid="sheet-content">Hello Sheet</div>
      </Sheet>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    const onClose = vi.fn();
    render(
      <Sheet isOpen={false} onClose={onClose} title="Test Title">
        <div data-testid="sheet-content">Hello Sheet</div>
      </Sheet>
    );

    expect(screen.queryByTestId('sheet-content')).not.toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Sheet isOpen={true} onClose={onClose} title="Closable Sheet">
        <div>Content</div>
      </Sheet>
    );

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain('min-h-[44px]');
    expect(closeBtn.className).toContain('min-w-[44px]');

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press (Radix Dialog trap/handler)', () => {
    const onClose = vi.fn();
    render(
      <Sheet isOpen={true} onClose={onClose} title="Escape Sheet">
        <div>Content</div>
      </Sheet>
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('contains safe-area inset classes and responsive bottom-sheet/modal classes', () => {
    render(
      <Sheet isOpen={true} onClose={vi.fn()} title="Styled Sheet">
        <div>Styled Content</div>
      </Sheet>
    );

    const dialog = screen.getByRole('dialog');
    const sheetPanel = (dialog.firstElementChild || dialog) as HTMLElement;
    // Safe area inset padding
    expect(sheetPanel.className).toContain('pb-[max(1rem,env(safe-area-inset-bottom))]');
    // Responsive rounded corners (bottom-sheet below md, centered modal at md+)
    expect(sheetPanel.className).toContain('rounded-t-[2.5rem]');
    expect(sheetPanel.className).toContain('md:rounded-[2rem]');
  });
});
