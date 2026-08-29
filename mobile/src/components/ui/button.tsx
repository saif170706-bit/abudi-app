import React from 'react';
import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: string;
  variant?: Variant;
  loading?: boolean;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-primary', text: 'text-primary-foreground' },
  secondary: { container: 'bg-secondary', text: 'text-secondary-foreground' },
  outline: { container: 'border border-border bg-transparent', text: 'text-foreground' },
  ghost: { container: 'bg-transparent', text: 'text-foreground' },
  destructive: { container: 'bg-destructive', text: 'text-destructive-foreground' },
};

export function Button({ children, variant = 'primary', loading, disabled, className, ...props }: ButtonProps & { className?: string }) {
  const styles = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`items-center justify-center rounded-xl px-4 py-3 ${styles.container} ${disabled || loading ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className={`text-base font-medium ${styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
