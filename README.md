# HARMONIE

A phone-first crochet showcase built with HTML, CSS, vanilla JavaScript, Tailwind utilities, and Vite. Typography follows Portfolio 2.0: Fraunces, Archivo, and Space Mono. The layout responds to a visitor's system light or dark preference.

## Collection and photos

`products.js` contains sample products and the first-visit contact details. Replace the sample fashion photos with HARMONIE's own work in Owner studio. Broken images show a designed fallback rather than an empty block.

Owner studio lets the owner add, edit, replace photos, and delete products. When shared storage is configured, each change is published to the hosted catalogue and appears to visitors on their next page load (already-open pages refresh the catalogue about every 30 seconds). Product photos are compressed and uploaded to Supabase Storage.

Without shared storage configured, changes are saved in that browser only. A static Vercel deployment cannot share browser-local edits with customers or write its own deployed files. Do not promise that edits sync until the Supabase setup below is complete.

## Connect shared publishing (Supabase)

1. Create a Supabase project and open **SQL Editor**. Run [`supabase/setup.sql`](supabase/setup.sql).
2. In Supabase Authentication, disable public sign-ups and create one owner account for `harmonyahukanna23@gmail.com`. This keeps authenticated write access limited to the owner account.
3. Copy the project's **Project URL** and **publishable key** (or legacy anon key) into `url` and `publicKey` in [`cloud-config.js`](cloud-config.js). Never use a service-role key in browser code.
4. Redeploy the Vite site to Vercel. Open Owner studio on the deployed site and sign in with the owner account. On first sign-in, the current sample catalogue is published. The owner can then replace it with her real product photos.

The public storefront can read the published catalogue and photos. Uploads and catalogue changes require the signed-in owner. Owner credentials are entered into the sign-in form and are not stored by the site. Contact changes and home/story photo updates use the same shared publishing flow.

## Current contact details

The site currently shows the phone and email supplied for HARMONIE, the Dennis Osadebay University Anwai Campus address in Asaba, and that HARMONIE also sells in Lagos State. The map pin is an approximate campus-area pin, not a private residence or exact shop location. The owner can adjust the contact and map fields in Owner studio.

## Local development and deploy

Run `npm install`, then `npm run dev` for local work. `npm run build` creates the Vercel-ready `dist` folder. The included `vercel.json` sets the build and output directory. Font and Tailwind CDN assets need an internet connection.

## Files

- `index.html` — storefront, collection, contact section, map, and Owner studio.
- `styles.css` — responsive brand styling and light/dark appearance.
- `script.js` — storefront rendering, owner tools, and publishing flow.
- `cloud.js`, `cloud-config.js` — small Supabase REST client and public project settings.
- `products.js` — editable sample products and contact defaults.
- `supabase/setup.sql` — database, read access, owner write access, and image bucket policies.
