import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';

export function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      placeholderTextColor="hsl(var(--muted-foreground))"
      className={`rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground ${className ?? ''}`}
      {...props}
    />
  );
}
