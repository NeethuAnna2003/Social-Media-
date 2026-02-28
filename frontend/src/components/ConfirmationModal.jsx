import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ConfirmationModal
 * Reusable, accessible confirmation dialog with focus trap, ESC/overlay close, and smooth animations.
 *
 * Props:
 * - isOpen: boolean
 * - title: string
 * - message: string
 * - confirmText?: string (default 'Yes')
 * - cancelText?: string (default 'Cancel')
 * - onConfirm: () => void
 * - onCancel: () => void
 * - confirmLoading?: boolean (disables buttons and shows spinner)
 */
export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmLoading = false,
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Mount/unmount animation flag
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // Save and restore focus, lock scroll
  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element in the dialog
    const focusables = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
      if (e.key === 'Tab') {
        // Simple focus trap
        const nodes = Array.from(
          dialogRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) || []
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus to last focused element
      if (lastFocusedRef.current && lastFocusedRef.current.focus) {
        try { lastFocusedRef.current.focus(); } catch (_) {}
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen && !mounted) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onCancel?.();
    }
  };

  const modal = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className={`bg-white rounded-2xl w-full max-w-sm mx-3 p-6 shadow-2xl transform transition-transform duration-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={confirmLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow inline-flex items-center gap-2 disabled:opacity-50"
            disabled={confirmLoading}
          >
            {confirmLoading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
