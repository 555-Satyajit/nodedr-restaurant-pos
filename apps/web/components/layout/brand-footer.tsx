import { LifeBuoy } from "lucide-react";

export function BrandFooter({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="border-t border-white/10 px-1 py-2 text-center shrink-0">
        <span className="text-[10px] font-medium leading-tight text-white/70">KF</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/10 px-4 py-2.5 shrink-0">
      <div className="text-left text-[11px] font-medium leading-tight text-white/60">
        KitchFlow POS
      </div>
      <a
        href="https://github.com/Raktim94/nodedr-restaurant-pos"
        target="_blank"
        rel="noopener noreferrer"
        className="text-left text-[10px] text-white/40 hover:text-white/70 hover:underline"
      >
        Powered by OrderRestro Engine
      </a>
    </div>
  );
}
