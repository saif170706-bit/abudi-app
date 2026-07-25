import React from 'react';
import { View, Text, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import pages from '@/shared/quran/pages.json';

const fontMap: Record<number, any> = {
  1: require('../../../assets/fonts/p1.ttf'),
  2: require('../../../assets/fonts/p2.ttf'),
  3: require('../../../assets/fonts/p3.ttf'),
};

function fontFamilyForPage(pageNumber: number) {
  return `QuranPage${pageNumber}`;
}

function QuranPage({ page, width }: { page: (typeof pages)[number]; width: number }) {
  return (
    <View style={{ width }} className="flex-1 justify-center px-6">
      {page.lines.map((line, idx) => {
        if (line.lineType === 'surah_name') {
          return (
            <Text key={idx} className="mb-4 text-center text-xl font-semibold text-primary">
              سورة {line.surahNumber}
            </Text>
          );
        }
        const text = line.words.map((w) => w.text).join(' ');
        return (
          <Text
            key={idx}
            style={{ fontFamily: fontFamilyForPage(page.pageNumber), writingDirection: 'rtl' }}
            className="text-center text-2xl leading-[3rem] text-foreground"
          >
            {text}
          </Text>
        );
      })}
      <Text className="mt-6 text-center text-xs text-muted-foreground">Side {page.pageNumber}</Text>
    </View>
  );
}

export function QuranScreen() {
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    QuranPage1: fontMap[1],
    QuranPage2: fontMap[2],
    QuranPage3: fontMap[3],
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={pages}
        keyExtractor={(p) => String(p.pageNumber)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <QuranPage page={item} width={width} />}
      />
    </SafeAreaView>
  );
}
