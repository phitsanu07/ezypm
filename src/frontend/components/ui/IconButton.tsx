import type { MouseEventHandler, ReactNode } from "react";

interface IconButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  label: string;
  children: ReactNode;
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  onClick,
  label,
  children,
  title,
  disabled,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`btn-icon${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
