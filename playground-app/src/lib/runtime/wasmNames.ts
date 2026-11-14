/** Read unsigned LEB128; returns [value, nextOffset]. */
function readU32Leb(bytes: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let i = offset;
  while (i < bytes.length) {
    const byte = bytes[i++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [result >>> 0, i];
}

function readName(bytes: Uint8Array, offset: number): [string, number] {
  const [len, afterLen] = readU32Leb(bytes, offset);
  const end = afterLen + len;
  const name = new TextDecoder().decode(bytes.subarray(afterLen, end));
  return [name, end];
}

/**
 * Parse the WASM "name" custom section into function-index -> name.
 * Returns an empty map if the section is missing or malformed.
 */
export function parseWasmFunctionNames(bytes: Uint8Array): Map<number, string> {
  const names = new Map<number, string>();
  if (bytes.length < 8) return names;
  // magic + version
  if (
    bytes[0] !== 0x00 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d
  ) {
    return names;
  }

  let i = 8;
  while (i < bytes.length) {
    const id = bytes[i++];
    const [size, afterSize] = readU32Leb(bytes, i);
    i = afterSize;
    const sectionEnd = i + size;
    if (sectionEnd > bytes.length) break;

    if (id === 0) {
      // custom section
      try {
        const [sectionName, afterName] = readName(bytes, i);
        if (sectionName === "name") {
          let p = afterName;
          while (p < sectionEnd) {
            const subsectionId = bytes[p++];
            const [subSize, afterSubSize] = readU32Leb(bytes, p);
            p = afterSubSize;
            const subEnd = p + subSize;
            if (subsectionId === 1) {
              // function names
              const [count, afterCount] = readU32Leb(bytes, p);
              p = afterCount;
              for (let n = 0; n < count && p < subEnd; n++) {
                const [idx, afterIdx] = readU32Leb(bytes, p);
                const [fname, afterFname] = readName(bytes, afterIdx);
                names.set(idx, fname);
                p = afterFname;
              }
            }
            p = subEnd;
          }
        }
      } catch {
        // ignore malformed name section
      }
    }

    i = sectionEnd;
  }

  return names;
}
