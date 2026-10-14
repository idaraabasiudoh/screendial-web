# Screendial website

The landing page for Screendial, a Gropad Inc product. Static HTML and CSS, served by Vercel.

- `index.html`: home page, with download buttons and Log in / Sign up
- `account/`: sign in or up, view history, delete account (`assets/js/account.js`)
- `privacy/`, `terms-of-service/`, `terms-of-use/`: legal pages. The old `*.html` files at the root only redirect to these.
- `assets/css/site.css`: styles for every page
- `assets/brand/`, `assets/icons/`: logo, favicons and app icons
- `assets/social/og-image.png`: the image shown when a link is shared
- `assets/videos/background.mp4`: the home page background video (add it here)
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, `favicon.ico`: stay at the root, where crawlers and browsers look for them

Pages use root-relative paths (`/assets/...`), so the site must be served from the domain root (www.screendial.com).

Downloads link to the latest release of this repo. The app's build workflow publishes them as `Screendial.dmg` and `Screendial-Setup.exe`, so the links never change between versions.

Preview locally with `python3 -m http.server` and open http://localhost:8000.
