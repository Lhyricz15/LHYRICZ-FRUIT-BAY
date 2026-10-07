# LHYRICZ FRUIT BAY — WhatsApp Ordering Website

A mobile-friendly static food ordering website for LHYRICZ FRUIT BAY.

## Deploy

1. Upload this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Deploy with no build command and no framework preset.
4. Keep `index.html` as the site root.

## Admin

Open `/admin.html` on the deployed site.

Default admin password: `1234`

You can change the password inside the dashboard.

## Important limitation

This version stores menu, product photos and settings in the browser using localStorage. It is intentionally simple and requires no database or login service. Changes made in one browser/device do not automatically sync to other devices.

For a true multi-device client dashboard, replace the localStorage layer with a secure backend/database later.
