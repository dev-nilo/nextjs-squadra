import { Slider } from "@nextui-org/react";
import { getStatColor } from "@/lib/stat-color";

interface StatSliderProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
}

export const StatSlider = ({ label, value, onChange }: StatSliderProps) => (
    <Slider 
        label={label}
        step={1} 
        maxValue={99} 
        minValue={1} 
        value={value}
        onChange={(val) => onChange(val as number)}
        className="w-full"
        size="sm"
        color="primary"
        renderValue={({ children, ...props }) => (
            <output {...props} className={getStatColor(value)}>
                {children}
            </output>
        )}
    />
);
