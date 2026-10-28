# Contract: Dataset Input Format

Applies to uploaded files and pasted text (FR-003 – FR-006). Implemented by one pure
function, `parseDataset(text: string): ParseResult`, in `src/dataset/parse.ts`.

## Accepted files

| Check | Rule | Message when it fails |
|-------|------|-----------------------|
| Type | Extension `.txt` or `.csv`, or MIME type `text/*` | "Please choose a .txt or .csv file." |
| Size | ≤ 1 MB (1,048,576 bytes) | "This file is larger than 1 MB." |
| Text content | Contains no NUL (`\0`) characters | "This file doesn't look like text." |

Files are read with `File.text()` (UTF-8). A leading byte-order mark is ignored. File
contents never leave the browser.

## Text format

- **Separators**: any run of commas, semicolons, spaces, tabs, or line breaks (`\n`,
  `\r\n`). Empty tokens from repeated separators are ignored, so `1,,2` equals `1,2`.
- **Numbers**: optional sign, digits, optional decimal point and digits, optional
  exponent: e.g. `42`, `-7`, `3.14`, `.5`, `+2`, `1e3`. Must be finite.
- **Not accepted**: thousands separators (`1,000` is read as `1` and `000`), decimal
  commas (`3,5` is two values), units (`5kg`), `NaN`, `Infinity`, hex.
- **Header row**: not supported. A non-numeric first line is reported like any other
  invalid token. The message tells the user to remove the header.
- **Count**: 2 to 1,000 values after parsing.

## Result

```ts
type ParseResult =
  | { ok: true; values: number[] }
  | { ok: false; error: { message: string; line?: number; column?: number; token?: string } };
```

Error messages (first problem found wins):

| Situation | Message |
|-----------|---------|
| No values at all | "No numbers found. Enter at least 2 numbers separated by commas, spaces, or new lines." |
| 1 value | "Enter at least 2 numbers to sort." |
| Over 1,000 values | "Too many numbers: found {count}, the maximum is 1,000." |
| Invalid token | "Line {line}: '{token}' is not a number." If on line 1 and other lines are numeric: add "If this is a header row, remove it." |
| Out of range (e.g. `1e400`) | "Line {line}: '{token}' is too large." |

Tokens longer than 20 characters are shortened in messages (first 20 characters + "…").

## Examples

| Input | Result |
|-------|--------|
| `5, 3, 8, 1` | `[5, 3, 8, 1]` |
| `5\n3\n8\n1\n` | `[5, 3, 8, 1]` |
| `-2.5; 0; 1e2` | `[-2.5, 0, 100]` |
| `value\n5\n3` | error, line 1, token `value`, header hint |
| `4, 4, 4` | `[4, 4, 4]` |
| `7` | error "Enter at least 2 numbers to sort." |
