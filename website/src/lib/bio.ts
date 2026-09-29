import type { Biodata, BiodataTextField } from "./types";

export function publishProblems(b: Biodata): string[] {
  const missing: string[] = [];
  if (!b.fullName) missing.push("full name");
  if (!b.dob) missing.push("date of birth");
  if (!b.city) missing.push("city");
  if (!b.state) missing.push("state");
  if (!b.photos.length) missing.push("a photo");
  return missing;
}

export function completeness(b: Biodata) {
  const keys: BiodataTextField[] = [
    "fullName", "dob", "height", "maritalStatus", "religion", "motherTongue", "community", "education",
    "occupation", "fatherName", "motherName", "city", "state", "contactName", "contactPhone", "about",
  ];
  const filled = keys.filter((k) => b[k]).length + (b.photos.length ? 2 : 0);
  return Math.round((filled / (keys.length + 2)) * 100);
}

export function ageFrom(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

