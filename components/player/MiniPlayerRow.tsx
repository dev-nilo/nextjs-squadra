import { Player } from "@/types";
import { User } from "lucide-react";

export const MiniPlayerRow = ({ player }: { player: Player }) => (
    <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-card border border-border shrink-0">
            {player.image ? (
                <img
                    src={player.image || "/placeholder.svg"}
                    alt={player.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <User size={20} />
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="font-bold text-foreground truncate">{player.name}</div>
            <div className="text-xs text-accent font-bold">{player.position}</div>
        </div>
        <div className="text-xl font-black text-secondary-foreground">
            {player.rating}
        </div>
    </div>
);
