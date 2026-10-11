export type Gender = "male" | "female";

export type User = {
  id: string;
  name: string;
  phone: string;
  gender: Gender;
  createdFor: string;
  passHash: string;
  createdAt: number;
  /** Human-friendly number shown as SS1001, SS1002, ... */
  profileNo?: number;
  lastActive?: number;
  status?: "active" | "suspended";
  /** A temporary account made from Admin → Testing. */
  test?: boolean;
};

export type PublicUser = Pick<User, "id" | "name" | "gender" | "createdFor">;

/** Every text field of a biodata. All optional while the person is still filling it in. */
export const BIODATA_TEXT_FIELDS = [
  // personal
  "fullName",
  "dob",
  "birthTime",
  "birthPlace",
  "height",
  "weight",
  "maritalStatus",
  "religion",
  "motherTongue",
  "community",
  "caste",
  "subCaste",
  "gotra",
  "manglik",
  "rashi",
  "nakshatra",
  "diet",
  "bloodGroup",
  // education and career
  "education",
  "college",
  "sector",
  "occupation",
  "employer",
  "income",
  "workCity",
  // family
  "fatherName",
  "fatherOccupation",
  "motherName",
  "motherOccupation",
  "brothers",
  "sisters",
  "familyType",
  "nativePlace",
  // location
  "city",
  "state",
  "address",
  // contact
  "contactName",
  "contactRelation",
  "contactPhone",
  "contactEmail",
  // about
  "about",
  "hobbies",
  "expectations",
  // biodata document
  "heading",
] as const;

export type BiodataTextField = (typeof BIODATA_TEXT_FIELDS)[number];

/** Structured partner preferences. Empty means "any". Heights are in inches. */
export type PartnerPrefs = {
  ageMin?: number;
  ageMax?: number;
  heightMin?: number;
  heightMax?: number;
  religions?: string[];
  motherTongues?: string[];
  marital?: string[];
  diets?: string[];
  states?: string[];
  /** Comma-separated communities or castes, matched loosely. */
  communities?: string;
  manglik?: "" | "No" | "Yes";
};

export type PromptAnswer = { q: string; a: string };

export type Biodata = { [K in BiodataTextField]?: string } & {
  userId: string;
  gender: Gender;
  photos: string[];
  published: boolean;
  updatedAt: number;
  /** A built-in sample profile (see lib/samples.ts): shown with a tag and can't receive interests. */
  sample?: boolean;
  /** Set by an admin after checking the profile. Shows a green "Verified" tick. */
  verified?: boolean;
  /** Set by an admin: the biodata can't be published until an admin unhides it. */
  adminHidden?: boolean;
  profileNo?: number;
  prefs?: PartnerPrefs;
  /** Up to three answered prompts, shown as cards that others can like. */
  prompts?: PromptAnswer[];
  /** "interest": photos show only to people this member sent an interest to or connected with. */
  photoPrivacy?: "all" | "interest";
  /** false: other members can't include this profile in a family review link. */
  familyShare?: boolean;
  /** Set when photos were withheld from the viewer by photoPrivacy. */
  photosHidden?: number;
};

export type ReportReason = "Fake profile" | "Wrong information" | "Inappropriate photo" | "Abusive messages" | "Asking for money" | "Already married" | "Other";

export type Report = {
  id: string;
  from: string;
  target: string;
  reason: ReportReason;
  note: string;
  ts: number;
  status: "open" | "dismissed" | "actioned";
};

/** Fields that only the owner and accepted connections can see. */
export const PRIVATE_FIELDS: BiodataTextField[] = ["contactName", "contactRelation", "contactPhone", "contactEmail"];
/** Fields that only the owner ever sees on screen. */
export const OWNER_ONLY_FIELDS: BiodataTextField[] = ["address"];

export type InterestStatus = "pending" | "accepted" | "declined";

export type Interest = {
  from: string;
  to: string;
  status: InterestStatus;
  createdAt: number;
  updatedAt: number;
  /** A short personal note sent with the interest. Becomes the first chat message once accepted. */
  note?: string;
  /** What they liked, e.g. a prompt they answered. */
  liked?: string;
};

export type Relation =
  | { kind: "self" }
  | { kind: "none" }
  | { kind: "sent"; interest: Interest }
  | { kind: "received"; interest: Interest }
  | { kind: "connected"; interest: Interest }
  | { kind: "declined-by-them"; interest: Interest }
  | { kind: "declined-by-me"; interest: Interest }
  | { kind: "blocked" };

export const MEET_MODES = ["Video call", "Phone call", "Coffee meet", "Family visit"] as const;
export type MeetMode = (typeof MEET_MODES)[number];
export type MeetStatus = "proposed" | "accepted" | "declined";

export type MessageKind = "text" | "meet" | "note" | "image" | "voice" | "call" | "deleted";

export type Message = {
  id: string;
  from: string;
  text: string;
  ts: number;
  /** "meet": a proposed meeting card. "note": the note sent with the interest. "deleted": removed for everyone. */
  kind?: MessageKind;
  meet?: { when: string; mode: MeetMode; place?: string };
  /** For notes: what the sender was replying to. */
  quote?: string;
  /** Photo or voice note. `dur` is in seconds for voice notes. */
  media?: { url: string; dur?: number; w?: number; h?: number };
  /** A snapshot of the message this one replies to. */
  reply?: { id: string; from: string; text: string };
  call?: { id: string; video: boolean };
};

/** Reactions and deletions, kept beside the messages so they can change after sending. */
export type ChatMeta = { rx: Record<string, Record<string, string>>; del: string[] };

export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed" | "cancelled";
export type CallOutcome = { status: CallStatus; dur?: number };

export const REACTIONS = ["❤️", "👍", "😂", "🙏", "😮", "😢"] as const;

export type NoticeType = "interest" | "accepted" | "view" | "family" | "meet";

export type Notice = {
  id: string;
  type: NoticeType;
  /** The member it's about. */
  who?: string;
  text: string;
  ts: number;
  link: string;
};

export const FAMILY_REACTIONS = [
  { id: "love", emoji: "❤️", label: "Love this", verb: "loved" },
  { id: "good", emoji: "👍", label: "Looks good", verb: "liked" },
  { id: "talk", emoji: "🤔", label: "Let's discuss", verb: "wants to discuss" },
  { id: "no", emoji: "👎", label: "Not for us", verb: "isn't keen on" },
] as const;
export type FamilyReaction = (typeof FAMILY_REACTIONS)[number]["id"];
export type FamilyVote = { name: string; reaction: FamilyReaction; comment?: string; ts: number };
