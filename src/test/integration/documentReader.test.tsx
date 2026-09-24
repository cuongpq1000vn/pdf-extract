// @vitest-environment jsdom
// End to end through the page: real sample PDFs are extracted, served through a
// fake fetch, and we check the refusals actually reach the screen.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentReaderPage } from "../../features/document-reader";
import { extractSample, sampleFile } from "../samples";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The raw JSON panel repeats every string; only count what the page itself says.
const visible = { ignore: "script, style, pre" };

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const upload = (file: File) => {
  const input = screen.getByLabelText("Choose a PDF");
  fireEvent.change(input, { target: { files: [file] } });
};

async function showSample(name: string) {
  const result = await extractSample(name);
  vi.stubGlobal("fetch", vi.fn(async () => reply({ ok: true, result })));
  render(<DocumentReaderPage />);
  await act(async () => upload(sampleFile(name)));
  return result;
}

describe("refusals reach the person using the page", () => {
  it("shows a scanned page as a plain-language refusal, not an error", async () => {
    await showSample("KBS-10241.pdf");
    expect(screen.getByText("Page 1 is a scanned image")).toBeTruthy();
    expect(screen.getByText(/we don't read pictures/, visible)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/No lines could be extracted/)).toBeTruthy();
  });

  it("shows the multi-page run: 7 pages read, page 4 refused, sections flagged", async () => {
    await showSample("KBS-DR118.pdf");
    expect(screen.getByText("7 of 8")).toBeTruthy();
    expect(screen.getByText("Page 4: not read")).toBeTruthy();
    expect(screen.getByText("Page 4 is a scanned image")).toBeTruthy();
    expect(screen.getAllByText(/Check whether this line should count/, visible)).toHaveLength(12);
    expect(screen.getByText("Page 6 · Multi-Site Delivery Run 118 - Returns Note")).toBeTruthy();
  });

  it("shows a total mismatch with both figures and the source text", async () => {
    await showSample("KBS-10270.pdf");
    expect(screen.getByText("The printed total doesn't match the lines")).toBeTruthy();
    expect(screen.getByText(/Lines add up to \$1,538.20, a difference of \$74.70/)).toBeTruthy();
    expect(screen.getAllByText(/Total: \$1,612.90/, visible).length).toBeGreaterThan(0);
  });

  it("shows 'not printed' instead of a calculated line total", async () => {
    await showSample("KBS-10255.pdf");
    expect(screen.getAllByText("not printed")).toHaveLength(4);
    expect(screen.getByText('"Weight" column not extracted')).toBeTruthy();
  });

  it("shows a clean document as clean, and the source of a number when it's clicked", async () => {
    await showSample("KBS-10234.pdf");
    expect(screen.getByText("Matches the lines below")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Line total: $1,195.20. Show source" })));
    const popover = screen.getByRole("dialog");
    expect(within(popover).getByText("Line total · page 1")).toBeTruthy();
    expect(within(popover).getByText("$1,195.20")).toBeTruthy();
    expect(within(popover).getByText("1 10mm GIB Standard board 2400x1200 48 sheet $24.90 $1,195.20")).toBeTruthy();
    expect(screen.getByText("What we didn't extract, and why (0)")).toBeTruthy();
    expect(screen.getByText(/Nothing was refused/)).toBeTruthy();
  });

  it("shows a contradiction with both quotes", async () => {
    await showSample("KBS-10262.pdf");
    const card = screen.getByText("The pallet count doesn't agree").closest("article")!;
    expect(within(card).getByText(/14 pallets loaded/)).toBeTruthy();
    expect(within(card).getByText(/16 pallets unloaded/)).toBeTruthy();
  });
});

describe("loading and failures show the real reason", () => {
  it("shows the file name while reading, and disables the upload", async () => {
    let finish!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))));
    render(<DocumentReaderPage />);
    await act(async () => upload(sampleFile("KBS-10234.pdf")));
    expect(screen.getByText("Reading KBS-10234.pdf…")).toBeTruthy();
    expect((screen.getByLabelText("Choose a PDF") as HTMLInputElement).disabled).toBe(true);
    await act(async () => finish(reply({ ok: false, error: { code: "NOT_A_PDF", title: "This isn't a PDF", message: "nope" } }, 415)));
    expect(screen.queryByText("Reading KBS-10234.pdf…")).toBeNull();
  });

  it("shows the server's own error title, message and code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      reply({ ok: false, error: { code: "PASSWORD_PROTECTED", title: "This PDF is password protected", message: "Remove the password." } }, 422),
    ));
    render(<DocumentReaderPage />);
    await act(async () => upload(sampleFile("KBS-10234.pdf")));
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("This PDF is password protected")).toBeTruthy();
    expect(within(alert).getByText("Remove the password.")).toBeTruthy();
    expect(within(alert).getByText("Error code: PASSWORD_PROTECTED")).toBeTruthy();
  });

  it("names a network failure as a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    render(<DocumentReaderPage />);
    await act(async () => upload(sampleFile("KBS-10234.pdf")));
    expect(screen.getByText("Couldn't reach the document reader")).toBeTruthy();
    expect(screen.getByText(/Failed to fetch/)).toBeTruthy();
  });
});
