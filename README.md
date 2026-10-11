# Sangam Setu

Sangam Setu is a matrimony web app for families. People sign up, create a detailed biodata with photos and prompts, discover matches that explain themselves, see free Guna Milan with every profile, let their family weigh in through a private link, chat in real time once an interest is accepted, plan the first meeting, and download their biodata as a designed, print-quality PDF.

## What makes it different

Built after looking at how Shaadi.com, BharatMatrimony, Jeevansathi, Sangam.com, Betterhalf and Hinge work, keeping what families rely on and adding what they lack:

| Feature | Why | Where |
| --- | --- | --- |
| **Home hub** with "Aaj ke rishte" (6 daily picks), people interested in you, mutual matches, new members, profile strength | One place to start every day | `src/app/home` |
| **Discover deck**: one profile at a time; swipe or ←/→/↑, undo a pass | Faster and more engaging than a grid | `src/app/discover`, `src/components/DiscoverDeck.tsx` |
| **Match score with reasons** from structured partner preferences, and **mutual match** when both fit each other | Big apps show a number; we show why | `src/lib/match.ts`, `src/components/Insights.tsx` |
| **Free Guna Milan** (36-point Ashtakoota) on every profile, plus a public tool at `/kundli` | Usually a paid add-on elsewhere | `src/lib/astro.ts`, `src/components/KundliTool.tsx` |
| **Prompts** (Hinge-style): like an answer and send a note with the interest; the note becomes the first chat message | Notes get far more replies than a bare interest | `src/lib/prompts.ts`, `src/components/PromptCards.tsx`, `src/components/Interest.tsx` |
| **Parivar panel**: one private link (14 days) where family react ❤️ 👍 🤔 👎 and comment without an account | Indian matches are family decisions | `src/app/family`, `src/app/f/[token]`, `src/components/Family.tsx` |
| **Plan a meeting** in chat (video call, phone call, coffee, family visit), accept with one tap, add to Google Calendar | Moves people from chat to meeting | `src/components/Conversation.tsx`, `src/app/api/chat/[id]/meet` |
| **Typing indicator and icebreakers** in chat | Easier first message | `src/lib/match.ts` (`icebreakers`) |
| **WhatsApp-style chat**: reply to a message, emoji reactions (or double-tap ❤️), delete for everyone within an hour, copy, photos with full-screen view, voice notes up to 2 minutes, emoji and quick replies, chat search, online dots | Families expect the chat they already know | `src/components/Conversation.tsx`, `src/app/api/chat/[id]/*` |
| **Voice and video calls in the app**, peer to peer over WebRTC, ringing on any page, mute, camera off, flip camera; call history cards with "Call back" | Talk before meeting without sharing numbers | `src/lib/calls.ts`, `src/components/CallManager.tsx`, `src/app/api/call` |
| **Money-scam warning** under any message that mentions UPI, OTP, bank details or money, plus a Safety centre | Romance and matrimony fraud usually starts with a money request | `src/components/Conversation.tsx`, `src/app/safety` |
| **Compare profiles** side by side (up to 3) with match, Guna, details, family reactions and your notes | How families actually weigh options | `src/app/compare`, `src/components/Compare.tsx` |
| **Private notes** on any profile, visible only to you | "Papa spoke to their father on Sunday" | `PrivateNote` in `src/components/Compare.tsx` |
| **Notifications** for interests, acceptances, profile views, family reactions and meetings | Brings people back | `src/app/notifications` |
| **"Rishta jud gaya" celebration** when both say yes | A moment worth remembering | `Celebrate` in `src/components/Interest.tsx` |
| **Photo privacy**: show photos only to people you've shown interest in | Common request from families | `photoPrivacy` in `src/lib/data.ts` |
| **Installable app** (web manifest and icons), no Play Store needed | Works like an app on any phone | `src/app/manifest.ts`, `public/icons` |

## The app

`website/` is a Next.js app, deployed on Vercel with the project root directory set to `website`.

| What | Where |
| --- | --- |
| Sign up and log in (mobile number and password) | `src/app/signup`, `src/app/login`, `src/app/api/auth` |
| Biodata editor and photos | `src/app/biodata/edit`, `src/components/BiodataEditor.tsx`, `src/app/api/photos` |
| Browse with filters, saved profiles | `src/app/browse` |
| Profiles, interests (send, accept, decline, withdraw), block | `src/app/profile/[id]`, `src/app/interests`, `src/app/api/interests` |
| Real-time chat with read ticks | `src/app/chat`, `src/components/Conversation.tsx`, `src/app/api/chat` |
| PDF biodata in three designs | `src/lib/pdf/BiodataPdf.tsx`, `src/app/api/pdf` |
| Report a profile, account page (change password, delete account) | `src/components/ProfileActions.tsx`, `src/app/account`, `src/app/api/report`, `src/app/api/account` |
| Admin panel | `src/app/admin`, `src/app/api/admin`, `src/lib/admin.ts` |
| Home, Discover, Search (sort by best match, newest, active, Guna) | `src/app/home`, `src/app/discover`, `src/app/browse`, `src/lib/feed.ts` |
| Notifications, Parivar panel, Kundli tool | `src/app/notifications`, `src/app/family`, `src/app/f/[token]`, `src/app/kundli` |
| Data access | `src/lib/data.ts` (all Redis keys are listed at the top), `src/lib/kv.ts` |

### Member features

- Every member gets a profile ID (SS1001, SS1002, …). It shows on the profile, on the PDF, and can be typed into Browse search.
- Profiles show when the person was last active ("Online", "Active today", …).
- "Who viewed your profile" on My biodata lists recent visitors and the total count.
- Any profile can be reported (fake profile, wrong information, rude messages, …). Reports go to the admin queue.
- Verified profiles carry a green tick, and Browse can filter to verified only.
- The Account page changes the password or deletes the account and all its data.

### Admin panel

Open `/admin` and log in with the `ADMIN_PASSWORD` environment variable. Without that variable the admin panel stays switched off. The admin session lasts 12 hours.

- **Dashboard**: members, brides, grooms, published, verified, active this week, interests, connections, messages, open reports, and charts of new members and messages for the last 14 days.
- **Members**: search every member by name, mobile, city or ID. On a member page: verify or remove the tick, hide the biodata from Browse, suspend (logs them out and blocks log-in), restore, or delete the account.
- **Reports**: open reports with the reason and note. Dismiss one, or suspend the reported member.
- **Settings**: an announcement strip shown to every member at the top of the site, and a switch to remove or restore the sample profiles.

To change the admin password, edit `ADMIN_PASSWORD` in Vercel → Project → Settings → Environment Variables and redeploy.

### Testing chat and calls yourself (temporary)

Admin → **Testing** creates two connected test accounts (a test groom and a test bride) with one-tap login links. Open one link on each of two devices, or one in an incognito window, and you land straight in their chat, ready to message or call. The same page can connect any two existing accounts by mobile number or profile ID, skipping the interest step. Test accounts stay unpublished, carry a "Test account" tag in Members, and the **Delete test accounts** button removes them and their chats. The code lives in `src/lib/testing.ts`, `src/app/admin/testing`, `src/app/api/admin/testing` and `src/app/t/[token]`; delete those when the tools are no longer needed.

### Calls

Calls connect the two browsers directly (WebRTC) and use public STUN servers to find a route. On some mobile networks a direct route isn't possible; for those, add a TURN relay (for example from Metered, Twilio or Cloudflare) by setting `TURN_URL` (comma-separated), `TURN_USERNAME` and `TURN_CREDENTIAL` in Vercel. Until then, a call that can't connect ends with "Couldn't connect on this network".

### Guna Milan

`src/lib/astro.ts` works out all eight kootas (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) from each person's Moon nakshatra and rashi, and flags Nadi and Bhakoot dosha. Point tables differ slightly between panchangs, so the app labels the result as a guide to confirm with the family pandit. Nakshatra spellings like "Mrigasira", "Pooradam" or "Revathi" are recognised.

### Privacy rules the code enforces

- Other people see only the city and state. The full address is shown only to its owner, and printed only on the owner's own PDF if they choose.
- Contact details are sent to a viewer only after an interest between the two is accepted.
- Chat opens only between two accepted connections. Either side can block the other.
- Phone numbers, email addresses and WhatsApp/Telegram links typed into chat, interest notes, biodata text, prompts and family comments are replaced with "📵 number hidden" before they're saved, and again when shown, so older messages are covered too. It catches spaced-out digits, +91/0 prefixes and numbers spelt out in English or Hindi words, while leaving dates, amounts and pin codes alone (`src/lib/privacy.ts`). The Contact person section isn't affected. Admins can switch it off in Settings and see how often each member tried.
- With photo privacy on, photos are left out of the page entirely (not just blurred) until the member sends an interest or connects.
- Family review links show first name and last initial, never contact details or address, and skip anyone who turned off family sharing. Links expire after 14 days and can be switched off.

### Services

- **Upstash Redis** stores accounts, biodatas, interests and messages. Connect it in Vercel → Storage → Create Database → Upstash for Redis. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Until it's connected, the site shows a "Connect the database" page.
- **Vercel Blob** stores photos (`BLOB_READ_WRITE_TOKEN`).
- Sessions are signed with `SESSION_SECRET` if it's set, otherwise with a key derived from the Redis token.

### Run it locally

```sh
cd website
npm install
npm run dev
```

Without Redis variables, local development uses an in-memory store saved to `website/.data/`, and photos are kept inline.

### Design

A festive wedding look: warm ivory `#FFF5E8` covered in colourful line doodles of wedding things, a maroon-to-rani-pink header (`#9E0038` → `#E0306F`) with a marigold toran below it, marigold `#F28C0F` buttons, and mehendi green and peacock blue as supporting colours. Inter for text, Rozha One for headings. To change the wallpaper, edit `scripts/make_doodles.py` and run `python3 scripts/make_doodles.py`.

### Sample profiles

24 sample profiles (12 brides, 12 grooms) are added the first time someone opens Browse, from `src/lib/samples.ts`. They use illustrated portraits from `public/samples` (made by `scripts/make_sample_avatars.py`), show a "Sample profile" tag, can't receive interests, and have no login. Real profiles always appear before them. To remove them, use Admin → Settings, or set `SANGAM_SAMPLE_PROFILES=off` in Vercel and redeploy.

### Before launch

- Home, Discover and Search score every published profile on each visit. That's fine for a few thousand profiles; beyond that, cache scores or pre-filter in Redis.
- Add Terms and Privacy Policy pages.
- Mobile numbers aren't verified yet. Add an SMS OTP provider (for example MSG91) to verify numbers at sign-up.
