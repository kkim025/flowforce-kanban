import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Drawer from './Drawer';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, onClick, className, ...props }: any) => (
            <div onClick={onClick} className={className} {...props}>
                {children}
            </div>
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Drawer', () => {
    it('should not render when isOpen is false', () => {
        render(
            <Drawer isOpen={false} onClose={() => {}}>
                <div>Drawer Content</div>
            </Drawer>
        );
        expect(screen.queryByText('Drawer Content')).not.toBeInTheDocument();
    });

    it('should render children when isOpen is true', () => {
        render(
            <Drawer isOpen={true} onClose={() => {}}>
                <div>Drawer Content</div>
            </Drawer>
        );
        expect(screen.getByText('Drawer Content')).toBeInTheDocument();
    });

    it('should call onClose when clicking the backdrop', () => {
        const onClose = vi.fn();
        render(
            <Drawer isOpen={true} onClose={onClose}>
                <div>Drawer Content</div>
            </Drawer>
        );
        
        const backdrop = screen.getByTestId('drawer-backdrop');
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when pressing Escape key', () => {
        const onClose = vi.fn();
        render(
            <Drawer isOpen={true} onClose={onClose}>
                <div>Drawer Content</div>
            </Drawer>
        );
        
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('should set body overflow to hidden when open', () => {
        render(
            <Drawer isOpen={true} onClose={() => {}}>
                <div>Drawer Content</div>
            </Drawer>
        );
        expect(document.body.style.overflow).toBe('hidden');
    });

    it('should reset body overflow when closed', () => {
        const { unmount } = render(
            <Drawer isOpen={true} onClose={() => {}}>
                <div>Drawer Content</div>
            </Drawer>
        );
        unmount();
        expect(document.body.style.overflow).toBe('unset');
    });
});
