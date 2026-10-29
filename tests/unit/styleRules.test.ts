import stylelint from 'stylelint';

/**
 * Style authoring rules (feature 003, FR-004, FR-010, SC-008, research R3): see
 * specs/003-scss-styling/contracts/style-rules.md §3.
 */

describe('nesting depth', () => {
  /** Lints `code` with the project's real stylelint.config.js and returns its warnings. */
  const warningsFor = async (code: string) => {
    const { results } = await stylelint.lint({
      code,
      codeFilename: 'src/components/atoms/Sample.module.scss',
      configFile: 'stylelint.config.js',
    });
    return results[0]!.warnings;
  };

  it('rejects a rule nested four levels deep', async () => {
    const warnings = await warningsFor(
      '.a {\n  .b {\n    .c {\n      .d {\n        color: red;\n      }\n    }\n  }\n}\n',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.rule).toBe('max-nesting-depth');
    expect(warnings[0]!.line).toBe(4);
  });

  it('allows three levels', async () => {
    const warnings = await warningsFor(
      '.table {\n  th,\n  td {\n    &:first-child {\n      padding-left: 0;\n    }\n  }\n}\n',
    );
    expect(warnings).toEqual([]);
  });

  it('allows a nested media query within three levels', async () => {
    const warnings = await warningsFor(
      '// note\n.main {\n  @media (min-width: 1024px) {\n    &:focus {\n      color: red;\n    }\n  }\n}\n',
    );
    expect(warnings).toEqual([]);
  });

  it('counts a nested media query as a level (FR-004)', async () => {
    const warnings = await warningsFor(
      '.a {\n  th {\n    @media (min-width: 1px) {\n      &:hover {\n        color: red;\n      }\n    }\n  }\n}\n',
    );
    expect(warnings.map((warning) => warning.rule)).toEqual(['max-nesting-depth']);
  });
});

describe('no cross-file composes', () => {
  // Includes .css so the check guards the conversion before any file is renamed.
  const sources = import.meta.glob<string>('/src/**/*.{css,scss}', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  it('composes classes only from the same file', () => {
    const files = Object.entries(sources)
      .filter(([, source]) => /composes:[^;]*\bfrom\b/.test(source))
      .map(([file]) => file);
    expect(
      files,
      'composes from another file ships uncompiled SCSS (feature 003, research R3); reuse the component or a class helper it exports (e.g. buttonClass()) instead:',
    ).toEqual([]);
  });
});
