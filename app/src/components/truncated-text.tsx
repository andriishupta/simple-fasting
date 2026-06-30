import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

const defaultMaxLength = 10;

type SegmenterLike = {
  segment: (value: string) => Iterable<{ segment: string }>;
};

const splitGraphemes = (value: string): string[] => {
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'grapheme' },
      ) => SegmenterLike;
    }
  ).Segmenter;

  if (Segmenter !== undefined) {
    return Array.from(
      new Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
      (part) => part.segment,
    );
  }

  return Array.from(value);
};

export const getTruncatedText = (value: string, maxLength = defaultMaxLength): string => {
  const graphemes = splitGraphemes(value);

  return graphemes.length > maxLength ? `${graphemes.slice(0, maxLength).join('')}…` : value;
};

type TruncatedTextProps = ThemedTextProps & {
  value: string;
  maxLength?: number;
};

export function TruncatedText({ value, maxLength = defaultMaxLength, ...textProps }: TruncatedTextProps) {
  return (
    <ThemedText numberOfLines={1} accessibilityLabel={value} {...textProps}>
      {getTruncatedText(value, maxLength)}
    </ThemedText>
  );
}
