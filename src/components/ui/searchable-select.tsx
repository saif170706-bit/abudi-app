'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

import { Button } from '@/components/ui/button';

export type SelectItem = {
  id: string;
  label: string;
  keywords?: string[];
  subLabel?: string;
};

type SearchableSelectProps = {
  value?: string | null;
  onChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  emptyText?: string;
  buttonClassName?: string;
  popoverClassName?: string;
};

export function SearchableSelect({
  value,
  onChange,
  items,
  placeholder = 'Vælg…',
  emptyText = 'Ingen resultater',
  buttonClassName,
  popoverClassName,
}: SearchableSelectProps) {
  const { tGlobal } = useGlobalTranslation();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // The portal target is the nearest [role="dialog"] ancestor.
  // This keeps us inside Radix Dialog's focus trap (not inert),
  // but OUTSIDE any glass-card that has backdrop-filter/isolation
  // which would mangle position:fixed coordinates.
  // Falls back to document.body when used outside a dialog.
  const portalTarget = React.useRef<Element | null>(null);
  React.useEffect(() => {
    if (buttonRef.current) {
      portalTarget.current =
        buttonRef.current.closest('[role="dialog"]') ?? document.body;
    }
  }, []);

  const selected = items.find((i) => i.id === value);

  const filteredItems = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((item) => {
      const hay = [item.id, item.label, item.subLabel || '', ...(item.keywords || [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [items, search]);

  const handleOpen = () => {
    if (buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen((prev) => !prev);
  };

  const handleClose = React.useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  // Keep position updated on scroll/resize
  React.useEffect(() => {
    if (!open) return;
    const update = () => {
      if (buttonRef.current) {
        setRect(buttonRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Close on outside click — capture phase to beat Radix
  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-searchable-dropdown]')) return;
      handleClose();
    };
    document.addEventListener('pointerdown', onPointer, { capture: true });
    return () => document.removeEventListener('pointerdown', onPointer, { capture: true });
  }, [open, handleClose]);

  const dropdownContent = open && rect && portalTarget.current
    ? (() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Horizontal: symmetric left/right margin derived from button's left offset
        const dropL = rect.left;
        const dropW = vw - 2 * rect.left;

        // Vertical: open downward if there's room, otherwise open upward
        const dropdownHeight = 340; // approx: search bar + list
        const spaceBelow = vh - rect.bottom;
        const openUpward = spaceBelow < dropdownHeight && rect.top > spaceBelow;

        const verticalStyle = openUpward
          ? { bottom: vh - rect.top + 4 }   // anchor to button's top, grow upward
          : { top: rect.bottom + 4 };        // anchor to button's bottom, grow downward

        return createPortal(
          <div
            data-searchable-dropdown
            style={{
              position: 'fixed',
              ...verticalStyle,
              left: dropL,
              width: dropW,
              zIndex: 9999,
            }}
            className={cn(
              'overflow-hidden rounded-xl border bg-white shadow-xl dark:bg-popover',
              popoverClassName
            )}
          >
            <div className="border-b bg-white px-3 py-2 dark:bg-popover flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 opacity-40 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tGlobal('Søg...')}
                className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground h-10"
              />
            </div>

            <div
              style={{
                height: '18rem',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties}
            >
              <Command shouldFilter={false}>
                <CommandList>
                  {filteredItems.length === 0 && (
                    <CommandEmpty className="py-6 text-sm text-muted-foreground">
                      {emptyText}
                    </CommandEmpty>
                  )}
                  <CommandGroup>
                    {filteredItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          onChange(item.id === value ? '' : item.id);
                          handleClose();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            value === item.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{item.label}</span>
                          {item.subLabel && (
                            <span className="text-xs text-muted-foreground">
                              {item.subLabel}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>,
          portalTarget.current
        );
      })()
    : null;

  return (
    <>
      <div className="relative w-full">
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onClick={handleOpen}
          className={cn(
            'w-full justify-between h-12 rounded-xl border-border bg-muted text-[16px]',
            buttonClassName
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
      {dropdownContent}
    </>
  );
}

type Surah = {
  number: number;
  english: string;
  arabic: string;
};

export function SurahSelect({
  value,
  onChange,
  surahs,
  placeholder = 'Vælg surah…',
}: {
  value?: string | null;
  onChange: (surahNumber: string) => void;
  surahs: Surah[];
  placeholder?: string;
}) {
  const items: SelectItem[] = React.useMemo(
    () =>
      surahs.map((s) => ({
        id: String(s.number),
        label: `${s.number}. ${s.english} — ${s.arabic}`,
        keywords: [
          String(s.number),
          s.english,
          s.english.replace(/-/g, ' ').toLowerCase(),
          s.arabic,
        ],
      })),
    [surahs]
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      items={items}
      placeholder={placeholder}
    />
  );
}