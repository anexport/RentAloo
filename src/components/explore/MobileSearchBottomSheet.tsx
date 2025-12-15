import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SnapPoint = "closed" | "peek" | "full";

type Props = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  peekContent?: React.ReactNode;
};

const CLOSED_HEIGHT_PX = 0;
const PEEK_HEIGHT_PX = 64;
const FULL_HEIGHT_RATIO = 0.85;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getViewportHeightPx = () =>
  window.visualViewport?.height ?? window.innerHeight;

const MobileSearchBottomSheet = ({
  children,
  isOpen,
  onClose,
  className,
  peekContent,
}: Props) => {
  const contentId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  const [snap, setSnap] = useState<SnapPoint>("full");
  const snapRef = useRef<SnapPoint>("full");

  const metricsRef = useRef<{ closed: number; peek: number; full: number }>({
    closed: CLOSED_HEIGHT_PX,
    peek: PEEK_HEIGHT_PX,
    full: Math.round(getViewportHeightPx() * FULL_HEIGHT_RATIO),
  });

  const visibleHeightRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number | null;
    startY: number;
    startVisibleHeight: number;
    didMove: boolean;
  }>({ pointerId: null, startY: 0, startVisibleHeight: 0, didMove: false });

  const applyVisibleHeight = useCallback(
    (visibleHeight: number, opts?: { animate?: boolean }) => {
      const sheet = sheetRef.current;
      if (!sheet) return;

      const { closed, full } = metricsRef.current;
      const nextVisible = clamp(visibleHeight, closed, full);
      visibleHeightRef.current = nextVisible;

      sheet.style.height = `${full}px`;
      sheet.style.willChange = "transform";
      sheet.style.transition =
        opts?.animate === false ? "none" : "transform 200ms ease";
      sheet.style.transform = `translate3d(0, ${full - nextVisible}px, 0)`;
    },
    []
  );

  const snapTo = useCallback(
    (nextSnap: SnapPoint, opts?: { animate?: boolean }) => {
      const { closed, peek, full } = metricsRef.current;
      const targetHeight =
        nextSnap === "closed" ? closed :
        nextSnap === "peek" ? peek : full;

      snapRef.current = nextSnap;
      setSnap(nextSnap);
      applyVisibleHeight(targetHeight, opts);
      
      if (nextSnap === "closed") {
        onClose();
      }
    },
    [applyVisibleHeight, onClose]
  );

  const recomputeMetrics = useCallback(() => {
    const viewportHeight = getViewportHeightPx();
    const closed = CLOSED_HEIGHT_PX;
    const peek = PEEK_HEIGHT_PX;
    const full = Math.round(viewportHeight * FULL_HEIGHT_RATIO);

    metricsRef.current = { closed, peek, full };

    const currentSnap = snapRef.current;
    const targetHeight =
      currentSnap === "closed" ? closed :
      currentSnap === "peek" ? peek : full;
    applyVisibleHeight(targetHeight, { animate: false });
  }, [applyVisibleHeight]);

  // Sync internal snap with isOpen prop
  useEffect(() => {
    if (isOpen && snapRef.current === "closed") {
      snapTo("full");
    } else if (!isOpen && snapRef.current !== "closed") {
      snapTo("closed", { animate: false });
    }
  }, [isOpen, snapTo]);

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  useLayoutEffect(() => {
    recomputeMetrics();
  }, [recomputeMetrics]);

  useEffect(() => {
    const handleResize = () => recomputeMetrics();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [recomputeMetrics]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startVisibleHeight:
        visibleHeightRef.current || metricsRef.current[snapRef.current],
      didMove: false,
    };

    const sheet = sheetRef.current;
    if (sheet) sheet.style.transition = "none";

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > 6) dragRef.current.didMove = true;

    const { closed, full } = metricsRef.current;
    const nextVisible = clamp(
      dragRef.current.startVisibleHeight - deltaY,
      closed,
      full
    );
    applyVisibleHeight(nextVisible, { animate: false });
  };

  const finishDragOrToggle = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.pointerId = null;

    const { closed, peek, full } = metricsRef.current;
    const currentVisible = visibleHeightRef.current;

    if (!dragRef.current.didMove) {
      // Toggle: closed→full, peek→full, full→peek
      const nextSnap =
        snapRef.current === "closed"
          ? "full"
          : snapRef.current === "peek"
          ? "full"
          : "peek";
      snapTo(nextSnap);
      return;
    }

    const candidates: Array<{ snap: SnapPoint; height: number }> = [
      { snap: "closed", height: closed },
      { snap: "peek", height: peek },
      { snap: "full", height: full },
    ];

    let nearest = candidates[0];
    for (const candidate of candidates) {
      if (
        Math.abs(candidate.height - currentVisible) <
        Math.abs(nearest.height - currentVisible)
      ) {
        nearest = candidate;
      }
    }

    snapTo(nearest.snap);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const nextSnap =
      snapRef.current === "closed"
        ? "full"
        : snapRef.current === "peek"
        ? "full"
        : "peek";
    snapTo(nextSnap);
  };

  if (!isOpen && snap === "closed") return null;

  return (
    <>
      {/* Backdrop overlay */}
      {snap !== "closed" && snap !== "peek" && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 animate-in fade-in-0"
          onClick={() => snapTo("peek")}
        />
      )}
      <div
        ref={sheetRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-lg flex flex-col",
          className
        )}
      >
        <button
          ref={handleRef}
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDragOrToggle}
          onPointerCancel={finishDragOrToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-shrink-0 touch-none select-none flex flex-col items-center",
            snap === "closed" ? "h-4 justify-center" :
            snap === "peek" ? "h-16 justify-center" : "pt-3 pb-2"
          )}
          aria-label="Drag to resize"
          aria-controls={contentId}
          aria-expanded={snap === "full"}
        >
          <div className={cn(
            "rounded-full bg-muted-foreground/30",
            snap === "closed" ? "w-16 h-1" : "w-12 h-1.5"
          )} />
          {snap === "peek" && peekContent}
        </button>

        <div
          id={contentId}
          className={cn(
            "flex-1 min-h-0 overflow-hidden flex flex-col",
            snap !== "full" && "pointer-events-none"
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default MobileSearchBottomSheet;
