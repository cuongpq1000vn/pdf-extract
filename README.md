# Document reader

Takes a supplier PDF (invoice, packing list, delivery docket) and returns every
line item it can read, each number carrying the page and exact text it came
from, plus a separate list of what it refused to extract and why. A small page
uploads a file and shows both, refusals first. Click any number on the page to
see the exact cell and line it was read from.

**Live:** https://pdf-extract-five.vercel.app (upload one of the files in
`samples/`). Uploads are limited to 4 MB, because Vercel rejects request
bodies over 4.5 MB before the function runs.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 77 tests
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

The extractor has no UI or Next.js code in it, so it is tested with hand-built
pages as well as the real samples. The page is split into small components.

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

**Refusing scanned pages instead of running OCR on them.**

KBS-10241 is a clean invoice, and page 4 of KBS-DR118 is an ordinary site
docket. Both are images with no text layer. OCR would probably have read them
correctly, and refusing means the tool returns nothing for 10241 and loses a
whole site from DR118. That felt like the wrong answer at first.

What decided it was the hard rule: every number must point to a page and the
exact source text it came from. With OCR, the "source text" is the OCR
engine's guess at the text, not text that is in the document. If it misread
`$1,104.00` as `$1,164.00`, the output would still look fully traced (page 1,
source text `$1,164.00`) while being wrong. A misread would turn an honest
"we can't read this" into a confident wrong number that looks sourced, and
the brief is explicit that this is worse than a refusal.

So a scanned page is refused, and the refusal names the exact page so a
person knows what to check by hand. OCR is the first thing I'd add (see
below), but only with its results kept visibly separate from text-layer
values.

A related call was the DR118 Summary / Returns / Credit / Signed Acceptance
pages. I extract their lines, because the numbers are clearly readable and
sourced, but I refuse to decide what they *mean* (add, subtract, or ignore)
and flag every one of those lines. Treating returns as deliveries, or
guessing they are negative, would be picking an answer quietly.

## Where I'm not confident

- **The heuristics are tuned to one supplier's layout.** All six samples come from the same template, and I wrote the parser after reading them. 100% test coverage means every branch runs, not that the approach works on a second supplier's layout.
- **Table detection** needs a header row containing "Description" and "Qty". Any other layout gets `NO_TABLE_FOUND`. That is safe but not useful.
- **Column assignment** puts each cell under the right-most header that starts at or before it. That works here because values are left-aligned under their headers. A right-aligned amount wider than its heading lands in the wrong column. When I tried it, the merged cell became unreadable and was refused, so it failed safe, but I haven't shown it always does.
- **Totals are checked per page.** A multi-page invoice with one grand total on the last page would get a false `TOTAL_MISMATCH`, because the total is compared only with that page's lines.
- **The pallet-count conflict** is found by a fairly blunt regex over free-text notes (a number followed by a noun). I wrote it after seeing KBS-10262. It will miss contradictions phrased differently, and could flag two unrelated numbers that share a noun.
- **Section meaning** (returns, credit, summary, acceptance) is a keyword match on the page heading.
- **Negative amounts are refused, not read.** `-$124.50` or `($124.50)` is `VALUE_UNREADABLE`, so a credit note yields no amounts at all. Safe, but not useful for credits.
- **My own traceability test missed a bug.** A total printed as `-$153.90` was output as `153.9`, a wrong number with a source attached, and the test that reads every number back from its source still passed, because it used the same regex as the code. I found it by generating extra edge-case PDFs, fixed it (`25cf478`), and tightened the test. Other checks could share that blind spot, where a test repeats the logic it is checking.
- **Some refusals overlap.** A document with a "Total" line but no figure gets both "A total is mentioned but no figure is given" (page) and "No total is printed" (document). Noisy, not wrong.
- **No plausibility checks.** 1,200 roofing screws weighing "480g total" is suspicious, but nothing flags it. It only stays out of the output because the whole weight column is refused.

## With three more days

1. **OCR for scanned pages, with verification.** Show each OCR value next to a crop of the page image, and keep it out of the trusted results until a person confirms it.
2. **More real documents.** Collect layouts from other suppliers as test fixtures, and find columns from how values line up, not only from header names.
3. **Checks across pages.** Handle grand totals and tables that continue over several pages. For delivery runs, use "Site 1 of 4" to report a missing site, and compare a summary page against the site pages.
4. **Plausibility checks** that raise a flag (never change a value), such as weight per unit or price far outside the usual range for that item.
5. **Log each refusal code in production**, so we can see which kinds of document fail most often and fix the most common ones first.
