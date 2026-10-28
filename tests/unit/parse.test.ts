import { MAX_FILE_BYTES, parseDataset, readDatasetFile } from '../../src/dataset/parse';

const values = (text: string) => {
  const result = parseDataset(text);
  if (!result.ok) throw new Error(`Expected values, got: ${result.error.message}`);
  return result.values;
};

const error = (text: string) => {
  const result = parseDataset(text);
  if (result.ok) throw new Error(`Expected an error, got: ${result.values.join()}`);
  return result.error;
};

describe('parseDataset — separators', () => {
  it.each([
    ['commas', '5,3,8,1'],
    ['commas and spaces', '5, 3, 8, 1'],
    ['semicolons', '5;3;8;1'],
    ['tabs', '5\t3\t8\t1'],
    ['new lines', '5\n3\n8\n1\n'],
    ['Windows line endings', '5\r\n3\r\n8\r\n1\r\n'],
    ['a mix', '5 ;\t3,\n8  ,, 1'],
  ])('splits on %s', (_name, text) => {
    expect(values(text)).toEqual([5, 3, 8, 1]);
  });

  it('ignores empty tokens from repeated separators', () => {
    expect(values('1,,2')).toEqual([1, 2]);
  });

  it('ignores a leading byte-order mark', () => {
    expect(values('﻿4, 2')).toEqual([4, 2]);
  });
});

describe('parseDataset — numbers', () => {
  it.each([
    ['42', 42],
    ['-7', -7],
    ['3.14', 3.14],
    ['.5', 0.5],
    ['+2', 2],
    ['1e3', 1000],
    ['2.5E-1', 0.25],
  ])('accepts %s', (token, expected) => {
    expect(values(`${token} 0`)).toEqual([expected, 0]);
  });

  it('reads 1,000 as two values (no thousands separators)', () => {
    expect(values('1,000')).toEqual([1, 0]);
  });

  it('reads 3,5 as two values (no decimal commas)', () => {
    expect(values('3,5')).toEqual([3, 5]);
  });

  it.each(['5kg', 'NaN', 'Infinity', '-Infinity', '0x1F', '1.2.3', '--4', 'e5'])(
    'rejects %s',
    (token) => {
      expect(error(`1 ${token} 2`).message).toBe(`Line 1: '${token}' is not a number.`);
    },
  );

  it('keeps duplicates and input order', () => {
    expect(values('4, 4, 1, 4')).toEqual([4, 4, 1, 4]);
  });
});

describe('parseDataset — contract examples', () => {
  it.each([
    ['5, 3, 8, 1', [5, 3, 8, 1]],
    ['5\n3\n8\n1\n', [5, 3, 8, 1]],
    ['-2.5; 0; 1e2', [-2.5, 0, 100]],
    ['4, 4, 4', [4, 4, 4]],
  ])('%j → %j', (text, expected) => {
    expect(values(text)).toEqual(expected);
  });

  it('value\\n5\\n3 → error on line 1 with the header hint', () => {
    expect(error('value\n5\n3')).toEqual({
      message: "Line 1: 'value' is not a number. If this is a header row, remove it.",
      line: 1,
      column: 1,
      token: 'value',
    });
  });

  it('7 → "Enter at least 2 numbers to sort."', () => {
    expect(error('7').message).toBe('Enter at least 2 numbers to sort.');
  });
});

describe('parseDataset — errors', () => {
  it.each(['', '   ', ',,;\n\t', '﻿'])('reports no numbers for %j', (text) => {
    expect(error(text).message).toBe(
      'No numbers found. Enter at least 2 numbers separated by commas, spaces, or new lines.',
    );
  });

  it('reports too many numbers with the count found', () => {
    const text = Array.from({ length: 1001 }, (_, i) => i).join(',');
    expect(error(text).message).toBe('Too many numbers: found 1001, the maximum is 1,000.');
  });

  it('accepts exactly 1,000 numbers', () => {
    expect(values(Array.from({ length: 1000 }, (_, i) => i).join('\n'))).toHaveLength(1000);
  });

  it('reports the line and column of the first invalid token', () => {
    expect(error('1, 2\n3, 4\n5, abc, 6, xyz')).toEqual({
      message: "Line 3: 'abc' is not a number.",
      line: 3,
      column: 4,
      token: 'abc',
    });
  });

  it('gives the header hint only when line 1 is bad and the other lines are numeric', () => {
    expect(error('id, score\n1, 2\n3, 4').message).toBe(
      "Line 1: 'id' is not a number. If this is a header row, remove it.",
    );
    expect(error('abc').message).toBe("Line 1: 'abc' is not a number.");
    expect(error('abc\n1\nx').message).toBe("Line 1: 'abc' is not a number.");
    expect(error('1 abc 2').message).toBe("Line 1: 'abc' is not a number.");
  });

  it('reports a value too large to represent', () => {
    expect(error('1\n2\n1e400')).toEqual({
      message: "Line 3: '1e400' is too large.",
      line: 3,
      column: 1,
      token: '1e400',
    });
  });

  it('shortens tokens longer than 20 characters in the message', () => {
    const token = 'abcdefghijklmnopqrstuvwxyz';
    const e = error(`1 ${token}`);
    expect(e.message).toBe("Line 1: 'abcdefghijklmnopqrst…' is not a number.");
    expect(e.token).toBe(token);
  });

  it('reports the first problem found, before counting', () => {
    expect(error('x').message).toBe("Line 1: 'x' is not a number.");
  });
});

describe('readDatasetFile', () => {
  const file = (content: BlobPart, name: string, type = '') => new File([content], name, { type });

  it.each([
    ['numbers.txt', ''],
    ['NUMBERS.CSV', ''],
    ['data', 'text/plain'],
  ])('accepts %s (%s)', async (name, type) => {
    await expect(readDatasetFile(file('3, 1, 2', name, type))).resolves.toEqual({
      ok: true,
      values: [3, 1, 2],
    });
  });

  it('rejects other file types', async () => {
    const result = await readDatasetFile(file('3,1', 'photo.png', 'image/png'));
    expect(result).toEqual({ ok: false, error: { message: 'Please choose a .txt or .csv file.' } });
  });

  it('rejects files over 1 MB', async () => {
    expect(MAX_FILE_BYTES).toBe(1_048_576);
    const big = file('1,'.repeat(MAX_FILE_BYTES / 2 + 1), 'big.txt', 'text/plain');
    expect(await readDatasetFile(big)).toEqual({
      ok: false,
      error: { message: 'This file is larger than 1 MB.' },
    });
  });

  it('accepts a file of exactly 1 MB (then applies the text rules)', async () => {
    // One million-digit token: past the size check, so the text rules report it.
    const exact = file('1'.repeat(MAX_FILE_BYTES), 'exact.txt', 'text/plain');
    const result = await readDatasetFile(exact);
    expect(result.ok ? '' : result.error.message).toMatch(/^Line 1: '1{20}…' is too large\.$/);
  });

  it('rejects content with NUL characters', async () => {
    expect(await readDatasetFile(file('1,2\0\0', 'binary.txt', 'text/plain'))).toEqual({
      ok: false,
      error: { message: "This file doesn't look like text." },
    });
  });

  it('applies the text rules to the content', async () => {
    const result = await readDatasetFile(file('value\n5\n3', 'header.csv'));
    expect(result.ok ? '' : result.error.message).toMatch(/header row/);
  });
});
