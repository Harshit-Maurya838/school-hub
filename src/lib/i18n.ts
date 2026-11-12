"use client";

import { useCallback, useSyncExternalStore } from "react";

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", locale: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", locale: "hi-IN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** Hindi strings keyed by their English source text; a missing key falls back to English. */
const HI: Record<string, string> = {
  // Top bar
  "Search…": "खोजें…",
  Search: "खोजें",
  Session: "सत्र",
  "Current session:": "वर्तमान सत्र:",
  "Current academic session": "वर्तमान शैक्षणिक सत्र",
  "UDISE Code": "यू-डाइस कोड",
  "Not set": "दर्ज नहीं",
  "Open navigation menu": "नेविगेशन मेनू खोलें",
  "Open calendar": "कैलेंडर खोलें",
  Calendar: "कैलेंडर",
  Today: "आज",
  "Previous month": "पिछला महीना",
  "Next month": "अगला महीना",
  "Open calculator": "कैलकुलेटर खोलें",
  "Quick Calculator": "कैलकुलेटर",
  Calc: "कैलकुलेटर",
  Language: "भाषा",
  "Choose language": "भाषा चुनें",
  "Sign out": "साइन आउट",
  "Signing out": "साइन आउट हो रहा है",
  // Profile menu
  Account: "खाता",
  "School Management": "विद्यालय प्रबंधन",
  "Leadership details have not been added to the school profile yet.":
    "विद्यालय प्रोफ़ाइल में अभी नेतृत्व का विवरण नहीं जोड़ा गया है।",
  "Platform Console": "प्लेटफ़ॉर्म कंसोल",
  "School Settings": "विद्यालय सेटिंग्स",
  "Take Attendance": "उपस्थिति लें",
  "Fees Management": "शुल्क प्रबंधन",
  "Help & Support": "सहायता",
  "For help with your school workspace, contact your platform administrator and share the details below.":
    "अपने विद्यालय वर्कस्पेस में सहायता के लिए प्लेटफ़ॉर्म व्यवस्थापक से संपर्क करें और नीचे दिया गया विवरण साझा करें।",
  "School code": "विद्यालय कोड",
  Workspace: "वर्कस्पेस",
  Close: "बंद करें",
  // Roles
  "Platform Admin": "प्लेटफ़ॉर्म व्यवस्थापक",
  "School Admin": "विद्यालय व्यवस्थापक",
  Teacher: "शिक्षक",
  Accountant: "लेखाकार",
  "Parent / Guardian": "अभिभावक",
  Student: "विद्यार्थी",
  "Management / Trust": "प्रबंधन / ट्रस्ट",
  "Head of School": "विद्यालय प्रमुख",
  // Sidebar
  Dashboard: "डैशबोर्ड",
  "Daily Attendance": "दैनिक उपस्थिति",
  "Student Roster": "विद्यार्थी सूची",
  "Student Billing Roll": "विद्यार्थी बिलिंग सूची",
  "Manage Students": "विद्यार्थी प्रबंधन",
  "Curriculum & Classes": "पाठ्यक्रम और कक्षाएँ",
  "Class & Subjects": "कक्षा और विषय",
  "Staff Directory": "कर्मचारी निर्देशिका",
  "Marks & Exams": "अंक और परीक्षाएँ",
  "Exam & Results": "परीक्षा और परिणाम",
  "Academic Settings": "शैक्षणिक सेटिंग्स",
  "Teaching Desk": "शिक्षण डेस्क",
  "Accounts Desk": "लेखा डेस्क",
  "Main Modules": "मुख्य मॉड्यूल",
  Management: "प्रबंधन",
  "Expand Sidebar": "साइडबार फैलाएँ",
  "Collapse Sidebar": "साइडबार छोटा करें",
  "Close menu": "मेनू बंद करें",
};

const DICTIONARIES: Record<LanguageCode, Record<string, string>> = { en: {}, hi: HI };

const STORAGE_KEY = "cg-language";
const listeners = new Set<() => void>();

function readLanguage(): LanguageCode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "hi" ? "hi" : "en";
  } catch (err) {
    console.error("Unable to read language preference", err);
    return "en";
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setLanguage(code: LanguageCode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch (err) {
    console.error("Unable to save language preference", err);
  }
  document.documentElement.lang = code;
  listeners.forEach((l) => l());
}

/** Current UI language; "en" during SSR to keep hydration stable. */
export function useLanguage(): LanguageCode {
  return useSyncExternalStore(subscribe, readLanguage, () => "en");
}

/** Returns `t(english)` for the current language, plus its locale for dates/numbers. */
export function useT() {
  const language = useLanguage();
  const t = useCallback((text: string) => DICTIONARIES[language][text] ?? text, [language]);
  const locale = LANGUAGES.find((l) => l.code === language)?.locale ?? "en-IN";
  return { t, language, locale };
}
