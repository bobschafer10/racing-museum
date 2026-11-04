# Media Member of the Month — Room 002: Gary & Pete Vercauteren
Research working dossier · 2026-11-03

## Exhibit scope and editorial rules
- Focus the exhibit on **Gary and Pete Vercauteren**. Harold and Regina Vercauteren and other relatives belong in a clearly differentiated family-context section, not as interchangeable media credits.
- **Do not confuse credited race-car photographs with identified portraits of Gary and Pete.** The museum does not yet have verified portraits for the new room hero.
- **Do not conflate** Jim Vercauteren or Keith Vercauteren photo credits with Gary/Pete. Treat 1970 OCR bylines under "Gerard Vercauteren" as an unresolved name until independently verified, rather than mapping those bylines to Gary.
- Original newspaper page and yearbook image remains the strongest primary evidence. OCR is an index, not a replacement for inspecting the image. Separate byline, photograph credit, company advertisement, news subject and general surname mention.
- Preserve Room 001 (Bob Bergeron), October's featured media member. This draft introduces the next media room on a feature branch, not in production.

## Live museum archive inventory
Queried Supabase project `szvkleurojiwqkkztxtr`, tables `photos`, `newspaper_ocr_search_pages`, `archive_ocr_pages`, `museum_archive_search_pages` on 2026-11-03.

### Raw photo-table records
| Photographer slug | Records | Explicit photo credits | Posts | Null credit type |
|---|---:|---:|---:|---:|
| pete-vercauteren | 213 | 170 | 35 | 8 |
| pete-vercauteran (apparent variant) | 1 | 1 | 0 | 0 |
| gary-vercauteren | 22 | 22 | 0 | 0 |
| keith-vercauteren (related / exclude from Gary + Pete totals) | 244 | 2 | 240 | 2 |

Gary+Pete combined: 236 raw records; **193** records explicitly typed as photos; **35** posts; **8** untyped. **2** Gary/Pete records have `driver_slug='unknown-driver'` (both Pete). Public photographer directory has different, filtered counts; do not confuse its figures with this full raw inventory.

Pete's most represented track slugs: Brown County Speedway 41, Wisconsin International Raceway 29, Shawano Speedway 28, Leo's Speedway 15, Capital Super Speedway 11, Seymour Speedway 10, Rockford Speedway 8. Pete also has 63 records labeled `unknown-track`. Gary has 19 WIR records out of 22. Apparent spelling/track-alias errors deserve later normalization, but do not blindly change originals or import duplicates.

### Newspapers: MRN and CFRN
Rows whose OCR has `vercaut` anywhere:
- Midwest Racing News: **2,638** matching page records.
- Checkered Flag Racing News: **608** matching page records.
- Combined: **3,246** matching pages; not 3,246 independently attributed articles.

More targeted `By[whitespace]+Pete Vercauteren` or `By[whitespace]+Gary Vercauteren`:
- Pete: **430 MRN** and **105 CFRN** candidate byline-pages.
- Gary: **713 MRN** and **257 CFRN** candidate byline-pages.
- The union is **1,462 unique matched page records**, because some pages have multiple byline patterns.
- See `002-vercauteren-ocr-byline-candidates.csv` in this directory for all page IDs, issue dates, page labels and museum-page URLs.
- Distinguish: byline *page* is not necessarily unique published story. Some stories are reprinted between MRN/CFRN. OCR introduces spelling errors, and mastheads have frequent surname entries.

Byline examples independently checked in archive OCR:
1. MRN, July 30, 1970, p. 11 — "Shawano Sweep For J. J. Smith," by Pete Vercauteren.
2. MRN, August 20, 1970, p. 14 — "Capacity De Pere Crowd," by Gary Vercauteren.
3. CFRN, May 30, 1979, p. 7 — "J.J.'s Flying At Shawano," by Pete Vercauteren.
4. MRN, May 17, 1979, p. 5 — 1979 Shawano opener, by Pete Vercauteren.
5. MRN, February 6, 1992, p. 13 — Gary's "Wisconsin Shortracks" column.
6. MRN, May 7, 1992, p. 2 — Jim Weber at WIR Spring Classic, by Gary Vercauteren.
7. MRN, April 16, 1992, p. 6 — Gary identified in a news article as a series organizer.

### Programs/yearbooks OCR
The museum's cross-source OCR search identifies **50 surname-matching pages across 18 yearbooks**, but includes other family members and company credits.
Specific verified primary-source leads:
- 1979 WIR yearbook, p. 5, “Kulwicki drives faster than he talks,” by Gary Vercauteren.
- 1979 WIR yearbook, p. 3, Pete Parker profile by Gary and photo credits.
- 1979 WIR yearbook, p. 6, multiple photographs credited to Gary.
- 1982 WIR yearbook, scan `1982 - WIR PROGRAM 1_003.jpg`, "Larry Detjens Remembered," by Gary.
- 1982 WIR yearbook, `1982 - WIR PROGRAM 1_005.jpg`, Marv Marzofka profile by Gary; photo credit is **Jim** Vercauteren.
- 1982 WIR yearbook, `1982 - WIR PROGRAM 1_008.jpg`, advertiser "Vercauteren Publishing, Inc." at 19 E. Main St., Chilton, WI, and other publications.
- 1986 WIR yearbook, `1986 - WIR PROGRAM 1_008.jpg`, Pete Vercauteren photo credit.
- 1993 ARTGO yearbook, p. 19, identifies Gary as president of ShopKo Mid-American Stock Car Series.
- 1993 ARTGO yearbook, p. 2, lists Vercauteren Publishing as a direct-mail / representative entity.
- These program links should use `?ocrPath=programs/<slug>/<exact filename>` because descriptive filename pages lack reliable numeric page indices.

## Historically grounded narrative
- Family roots: De Pere/Brown County Fairgrounds, MRN newspaper sales and racing photos — Joe Verdegan's 2020 interview with Pete.
- By 1970 separate Gary and Pete MRN bylines existed for De Pere, Shawano and Seymour tracks, corroborated by contemporary OCR.
- Gary became WIR PR director in 1972 and helped develop the Red, White and Blue championship program — Keith Vercauteren's retrospective (2014).
- The Vercauteren Memorial began in 1990 for Harold and Regina and later commemorated Gary after his October 2005 death (Keith 2014).
- Gary and Pete founded the Mid-American Stock Car Series in 1993. The museum's published series record is `/series/mid-american-racing-series` (series ID 18, published, first year 1993). Do not accidentally link to the unpublished legacy duplicate series ID 134.
- Race reporting, photos, WIR yearbook profiles, track promotion and the development of Mid-American should be individual and joint exhibit chapters.

## External, attributable research
- Joe Verdegan, "Pete Vercauteren" oral history (September 30, 2020): https://joeverdegan.com/pete-vercauteren/
- Keith Vercauteren, "Vercauteren Memorial Returns to WIR" (April 30, 2014): https://www.carsandracingstuff.com/library/articles/24845.php
- Vercauteren Memorial history: https://www.carsandracingstuff.com/library/articles/25038.php
- Joe Verdegan, "Larry Richards — An Original Grand National Outlaw": https://joeverdegan.com/larry-richards-an-original-grand-national-outlaw/

## Next research priorities
1. Find authenticated period photographs *of* Gary and Pete, ideally together, and confirm image rights/caption credits before replacing the current race-photo hero.
2. Curate a 20–40 page original-print centerpiece from byline CSV, prioritizing 1970s De Pere–Shawano–Seymour, 1980s WIR, 1992–1993 Mid-American founding and 2005 memorial coverage. Read article images to separate reprints and OCR collisions.
3. Audit 18 yearbooks and extract significant signed articles, historic photo credits and institutional history; prioritize 1979, 1982 and 1986 WIR books and 1993 ARTGO.
4. Link a Vercauteren Memorial chronology to archived Mid-American events and any existing museum special-event record rather than inventing winners.
5. Consider a Vercauteren Publishing / Chilton Times-Journal section using archival advertising and surviving publication documents.
6. Review 63 Pete items currently tagged unknown-track and just 2 explicit unknown-driver records; deduplicate and avoid overriding attribution evidence.
7. When editorial review is complete, merge/deploy the feature branch, then switch homepage featured media room from Bob's Room 001 to Room 002 while keeping the Room 001 link permanent.


## Research continuation — November 3, 2026 (evening)

### Primary-source chapter discoveries
- **The first Red / White / Blue series, 1972:** CFRN 1972-05-31 p.1 carries Gary Vercauteren's coverage of early entrants for the June 25 inaugural Red event. MRN 1972-06-29 p.2 has Gary's "Trickle Edges Rank" coverage of the inaugural Red event. See also Joe Verdegan, "1972 — The Birth of WIR’s Red, White & Blue State Championship Series" and Roger Van Daalwyk interview at joeverdegan.com.
- **Pete's weekly regional column:** MRN 1973-04-26 p.9 has "N.E. Wis. Race News" by Pete. MRN 1973-06-14 p.6 and 1973-06-21 p.7 carry Pete's De Pere and Leo's Speedway coverage.
- **Gary beyond the Tri-track:** MRN 1970-09-10 p.8 carries his "Derr Holds Off Mueller to Take IMCA 'Badger 100' at Marshfield" article.
- **An important object/story:** 1982 WIR yearbook scan `1982 - WIR PROGRAM 1_008.jpg` names Vercauteren Publishing, Inc. and its Chilton operations. A separate 1993 ARTGO yearbook scan `002.jpg` names Vercauteren Publishing in the direct-mail / promotion operation. Keith's 2014 family essay remembers the hours spent laying out WIR race programs and event flyers.
- **Historical family photograph:** Joe Verdegan's Pete interview reproduces an explicitly captioned picture of Pete with father Harold holding MRN. This is an excellent lead for an authentic period photo of Pete, but the museum has **not** secured reuse permission, and it is not a confirmed portrait of Gary.
- **Early series roles:** A 2011 Mid-American press release identifies Pete as vice president in the early years, and relates that Gary helped reopen 141 Speedway in 1998.

### Memorial winner source and event identity warning
Verified published winners from the Mid-American 2009 announcement (1990–2008) plus the 2011 announcement (2009–2010). The room now contains **21 memorial winners for 1990–2010**, with documented special venues: Chilton in 1990–1992, 141 in 2007 and 2009, Road America in 2010. Sources:
- https://www.carsandracingstuff.com/library/articles/25038.php
- https://www.carsandracingstuff.com/library/articles/24935.php
- https://www.carsandracingstuff.com/library/articles/24845.php

**Critical:** A Mid-American race winner is not automatically a Vercauteren Memorial winner. Current Supabase series ID 18 contains sparse results for some years and no event `slug` explicitly identifying "Vercauteren" memorial. For example, its 2008 Milwaukee Mile series event is not evidence that its winner won the memorial. Do not import or compare year-only winners blindly; match date, track, source and event.

A May 17, 2026 official Mid-Am story records Cameron Vandermeir winning that year's Gary Vercauteren Memorial at WIR:
https://www.midamracing.com/post/from-victory-lane-to-graduation-stage-vandermeir-wins-gary-vercauteren-memorial

### Article / program QA performed
- The current exhibit has 13 specifically selected newspaper article cards. Every (publication, issue date, numeric page label) has **one matching row** in `newspaper_ocr_search_pages` verified by SQL.
- The current exhibit has 8 specific yearbook/program cards. Every exact `document_slug + storage_path` has **one matching OCR row** in `archive_ocr_pages`.
- The currently used 1972 Brown County Bob Bennett race-photo hero is present in `photos` as photo ID 30582, credited to Pete; `credit_type` is null (not an explicit `photo` code), so do not classify that row incorrectly.
- Three nonnumeric cover labels in the 1,462-row byline CSV generated invalid `sourcePage=NaN` URL query strings; those URLs were repaired to link the issue directly without a numeric page.
- No HTTP/viewer runtime preview or full Next.js build completed in this stage; link existence in DB is verified, browser rendering needs QA in a preview environment.
- No Supabase production data was inserted, edited or deleted. The room is a draft PR only, and the homepage Room 001 entrance was not replaced.

### Editorial nuance
- Local historical accounts and Keith's family statement describe the Mid-American tour as formed/launched for **1993**. A contemporary 2005 obituary notice says it was **created in 1992**. Present 1993 as the **launch/inaugural racing season**; distinguish conception/organization from the first racing season if supported by future primary evidence.
- Pete's 2020 oral history names brother **Jim** as a main photographer; original WIR program captions carry Jim's distinct credits. Do not attribute every Vercauteren photo to Gary or Pete.
- The 2011 source explicitly says Pete served as vice president of Mid-American in its early years. This provides a basis for a future "Pete the organizer" section, alongside the better documented "Gary the PR director" section.


### New 1993 contemporary founding/PR sources
- **MRN January 14, 1993, p.10:** Gary's Wisconsin Shortracks column recalls receiving a telephone call from newly crowned NASCAR champion Alan Kulwicki and reflects on Kulwicki's racing days in Wisconsin. This complements Gary's earlier 1979 WIR yearbook profile of Kulwicki.
- **MRN February 11, 1993, p.15:** an original news item quotes Gary as *Mid-American Series President*, reports the Vercauteren Memorial's move from Chilton to WIR, and announces the Rockford opener planned for April 3–4. Contemporary primary documentary evidence for the series' formation and the memorial's evolution.
- **MRN February 11, 1993, p.5:** Rockford Speedway advertisement introduces the ShopKo Mid-American Series and supplies Gary as the entry contact. Store/use as a publicity item, not as an independently authored Gary article.
- **MRN May 6, 1993, p.8:** a Mid-American/WIR memorial race advertisement names Harold and Regina. Do not misclassify the promotional advertisement as a signed Gary article.
- **MRN May 13, 1993, p.14:** program coverage promotes the Mid-American "Dirt Devil National Championship 25" honoring Harold and Regina as part of WIR Spring Nationals.
- Relevant later secondary source: 2005 Jayski notice says the organization was *created in 1992*, while contemporary references record the **inaugural 1993 racing season**. Maintain precise distinction between organizing a series and first racing season.

### Later QA checkpoints
- **16** newspaper cards in draft, plus **8** WIR/ARTGO program cards. All 13 earlier newspaper paths and all 8 program paths were verified as exact 1:1 records in Supabase. The three newly added 1993 newspaper paths also appeared directly in the search results; these should be included in the next exact-link SQL check.
- 1979 WIR, 1982 WIR, 1986 WIR and 1993 ARTGO source documents have **29 matched pages total** with Vercauteren surname, all 29 in `complete` OCR status and carrying usable text.
- **6 real photograph binaries** checked against `storage.objects` in the `media` bucket: hero image (Bob Bennett 1972 / Pete credit); Al Schill 1973 (Pete); Pete Parker 1974 (Pete); Dale Earnhardt 1987 Slinger (Pete); Dick Trickle 1984 Rockford (Gary); Tim Nooner 1987 WIR (Gary). All six canonical photo paths exist.
- From the byline index: **1,462 distinct page rows across 715 (publication, issue) combinations**. These represent OCR candidate pages, NOT 1,462 visually validated authored articles.


## Room 002 continuation — verified life dates, photographed artifacts and preview

### Pete's obituary and historical accuracy
- Pete Vercauteren's funeral-home tribute is the strongest sourced confirmation of his passing: Peter James Vercauteren, born **December 30, 1948**; died at home **November 25, 2024**, aged 75. The 2020 Joe Verdegan oral history was published before Pete's death, so its "retired and lives with Donna" wording must not be repeated as current information.
- Obituary source: https://www.hansenfuneralservice.com/obituaries/Peter-Pete-Vercauteren
- Gary died in October 2005 aged 55; 2005 NASCAR trade reporting and 2014 family account provide corroboration. Specific February 1950 birth details need independent primary confirmation before adding the exact birth day.
- The room now has distinct biographical display panels for Gary (publicity and series leadership) and Pete (race reporting, eyewitness stories and early Mid-American leadership), with separate memorial milestones for 2005 and 2024.

### Original Gary narrative: "W.I.R. — Joe's Challenge"
- A 2006 Mid-American historical item republishes Gary's earlier first-person article recalling his March 1972 meeting with WIR owner Joe Van Daalwyk. It names the old KK Sports Arena and illustrates the work that became the Red/White/Blue series. Source: https://www.carsandracingstuff.com/library/articles/24973.php
- Joe Verdegan's Roger Van Daalwyk interview independently attests to Gary handling WIR marketing/public relations in 1972, WIR's 1970–1971 ownership transition, and the development of Red/White/Blue. Source: https://joeverdegan.com/roger-van-daalwyk-became-wirs-gm-at-18-years-old/
- Page links to the historical articles without reproducing extended copyrighted text.

### Authenticated image lead and artifact rights
- Joe Verdegan's Pete oral history includes a genuine, captioned photograph identifying **Pete with father Harold**, holding Midwest Racing News. Do not present this as a picture of Gary and Pete together. Its reuse/licensing was not established; keep it linked at the source until permission is obtained.
- Hansen Family Funeral's 2024 tribute may contain more authentic Pete portraits, but those also need permission before copying into the museum.
- Existing hero and gallery art in the draft consists of genuinely archived **race-car photographs credited to Pete or Gary**; never imply those photographs show the brothers.
- Four photo spotlights were selected from live photo records and source files verified in Supabase storage: Pete's Al Schill (1973 Brown County) and Pete Parker (1974 Seymour); Gary's Dick Trickle (1984 Rockford) and Tim Nooner (1987 WIR). The existing Bob Bennett (1972 Brown County) hero is Pete-credited and stored in the public media bucket.

### Authentic original page visuals
- New exhibit shelf displays four **genuine scanned page images** selected from eight primary archive artifacts: 1979 WIR Alan Kulwicki profile (Gary), 1982 WIR Larry Detjens memorial story (Gary), 1986 WIR image with a Pete photo credit, and a 1993 ARTGO yearbook source identifying Gary's Mid-American leadership.
- **All eight** linked program page paths exist as binaries under Supabase Storage bucket `media`. The Next.js museum viewer uses the same source program assets. Images are lazy-loaded in Room 002 to reduce unnecessary page load.
- All sixteen newspaper artifact links remain exact matching OCR-index entries.

### Vercel development status
- Room branch: `feature/media-room-002-vercauteren-brothers`; draft PR #45: https://github.com/bobschafer10/racing-museum/pull/45
- Vercel automatically built commit `9ba058ef15fc0135c29cbf6d04c0f9c46a0a90b2` as a **READY** preview with the new biographies and museum photos. Its build log explicitly lists the Room 002 dynamic route.
- Two subsequent commits added the four scanned-page exhibit shelf and CSS. Confirm their latest Vercel build result separately before claiming the entire artifact shelf has passed.
- Preview URL for the previously tested build: https://racing-museum-odsctx5y8-robert-schafer-s-projects.vercel.app/rooms/media-member-of-the-month/vercauteren-brothers
- Browser rendering at the protected preview was not independently inspected; this remains the outstanding visual QA task.
- No production merge, no update to the homepage current-month feature, and no production Supabase writes were performed.

## Visual source research — Pete headshots and both brothers' original columns
- Joe Verdegan original caption confirms Pete Vercauteren **at left with father Harold**, holding Midwest Racing News. Image URL: https://joeverdegan.com/wp-content/uploads/2020/09/Pete-Vercauteren.jpg . Article: https://joeverdegan.com/pete-vercauteren/ . Not Gary and Pete together; reproduction permission not established.
- Hansen Family Funeral obituary identifies Pete in a portrait: https://cdn.f1connect.net/photo/tributes/t/8/r/207x207/7903305/Peter-Pete-Vercauteren-1732645088.jpg . Source: https://www.hansenfuneralservice.com/obituaries/Peter-Pete-Vercauteren/ . Link only pending rights.
- Gary's original MRN obituary: Oct 19 2005 p5, headline "Gary Vercauteren, founder of Mid-America Racing Series and ASL, dead at 55". It includes his career history; possible portrait is not independently established. Link: https://www.uppermidwestautoracingmuseum.org/media/newspapers/midwest-racing-news/2005-10-19?sourcePage=5&q=Vercauteren
- **Critical original 1972 same-page dual bylines:** MRN April 27 1972 p8, N.E. Wis. Race News by Pete (title x=.097,y=.038; byline x=.185,y=.065); Wisconsin Review by Gary (title x=.660,y=.041; byline x=.753,y=.069). Original R2 image: https://newspapers.uppermidwestautoracingmuseum.org/newspapers/midwest-racing-news/1972-04-27/008.jpg
- Additional primary clip: Pete Apr 26 1973 MRN p9 (title x=.137,y=.110 and byline x=.218,y=.138), and Gary Aug 20 1970 MRN p14 "Capacity De Pere Crowd" (headline x=.210,y=.416 and byline x=.246,y=.464).
- Added CSS-windowed unaltered archive scans in Room 002 with full uncropped page links. No image pixels have been AI-generated. Preview alignment still requires browser visual checking.
