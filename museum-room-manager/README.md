# Museum Room Manager

Local-only management tool for the Virtual Upper Midwest Auto Racing Museum's curated Museum Rooms.

## Why this exists

Museum Room images must not depend on ChatGPT conversation attachments, GitHub binary uploads, or hard-coded substitutes. The Manager uploads approved images directly from the browser to Supabase Storage and records the exact Room/slot assignment in the database.

## First-time setup

1. Open PowerShell in `C:\Users\schaf\racing-museum\museum-room-manager`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add the Supabase service-role key. Do not commit `.env`.
4. Run `npm start`.
5. Open `http://127.0.0.1:4217`.

The server binds only to `127.0.0.1`. The service-role key remains server-side and is never sent to the browser.

## Room workflow

- Create or select a Room.
- Keep it in **Draft** while assembling it.
- Drag a whole image batch into **Fast Import**. A filename containing a four-digit year automatically maps to `winner-YYYY`; a filename containing `watermark` maps to the Room watermark.
- Review subject, photographer/source credit, crop position and approval state.
- Use **Preview Wall** before publication.
- Change status to **Published** only after the Room is complete. Public website queries can read only published Rooms and their approved assets.

## Storage convention

Room 001 uses:

`media/rooms/001-oktoberfest/`

Each asset has one stable slot path, such as:

- `watermark.jpg`
- `winner-1970.jpg`
- `winner-1971.jpg`
- `hero.jpg`
- `story.jpg`

Replacing an image keeps the same logical slot. The database records the exact storage path and presentation crop.

## Database

The Manager uses:

- `public.museum_rooms`
- `public.museum_room_media`

The older `public.museum_room_assets` table is left untouched for compatibility with any earlier experiments.

## Security

The public site has SELECT access only to Rooms with `status='published'` and approved media belonging to those Rooms. All Manager writes use the local server's service-role key.

The Supabase service-role credential that had previously been committed under `museum-newspaper-manager/.env` is intentionally removed on this branch. Rotate that key before merging this security cleanup into production because deletion from the current tree does not erase it from Git history.
