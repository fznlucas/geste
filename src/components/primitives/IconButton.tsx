import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "../brand/Icon";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Required accessible name, e.g. "Cart, 2 items". */
  label: string;
  /** Optional visible count next to the icon (cart). */
  count?: number;
}

/** 44×44 hit area, icon 12 px, optional count in the same 12 px mono. Hover: Stone. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, count, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex min-h-44 min-w-44 items-center justify-center gap-5 text-xs text-fg hover:text-fg-muted",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
      {count !== undefined && count > 0 && (
        <span aria-hidden="true" className="tabular-nums transition-opacity duration-150">
          {count}
        </span>
      )}
    </button>
  );
});
