'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Palette, Eraser, Type, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string | null | undefined;
  onChange: (html: string) => void;
  placeholder?: string;
};

function sanitizeEmpty(html: string) {
  const trimmed = html
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<div>\s*<\/div>/gi, "")
    .trim();
  return trimmed.length ? html : "";
}

export default function RichTextarea({
  label,
  value,
  onChange,
  placeholder = "Skriv her...",
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>("");
  const [activeColor, setActiveColor] = useState("#22c55e");
  const [isColorActive, setIsColorActive] = useState(false);
  
  // State for active formatting
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  const setHtml = useCallback(
    (html: string) => {
      const normalized = sanitizeEmpty(html);
      lastHtmlRef.current = normalized;
      onChange(normalized);
    },
    [onChange]
  );

  // Sync active states based on cursor position
  const updateActiveStates = useCallback(() => {
    if (typeof document === 'undefined') return;
    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
    
    // Check if the current text color matches our active color
    // This is a bit tricky with execCommand, so we rely on our local toggle for the UI button
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const incoming = value ?? "";
    if (incoming === lastHtmlRef.current) return;

    el.innerHTML = incoming || "";
    lastHtmlRef.current = incoming;
  }, [value]);

  // Command handler
  const cmd = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    updateActiveStates();
    const html = editorRef.current?.innerHTML ?? "";
    setHtml(html);
  };

  const toggleColor = () => {
    const nextState = !isColorActive;
    setIsColorActive(nextState);
    if (nextState) {
      cmd("foreColor", activeColor);
    } else {
      cmd("foreColor", "#000000"); // Reset to black
    }
  };

  const onInput = () => {
    const html = editorRef.current?.innerHTML ?? "";
    setHtml(html);
    updateActiveStates();
  };

  const keepSelection = (e: React.MouseEvent) => {
    // Only prevent default if we are not clicking the actual color input
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      e.preventDefault();
    }
  };

  const isEmpty = React.useMemo(() => {
    const v = (value ?? "").trim();
    return !v || v === "<br>" || v === "<div><br></div>" || v === "<div></div>";
  }, [value]);

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
          {label}
        </div>
      )}

      <div className="group flex flex-col rounded-[28px] border border-border bg-card shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/20 transition-all">
        {/* Modern, Phone-friendly Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-black/[0.03] bg-muted">
          <div className="flex items-center bg-card border border-border rounded-2xl p-1 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl transition-colors",
                isBold ? "bg-black/[0.08] text-primary" : "hover:bg-black/5 text-foreground"
              )}
              onMouseDown={keepSelection}
              onClick={() => cmd("bold")}
              title="Fed"
            >
              <Bold className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl transition-colors",
                isItalic ? "bg-black/[0.08] text-primary" : "hover:bg-black/5 text-foreground"
              )}
              onMouseDown={keepSelection}
              onClick={() => cmd("italic")}
              title="Kursiv"
            >
              <Italic className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center bg-card border border-border rounded-2xl p-1 shadow-sm gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl transition-colors",
                isColorActive ? "bg-black/[0.08]" : "hover:bg-black/5"
              )}
              onMouseDown={keepSelection}
              onClick={toggleColor}
              title={isColorActive ? "Fjern farve" : "Anvend farve"}
            >
              <Palette className="h-5 w-5" style={{ color: activeColor }} />
            </Button>
            
            <div className="relative h-10 w-6 flex items-center justify-center hover:bg-black/5 rounded-xl cursor-pointer overflow-hidden">
              <input
                type="color"
                value={activeColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setActiveColor(newColor);
                  // If color mode is already active, apply the new color immediately
                  if (isColorActive) {
                    cmd("foreColor", newColor);
                  } else {
                    // Activate it automatically if a color is picked
                    setIsColorActive(true);
                    cmd("foreColor", newColor);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer scale-150"
              />
              <ChevronDown className="h-3 w-3 opacity-30 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl bg-card border border-border shadow-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
            onMouseDown={keepSelection}
            onClick={() => {
              cmd("removeFormat");
              cmd("foreColor", "#000000");
              setIsColorActive(false);
            }}
            title="Rens formatering"
          >
            <Eraser className="h-5 w-5" />
          </Button>
        </div>

        {/* Editor Area */}
        <div className="relative flex-1">
          {isEmpty && (
            <div className="pointer-events-none absolute left-6 top-5 text-[17px] text-black/20 font-medium italic">
              {placeholder}
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onKeyUp={updateActiveStates}
            onMouseUp={updateActiveStates}
            className={cn(
              "w-full min-h-[220px] p-6 text-[17px] leading-relaxed outline-none prose prose-sm max-w-none",
              "selection:bg-primary/20 selection:text-primary-foreground",
              "caret-primary"
            )}
            style={{ 
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent'
            }}
          />
        </div>
        
        <div className="px-6 py-2 bg-muted border-t border-black/[0.03]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Type className="h-3 w-3" />
            Marker tekst for at formatere
          </p>
        </div>
      </div>
    </div>
  );
}
