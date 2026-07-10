import { Player } from "@/types";
import { User as UserIcon } from "lucide-react";
import { User } from "@nextui-org/react";

export const MiniPlayerRow = ({ player }: { player: Player }) => (
    <div className="flex items-center justify-between p-3 bg-content2/30 rounded-lg border border-divider hover:border-primary/50 transition-colors">
        <User
            name={player.name}
            description={<span className="font-bold text-primary">{player.position}</span>}
            avatarProps={{
                src: player.image || undefined,
                icon: !player.image ? <UserIcon size={20} /> : undefined,
                size: "sm",
                isBordered: true,
                color: "primary"
            }}
            classNames={{
                name: "font-bold text-foreground truncate",
                description: "text-xs"
            }}
        />
        <div className="text-xl font-black text-default-700">
            {player.rating}
        </div>
    </div>
);
