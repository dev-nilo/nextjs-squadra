"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonColor = "primary" | "secondary" | "danger" | "default";
type ButtonVariant = "solid" | "bordered" | "flat" | "light";
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

const COLOR_STYLES: Record<ButtonColor, Record<ButtonVariant, string>> = {
  primary: {
    solid: "bg-primary text-primary-foreground hover:bg-primary-600",
    bordered: "border-2 border-primary text-primary bg-transparent hover:bg-primary/10",
    flat: "bg-primary/10 text-primary hover:bg-primary/20",
    light: "bg-transparent text-primary hover:bg-primary/10",
  },
  secondary: {
    solid: "bg-secondary text-secondary-foreground hover:opacity-90",
    bordered: "border-2 border-secondary text-secondary bg-transparent hover:bg-secondary/10",
    flat: "bg-secondary/10 text-secondary hover:bg-secondary/20",
    light: "bg-transparent text-secondary hover:bg-secondary/10",
  },
  danger: {
    solid: "bg-danger text-danger-foreground hover:opacity-90",
    bordered: "border-2 border-danger text-danger bg-transparent hover:bg-danger/10",
    flat: "bg-danger/10 text-danger hover:bg-danger/20",
    light: "bg-transparent text-danger hover:bg-danger/10",
  },
  default: {
    solid: "bg-default text-default-foreground hover:opacity-90",
    bordered: "border-2 border-default-300 text-foreground bg-transparent hover:bg-default-100",
    flat: "bg-default-100 text-foreground hover:bg-default-200",
    light: "bg-transparent text-foreground hover:bg-default-100",
  },
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const ICON_ONLY_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
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
      className={`inline-flex shrink-0 items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
