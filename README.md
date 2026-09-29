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

A dark chat-wallpaper look: charcoal `#0B141A` covered in faint line doodles of wedding things, maroon `#46001C` → `#AC0045` bubbles and buttons, and the gold lotus `#E0AD38`. Inter for text, Rozha One for headings. To change the wallpaper, edit `scripts/make_doodles.py` and run `python3 scripts/make_doodles.py`.

### Before launch

- Add Terms and Privacy Policy pages.
- Mobile numbers aren't verified yet. Add an SMS OTP provider (for example MSG91) to verify numbers at sign-up.
- Add an admin view to review reported or blocked profiles.
