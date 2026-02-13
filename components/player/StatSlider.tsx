import { getStatColor } from "@/lib/player-utils";

interface StatSliderProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
}

export const StatSlider = ({ label, value, onChange }: StatSliderProps) => (
    <div className="flex flex-col space-y-1">
        <div className="flex justify-between text-xs font-bold tracking-wider text-muted-foreground">
            <span>{label}</span>
            <span className={getStatColor(value)}>{value}</span>
        </div>
        <input
            type="range"
            min="1"
            max="99"
            value={value}
            onChange={(e) => onChange(Number.parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/90 transition-all"
        />
    </div>
);
