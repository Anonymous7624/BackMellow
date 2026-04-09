# BackMellow — Static Ecommerce Landing Page

A polished, conversion-focused static storefront for the **BackMellow** lumbar support pillow brand. Built with plain HTML, CSS, and JavaScript — no build tools, no frameworks, no dependencies.

---

## Live Site

Once deployed, your site will be live at:
```
https://<your-github-username>.github.io/BackMellow/
```

---

## File Structure

```
BackMellow/
├── index.html          ← Main page (all sections)
├── css/
│   └── styles.css      ← Full design system + responsive layout
├── js/
│   └── main.js         ← All interactions (cart, slideshow, FAQ, etc.)
├── Image_1.avif        ← Product images (root level, relative paths)
├── Image_2.avif
├── Image_3.avif
├── Image_4.avif
├── Image_5.avif
├── Image_6.avif
└── README.md
```

---

## Deploy to GitHub Pages

### Option A — Repository Settings (simplest)

1. Push all files to the `main` branch of your GitHub repo (`BackMellow`).
2. Go to **Settings → Pages** in your GitHub repo.
3. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
4. GitHub will publish the site within ~30 seconds.
5. Visit `https://<your-username>.github.io/BackMellow/`

### Option B — gh-pages Branch

```bash
# From the repo root
git checkout -b gh-pages
git push origin gh-pages
```
Then set GitHub Pages source to the `gh-pages` branch.

---

## What's Included

| Feature | Status |
|---|---|
| Hero with auto-playing slideshow | ✅ |
| Thumbnail strip + click-to-enlarge lightbox | ✅ |
| Touch/swipe support for slideshow | ✅ |
| Benefits section (6 cards, scroll reveal) | ✅ |
| Sample customer reviews | ✅ |
| Shop section with color + quantity selectors | ✅ |
| Bundle pricing (3+ = $30 each, auto-applied) | ✅ |
| Max 5 units enforced everywhere | ✅ |
| Working cart drawer (add, update, remove) | ✅ |
| Cart persisted in localStorage | ✅ |
| "Checkout coming soon" modal | ✅ |
| Use cases section | ✅ |
| Product specifications table | ✅ |
| FAQ accordion (animated) | ✅ |
| Sticky header with scroll-aware styling | ✅ |
| Smooth scroll + active nav highlighting | ✅ |
| Mobile hamburger menu | ✅ |
| Fully responsive (mobile-first) | ✅ |
| Accessible (ARIA, keyboard, focus states) | ✅ |
| Stripe checkout | 🔜 Coming soon |

---

## Customization

### Pricing
Edit the constants at the top of `js/main.js`:
```js
const CFG = {
  regularPrice:  34.99,  // Sale price shown
  originalPrice: 49.99,  // Struck-through price
  bundlePrice:   30.00,  // Price per unit when qty >= bundleMin
  bundleMin:     3,      // Minimum qty for bundle
  maxQty:        5,      // Max per order
  ...
};
```

### Product Images
Replace the `.avif` files in the repo root. Image filenames and alt text are referenced in both `index.html` (slideshow/gallery HTML) and `js/main.js` (`CFG.images` array for the lightbox).

### Dimensions
When your supplier confirms dimensions, add them to the spec table in `index.html`:
```html
<!-- Find this row in #details section -->
<span class="spec-value spec-pending" role="cell">
  <!-- Replace with: -->
  18" × 12" × 4" (approx.)
</span>
```

### Contact Email
Replace `hello@backmellow.com` in `index.html` and `css/styles.css` with your real address.

### Adding Stripe Checkout
When ready, replace the `openCheckoutModal()` calls in `js/main.js` with your Stripe Checkout or Payment Link integration. The cart state (`S.cart`) contains `{ color, qty }` objects ready to pass to your backend.

---

## Browser Support

The site uses modern CSS (CSS custom properties, grid, `aspect-ratio`, `backdrop-filter`) and AVIF images. Supported in all modern browsers (Chrome 90+, Firefox 93+, Safari 16+, Edge 90+).

For older browsers, images will fall back gracefully (the `<img>` element will show a broken image placeholder), and layout will still function with minor visual differences.

---

## License

© 2026 BackMellow. All rights reserved.
