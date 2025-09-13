
import { cn } from "@/lib/utils";
import { Rocket } from "lucide-react";

export const SativarLogo = ({ className }: { className?: string }) => (
    <div className="flex items-center gap-2">
        <div className="bg-primary p-1.5 rounded-lg">
            <Rocket className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className={cn("text-lg font-bold text-foreground", className)}>
            Sativar
        </h1>
    </div>
);

export const SativarLogoIcon = ({ className }: { className?: string }) => (
     <div className="flex items-center gap-2">
        <div className="bg-primary p-1.5 rounded-lg">
            <Rocket className={cn("h-5 w-5 text-primary-foreground", className)} />
        </div>
    </div>
);
