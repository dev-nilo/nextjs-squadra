"use client";

import { useState } from "react";

interface PlayerAvatarProps {
    src?: string | null;
    name?: string;
    icon?: React.ReactNode;
    size?: "sm" | "md";
    bordered?: boolean;
    className?: string;
}

const SIZE_STYLES: Record<"sm" | "md", string> = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
};

function getInitials(name?: string) {
    if (!name) return "";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function PlayerAvatar({
    src,
    name,
    icon,
    size = "sm",
    bordered = false,
    className = "",
}: PlayerAvatarProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(src) && !imageFailed;

    return (
        <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-default-100 ${
                bordered ? "ring-2 ring-primary" : ""
            } ${SIZE_STYLES[size]} ${className}`}
        >
            {showImage ? (
                <img
                    src={src!}
                    alt={name || ""}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : icon ? (
                icon
            ) : (
                <span className="font-bold text-default-600">{getInitials(name)}</span>
            )}
        </div>
    );
}
