import { type Component, onCleanup } from "solid-js";

export const Tooltip: Component<{ text: string }> = (props) => {
  let popoverRef: HTMLDivElement | undefined;
  let triggerRef: HTMLSpanElement | undefined;
  let closeTimeout: number | undefined;

  const cancelClose = () => {
    if (closeTimeout !== undefined) {
      clearTimeout(closeTimeout);
      closeTimeout = undefined;
    }
  };

  // Recalculates position based on trigger's current bounding rect in the viewport
  const updatePosition = () => {
    if (popoverRef && triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      popoverRef.style.position = "fixed";
      popoverRef.style.left = `${rect.left + rect.width / 2}px`;
      popoverRef.style.top = `${rect.top - 6}px`;
      popoverRef.style.transform = "translate(-50%, -100%)";
      popoverRef.style.margin = "0";
    }
  };

  const show = () => {
    cancelClose();
    if (popoverRef && triggerRef) {
      try {
        // 1. Show popover in the top layer
        popoverRef.showPopover();

        // 2. Initial position computation
        updatePosition();

        // 3. Register scroll listener on window (using capture to catch nested scrollable divs as well)
        window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
      } catch (e) {
        console.error("HTML Popover error:", e);
      }
    }
  };

  const hide = () => {
    if (popoverRef) {
      try {
        popoverRef.hidePopover();
      } catch (e) {
        // Fallback
      }
    }
    // Clean up scroll listener when hidden
    window.removeEventListener("scroll", updatePosition, { capture: true });
  };

  const scheduleClose = () => {
    cancelClose();
    // 200ms delay gives the user time to move the mouse from the trigger to the tooltip content
    closeTimeout = window.setTimeout(() => {
      hide();
    }, 200);
  };

  onCleanup(() => {
    cancelClose();
    window.removeEventListener("scroll", updatePosition, { capture: true });
    if (popoverRef) {
      try {
        popoverRef.hidePopover();
      } catch (e) { }
    }
  });

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        class="group relative inline-flex items-center justify-center ml-1.5 cursor-help text-slate-400 hover:text-(--orange-500) transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </span>
      {/* 
        We use the {...{ popover: "manual" }} syntax to prevent TypeScript compiler 
        errors since Solid's JSX types might not have native popover attributes declared yet.
      */}
      <div
        ref={popoverRef}
        {...{ popover: "manual" }}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        class="rounded-xl border border-black bg-transparent p-3 text-[12px] font-medium leading-relaxed text-black max-w-xs backdrop-blur-[15px] transition-all pointer-events-auto tooltip"
      >
        {props.text}
      </div>
    </>
  );
};

export default Tooltip;


