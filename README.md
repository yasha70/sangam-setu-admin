# Sangam Setu

Sangam Setu is a matrimony web app for families. People sign up, create a detailed biodata with photos, browse other biodatas, send interests, chat in real time once an interest is accepted, and download their biodata as a designed, print-quality PDF.

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
| Data access | `src/lib/data.ts` (all Redis keys are listed at the top), `src/lib/kv.ts` |

### Privacy rules the code enforces

- Other people see only the city and state. The full address is shown only to its owner, and printed only on the owner's own PDF if they choose.
- Contact details are sent to a viewer only after an interest between the two is accepted.
- Chat opens only between two accepted connections. Either side can block the other.

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

24 sample profiles (12 brides, 12 grooms) are added the first time someone opens Browse, from `src/lib/samples.ts`. They use illustrated portraits from `public/samples` (made by `scripts/make_sample_avatars.py`), show a "Sample profile" tag, can't receive interests, and have no login. Real profiles always appear before them. To remove them, set `SANGAM_SAMPLE_PROFILES=off` in Vercel and redeploy.

### Before launch

- Add Terms and Privacy Policy pages.
- Mobile numbers aren't verified yet. Add an SMS OTP provider (for example MSG91) to verify numbers at sign-up.
- Add an admin view to review reported or blocked profiles.

## VivahKala (wedding invitation cards and videos)

`vivahkala/` is a separate site, deployed on Vercel as the `vivahkala` project (root directory `vivahkala`, no build step) at https://vivahkala.vercel.app.

- `index.html` the whole app: card designer, animated video maker, and the Plan page. Phones get a top bar, a bottom tab bar (Details, Card, Video, Plan) and a download bar above it; screens 1024px and wider get a side menu with the plan card, a large preview and the controls beside it.
- `admin.html` the owner's panel at `/admin`: payments to approve, customers (give Pro days, remove Pro, new password, CSV), earnings, and Settings (UPI ID, prices, free trial days).
- `api/` Vercel functions, the same model as PakkaBill: `auth` (sign up, log in, mobile number and password), `me`, `config`, `pay` (submit a UTR, list my payments), `admin`.
- The video (about 50 seconds, 9:16): the intro writes the title out by hand; the groom and the bride each walk in; the **varmala** under a mandap, where the bride lifts her garland over the groom's head and places it round his neck, then he does the same for her (the one receiving bows their head, and petals burst as each garland lands); the functions; a **countdown** of days left to the wedding (from the day the video is made); the date and venue; and a closing **namaste**, both with palms joined, bowing to invite the guests. A **guest name** (Video → Personal invite) greets that family by name at the start and the end, and goes into the file name, so one video can be made per family.
- `qrcode.js` QR code generator (qrcode-generator 1.4.4, MIT) for the UPI QR.

### Accounts

Downloading anything (card image, PDF, share, making or downloading the video) needs an account. Logged out, those buttons open a Log in / Create account dialog (mobile number and password, no OTP yet) and the download carries on as soon as the person is signed in. Designing and previewing stay open to everyone. Accounts need the Upstash database connected to the project; if the server can't be reached the dialog says sign-in is not available. The check runs in the browser, since the files are made on the device.

### Plans

| | Free | Pro (monthly or yearly) |
|---|---|---|
| Card designs | 6 | all 20 |
| Video designs | 2 | all 7 |
| Downloads | small "Made with VivahKala" mark | no mark |
| PDF, HD 720p video, own song | – | ✓ |

Free users can preview every design; Pro is asked for when they download. Payment is by UPI QR: the customer pays the owner's UPI ID, submits the 12-digit UTR, and the owner approves it in `/admin`, which adds 30 or 365 days (renewals add on top). New accounts get a free Pro trial (`trialDays`, default 1, 0 turns it off). Until a UPI ID is saved in `/admin`, or if the server can't be reached, everything is free.

### Setting it up on Vercel

1. Connect the existing Upstash Redis database to the `vivahkala` project (Storage → Connect). Its keys are stored under `vk:`, so it can share the database with PakkaBill and Sangam Setu.
2. Add `ADMIN_PASSWORD` (8+ characters) and redeploy.
3. Open `/admin` → Settings, save your UPI ID, the name customers see, and prices (default ₹149 a month, ₹499 a year).

Plan checks run in the browser, so a technical user could get around them. Payments only count once the owner approves them.
