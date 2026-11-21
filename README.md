# HARMONIE

A lightweight product showcase for HARMONIE, built with HTML, CSS, vanilla JavaScript, and Tailwind CSS utilities. The typography matches Portfolio 2.0: Fraunces for display type, Archivo for body text, and Space Mono for labels. There is no backend. Open `index.html` directly, or use the VS Code Live Server extension; Live Server is recommended for saving studio edits.

## Update the products

Edit `products.js` to change product names, descriptions, categories, prices, and photos. Add a new object to `window.HARMONIE_PRODUCTS` to add a card. Product images currently use Unsplash examples; replace the image ID with a real photo from the brand. The sample product details and prices should be replaced with her current information before publishing.

The **Owner studio** button is visible in the top navigation and footer. Click it, enter the starter passcode `change-me`, and the product manager opens. Set a personal value in `script.js` before sharing the site. She can replace the home and story photos, edit contact details and map coordinates, add a product with several photos, edit product details, add or replace gallery photos, and delete products. Her edits are saved only in that browser. Download the updated `products.js` catalogue and replace the project file to publish photos, contact, and product changes for customers.

The contact section uses a deliberately masked Nigerian sample number, the reserved `example` email domain, and an approximate Asaba city-center map pin. In Owner studio, update the contact fields and map coordinates when she confirms them. The map pin is city-level only, not a claimed home or studio address.

Because this is a static site, the passcode is visible to someone who inspects the JavaScript source. It helps keep the editing controls out of the way, but it is not secure authentication. Edits also do not sync between browsers or devices unless the exported catalogue is used to update the site files.

Supported filters are `Tops`, `Dresses`, and `Accessories`. Use one of those category names for each product, or add a matching filter in `index.html`.

## Files

- `index.html` — page content, Tailwind CDN, font loading, and metadata.
- `styles.css` — brand styling and responsive layout.
- `script.js` — product cards, category filters, and product details dialog.
- `products.js` — editable product showcase data.
- `favicon.svg` — HARMONIE brand icon.
- `vercel.json` — Vercel build and output settings.

The layout follows Portfolio 2.0's 1200px centered grid, rounded header and buttons, consistent 16px desktop / 14px mobile body copy, and 12px / 10px mono labels. The color palette switches automatically between light and dark using the visitor's phone or computer appearance setting. Starter fashion photos are examples; replace them with HARMONIE's own photos in Owner studio. If an external example photo fails to load, a designed HARMONIE fallback appears instead of a blank box. Tailwind utilities and fonts load from external services, so an internet connection is needed for those assets. The page structure and custom styling remain in the local files.

## Deploy to Vercel

Push the project to a Git repository and import it in Vercel. The included configuration runs `npm run build` and serves the generated `dist` folder. You can also run `npm run build` locally to check that the deployment build completes.
