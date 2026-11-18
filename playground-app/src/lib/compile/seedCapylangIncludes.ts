/**
 * Capylang `/lib` sources written into the WASI MemoryFS before compile
 */
import wasiCapy from "../../../../lib/wasi.capy?raw";
import ioCapy from "../../../../lib/io.capy?raw";

export const CAPYLANG_INCLUDE_FILES: Readonly<Record<string, string>> = {
  "/lib/wasi.capy": wasiCapy,
  "/lib/io.capy": ioCapy,
};

export function seedCapylangIncludes(
  writeFile: (path: string, data: string) => void,
) {
  for (const [path, content] of Object.entries(CAPYLANG_INCLUDE_FILES)) {
    writeFile(path, content);
  }
}
