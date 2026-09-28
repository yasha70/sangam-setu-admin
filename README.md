# Sangam Setu

Sangam Setu is a matrimony app for families. People build a complete profile, browse matches from their community, verify with Aadhaar to send or accept requests, and see each other's contact number only after a request is accepted.

## Website

`website/` is the public website. It's a static site with no build step:

| File | What it is |
| --- | --- |
| `website/index.html` | The page: hero chat, "why" comparison, how it works, app tour, for families, FAQ, closing |
| `website/styles.css` | Site styles, plus the app-screen mockup styles carried over from the app design |
| `website/script.js` | Mobile menu, the "Forward to family" share buttons, and the app-tour tabs |
| `website/doodles.svg` | The wedding-doodle wallpaper tile behind every page |
| `website/favicon.svg` | The gold lotus mark on maroon |

To view it locally, open `website/index.html` in a browser, or serve the folder:

```sh
npx serve website
```

It's deployed on Vercel from this repo with the project root directory set to `website`. There's no build command.

### Design

- A dark chat-wallpaper look: a charcoal `#0B141A` background covered in faint line doodles of wedding things (diya, kalash, marigold, rings, mangalsutra, garland, laddoos, chai, shehnai, dhol, doli, mandap), plus the double "forward" arrow.
- The idea behind the page is that families forward biodatas around group chats with the full address and phone number inside. Sangam Setu is the alternative, so the hero is a family group chat and the FAQ reads as questions and replies.
- Brand accents come from the app: maroon `#46001C` → crimson `#AC0045` bubbles and buttons, and the gold lotus `#E0AD38`.
- Inter for text. Rozha One (Latin and Devanagari) for headlines only.
- The phone mockups use the app's own screens, which are light.

To change the wallpaper, edit the icons in `scripts/make_doodles.py` and run `python3 scripts/make_doodles.py`.

### Before launch

- Add Terms and Privacy Policy pages and link them from the footer.
- Names, photos and phone numbers in the chat and phone previews are example data.
