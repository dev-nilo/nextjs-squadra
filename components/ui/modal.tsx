"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // e.g. "max-w-md" | "max-w-3xl" | "max-w-5xl"
  /**
   * Makes the modal itself the form. Wrapping ModalBody and ModalFooter in a
   * <form> of your own breaks the column: the body stops scrolling and the
   * footer falls off a short screen.
   */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  /** With `onSubmit`: skip the browser's own field checks (the form shows its own). */
  noValidate?: boolean;
}

// dvh, not vh: on a phone the browser's bars and the keyboard take part of the screen.
// Below sm it's a sheet: full width at the bottom, rounded on top, clear of the home
// indicator, sliding up as it opens (the motion answers the tap; none with reduced motion).
const CAIXA =
  "mx-auto flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl bg-content1 shadow-2xl " +
  "max-sm:w-full max-sm:max-w-none max-sm:max-h-[calc(100dvh-2rem)] max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)] " +
  "max-sm:motion-safe:animate-[subir_220ms_cubic-bezier(0.2,0.8,0.2,1)]";

export function Modal({ isOpen, onClose, children, className = "max-w-md", onSubmit, noValidate }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingFromEffect = useRef(false);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) {
      closingFromEffect.current = true;
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, [isOpen]);

  const handleNativeClose = () => {
    if (closingFromEffect.current) {
      closingFromEffect.current = false;
      return;
    }
    onClose();
    // Some modals are mandatory (onClose is a no-op until a real action
    // completes it). If the parent doesn't flip isOpen to false in response,
    // put the dialog back so it stays in sync instead of silently vanishing
    // on ESC/backdrop-click.
    setTimeout(() => {
      if (isOpenRef.current && dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
    }, 0);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleNativeClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="m-auto max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-overlay/50 backdrop:backdrop-blur-sm max-sm:mb-0"
    >
      {onSubmit ? (
        <form noValidate={noValidate} onSubmit={onSubmit} className={`${CAIXA} ${className}`}>
          {children}
        </form>
      ) : (
        <div className={`${CAIXA} ${className}`}>{children}</div>
      )}
    </dialog>
  );
}

export const ModalHeader = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div className={`shrink-0 border-b border-divider px-4 py-4 sm:px-6 ${className}`}>{children}</div>
);

export const ModalBody = ({
  className = "",
  padded = true,
  children,
}: {
  className?: string;
  padded?: boolean;
  children: React.ReactNode;
}) => <div className={`flex-1 overflow-y-auto ${padded ? "px-4 py-4 sm:px-6" : ""} ${className}`}>{children}</div>;

export const ModalFooter = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div
    className={`flex shrink-0 flex-col-reverse gap-2 border-t border-divider px-4 py-4 sm:flex-row sm:px-6 ${className}`}
  >
    {children}
  </div>
);
