"use client";

import { APP_NAME } from "../../config";
import { ErrorState, PageHeader } from "../../shared";
import { LoadingState, ResultView, UploadBox } from "./components";
import { useExtraction } from "./hooks";

export const DocumentReaderPage = () => {
  const { state, extract } = useExtraction();

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-5 px-4 pt-10 pb-20">
      <PageHeader
        title={APP_NAME}
        description="Upload a supplier PDF. You'll see every line we could read, where each number came from, and a plain list of anything we refused to read and why."
      />
      <UploadBox onFile={extract} disabled={state.kind === "loading"} />
      {state.kind === "loading" ? <LoadingState fileName={state.fileName} /> : null}
      {state.kind === "error" ? <ErrorState title={state.title} message={state.message} code={state.code} /> : null}
      {state.kind === "result" ? <ResultView result={state.result} /> : null}
    </main>
  );
};
