"use client";

import { forwardRef, useId } from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  startContent?: React.ReactNode;
  /** Interactive trailing slot (e.g. a show-password toggle). */
  endContent?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_STYLES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 text-sm",
  md: "h-10 text-sm",
  lg: "h-12 text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, isRequired, isDisabled, startContent, endContent, size = "md", className = "", id, required, disabled, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
          {(isRequired || required) && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      <div className="relative">
        {startContent && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-default-400">
            {startContent}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={isRequired || required}
          disabled={isDisabled || disabled}
          className={`w-full rounded-xl border border-default-200 bg-default-100 px-3 text-foreground placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_STYLES[size]} ${startContent ? "pl-9" : ""} ${endContent ? "pr-11" : ""} ${className}`}
          {...props}
        />
        {endContent && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{endContent}</span>
        )}
      </div>
    </div>
  );
});
