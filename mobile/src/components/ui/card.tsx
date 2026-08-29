import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-border bg-card p-4 ${className ?? ''}`}
      {...props}
    />
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-lg font-semibold text-card-foreground ${className ?? ''}`}>{children}</Text>;
}

export function CardDescription({
  children,
  className,
  numberOfLines,
}: {
  children: React.ReactNode;
  className?: string;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} className={`mt-1 text-sm text-muted-foreground ${className ?? ''}`}>
      {children}
    </Text>
  );
}
