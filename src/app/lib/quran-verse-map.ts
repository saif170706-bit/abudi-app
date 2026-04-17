
// A simple in-memory cache for the processed maps to avoid re-computation.
let versePageMap: Map<string, number> | null = null;

interface QuranWord {
    id: number;
    surah: string; // e.g., "1"
    ayah: string;  // e.g., "1"
    word: string;  // e.g., "1"
    location: string; // e.g., "1:1:1"
    text: string;
}

interface LayoutLine {
    page_number: number;
    line_number: number;
    line_type: string;
    is_centered: number;
    first_word_id: number | '';
    last_word_id: number | '';
    surah_number: number | '';
    text?: string;
}

/**
 * Fetches and processes Quran data files to create a mapping
 * from a verse_key (e.g., "1:1") to its page number.
 * This function caches its result to avoid re-processing on subsequent calls.
 * @returns {Promise<Map<string, number>>} A promise that resolves to the verse-to-page map.
 */
export async function getVersePageMap(): Promise<Map<string, number>> {
    if (versePageMap) {
        return versePageMap;
    }

    try {
        const [quranRes, layoutRes] = await Promise.all([
            fetch('/quran.json'),
            fetch('/layout.json')
        ]);

        if (!quranRes.ok || !layoutRes.ok) {
            throw new Error('Failed to fetch Quran data for verse mapping.');
        }

        const quranData: Record<string, QuranWord> = await quranRes.json();
        const layoutData: LayoutLine[] = await layoutRes.json();

        // 1. Create a map from word ID to page number
        const wordIdToPageMap = new Map<number, number>();
        for (const line of layoutData) {
            if (typeof line.first_word_id === 'number' && typeof line.last_word_id === 'number') {
                for (let i = line.first_word_id; i <= line.last_word_id; i++) {
                    wordIdToPageMap.set(i, line.page_number);
                }
            }
        }
        
        // 2. Create a map from verse_key to the first word ID of that verse
        const verseKeyToFirstWordIdMap = new Map<string, number>();
        for (const key in quranData) {
            const word = quranData[key];
            if (word && word.ayah && word.surah) {
                const verseKey = `${word.surah}:${word.ayah}`;
                // Only store the ID if it's the first word of the verse or if the verse isn't in the map yet.
                // Since we iterate through words in order, the first one we encounter for a verse is the one we want.
                if (!verseKeyToFirstWordIdMap.has(verseKey)) {
                    verseKeyToFirstWordIdMap.set(verseKey, word.id);
                }
            }
        }

        // 3. Combine the maps to create the final verse_key -> page_number map
        const finalMap = new Map<string, number>();
        for (const [verseKey, wordId] of verseKeyToFirstWordIdMap.entries()) {
            const page = wordIdToPageMap.get(wordId);
            if (page) {
                finalMap.set(verseKey, page);
            }
        }
        
        // Al-Fatiha is a special case, hardcode page 1
        if (!finalMap.has("1:1")) {
            finalMap.set("1:1", 1);
        }

        // Cache the result
        versePageMap = finalMap;
        return versePageMap;

    } catch (error) {
        console.error("Error building verse page map:", error);
        throw new Error("Could not initialize Quran verse mapping.");
    }
}
