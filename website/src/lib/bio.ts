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


export type Step = { id: string; label: string; why: string; done: boolean; href: string };

/** The things that make a profile stand out, in the order worth doing them. */
export function strengthSteps(b: Biodata): Step[] {
  return [
    { id: "publish", label: "Publish your biodata", why: "Families can only find you once it's live.", done: b.published, href: "/biodata/edit" },
    { id: "photos", label: "Add 3 or more photos", why: "Profiles with several photos get noticed far more.", done: b.photos.length >= 3, href: "/biodata/edit#photos" },
    { id: "prompts", label: "Answer 3 prompts", why: "Gives people something to like and talk about.", done: (b.prompts?.length ?? 0) >= 3, href: "/biodata/edit#prompts" },
    { id: "prefs", label: "Set partner preferences", why: "Sharper match scores and better daily picks.", done: Boolean(b.prefs && Object.keys(b.prefs).length), href: "/biodata/edit#prefs" },
    { id: "horoscope", label: "Add your nakshatra", why: "Unlocks Guna Milan with every profile.", done: Boolean(b.nakshatra), href: "/biodata/edit#horoscope" },
    { id: "about", label: "Write a few lines about you", why: "The first thing families read.", done: (b.about?.length ?? 0) >= 60, href: "/biodata/edit#about" },
    { id: "family", label: "Add family details", why: "Parents look for this before anything else.", done: Boolean(b.fatherName && b.motherName), href: "/biodata/edit#family" },
    { id: "contact", label: "Add a contact person", why: "Shared only after you both accept.", done: Boolean(b.contactPhone), href: "/biodata/edit#contact" },
  ];
}

export function strengthScore(b: Biodata) {
  const steps = strengthSteps(b);
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}
