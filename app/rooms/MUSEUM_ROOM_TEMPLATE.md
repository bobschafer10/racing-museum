# Museum Room Template

The Museum Room system is an exhibit layer, not a database dump. Every future room should use `app/rooms/_components/MuseumRoomV2.tsx` and keep the same basic visitor flow.

## Required room structure

1. **Hero** — room number, event/subject identity, date range, one strong background image, short lede, and no more than four statistics.
2. **The Story** — one concise historical narrative paired with one strong image. External history/source links may appear here.
3. **Winners / Timeline Wall** — compact visual tiles only. Each tile opens a focused exhibit overlay. Do not place full result tables, newspaper walls, biographies, and navigation controls directly on the room wall.
4. **The Display Case** — no more than four featured artifacts on the main room page. Newspaper scans, programs, yearbooks, and other primary sources live one level deeper in their archive pages.
5. **Legacy / Exit** — concise closing interpretation and links to the related track/event/next chapter.

## Year/timeline exhibit behavior

- Main wall shows year, subject/winner, and one strong image.
- If a strong image is unavailable, use the designed year plaque. Never show a broken image or low-quality browser placeholder.
- Opening a tile reveals the preserved top finishers and contextual links.
- `Read the Full Race Story` should point to the best available MRN/CFRN contemporary race story for historical rooms when that material exists.
- `Winner Profile` points to the museum driver profile when available.
- Both downstream links must carry `returnTo` and `returnLabel` so the visitor returns to the exact year tile in the Museum Room.

## Curation rules

- The room should feel like a museum exhibit, not a search results page.
- Limit the primary navigation to four sections whenever possible.
- Do not create separate large card grids for winners, photos, newspapers, programs, and results on the same page.
- Keep source depth in the archive and surface only representative objects in the room.
- Favor whitespace and large imagery over dense metadata.
- Use one dominant visual language across all Rooms. Subject matter and imagery change; interaction patterns do not.

## Future room implementation

A new room should normally require only a server page that:

- fetches or defines its timeline/event data;
- maps each timeline item into `MuseumRoomYear` objects;
- defines up to four `MuseumRoomArtifact` objects;
- supplies hero, origin, archive, and legacy copy to `MuseumRoomV2`.

Do not fork the reusable component for each room unless the room truly needs a new exhibit type that will also be useful elsewhere.
