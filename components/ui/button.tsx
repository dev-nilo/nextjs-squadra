"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonColor = "primary" | "secondary" | "danger" | "default";
type ButtonVariant = "solid" | "flat" | "light";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  isIconOnly?: boolean;
  radius?: "full";
  startContent?: React.ReactNode;
}

// `active:` is the pressed state a phone shows (hover only exists with a mouse).
const COLOR_STYLES: Record<ButtonColor, Record<ButtonVariant, string>> = {
  primary: {
    solid: "bg-primary text-primary-foreground hover:bg-primary-600 active:bg-primary-700",
    flat: "bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25",
    light: "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/15",
  },
  secondary: {
    solid: "bg-secondary text-secondary-foreground hover:opacity-90 active:opacity-80",
    flat: "bg-secondary/10 text-secondary hover:bg-secondary/20 active:bg-secondary/25",
    light: "bg-transparent text-secondary hover:bg-secondary/10 active:bg-secondary/15",
  },
  danger: {
    solid: "bg-danger text-danger-foreground hover:opacity-90 active:opacity-80",
    flat: "bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/25",
    light: "bg-transparent text-danger hover:bg-danger/10 active:bg-danger/15",
  },
  default: {
    solid: "bg-default text-default-foreground hover:opacity-90 active:opacity-80",
    flat: "bg-default-100 text-foreground hover:bg-default-200 active:bg-default-300",
    light: "bg-transparent text-foreground hover:bg-default-100 active:bg-default-200",
  },
};

// A small button keeps its look, but its tap area reaches 44px (the pseudo-element).
const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const ICON_ONLY_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 w-8 after:absolute after:-inset-1.5 after:content-['']",
  md: "h-10 w-10 after:absolute after:-inset-0.5 after:content-['']",
  lg: "h-12 w-12",
};

const SPINNER_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    color = "default",
    variant = "solid",
    size = "md",
    isLoading = false,
    isDisabled = false,
    isIconOnly = false,
    radius,
    startContent,
    className = "",
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  const spinner = <Loader2 size={SPINNER_SIZE[size]} className="animate-spin" />;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled || disabled || isLoading}
      className={`relative inline-flex shrink-0 items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        isIconOnly ? ICON_ONLY_SIZE[size] : SIZE_STYLES[size]
      } ${radius === "full" ? "rounded-full" : "rounded-xl"} ${COLOR_STYLES[color][variant]} ${className}`}
      {...props}
    >
      {isIconOnly ? (
        isLoading ? spinner : children
      ) : (
        <>
          {isLoading ? spinner : startContent}
          {children}
        </>
      )}
    </button>
  );
});
