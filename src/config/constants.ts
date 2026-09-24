export const APP_NAME = "Document reader";

/**
 * Largest upload the extractor accepts. Checked on the server; the page only mentions it.
 * Vercel rejects function request bodies over 4.5 MB before our code runs, so stay under it.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
