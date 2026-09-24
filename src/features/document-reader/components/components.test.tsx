// @vitest-environment jsdom
// Branches the sample documents don't reach.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtractionResult, LineItem } from "../types";
import { PageRows } from "./PageRows";
import { SummaryPanel } from "./SummaryPanel";
import { TotalCheck } from "./TotalCheck";
import { UploadBox } from "./UploadBox";

afterEach(cleanup);

const src = { page: 1, text: "x", line: "x" };

describe("UploadBox", () => {
  const pdf = new File(["%PDF"], "a.pdf");

  it("accepts a dropped file and highlights while dragging", () => {
    const onFile = vi.fn();
    render(<UploadBox onFile={onFile} disabled={false} />);
    const zone = screen.getByTestId("drop-zone");
    fireEvent.dragOver(zone);
    expect(zone.className).toContain("border-primary");
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain("border-primary");
    fireEvent.drop(zone, { dataTransfer: { files: [pdf] } });
    expect(onFile).toHaveBeenCalledWith(pdf);
  });

  it("ignores drops while busy, and empty drops", () => {
    const onFile = vi.fn();
    const { rerender } = render(<UploadBox onFile={onFile} disabled />);
    fireEvent.drop(screen.getByTestId("drop-zone"), { dataTransfer: { files: [pdf] } });
    rerender(<UploadBox onFile={onFile} disabled={false} />);
    fireEvent.drop(screen.getByTestId("drop-zone"), { dataTransfer: { files: [] } });
    fireEvent.change(screen.getByLabelText("Choose a PDF"), { target: { files: null } });
    expect(onFile).not.toHaveBeenCalled();
  });
});

it("TotalCheck explains why a total wasn't checked", () => {
  render(<TotalCheck check={{ status: "unchecked", reason: "Some lines were left out." }} />);
  expect(screen.getByText("Not checked: Some lines were left out.")).toBeTruthy();
});

it("PageRows omits an empty heading", () => {
  const item = {
    page: 2,
    section: { kind: "delivery", heading: "" },
    itemNo: { value: 1, source: src },
    description: { value: "Board", source: src },
    quantity: { value: 1, source: src },
    unit: null,
    unitPrice: null,
    lineTotal: null,
    flags: [],
  } satisfies LineItem;
  render(<table><PageRows page={2} items={[item]} /></table>);
  expect(screen.getByText("Page 2")).toBeTruthy();
  expect(screen.getByText("none")).toBeTruthy();
});

it("SummaryPanel says when document number and date weren't found", () => {
  const result: ExtractionResult = {
    fileName: "a.pdf", pageCount: 1, documentNo: null, date: null,
    pages: [{ page: 1, status: "failed", lineItemCount: 0 }], lineItems: [], totals: [], refusals: [],
  };
  render(<SummaryPanel result={result} />);
  expect(screen.getAllByText("Not found")).toHaveLength(2);
  expect(screen.getByText("Page 1: failed")).toBeTruthy();
});
