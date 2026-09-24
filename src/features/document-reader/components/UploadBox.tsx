"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";
import { MAX_FILE_BYTES } from "../../../config";
import { cn } from "../../../lib/utils";

export interface UploadBoxProps {
  onFile: (file: File) => void;
  disabled: boolean;
}

export const UploadBox = ({ onFile, disabled }: UploadBoxProps) => {
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file !== undefined && !disabled) onFile(file);
  };

  return (
    <label
      data-testid="drop-zone"
      className={cn(
        "flex cursor-pointer flex-wrap items-center gap-4 rounded-(--radius-lg) border-2 border-dashed border-border-app bg-surface p-6",
        dragging && "border-primary bg-primary-wash",
        disabled && "cursor-wait opacity-60",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pick(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        aria-label="Choose a PDF"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
      <span className="inline-flex items-center gap-2 rounded-(--radius) bg-primary px-3.5 py-2 font-medium text-on-accent">
        <FileUp size={16} aria-hidden="true" />
        Choose a PDF
      </span>
      <span className="text-sm text-muted">
        or drop it here. Invoices, packing lists and delivery dockets, up to {MAX_FILE_BYTES / 1024 / 1024} MB.
      </span>
    </label>
  );
};
