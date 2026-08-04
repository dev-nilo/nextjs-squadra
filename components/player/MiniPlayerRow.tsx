import type { ReactNode } from "react";
import { Player } from "@/types";
import { CheckCircle2, User as UserIcon } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";

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
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
            <PlayerAvatar
                src={player.image}
                name={player.name}
                icon={!player.image ? <UserIcon size={20} /> : undefined}
                size="sm"
                bordered
            />
            <div className="flex min-w-0 flex-col">
                <p className="truncate font-bold text-foreground">{player.name}</p>
                <p className="text-xs">
                    <span className="font-bold text-primary">{player.position}</span>
                </p>
            </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-default-700 shrink-0 tabular-nums">
            {player.rating}
        </div>
        {actions}
    </div>
);
