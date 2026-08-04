"use client";

import { useId } from "react";
import { getStatColor } from "@/lib/stat-color";

interface StatSliderProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
}

export const StatSlider = ({ label, value, onChange }: StatSliderProps) => {
    const inputId = useId();

    return (
        <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
                <label htmlFor={inputId} className="text-foreground">
                    {label}
                </label>
                <output htmlFor={inputId} className={getStatColor(value)}>
                    {value}
                </output>
            </div>
            <input
                id={inputId}
                type="range"
                min={1}
                max={99}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-default-200 accent-primary"
            />
        </div>
    );
};
