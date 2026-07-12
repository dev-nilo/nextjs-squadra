import type { ReactNode } from "react";
import { Player } from "@/types";
import { CheckCircle2, User as UserIcon } from "lucide-react";
import { User } from "@nextui-org/react";

interface MiniPlayerRowProps {
    player: Player;
    isSelected?: boolean;
    actions?: ReactNode;
    className?: string;
}

export const MiniPlayerRow = ({
    player,
    isSelected = false,
    actions,
    className = "",
}: MiniPlayerRowProps) => (
    <div
        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-content2/30 rounded-lg border border-divider hover:border-primary/50 transition-colors ${className}`}
    >
        {isSelected && (
            <CheckCircle2
                size={20}
                className="text-primary shrink-0"
                fill="currentColor"
                aria-hidden="true"
            />
        )}
        <User
            name={player.name}
            description={<span className="font-bold text-primary">{player.position}</span>}
            avatarProps={{
                src: player.image || undefined,
                icon: !player.image ? <UserIcon size={20} /> : undefined,
                size: "sm",
                isBordered: true,
                color: "primary",
            }}
            classNames={{
                base: "flex-1 min-w-0 justify-start",
                name: "font-bold text-foreground truncate",
                description: "text-xs",
            }}
        />
        <div className="text-lg sm:text-xl font-black text-default-700 shrink-0 tabular-nums">
            {player.rating}
        </div>
        {actions}
    </div>
);
