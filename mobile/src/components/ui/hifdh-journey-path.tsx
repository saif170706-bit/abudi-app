import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguagePreference } from '@/context/language-context';

type Milestone = {
  id: string;
  label: string;
  sublabel: string;
  pagesRequired: number;
  icon: keyof typeof Ionicons.glyphMap;
  final?: boolean;
};

const MILESTONES: Milestone[] = [
  { id: 'start', label: 'Start', sublabel: 'Rejsen begynder', pagesRequired: 0, icon: 'moon' },
  { id: 'p10', label: '10 Sider', sublabel: 'Første badge', pagesRequired: 10, icon: 'bookmark' },
  { id: 'juz1', label: '1 Juz', sublabel: 'Flot start', pagesRequired: 20, icon: 'book' },
  { id: 'p50', label: '50 Sider', sublabel: 'Momentum', pagesRequired: 50, icon: 'leaf' },
  { id: 'juz5', label: '5 Juz', sublabel: 'Låst op', pagesRequired: 101, icon: 'business' },
  { id: 'quarter1', label: '¼ Quran', sublabel: 'Stort skridt', pagesRequired: 151, icon: 'cube' },
  { id: 'juz10', label: '10 Juz', sublabel: 'Fremragende', pagesRequired: 201, icon: 'hand-left' },
  { id: 'p250', label: '250 Sider', sublabel: 'Stærk indsats', pagesRequired: 250, icon: 'paw' },
  { id: 'half', label: '½ Quran', sublabel: 'Halvvejs', pagesRequired: 302, icon: 'sunny' },
  { id: 'juz15', label: '15 Juz', sublabel: 'Bliv ved', pagesRequired: 302, icon: 'ellipse' },
  { id: 'juz20', label: '20 Juz', sublabel: 'Fantastisk', pagesRequired: 403, icon: 'body' },
  { id: 'threequarters', label: '¾ Quran', sublabel: 'Næsten i mål', pagesRequired: 453, icon: 'flame' },
  { id: 'p500', label: '500 Sider', sublabel: 'Elite badge', pagesRequired: 500, icon: 'shield' },
  { id: 'juz29', label: '29 Juz', sublabel: 'Kun ét skridt', pagesRequired: 584, icon: 'pencil' },
  { id: 'khatmah', label: 'Khatmah', sublabel: 'Fuld Quran', pagesRequired: 604, icon: 'trophy', final: true },
];

// A simplified, straight vertical rendition of the web app's winding illustrated path —
// react-native-svg isn't in the project yet, so this keeps the milestone content and
// unlocked/locked states without the custom hand-drawn icon set or curved route.
export function HifdhJourneyPath({ completedPages }: { completedPages: number }) {
  const milestones = useMemo(() => MILESTONES, []);
  const { tGlobal } = useLanguagePreference();

  return (
    <View className="gap-1">
      {milestones.map((m, i) => {
        const unlocked = completedPages >= m.pagesRequired;
        const isLast = i === milestones.length - 1;
        return (
          <View key={m.id} className="flex-row gap-4">
            <View className="items-center">
              <View
                style={{ width: m.final ? 64 : 44, height: m.final ? 64 : 44 }}
                className={`items-center justify-center rounded-2xl ${
                  m.final ? (unlocked ? 'bg-primary' : 'bg-muted') : unlocked ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <Ionicons name={m.icon} size={m.final ? 28 : 20} color={unlocked ? '#fff' : '#9ca3af'} />
              </View>
              {!isLast && <View className="my-1 h-8 w-[2px]" style={{ backgroundColor: unlocked ? '#DEA93E' : '#e5e7eb' }} />}
            </View>
            <View className="flex-1 justify-center pb-3">
              <Text className={`text-sm font-bold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{tGlobal(m.label)}</Text>
              <Text className="text-xs text-muted-foreground">{tGlobal(m.sublabel)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
