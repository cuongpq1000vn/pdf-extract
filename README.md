# Document reader

Takes a supplier PDF (invoice, packing list, delivery docket) and returns every
line item it can read, each number carrying the page and exact text it came
from, plus a separate list of what it refused to extract and why. A small page
uploads a file and shows both, refusals first.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 70 tests
npm run coverage   # 100% statements / branches / functions / lines
```

The six sample PDFs are in `samples/`.

## The one rule

No number is output unless it was read from one exact cell. Sums are only
used to *check* printed figures; a failed check becomes a refusal, never a
corrected number. `refusals.test.ts` walks every number in every sample's
output and reads it back from its own `source.text`.

## What each sample does

| File | Result |
|---|---|
| KBS-10234 | 5 lines, total matches. The `(box of 1000) 8` row reads qty **8**, because columns are split by x-position, not whitespace. |
| KBS-10241 | Whole page is a scanned image → `SCANNED_PAGE`. Nothing extracted. |
| KBS-10255 | 4 lines. No line totals printed → `LINE_TOTAL_NOT_PRINTED` (not calculated). Weight column refused: mixes "total" and per-unit, kg and g. No money total → `TOTAL_NOT_STATED`. |
| KBS-10262 | 3 lines, total matches. "14 pallets loaded" vs "16 pallets unloaded" → `CONFLICTING_VALUES`. |
| KBS-10270 | 4 lines. Printed total $1,612.90 vs lines $1,538.20 → `TOTAL_MISMATCH`; both shown, neither chosen. |
| KBS-DR118 | 8 pages. Page 4 is scanned → refused; the other 7 are still read (21 lines). Pages 5–8 (Summary, Returns, Credit, Signed Acceptance) are extracted but flagged `SECTION_MEANING_UNCLEAR`. |

## Layout

Follows the `features/ · shared/ · config/ · lib/` structure of our
b2b-admin-dashboard.

```
src/
  app/                      Next.js routes: page.tsx, api/extract/route.ts
  config/                   endpoint, file-size limit
  lib/extract/              the extractor, no UI, no Next
    pdf.ts                  pdfjs → per-page text cells with x/y (page errors contained here)
    parse.ts                pure: pages → items, totals, refusals
    numbers.ts              strict number/money parsers (integer cents)
  features/document-reader/ the upload page: api.ts, hooks/, components/, types/
  shared/components/        Badge, Panel, ErrorState, …
  test/integration/         real samples driven through the page
```

## Hardest decision

<!-- TODO: in your own words. Candidate: refusing scanned pages instead of OCR —
OCR text isn't "exact source text", so it would have needed its own
confidence/verification layer; refusing is correct and cheap. -->

## Where I'm not confident

<!-- TODO: confirm/edit. Known weak spots: -->
- Table detection needs a header row with "Description" and "Qty". A different supplier layout gets `NO_TABLE_FOUND`, which is safe but useless.
- Column assignment assumes cells start at or right of their header's x. Right-aligned numbers wider than the header would be misassigned.
- A document total is checked only against lines on the same page. A multi-page invoice with a total on the last page would show as "not checked" or a false mismatch.
- The count-conflict check (pallets) is a regex over free-text notes. It will miss conflicts phrased differently and could flag unrelated numbers that share a noun.
- The section check (returns/credit/…) is keyword-based on the page heading.
- No plausibility checks: 1200 roofing screws weighing "480g total" is suspicious but not flagged (the weight column is refused anyway).

## With three more days

<!-- TODO -->
- OCR for scanned pages, with results marked unverified and kept apart from text-layer values.
- Multi-page totals, and handling of tables that continue across pages.
- More layouts: learn columns from data alignment rather than only from header names.
