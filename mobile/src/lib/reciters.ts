// Ported verbatim from the web app's src/app/lib/reciters.ts — the `id` here
// is the audio-timing file index used by quran-audio-data.ts
// (quran-assets/audio-timing/{id}surah.json / {id}segments.json in Storage).
export interface Reciter {
  id: string;
  name: string;
  style?: string;
}

export const reciters: Reciter[] = [
  { id: '1', name: 'Ahmad Alnufais' },
  { id: '2', name: 'Muhammad Siddiq al-Minshawi', style: 'with kids' },
  { id: '3', name: 'Hady Toure' },

  { id: '4', name: 'Abdul Basit Abdul Samad', style: 'Murattal' },
  { id: '5', name: 'Abdullah Ali Jabir' },
  { id: '6', name: 'Yasser ad-Dussary' },
  { id: '7', name: 'Abdul Basit Abdul Samad', style: 'Mujawwad' },

  { id: '8', name: 'Abdullah Awad al-Juhani' },

  { id: '10', name: 'Mishari Rashid al-`Afasy' },
  { id: '11', name: 'Mohammad Al-Tablawi' },
  { id: '12', name: 'Mahmood Ali Al-Bana' },
  { id: '13', name: 'Muhammad Jibreel' },

  { id: '14', name: 'Mahmoud Khaleel Al-Husary', style: 'Ijazah' },
  { id: '15', name: 'Khalid Al-Jalil' },
  { id: '16', name: 'Mahmoud Khalil Al-Husary', style: 'Muallim' },

  { id: '17', name: 'Aziz Alili' },
  { id: '18', name: 'Nasser Al Qatami' },
  { id: '19', name: 'Bandar Baleela' },
  { id: '20', name: 'Hani ar-Rifai' },
  { id: '21', name: 'Salah Bukhatir' },
  { id: '22', name: 'Salah al-Budair' },
  { id: '23', name: 'Akram Al-Alaqmi' },
  { id: '24', name: 'Abu Bakr al-Shatri' },
  { id: '25', name: 'Saad al-Ghamdi' },
  { id: '26', name: 'Sa`ud ash-Shuraym' },
  { id: '27', name: 'Ali Hajjaj Alsouasi' },

  { id: '28', name: 'Mahmoud Khaleel Al-Husary', style: 'Murattal' },
  { id: '29', name: 'Fares Abbad' },
  { id: '30', name: 'Khalifah Taniji' },
  { id: '31', name: 'Mostafa Ismaeel' },

  { id: '32', name: 'Muhammad Siddiq al-Minshawi', style: 'Mujawwad' },
  { id: '33', name: 'Maher al-Muaiqly' },
  { id: '34', name: 'Muhammad Siddiq al-Minshawi', style: 'Murattal' },

  { id: '36', name: 'Abdullah Matroud' },
  { id: '37', name: 'Ahmad Nauina' },
  { id: '38', name: 'Abdur-Rahman as-Sudais' },
  { id: '39', name: 'Sahl Yasin' },
];

export const DEFAULT_RECITER_ID = '10'; // Mishari Rashid al-`Afasy — matches quran-audio-data.ts's prior fixed default.
