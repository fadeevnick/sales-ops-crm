import { useEffect } from "react";

/**
 * Shared chrome for modals and drawers:
 *  - closes on Escape (unless `disabled`, e.g. while submitting)
 *  - locks body scroll while mounted, restoring the previous value on unmount
 *
 * Use alongside a scrim `onClick={onClose}` for click-outside.
 */
export function useModalChrome(onClose: () => void, options?: { disabled?: boolean }) {
  const disabled = options?.disabled ?? false;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disabled) onClose();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, disabled]);
}
