import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { useView } from '@/context/ViewContext';

/**
 * FullscreenSheet is a specialized dialog that occupies the entire viewport.
 * Optimized for immersive mobile experiences.
 */
export function FullscreenSheet({
  open,
  onOpenChange,
  title,
  rightSlot,
  children,
  contentClassName,
  headerClassName,
  containerClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  rightSlot?: React.ReactNode; 
  children: React.ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  containerClassName?: string;
}) {
  const { isSubView, setIsSubView } = useView();
  const wasOpenRef = React.useRef(false);
  const wasSubViewOnEntryRef = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      // Capture if we were already in a subview before this sheet opened
      if (!wasOpenRef.current) {
        wasSubViewOnEntryRef.current = isSubView;
      }
      
      setIsSubView(true);
      wasOpenRef.current = true;
      
      // Ensure body is locked immediately
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      
      // Small timeout to prevent flashes
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        
        // Only revert to false if the page wasn't ALREADY a subview 
        // before we opened the sheet.
        if (!wasSubViewOnEntryRef.current) {
          setIsSubView(false);
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    return () => {
      // Cleanup on unmount only if it was open
      if (wasOpenRef.current) {
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        if (!wasSubViewOnEntryRef.current) {
          setIsSubView(false);
        }
      }
    };
  }, [open, setIsSubView, isSubView]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        {open && (
          <>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" />

            <DialogPrimitive.Content 
              className={cn(
                'fixed inset-x-0 bottom-0 z-[200]',
                'h-[100dvh] w-screen',
                'bg-card outline-none',
                'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
                'overflow-hidden flex flex-col',
                'transition-transform duration-300 ease-out translate-y-0',
                contentClassName
              )}
            >
              {/* Vigtigt: DialogTitle er påkrævet for tilgængelighed */}
              <DialogPrimitive.Title className="sr-only">
                {typeof title === 'string' ? title : 'Vindue'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Indhold af vinduet
              </DialogPrimitive.Description>

              {(title || rightSlot) && (
                <div className={cn(
                  "sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border flex-shrink-0",
                  headerClassName
                )}>
                  <div className="h-14 px-4 flex items-center justify-between">
                    <div className="min-w-0">
                      {title && (
                        <div className="text-lg font-bold truncate">
                          {title}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">{rightSlot}</div>
                  </div>
                </div>
              )}

              <div className={cn(
                "flex-grow overflow-y-auto overflow-x-visible overscroll-contain bg-muted",
                containerClassName
              )}>
                {children}
              </div>
            </DialogPrimitive.Content>
          </>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
