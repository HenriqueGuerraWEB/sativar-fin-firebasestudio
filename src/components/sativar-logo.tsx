
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

export const SativarLogo = ({ className }: { className?: string }) => (
    <div className="flex items-center gap-2">
        <div className={cn("bg-primary p-1.5 rounded-full", className)}>
            <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
    </div>
);

export const SativarLogoIcon = ({ className }: { className?: string }) => (
     <div className="flex items-center gap-2">
        <div className="bg-primary p-1.5 rounded-full">
            <Bot className={cn("h-5 w-5 text-primary-foreground", className)} />
        </div>
    </div>
);
