import { cn } from "@/lib/utils";

export const SativarLogo = ({ className }: { className?: string }) => (
  <h1 className={cn("font-headline text-2xl font-bold text-primary", className)}>
    Sativar
  </h1>
);
