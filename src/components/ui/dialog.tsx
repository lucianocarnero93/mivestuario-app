import type { ComponentProps, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  footer,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/70" />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DialogPrimitive.Content
          className={cn(
            "pointer-events-auto flex min-h-0 max-h-full w-[min(100%,440px)] flex-col rounded-xl shadow-lg",
            className,
          )}
          {...props}
        >
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
            <div className="relative flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
              <DialogPrimitive.Title className="font-display text-lg font-semibold tracking-tight text-fg">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="grid size-11 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg">
                <X className="size-4" />
              </DialogPrimitive.Close>
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            </div>
            <div className={cn("min-h-0 flex-auto overflow-y-auto overscroll-contain px-5", footer ? "pb-3" : "pb-5")}>
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-border bg-surface px-5 py-3">{footer}</div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}
