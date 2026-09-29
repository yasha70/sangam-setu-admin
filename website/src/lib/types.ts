export type Gender = "male" | "female";

export type User = {
  id: string;
  name: string;
  phone: string;
  gender: Gender;
  createdFor: string;
  passHash: string;
  createdAt: number;
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

export type Biodata = { [K in BiodataTextField]?: string } & {
  userId: string;
  gender: Gender;
  photos: string[];
  published: boolean;
  updatedAt: number;
  /** A built-in sample profile (see lib/samples.ts): shown with a tag and can't receive interests. */
  sample?: boolean;
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

export type Message = {
  id: string;
  from: string;
  text: string;
  ts: number;
};
