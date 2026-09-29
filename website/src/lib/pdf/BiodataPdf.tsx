import path from "node:path";
import React from "react";
import {
  Circle,
  Defs,
  Document,
  Ellipse,
  Font,
  G,
  Image,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Biodata, BiodataTextField } from "../types";
import type { PdfTemplateId } from "../options";

// ---------- fonts ----------

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const dir = (pkg: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files");
  const inter = dir("inter");
  const play = dir("playfair-display");
  const faces = (base: string, prefix: string, subset: string, weights: number[], italic = false) =>
    weights.flatMap((w) => [
      { src: path.join(base, `${prefix}-${subset}-${w}-normal.woff`), fontWeight: w },
      ...(italic ? [{ src: path.join(base, `${prefix}-${subset}-${w}-italic.woff`), fontWeight: w, fontStyle: "italic" as const }] : []),
    ]);
  Font.register({ family: "Inter", fonts: faces(inter, "inter", "latin", [400, 500, 600, 700]) });
  Font.register({ family: "InterExt", fonts: faces(inter, "inter", "latin-ext", [400, 500, 600, 700]) });
  Font.register({ family: "Playfair", fonts: faces(play, "playfair-display", "latin", [400, 600, 700], true) });
  Font.register({ family: "PlayfairExt", fonts: faces(play, "playfair-display", "latin-ext", [400, 600, 700], true) });
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const SANS = ["Inter", "InterExt"];
const SERIF = ["Playfair", "PlayfairExt"];

// ---------- themes ----------

type Theme = {
  page: string;
  ink: string;
  muted: string;
  accent: string; // headings
  gold: string;
  rule: string;
  label: string;
  headerBg?: [string, string];
  headerInk: string;
  headerSub: string;
  photoBorder: string;
  chipBg: string;
};

const THEMES: Record<PdfTemplateId, Theme> = {
  royal: {
    page: "#fbf6ee",
    ink: "#2a1a20",
    muted: "#7b6a70",
    accent: "#5c0a2c",
    gold: "#b98a22",
    rule: "#e6d3ad",
    label: "#8a6f5a",
    headerBg: ["#46001c", "#8f0a3f"],
    headerInk: "#fdf3dc",
    headerSub: "#e9c46a",
    photoBorder: "#d9aa3f",
    chipBg: "#f3e6cc",
  },
  ivory: {
    page: "#fffdf7",
    ink: "#2b2326",
    muted: "#7d7175",
    accent: "#46001c",
    gold: "#b28a2a",
    rule: "#e8dcc0",
    label: "#8b7b62",
    headerInk: "#46001c",
    headerSub: "#b28a2a",
    photoBorder: "#c9a14a",
    chipBg: "#f5ecda",
  },
  marigold: {
    page: "#fff8ec",
    ink: "#2d1b16",
    muted: "#7e6259",
    accent: "#7a0033",
    gold: "#e0891c",
    rule: "#f2d3a4",
    label: "#a0663a",
    headerInk: "#7a0033",
    headerSub: "#c96f10",
    photoBorder: "#e8891c",
    chipBg: "#fde7c4",
  },
};

// ---------- the lotus mark (same drawing as the app logo) ----------

const LOTUS_PATHS = [
  "M53.5981 78.8563C26.6472 66.0783 39.9845 36.2461 52.1694 19.8571C53.5356 18.0196 56.2533 18.067 57.6012 19.9179C83.5933 55.6086 68.4753 73.6862 56.2373 78.9324C55.3978 79.2923 54.4234 79.2477 53.5981 78.8563Z",
  "M89.6744 30.1028C80.1113 29.6897 73.3064 33.4132 69.9432 36.3657C68.9488 37.2386 68.7498 38.6554 69.2508 39.88L72.7888 48.5285C72.8918 48.7803 73.0286 49.0144 73.1554 49.2552C74.67 52.1318 73.8876 59.9177 73.2777 63.5964C73.1405 66.1339 70.9136 69.3963 68.2294 72.4069C65.9689 74.9422 67.3702 77.58 70.5164 76.2998C71.9489 75.7169 73.1796 75.1833 73.9087 74.8362C74.3923 74.6059 74.8362 74.2786 75.2465 73.9344C80.7602 69.3086 82.5776 63.1664 82.7921 60.5918L84.4613 45.736C85.4838 38.6807 88.3854 34.6319 90.4802 32.477C91.734 31.1873 91.4715 30.1804 89.6744 30.1028Z",
  "M20.3256 30.1028C29.8887 29.6897 36.6936 33.4132 40.0568 36.3657C41.0512 37.2386 41.2502 38.6554 40.7492 39.88L37.2112 48.5285C37.1082 48.7803 36.9714 49.0144 36.8446 49.2552C35.33 52.1318 36.1124 59.9177 36.7223 63.5964C36.8595 66.1339 39.0864 69.3963 41.7706 72.4069C44.0311 74.9422 42.6298 77.58 39.4836 76.2998C38.0511 75.7169 36.8204 75.1833 36.0913 74.8362C35.6077 74.6059 35.1638 74.2786 34.7535 73.9344C29.2398 69.3086 27.4224 63.1664 27.2079 60.5918L25.5387 45.736C24.5162 38.6807 21.6146 34.6319 19.5198 32.477C18.266 31.1873 18.5285 30.1804 20.3256 30.1028Z",
  "M78.4031 73.7828C75.486 77.9483 63.9258 80.956 63.7633 80.956H72.6782C72.8551 80.956 73.0315 80.9435 73.2061 80.9153C79.1109 79.9616 84.9383 76.5351 87.4609 74.6983C87.6893 74.532 87.8899 74.3355 88.0683 74.1165L91.2371 70.2275C91.3938 70.0352 91.5293 69.8283 91.643 69.6079L96.8133 59.5903C99.0674 53.5794 104.422 52.3599 106.815 52.1257C107.587 52.0501 107.673 51.811 106.995 51.4336C102.37 48.8598 93.8292 48.808 89.1796 49.0135C87.3457 49.0945 86.0132 50.6351 85.8094 52.4594C85.3779 56.3229 84.2803 62.12 83.6267 65.2656C82.9996 68.0247 80.3604 71.4905 78.8893 73.1464C78.7115 73.3465 78.5567 73.5635 78.4031 73.7828Z",
  "M31.5969 73.7828C34.514 77.9483 46.0742 80.956 46.2367 80.956H37.3218C37.1449 80.956 36.9685 80.9435 36.7939 80.9153C30.8891 79.9616 25.0617 76.5351 22.5391 74.6983C22.3107 74.532 22.1101 74.3355 21.9317 74.1165L18.7629 70.2275C18.6062 70.0352 18.4707 69.8283 18.357 69.6079L13.1867 59.5903C10.9326 53.5794 5.57815 52.3599 3.18496 52.1257C2.41254 52.0501 2.32669 51.811 3.00488 51.4336C7.6304 48.8598 16.1708 48.808 20.8204 49.0135C22.6543 49.0945 23.9868 50.6351 24.1906 52.4594C24.6221 56.3229 25.7197 62.12 26.3733 65.2656C27.0004 68.0247 29.6396 71.4905 31.1107 73.1464C31.2885 73.3465 31.4433 73.5635 31.5969 73.7828Z",
  "M60.7587 103.156C56.7526 107.162 55.1947 112.504 54.9165 114.674C54.9165 110.267 51.8007 106.272 50.2428 104.826C47.2873 101.634 45.2476 98.0318 44.3553 96.1279C44.1556 95.7018 44.0668 95.2358 44.0668 94.7652V91.1381C44.1576 89.321 44.5946 88.2457 44.9741 87.5892C45.3435 86.9501 45.7928 86.2999 46.2416 85.7138C50.2681 80.4553 53.4665 80.4553 54.4158 80.4553C58.066 80.1131 60.9368 82.6552 62.4952 84.2992C63.2916 85.1394 64.2067 86.1714 64.6907 87.223C67.3981 93.1057 63.3517 100.151 60.7587 103.156Z",
];

function Lotus({ size, colors, id }: { size: number; colors: [string, string]; id: string }) {
  return (
    <Svg width={size} height={size * 1.31} viewBox="0 0 110 144">
      <Defs>
        <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <G>
        {LOTUS_PATHS.map((d, i) => (
          <Path key={i} d={d} fill={`url(#${id})`} />
        ))}
        <Circle cx="55.25" cy="117" r="1.4" fill={colors[0]} />
        <Circle cx="55.25" cy="124" r="1" fill={colors[0]} />
      </G>
    </Svg>
  );
}

// ---------- helpers ----------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDob(dob?: string) {
  if (!dob) return "";
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return dob;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

type Row = [string, string | undefined];

export type PdfOptions = {
  template: PdfTemplateId;
  includeContact: boolean;
  includeAddress: boolean;
  age: number | null;
  siteUrl: string;
};

// ---------- document ----------

export function BiodataPdf({ bio, opts }: { bio: Biodata; opts: PdfOptions }) {
  registerFonts();
  const t = THEMES[opts.template];
  const s = makeStyles(t);
  const v = (k: BiodataTextField) => bio[k]?.trim() || undefined;

  const dobLine = [formatDob(v("dob")), opts.age !== null ? `${opts.age} years` : ""].filter(Boolean).join("  ·  ");
  const personal: Row[] = [
    ["Date of birth", dobLine || undefined],
    ["Height", v("height")],
    ["Weight", v("weight")],
    ["Marital status", v("maritalStatus")],
    ["Religion", v("religion")],
    ["Mother tongue", v("motherTongue")],
    ["Community", [v("community"), v("caste")].filter(Boolean).join(", ") || undefined],
    ["Sub-caste", v("subCaste")],
    ["Gotra", v("gotra")],
    ["Diet", v("diet")],
    ["Blood group", v("bloodGroup")],
    ["Lives in", [v("city"), v("state")].filter(Boolean).join(", ") || undefined],
  ];
  const horoscope: Row[] = [
    ["Time of birth", formatTime(v("birthTime")) || undefined],
    ["Place of birth", v("birthPlace")],
    ["Manglik", v("manglik")],
    ["Rashi", v("rashi")],
    ["Nakshatra", v("nakshatra")],
  ];
  const career: Row[] = [
    ["Education", v("education")],
    ["College", v("college")],
    ["Occupation", v("occupation")],
    ["Works in", v("sector")],
    ["Company", v("employer")],
    ["Annual income", v("income") === "Prefer not to say" ? undefined : v("income")],
    ["Work location", v("workCity")],
  ];
  const family: Row[] = [
    ["Father", [v("fatherName"), v("fatherOccupation")].filter(Boolean).join(" · ") || undefined],
    ["Mother", [v("motherName"), v("motherOccupation")].filter(Boolean).join(" · ") || undefined],
    ["Brothers", v("brothers")],
    ["Sisters", v("sisters")],
    ["Family type", v("familyType")],
    ["Native place", v("nativePlace")],
  ];
  const contact: Row[] = opts.includeContact
    ? [
        ["Contact person", [v("contactName"), v("contactRelation")].filter(Boolean).join(" · ") || undefined],
        ["Mobile", v("contactPhone") ? `+91 ${v("contactPhone")!.replace(/^\+?91\s?/, "")}` : undefined],
        ["Email", v("contactEmail")],
        ...(opts.includeAddress ? ([["Address", v("address")]] as Row[]) : []),
      ]
    : opts.includeAddress
      ? [["Address", v("address")]]
      : [];

  const photo = bio.photos[0];
  const extraPhotos = bio.photos.slice(1, 4);
  const name = v("fullName") || "Biodata";
  const tagline = [v("occupation"), [v("city"), v("state")].filter(Boolean).join(", ")].filter(Boolean).join("  ·  ");

  return (
    <Document title={`${name} - Biodata`} author="Sangam Setu" subject="Marriage biodata" creator="Sangam Setu">
      <Page size="A4" style={s.page}>
        <Decor template={opts.template} t={t} />

        {/* header */}
        <View style={opts.template === "royal" ? s.headerRoyal : s.header}>
          {v("heading") ? <Text style={s.invocation}>{v("heading")}</Text> : null}
          <View style={{ alignItems: "center", marginBottom: 4 }}>
            <Lotus size={opts.template === "royal" ? 26 : 30} colors={opts.template === "royal" ? ["#e9c46a", "#fff1c1"] : [t.gold, "#f0d27a"]} id="hdr" />
          </View>
          <Text style={s.kicker}>BIODATA</Text>
          <Text style={s.name}>{name}</Text>
          {tagline ? <Text style={s.tagline}>{tagline}</Text> : null}
        </View>

        {/* personal details and photo */}
        <View style={s.topRow}>
          <View style={{ flex: 1, paddingRight: photo ? 20 : 0 }}>
            <Section title="Personal details" rows={personal} s={s} t={t} />
          </View>
          {photo ? (
            <View style={s.photoCol}>
              <View style={s.photoFrame}>
                <Image src={photo} style={s.photo} />
              </View>
            </View>
          ) : null}
        </View>

        {horoscope.some((r) => r[1]) ? <Section title="Horoscope" rows={horoscope} s={s} t={t} twoCol /> : null}

        <View style={s.cols}>
          <View style={s.col}>
            <Section title="Education and career" rows={career} s={s} t={t} />
          </View>
          <View style={s.col}>
            <Section title="Family" rows={family} s={s} t={t} />
          </View>
        </View>

        {v("about") || v("hobbies") ? (
          <View style={s.section} wrap={false}>
            <SectionTitle title="About" s={s} t={t} />
            {v("about") ? <Text style={s.para}>{v("about")}</Text> : null}
            {v("hobbies") ? (
              <Text style={[s.para, { marginTop: 4 }]}>
                <Text style={{ fontWeight: 600, color: t.label }}>Hobbies  </Text>
                {v("hobbies")}
              </Text>
            ) : null}
          </View>
        ) : null}

        {v("expectations") ? (
          <View style={s.section} wrap={false}>
            <SectionTitle title="Partner expectations" s={s} t={t} />
            <Text style={s.para}>{v("expectations")}</Text>
          </View>
        ) : null}

        {contact.some((r) => r[1]) ? <Section title="Contact" rows={contact} s={s} t={t} /> : null}

        {extraPhotos.length ? (
          <View style={s.section} wrap={false}>
            <SectionTitle title="Photos" s={s} t={t} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              {extraPhotos.map((p, i) => (
                <View key={i} style={[s.photoFrame, { width: 150, height: 190 }]}>
                  <Image src={p} style={s.photo} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Made on Sangam Setu  ·  {opts.siteUrl}</Text>
        </View>
      </Page>
    </Document>
  );
}

function SectionTitle({ title, s, t }: { title: string; s: Styles; t: Theme }) {
  return (
    <View style={s.sectionHead}>
      <Svg width={9} height={9} viewBox="0 0 10 10" style={{ marginRight: 7 }}>
        <Path d="M5 0 L10 5 L5 10 L0 5 Z" fill={t.gold} />
      </Svg>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
    </View>
  );
}

function Section({ title, rows, s, t, twoCol }: { title: string; rows: Row[]; s: Styles; t: Theme; twoCol?: boolean }) {
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1]));
  if (!filled.length) return null;
  return (
    <View style={s.section} wrap={false}>
      <SectionTitle title={title} s={s} t={t} />
      <View style={twoCol ? { flexDirection: "row", flexWrap: "wrap" } : undefined}>
        {filled.map(([label, value]) => (
          <View key={label} style={[s.row, twoCol ? { width: "50%", paddingRight: 12 } : {}]}>
            <Text style={[s.label, twoCol ? { width: 88 } : {}]}>{label}</Text>
            <Text style={s.value}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Decor({ template, t }: { template: PdfTemplateId; t: Theme }) {
  const W = 595.28;
  const H = 841.89;
  if (template === "royal") {
    return (
      <>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} fixed>
          <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <Rect x="16" y="16" width={W - 32} height={H - 32} fill="none" stroke={t.gold} strokeWidth={0.8} />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Circle key={i} cx={W / 2 - 64 + i * 16} cy={H - 30} r={1.6} fill={t.gold} />
            ))}
          </Svg>
        </View>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 210 }}>
          <Svg width={W} height={210} viewBox={`0 0 ${W} 210`}>
            <Defs>
              <LinearGradient id="band" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={t.headerBg![0]} />
                <Stop offset="1" stopColor={t.headerBg![1]} />
              </LinearGradient>
            </Defs>
            <Path d={`M0 0 H ${W} V 170 Q ${W / 2} 198 0 170 Z`} fill="url(#band)" />
            <Path d={`M0 170 Q ${W / 2} 198 ${W} 170 L ${W} 174 Q ${W / 2} 202 0 174 Z`} fill={t.gold} />
          </Svg>
        </View>
      </>
    );
  }
  if (template === "ivory") {
    const corner = (x: number, y: number, rot: number) => (
      <G key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
        <Path d="M0 0 C 18 0 30 12 30 30" stroke={t.gold} strokeWidth={1} fill="none" />
        <Path d="M0 8 C 12 8 22 18 22 30" stroke={t.gold} strokeWidth={0.6} fill="none" />
        <Circle cx="6" cy="6" r="2.2" fill={t.gold} />
      </G>
    );
    return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} fixed>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Rect x="18" y="18" width={W - 36} height={H - 36} fill="none" stroke={t.gold} strokeWidth={1.4} />
          <Rect x="24" y="24" width={W - 48} height={H - 48} fill="none" stroke={t.gold} strokeWidth={0.5} />
          {corner(30, 30, 0)}
          {corner(W - 30, 30, 90)}
          {corner(W - 30, H - 30, 180)}
          {corner(30, H - 30, 270)}
        </Svg>
      </View>
    );
  }
  // marigold: a hanging garland of flowers along the top, leaves between
  const flowers = Array.from({ length: 19 }, (_, i) => i);
  const sag = (x: number) => 30 + 16 * Math.sin((Math.PI * x) / W);
  return (
    <>
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} fixed>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x="18" y="18" width={W - 36} height={H - 36} fill="none" stroke="#f0c585" strokeWidth={0.8} rx={6} />
      </Svg>
    </View>
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 70 }}>
      <Svg width={W} height={70} viewBox={`0 0 ${W} 70`}>
        <Rect x="0" y="0" width={W} height="10" fill="#7a0033" />
        {flowers.map((i) => {
          const x = 14 + i * ((W - 28) / 18);
          const y = sag(x);
          return (
            <G key={i}>
              <Path d={`M${x} 10 L${x} ${y - 9}`} stroke="#c96f10" strokeWidth={0.6} />
              <Circle cx={x} cy={y} r={9.5} fill={i % 2 ? "#f6b42c" : "#ee8a12"} />
              <Circle cx={x} cy={y} r={6.5} fill={i % 2 ? "#f9c94f" : "#f4a226"} />
              <Circle cx={x} cy={y} r={2.6} fill="#b8520a" />
              {i < 18 ? <Ellipse cx={x + (W - 28) / 36} cy={y + 3} rx={5} ry={2.4} fill="#4f8a3a" /> : null}
            </G>
          );
        })}
      </Svg>
    </View>
    </>
  );
}

// ---------- styles ----------

function makeStyles(t: Theme) {
  return StyleSheet.create({
    page: { backgroundColor: t.page, color: t.ink, fontFamily: SANS, fontSize: 9.6, paddingTop: 56, paddingBottom: 50, paddingHorizontal: 44, lineHeight: 1.38 },
    header: { alignItems: "center", marginBottom: 18, marginTop: 14 },
    headerRoyal: { alignItems: "center", marginBottom: 40, marginTop: -40, height: 164, justifyContent: "center" },
    invocation: { fontFamily: SERIF, fontStyle: "italic", fontSize: 10, color: t.headerSub, marginBottom: 6, letterSpacing: 0.5 },
    kicker: { fontSize: 8, letterSpacing: 4, color: t.headerSub, fontWeight: 600, marginBottom: 2 },
    name: { fontFamily: SERIF, fontWeight: 700, fontSize: 30, color: t.headerInk, textAlign: "center", lineHeight: 1.15 },
    tagline: { fontSize: 9.5, color: t.headerSub, marginTop: 3, letterSpacing: 0.3 },
    topRow: { flexDirection: "row", alignItems: "flex-start" },
    photoCol: { width: 168, alignItems: "center" },
    photoFrame: { width: 168, height: 212, borderRadius: 10, borderWidth: 2.5, borderColor: t.photoBorder, overflow: "hidden", backgroundColor: t.chipBg },
    photo: { width: "100%", height: "100%", objectFit: "cover" },
    cols: { flexDirection: "row", gap: 22 },
    col: { flex: 1 },
    section: { marginBottom: 12 },
    sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    sectionTitle: { fontFamily: SERIF, fontWeight: 700, fontSize: 13, color: t.accent },
    sectionRule: { flex: 1, height: 0.8, backgroundColor: t.rule, marginLeft: 8 },
    row: { flexDirection: "row", paddingVertical: 2.4 },
    label: { width: 96, color: t.label, fontWeight: 500 },
    value: { flex: 1, color: t.ink, fontWeight: 500 },
    para: { color: t.ink, lineHeight: 1.5 },
    footer: { position: "absolute", bottom: 24, left: 0, right: 0, alignItems: "center" },
    footerText: { fontSize: 7.5, color: t.muted, letterSpacing: 0.4 },
  });
}

type Styles = ReturnType<typeof makeStyles>;
