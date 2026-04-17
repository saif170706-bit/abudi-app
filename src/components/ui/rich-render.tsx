'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export default function RichRender({ value, className }: { value: string | null | undefined, className?: string }) {
  if (!value) {
    return null;
  }
  
  return (
    <div
      className={cn("prose prose-sm max-w-none break-words", className)}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
