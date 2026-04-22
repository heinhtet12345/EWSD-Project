import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
};

export default function Modal({
  isOpen,
  title,
  description,
  onClose,
  children,
  maxWidthClassName = "max-w-2xl",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ease-out opacity-100"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-center justify-center px-4 py-6">
        <div
          className={`hide-scrollbar relative mx-auto w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out translate-y-0 scale-100 opacity-100`}
        >
          {(title || description) && (
            <div className="mb-5 rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
