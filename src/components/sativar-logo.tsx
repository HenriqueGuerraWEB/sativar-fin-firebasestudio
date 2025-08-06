
import { cn } from "@/lib/utils";
import { Package2 } from "lucide-react";

export const SativarLogo = ({ className }: { className?: string }) => (
    <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
        <Package2 className="h-6 w-6 text-primary" />
        <h1 className={cn("text-lg font-semibold text-foreground", className)}>
            Sativar
        </h1>
    </div>
);

export const SativarLogoIcon = ({ className }: { className?: string }) => (
    <div className="hidden items-center gap-2 group-data-[collapsible=icon]:flex">
        <Package2 className="h-6 w-6 text-primary" />
    </div>
);
