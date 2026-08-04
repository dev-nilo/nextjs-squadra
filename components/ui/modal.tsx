"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // e.g. "max-w-md" | "max-w-3xl" | "max-w-5xl"
}

export function Modal({ isOpen, onClose, children, className = "max-w-md" }: ModalProps) {
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
      className="m-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div
        className={`mx-auto flex max-h-[90vh] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl bg-content1 shadow-2xl ${className}`}
      >
        {children}
      </div>
    </dialog>
  );
}

export const ModalHeader = ({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`shrink-0 border-b border-divider px-4 py-4 sm:px-6 ${className}`}>
    {children}
  </div>
);

export const ModalBody = ({
  className = "",
  padded = true,
  children,
}: {
  className?: string;
  padded?: boolean;
  children: React.ReactNode;
}) => (
  <div className={`flex-1 overflow-y-auto ${padded ? "px-4 py-4 sm:px-6" : ""} ${className}`}>
    {children}
  </div>
);

export const ModalFooter = ({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={`flex shrink-0 flex-col-reverse gap-2 border-t border-divider px-4 py-4 sm:flex-row sm:px-6 ${className}`}
  >
    {children}
  </div>
);
