import type { BiodataTextField } from "./types";

export const CREATED_FOR = ["Myself", "Son", "Daughter", "Brother", "Sister", "Relative", "Friend"] as const;

export const RELIGIONS = ["Hindu", "Jain", "Sikh", "Muslim", "Christian", "Buddhist", "Parsi", "Jewish", "Other"];

export const MOTHER_TONGUES = [
  "Hindi", "Marwari", "Gujarati", "Marathi", "Punjabi", "Bengali", "Odia", "Assamese", "Tamil", "Telugu",
  "Kannada", "Malayalam", "Konkani", "Sindhi", "Urdu", "Kashmiri", "Maithili", "Bhojpuri", "Rajasthani",
  "English", "Other",
];

export const MARITAL_STATUS = ["Never married", "Divorced", "Widowed", "Awaiting divorce", "Annulled"];

export const MANGLIK = ["No", "Yes", "Anshik (partial)", "Don't know"];

export const DIET = ["Vegetarian", "Jain vegetarian", "Eggetarian", "Non-vegetarian", "Vegan"];

export const RASHI = [
  "Mesh (Aries)", "Vrishabh (Taurus)", "Mithun (Gemini)", "Kark (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
  "Tula (Libra)", "Vrishchik (Scorpio)", "Dhanu (Sagittarius)", "Makar (Capricorn)", "Kumbh (Aquarius)",
  "Meen (Pisces)",
];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const SECTORS = ["Government", "Private", "Business / Self-employed", "Professional (Doctor, CA, Lawyer)", "Studying", "Not working"];

export const INCOMES = [
  "Below ₹3 lakh", "₹3–5 lakh", "₹5–8 lakh", "₹8–12 lakh", "₹12–18 lakh", "₹18–25 lakh", "₹25–40 lakh",
  "₹40–60 lakh", "₹60 lakh–1 crore", "Above ₹1 crore", "Prefer not to say",
];

export const FAMILY_TYPES = ["Joint family", "Nuclear family"];

export const RELATIONS = ["Self", "Father", "Mother", "Brother", "Sister", "Uncle", "Aunt", "Other"];

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep",
  "Puducherry", "Outside India",
];

export const HEIGHTS = (() => {
  const out: string[] = [];
  for (let inches = 54; inches <= 84; inches++) {
    const ft = Math.floor(inches / 12);
    const inch = inches % 12;
    out.push(`${ft} ft ${inch} in (${Math.round(inches * 2.54)} cm)`);
  }
  return out;
})();

export const COMMUNITY_SUGGESTIONS = [
  "Agrawal", "Maheshwari", "Khandelwal", "Oswal", "Jain", "Brahmin", "Rajput", "Kayastha", "Baniya", "Jat",
  "Maratha", "Patel", "Reddy", "Nair", "Iyer", "Iyengar", "Kamma", "Lingayat", "Vokkaliga", "Ezhava",
  "Khatri", "Arora", "Sindhi", "Kurmi", "Yadav", "Gupta", "Vaishya", "Kshatriya", "SC", "ST", "OBC",
];

export const EDUCATION_SUGGESTIONS = [
  "B.Tech", "B.E.", "M.Tech", "MBA", "BBA", "B.Com", "M.Com", "CA", "CS", "B.Sc", "M.Sc", "BA", "MA", "MBBS",
  "MD", "BDS", "B.Pharm", "LLB", "LLM", "B.Arch", "PhD", "Diploma", "12th pass",
];

export type FieldDef = {
  key: BiodataTextField;
  label: string;
  type?: "text" | "date" | "time" | "select" | "textarea" | "tel" | "email" | "suggest";
  options?: string[];
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  max?: number;
};

export type SectionDef = {
  id: string;
  title: string;
  note?: string;
  fields: FieldDef[];
};

export const SECTIONS: SectionDef[] = [
  {
    id: "personal",
    title: "Personal details",
    fields: [
      { key: "fullName", label: "Full name", placeholder: "e.g. Aditya Joshi", wide: true },
      { key: "dob", label: "Date of birth", type: "date" },
      { key: "height", label: "Height", type: "select", options: HEIGHTS },
      { key: "weight", label: "Weight", placeholder: "e.g. 68 kg" },
      { key: "maritalStatus", label: "Marital status", type: "select", options: MARITAL_STATUS },
      { key: "religion", label: "Religion", type: "select", options: RELIGIONS },
      { key: "motherTongue", label: "Mother tongue", type: "select", options: MOTHER_TONGUES },
      { key: "community", label: "Community", type: "suggest", options: COMMUNITY_SUGGESTIONS, placeholder: "e.g. Marwari" },
      { key: "caste", label: "Caste", type: "suggest", options: COMMUNITY_SUGGESTIONS, placeholder: "e.g. Agrawal" },
      { key: "subCaste", label: "Sub-caste", placeholder: "Optional" },
      { key: "gotra", label: "Gotra", placeholder: "e.g. Garg" },
      { key: "diet", label: "Diet", type: "select", options: DIET },
      { key: "bloodGroup", label: "Blood group", type: "select", options: BLOOD_GROUPS },
    ],
  },
  {
    id: "horoscope",
    title: "Horoscope",
    note: "Optional. Many families match kundli using these.",
    fields: [
      { key: "birthTime", label: "Time of birth", type: "time" },
      { key: "birthPlace", label: "Place of birth", placeholder: "e.g. Indore" },
      { key: "manglik", label: "Manglik", type: "select", options: MANGLIK },
      { key: "rashi", label: "Rashi", type: "select", options: RASHI },
      { key: "nakshatra", label: "Nakshatra", placeholder: "e.g. Rohini" },
    ],
  },
  {
    id: "career",
    title: "Education and career",
    fields: [
      { key: "education", label: "Highest education", type: "suggest", options: EDUCATION_SUGGESTIONS, placeholder: "e.g. B.Tech" },
      { key: "college", label: "College or university", placeholder: "e.g. SGSITS, Indore" },
      { key: "sector", label: "Works in", type: "select", options: SECTORS },
      { key: "occupation", label: "Occupation", placeholder: "e.g. Software Engineer" },
      { key: "employer", label: "Company or department", placeholder: "e.g. Infosys, PWD" },
      { key: "income", label: "Annual income", type: "select", options: INCOMES },
      { key: "workCity", label: "Work location", placeholder: "e.g. Pune" },
    ],
  },
  {
    id: "family",
    title: "Family",
    fields: [
      { key: "fatherName", label: "Father's name" },
      { key: "fatherOccupation", label: "Father's occupation" },
      { key: "motherName", label: "Mother's name" },
      { key: "motherOccupation", label: "Mother's occupation" },
      { key: "brothers", label: "Brothers", placeholder: "e.g. 1 elder, married" },
      { key: "sisters", label: "Sisters", placeholder: "e.g. 1 younger, unmarried" },
      { key: "familyType", label: "Family type", type: "select", options: FAMILY_TYPES },
      { key: "nativePlace", label: "Native place", placeholder: "e.g. Jhunjhunu, Rajasthan" },
    ],
  },
  {
    id: "location",
    title: "Where you live",
    note: "Other people see only your city and state.",
    fields: [
      { key: "city", label: "City", placeholder: "e.g. Indore" },
      { key: "state", label: "State", type: "select", options: STATES },
      {
        key: "address",
        label: "Full address",
        type: "textarea",
        wide: true,
        max: 300,
        hint: "Never shown on your profile. It's printed only on the PDF you download, and only if you choose to include it.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact person",
    note: "Hidden until you accept someone's interest, or they accept yours.",
    fields: [
      { key: "contactName", label: "Name", placeholder: "e.g. Suresh Joshi" },
      { key: "contactRelation", label: "Relation", type: "select", options: RELATIONS },
      { key: "contactPhone", label: "Mobile number", type: "tel", placeholder: "10-digit number" },
      { key: "contactEmail", label: "Email", type: "email", placeholder: "Optional" },
    ],
  },
  {
    id: "about",
    title: "About and expectations",
    fields: [
      { key: "about", label: "About me", type: "textarea", wide: true, max: 600, placeholder: "A few lines about who you are, your work and your values." },
      { key: "hobbies", label: "Hobbies and interests", wide: true, placeholder: "e.g. Cricket, cooking, travel" },
      { key: "expectations", label: "Partner expectations", type: "textarea", wide: true, max: 500, placeholder: "What you're looking for in a partner and their family." },
    ],
  },
];

export const LABELS: Partial<Record<BiodataTextField, string>> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.label])),
);

export const PDF_TEMPLATES = [
  { id: "royal", name: "Royal Maroon", swatch: ["#46001c", "#e0ad38", "#fbf6ee"] },
  { id: "ivory", name: "Ivory Classic", swatch: ["#fbf6ee", "#b28a2a", "#46001c"] },
  { id: "marigold", name: "Marigold", swatch: ["#fff4e0", "#e8891c", "#7a0033"] },
] as const;

export type PdfTemplateId = (typeof PDF_TEMPLATES)[number]["id"];
