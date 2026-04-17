
// This file is a placeholder for data that might be loaded from a CMS
// or other static data source.

export type Reciter = {
    id: string,
    name: string,
    style?: string,
    audio_url_prefix?: string, // for everyayah.com
    quranComId?: number,        // for quran.com
}

// everyayah.com format: https://everyayah.com/data/[ReciterId]/[SurahIdPad3][VerseIdPad3].mp3
export const reciters: Reciter[] = [
    {
        "id": "Abdul_Basit_Mujawwad_128kbps",
        "name": "AbdulBaset AbdulSamad (Mujawwad)",
        "style": "Mujawwad",
        "audio_url_prefix": "https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps"
    },
    {
        "id": "Abdul_Basit_Murattal_192kbps",
        "name": "AbdulBaset AbdulSamad (Murattal)",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Abdul_Basit_Murattal_192kbps"
    },
    {
        "id": "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
        "name": "Abdullah Awad Al-Juhany",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps"
    },
    {
        "id": "Abdullah_Basfar_192kbps",
        "name": "Abdullah Basfar",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Abdullah_Basfar_192kbps"
    },
    {
        "id": "Abdullah_Matroud_128kbps",
        "name": "Abdullah Matrood",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Abdullah_Matroud_128kbps"
    },
    {
        "id": "Abdurrahmaan_As-Sudais_192kbps",
        "name": "Abdur-Rahman as-Sudais",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps"
    },
    {
        "id": "Abu_Bakr_Ash-Shaatree_128kbps",
        "name": "Abu Bakr al-Shatri",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps"
    },
    {
        "id": "Ahmed_Neana_128kbps",
        "name": "Ahmed Neana",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Ahmed_Neana_128kbps"
    },
    {
        "id": "ahmed_ibn_ali_al_ajamy_128kbps",
        "name": "Ahmed ibn Ali al-Ajmy",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/ahmed_ibn_ali_al_ajamy_128kbps"
    },
    {
        "id": "Akram_AlAlaqimy_128kbps",
        "name": "Akram Al-Alaqimy",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Akram_AlAlaqimy_128kbps"
    },
    {
        "id": "Alafasy_128kbps",
        "name": "Mishary Rashid al-`Afasy",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Alafasy_128kbps"
    },
    {
        "id": "Ali_Hajjaj_AlSuesy_128kbps",
        "name": "Ali Hajjaj AlSuesy",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Ali_Hajjaj_AlSuesy_128kbps"
    },
    {
        "id": "Ali_Jaber_64kbps",
        "name": "Ali Jaber",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Ali_Jaber_64kbps"
    },
    {
        "id": "Ayman_Sowaid_64kbps",
        "name": "Ayman Sowaid",
        "style": "Muallim",
        "audio_url_prefix": "https://everyayah.com/data/Ayman_Sowaid_64kbps"
    },
    {
        "id": "Fares_Abbad_64kbps",
        "name": "Fares Abbad",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Fares_Abbad_64kbps"
    },
    {
        "id": "Ghamadi_40kbps",
        "name": "Saad al-Ghamdi",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Ghamadi_40kbps"
    },
    {
        "id": "Hani_Rifai_192kbps",
        "name": "Hani ar-Rifai",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Hani_Rifai_192kbps"
    },
    {
        "id": "Hudhaify_128kbps",
        "name": "Ali Abdur-Rahman al-Huthaify",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Hudhaify_128kbps"
    },
    {
        "id": "Husary_128kbps",
        "name": "Mahmoud Khalil Al-Husary",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Husary_128kbps"
    },
    {
        "id": "Husary_128kbps_Mujawwad",
        "name": "Al-Husary (Mujawwad)",
        "style": "Mujawwad",
        "audio_url_prefix": "https://everyayah.com/data/Husary_128kbps_Mujawwad"
    },
    {
        "id": "Husary_Muallim_128kbps",
        "name": "Al-Husary (Muallim)",
        "style": "Muallim",
        "audio_url_prefix": "https://everyayah.com/data/Husary_Muallim_128kbps"
    },
    {
        "id": "Ibrahim_Akhdar_64kbps",
        "name": "Ibrahim Al Akhdar",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Ibrahim_Akhdar_32kbps"
    },
    {
        "id": "Karim_Mansoori_40kbps",
        "name": "Karim Mansoori",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Karim_Mansoori_40kbps"
    },
    {
        "id": "Khaalid_Abdullaah_al-Qahtaanee_192kbps",
        "name": "Khalid Abdullah al-Qahtanee",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Khaalid_Abdullaah_al-Qahtaanee_192kbps"
    },
    {
        "id": "MaherAlMuaiqly128kbps",
        "name": "Maher al-Muaiqly",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/MaherAlMuaiqly128kbps"
    },
    {
        "id": "Minshawy_Mujawwad_192kbps",
        "name": "Mohamed Siddiq al-Minshawi (Mujawwad)",
        "style": "Mujawwad",
        "audio_url_prefix": "https://everyayah.com/data/Minshawy_Mujawwad_192kbps"
    },
    {
        "id": "Minshawy_Murattal_128kbps",
        "name": "Mohamed Siddiq al-Minshawi (Murattal)",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Minshawy_Murattal_128kbps"
    },
    {
        "id": "Mohammad_al_Tablaway_128kbps",
        "name": "Mohammad al-Tablaway",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Mohammad_al_Tablaway_128kbps"
    },
    {
        "id": "Muhammad_AbdulKareem_128kbps",
        "name": "Muhammad AbdulKareem",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Muhammad_AbdulKareem_128kbps"
    },
    {
        "id": "Muhammad_Ayyoub_128kbps",
        "name": "Muhammad Ayyoub",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Muhammad_Ayyoub_128kbps"
    },
    {
        "id": "Muhammad_Jibreel_128kbps",
        "name": "Muhammad Jibreel",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Muhammad_Jibreel_128kbps"
    },
    {
        "id": "Muhsin_Al_Qasim_192kbps",
        "name": "Muhsin Al-Qasim",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Muhsin_Al_Qasim_192kbps"
    },
    {
        "id": "Nasser_Alqatami_128kbps",
        "name": "Nasser Alqatami",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Nasser_Alqatami_128kbps"
    },
    {
        "id": "Parhizgar_48kbps",
        "name": "Shahriar Parhizgar",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Parhizgar_48kbps"
    },
    {
        "id": "Sahl_Yassin_128kbps",
        "name": "Sahl Yassin",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Sahl_Yassin_128kbps"
    },
    {
        "id": "Salaah_AbdulRahman_Bukhatir_128kbps",
        "name": "Salah Bukhatir",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Salaah_AbdulRahman_Bukhatir_128kbps"
    },
    {
        "id": "Salah_Al_Budair_128kbps",
        "name": "Salah Al-Budair",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Salah_Al_Budair_128kbps"
    },
    {
        "id": "Saood_ash-Shuraym_128kbps",
        "name": "Sa`ud ash-Shuraym",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Saood_ash-Shuraym_128kbps"
    },
    {
        "id": "Yaser_Salamah_128kbps",
        "name": "Yaser Salamah",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Yaser_Salamah_128kbps"
    },
    {
        "id": "Yasser_Ad-Dussary_128kbps",
        "name": "Yasser Ad-Dussary",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps"
    },
    {
        "id": "aziz_alili_128kbps",
        "name": "Aziz Alili",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/aziz_alili_128kbps"
    },
    {
        "id": "khalefa_al_tunaiji_64kbps",
        "name": "Khalifah Al Tunaiji",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/khalefa_al_tunaiji_64kbps"
    },
    {
        "id": "mahmoud_ali_al_banna_32kbps",
        "name": "Mahmoud Ali Al Banna",
        "style": "Murattal",
        "audio_url_prefix": "https://everyayah.com/data/mahmoud_ali_al_banna_32kbps"
    }
];
