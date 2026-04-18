'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';import { Button } from '@/components/ui/button';

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

  const selected = items.find((i) => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-12 rounded-xl border-border bg-muted text-[16px]', 
            buttonClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        portalled={true}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn('w-[--radix-popover-trigger-width] p-0 z-[9999]', popoverClassName)}
        align="start"
      >
        <Command
          filter={(val, search, keywords) => {
            const s = search.trim().toLowerCase();
            if (!s) return 1;

            const hay = [val, ...(keywords || [])].join(' ').toLowerCase();
            return hay.includes(s) ? 1 : 0;
          }}
        >
          <div className="p-2 border-b sticky top-0 bg-popover z-10">
            <CommandInput
              autoFocus={false}
              placeholder={tGlobal("Søg...")}
              className="text-[16px] h-10" 
            />
          </div>

          <CommandList className="h-72 overscroll-contain touch-pan-y">
            <CommandEmpty className="py-6 text-sm text-muted-foreground">
              {emptyText}
            </CommandEmpty>

            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  keywords={item.keywords}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      value === item.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
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
      </PopoverContent>
    </Popover>
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