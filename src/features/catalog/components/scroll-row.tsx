'use client';

/**
 * A horizontal, snap-scrolling strip. No arrows — the partial next card that
 * peeks at the edge is the affordance that there's more to scroll. Tighter gap
 * below `md`, wider above. Children are the item cells (each sets its own width
 * + `shrink-0 snap-start`).
 */
export function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:gap-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}
