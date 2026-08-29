import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';

/** Displays HTML content saved by RichTextEditor (bold/italic/color formatting). */
export function RichText({ html, className }: { html: string; className?: string }) {
  const { width } = useWindowDimensions();
  if (!html) return null;

  return (
    <RenderHtml
      contentWidth={width - 32}
      source={{ html }}
      baseStyle={{ fontSize: 14, color: '#4b5563' }}
    />
  );
}
