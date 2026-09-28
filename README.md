# Sangam Setu

Sangam Setu is a matrimony app for families. People build a complete profile, browse matches from their community, verify with Aadhaar to send or accept requests, and see each other's contact number only after a request is accepted.

## Website

`website/` is the public marketing site for the app. It's a static site with no build step:

| File | What it is |
| --- | --- |
| `website/index.html` | The page: hero, privacy rules, how it works, app tour, for families, FAQ, launch |
| `website/styles.css` | Site styles, plus the app-screen mockup styles carried over from the app design |
| `website/script.js` | Mobile menu, the before/after-acceptance demo, and the app-tour tabs |
| `website/favicon.svg` | The gold lotus mark on maroon |

To view it locally, open `website/index.html` in a browser, or serve the folder:

```sh
npx serve website
```

To deploy, point any static host (Vercel, Netlify, GitHub Pages) at the `website/` folder. No build command is needed.

### Design

The site follows the app's FINAL UI design:

- Brand gradient `#46001C` → `#AC0045`, gold lotus `#B28A2A` / `#E0AD38`
- Inter for text. Rozha One (Latin and Devanagari) for headlines only
- The phone mockups use the app's own screens: home feed, profile before and after acceptance, requests, connections, and the profile tab

The site follows the viewer's light or dark system setting. The phone mockups always stay light, because the app is light-only.

### Before launch

- Replace the "Coming soon" badges in the `#launch` section with the real Play Store and App Store links.
- Add Terms and Privacy Policy pages and link them from the footer. The app's sign-in screen already refers to both.
- Profile photos in the mockups are placeholder silhouettes. Names and phone numbers are example data.
