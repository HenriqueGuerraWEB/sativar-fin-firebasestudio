import { cn } from "@/lib/utils";

export const SativarLogo = ({ className }: { className?: string }) => (
  <h1 className={cn("text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden", className)}>
    Sativar
  </h1>
);
