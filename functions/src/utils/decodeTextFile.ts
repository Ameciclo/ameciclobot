export function decodeTextFile(
  fileBuffer: Buffer,
  encodings: string[] = ["utf-8", "latin1"]
): string {
  for (const encoding of encodings) {
    try {
      if (encoding === "utf-8") {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        return decoder.decode(fileBuffer);
      }

      return Buffer.from(fileBuffer).toString(encoding as BufferEncoding);
    } catch {
      continue;
    }
  }

  return Buffer.from(fileBuffer).toString("utf8");
}
