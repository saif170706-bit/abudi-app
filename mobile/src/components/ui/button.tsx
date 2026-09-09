import React from 'react';
import { Pressable, Text, ActivityIndicator, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: string;
  variant?: Variant;
  loading?: boolean;
  /** Overrides the variant's default text color — e.g. a primary-colored label on a custom (non-variant) background. */
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-primary', text: 'text-primary-foreground' },
  secondary: { container: 'bg-secondary', text: 'text-secondary-foreground' },
  outline: { container: 'border border-border bg-transparent', text: 'text-foreground' },
  ghost: { container: 'bg-transparent', text: 'text-foreground' },
  destructive: { container: 'bg-destructive', text: 'text-destructive-foreground' },
};

export function Button({ children, variant = 'primary', loading, disabled, className, textClassName, style, ...props }: ButtonProps & { className?: string }) {
  const styles = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      // Dimming is applied via `style` (not a toggled `opacity-50` class) — NativeWind's
      // css-interop treats a className that appears/disappears after the initial render as
      // needing a component "upgrade" and, on native, that path has a known bug where it
      // crashes with a misleading "Couldn't find a navigation context" error. disabled/loading
      // change constantly after mount on this component, used on nearly every screen, so this
      // was a systemic crash risk. See https://github.com/nativewind/nativewind/issues/1536.
      style={[{ opacity: disabled || loading ? 0.5 : 1 }, style]}
      className={`items-center justify-center rounded-xl px-4 py-3 ${styles.container} ${className ?? ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className={`text-base font-medium ${textClassName ?? styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
