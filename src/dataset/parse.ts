import { MAX_VALUES, MIN_VALUES } from './facts';

/** Largest accepted upload (contracts/dataset-input-format.md → Accepted files). */
export const MAX_FILE_BYTES = 1_048_576;

/** What went wrong, with the position of the offending token when there is one. */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  token?: string;
}

export type ParseResult = { ok: true; values: number[] } | { ok: false; error: ParseError };

const TOKEN = /[^,;\s]+/g;
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const MAX_TOKEN_SHOWN = 20;

const fail = (error: ParseError): ParseResult => ({ ok: false, error });

/** Token as shown in a message: at most 20 characters, then "…". */
function shown(token: string): string {
  return token.length > MAX_TOKEN_SHOWN ? `${token.slice(0, MAX_TOKEN_SHOWN)}…` : token;
}

interface Token {
  text: string;
  line: number;
  column: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .forEach((lineText, i) => {
      for (const match of lineText.matchAll(TOKEN)) {
        tokens.push({ text: match[0], line: i + 1, column: match.index + 1 });
      }
    });
  return tokens;
}

/**
 * Parses pasted or uploaded text into numbers (contracts/dataset-input-format.md).
 * Values may be separated by any run of commas, semicolons, spaces, tabs, or line breaks.
 * Returns the values in input order, or the first problem found: an invalid or too large
 * token (with its line and column), no numbers, one number, or more than 1,000.
 */
export function parseDataset(text: string): ParseResult {
  const tokens = tokenize(text);
  const values: number[] = [];

  for (const { text: token, line, column } of tokens) {
    if (!NUMBER.test(token)) {
      const header =
        line === 1 &&
        tokens.some((t) => t.line > 1) &&
        tokens.every((t) => t.line === 1 || NUMBER.test(t.text));
      const hint = header ? ' If this is a header row, remove it.' : '';
      return fail({
        message: `Line ${String(line)}: '${shown(token)}' is not a number.${hint}`,
        line,
        column,
        token,
      });
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      return fail({
        message: `Line ${String(line)}: '${shown(token)}' is too large.`,
        line,
        column,
        token,
      });
    }
    values.push(value);
  }

  if (values.length === 0) {
    return fail({
      message:
        'No numbers found. Enter at least 2 numbers separated by commas, spaces, or new lines.',
    });
  }
  if (values.length < MIN_VALUES) return fail({ message: 'Enter at least 2 numbers to sort.' });
  if (values.length > MAX_VALUES) {
    return fail({
      message: `Too many numbers: found ${String(values.length)}, the maximum is 1,000.`,
    });
  }
  return { ok: true, values };
}

/**
 * Reads an uploaded file in the browser (it never leaves the device, FR-008) and parses
 * it. The file must be `.txt`/`.csv` or `text/*`, at most 1 MB, and contain no NUL
 * characters; otherwise the result explains which rule failed.
 */
export async function readDatasetFile(file: File): Promise<ParseResult> {
  const isText = /\.(txt|csv)$/i.test(file.name) || file.type.startsWith('text/');
  if (!isText) return fail({ message: 'Please choose a .txt or .csv file.' });
  if (file.size > MAX_FILE_BYTES) return fail({ message: 'This file is larger than 1 MB.' });
  const text = await file.text();
  if (text.includes('\0')) return fail({ message: "This file doesn't look like text." });
  return parseDataset(text);
}
