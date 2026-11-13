/**
 * Capylang CodeMirror language (StreamLanguage)
 * Keywords mirrored from grammar/CapylangLexerGrammar.g4, keep in sync on grammar changes.
 */
import { LanguageSupport, StreamLanguage } from "@codemirror/language";

/** @type {ReadonlySet<string>} */
const KEYWORDS = new Set([
  "allocate",
  "break",
  "else",
  "fn",
  "global",
  "if",
  "import",
  "include",
  "let",
  "mut",
  "record",
  "return",
  "while",
  "as", // OP_CONV in lexer
]);

/** Built-in / common type names (lexer treats these as IDENTIFIER). */
const TYPES = new Set([
  "u8",
  "u16",
  "u32",
  "u64",
  "s8",
  "s16",
  "s32",
  "s64",
  "f32",
  "f64",
  "bool",
  "string",
  "void",
]);

const NUMBER_SUFFIX = /^(u|s|f)(8|16|32|64)\b/;

/**
 * @typedef {{ tokenize?: Function }} CapylangState
 */

/**
 * @param {import("@codemirror/language").StringStream} stream
 * @param {CapylangState} state
 */
function tokenBase(stream, state) {
  if (stream.eatSpace()) return null;

  // Line comment
  if (stream.match("//")) {
    stream.skipToEnd();
    return "comment";
  }

  // Blob string: b"..."
  if (stream.match(/^b"/)) {
    state.tokenize = tokenString('"');
    return state.tokenize(stream, state);
  }

  // String
  if (stream.match('"')) {
    state.tokenize = tokenString('"');
    return state.tokenize(stream, state);
  }

  // Char
  if (stream.match("'")) {
    state.tokenize = tokenString("'");
    return state.tokenize(stream, state);
  }

  // Numbers (optional type suffix: 1u32)
  if (stream.match(/^\d+/)) {
    stream.match(NUMBER_SUFFIX);
    return "number";
  }

  // Multi-char operators / punctuation first
  if (stream.match("->") || stream.match("::") || stream.match("||") || stream.match("&&")) {
    return "operator";
  }
  if (
    stream.match("!=") ||
    stream.match("==") ||
    stream.match("<=") ||
    stream.match(">=") ||
    stream.match("<<") ||
    stream.match(">>")
  ) {
    return "operator";
  }

  // Single-char operators / punctuation
  const ch = stream.next();
  if (!ch) return null;

  if ("@".includes(ch)) return "meta";
  if ("+-*/%<>=".includes(ch)) return "operator";
  if ("(){}[];,:.*".includes(ch)) return "punctuation";

  // Identifier / keyword / type (put char back via match from previous)
  // stream.next() already consumed; rebuild word
  if (/[a-zA-Z_$]/.test(ch)) {
    let word = ch;
    while (!stream.eol()) {
      const peek = stream.peek();
      if (!peek || !/[a-zA-Z0-9_$]/.test(peek)) break;
      word += stream.next();
    }
    if (KEYWORDS.has(word)) return "keyword";
    if (TYPES.has(word)) return "typeName";
    return "variableName";
  }

  return null;
}

/**
 * @param {string} quote
 * @returns {(stream: import("@codemirror/language").StringStream, state: CapylangState) => string}
 */
function tokenString(quote) {
  /**
   * @param {import("@codemirror/language").StringStream} stream
   * @param {CapylangState} state
   */
  return function (stream, state) {
    let escaped = false;
    while (!stream.eol()) {
      const ch = stream.next();
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        state.tokenize = undefined;
        break;
      }
    }
    return "string";
  };
}

const capylangStreamParser = {
  name: "capylang",
  startState() {
    return /** @type {CapylangState} */ ({});
  },
  /**
   * @param {import("@codemirror/language").StringStream} stream
   * @param {CapylangState} state
   */
  token(stream, state) {
    if (state.tokenize) return state.tokenize(stream, state);
    return tokenBase(stream, state);
  },
  languageData: {
    commentTokens: { line: "//" },
  },
};

export const capylangLanguage = StreamLanguage.define(capylangStreamParser);

/**
 * Collect leaf highlight tokens for tests / debugging.
 * @param {string} text
 * @returns {{ name: string, text: string }[]}
 */
export function tokenizeCapylang(text) {
  const tree = capylangLanguage.parser.parse(text);
  /** @type {{ name: string, text: string }[]} */
  const out = [];
  tree.iterate({
    enter(node) {
      if (node.type.isTop) return;
      if (node.node.firstChild) return;
      out.push({
        name: node.name,
        text: text.slice(node.from, node.to),
      });
    },
  });
  return out;
}

/** Capylang language support for CodeMirror 6. */
export function capylang() {
  return new LanguageSupport(capylangLanguage);
}
