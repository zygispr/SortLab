import { ESLint } from 'eslint';
import { boundaries } from '../../eslint.boundaries.js';

/**
 * Atomic design level rules (feature 002, FR-003 to FR-005, FR-015, SC-003): each rule in
 * eslint.boundaries.js must reject the imports its level may not make, with the message
 * from specs/002-atomic-design-components/contracts/component-levels.md §1.
 */

const MESSAGE = {
  atom: 'Atomic design (FR-003): an atom may not import other components (atoms, molecules, organisms, templates, or pages).',
  molecule:
    'Atomic design (FR-003): a molecule may import only atoms, not molecules, organisms, templates, or pages.',
  organism: 'Atomic design (FR-005): an organism may not import templates or pages.',
  template:
    'Atomic design (FR-003): a template is pure layout and may not import organisms or pages; the page passes content in.',
  state:
    'Atomic design (FR-004): atoms, molecules, and templates may not use app state (store, zustand, or hooks); take values and callbacks as props.',
};

const STATE_IMPORTS = ['../../store/appStore', '../../hooks/useKeyboardShortcuts', 'zustand'];

type Level = 'atoms' | 'molecules' | 'organisms' | 'templates' | 'pages';

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['**/*.tsx'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    ...boundaries,
  ],
});

/** Lint messages for a fake component in `level` that imports `path`. */
async function messagesFor(level: Level, path: string): Promise<string[]> {
  const [result] = await eslint.lintText(`import '${path}';\n`, {
    filePath: `src/components/${level}/Fake.tsx`,
  });
  return result!.messages.map((m) => m.message);
}

describe('dependency rules', () => {
  const blocked: [Level, string, string][] = [
    ...['../molecules/X', '../organisms/X', '../templates/X', '../pages/X'].map(
      (path): [Level, string, string] => ['atoms', path, MESSAGE.atom],
    ),
    ['atoms', './Sibling', MESSAGE.atom],
    ['atoms', '../atoms/Slider', MESSAGE.atom],
    ['atoms', '../../components/organisms/X', MESSAGE.atom],
    ...['../organisms/X', '../templates/X', '../pages/X'].map((path): [Level, string, string] => [
      'molecules',
      path,
      MESSAGE.molecule,
    ]),
    ['molecules', './Sibling', MESSAGE.molecule],
    ['molecules', '../molecules/Legend', MESSAGE.molecule],
    ['organisms', '../templates/X', MESSAGE.organism],
    ['organisms', '../pages/X', MESSAGE.organism],
    ['templates', '../organisms/X', MESSAGE.template],
    ['templates', '../pages/X', MESSAGE.template],
    ...(['atoms', 'molecules', 'templates'] as const).flatMap((level) =>
      STATE_IMPORTS.map((path): [Level, string, string] => [level, path, MESSAGE.state]),
    ),
  ];

  it.each(blocked)('%s may not import %s', async (level, path, message) => {
    const messages = await messagesFor(level, path);
    expect(messages).toHaveLength(1);
    // ESLint prefixes the configured message with "'<path>' import is restricted …".
    expect(messages[0]!.endsWith(message)).toBe(true);
  });

  const allowed: [Level, string][] = [
    ['atoms', './Button.module.scss'],
    ['atoms', '../../util/clamp'],
    ['molecules', '../atoms/Button'],
    ['molecules', '../atoms/Button.module.scss'],
    ['molecules', './RangeField.module.scss'],
    ['organisms', './Sibling'],
    ['organisms', '../molecules/RangeField'],
    ['organisms', '../../store/appStore'],
    ['templates', '../molecules/Legend'],
    ['pages', '../organisms/DataPanel'],
    ['pages', '../../hooks/useKeyboardShortcuts'],
  ];

  it.each(allowed)('%s may import %s', async (level, path) => {
    expect(await messagesFor(level, path)).toEqual([]);
  });
});

describe('component levels', () => {
  const LEVELS = ['atoms', 'molecules', 'organisms', 'templates', 'pages'];
  // Every file under src/components, as '/src/components/<path>' (keys only, nothing loads).
  const files = Object.keys(import.meta.glob('/src/components/**/*')).map((key) =>
    key.slice('/src/components/'.length),
  );

  it('src/components holds only the five level folders (SC-001)', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(
      files.filter((file) => !LEVELS.includes(file.split('/')[0]!) || !file.includes('/')),
    ).toEqual([]);
  });
});

describe('shared building blocks', () => {
  // Source of every component, keyed by its path under src/components (FR-007, SC-004).
  const sources = Object.entries(
    import.meta.glob<string>('/src/components/**/*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map(([key, source]) => [key.slice('/src/components/'.length), source] as const);

  const filesMatching = (pattern: RegExp) =>
    sources.filter(([, source]) => pattern.test(source)).map(([file]) => file);

  it('renders <button> only in the Button atom', () => {
    expect(filesMatching(/<button/)).toEqual(['atoms/Button.tsx']);
  });

  it('renders range inputs only in the Slider atom', () => {
    expect(filesMatching(/type="range"/)).toEqual(['atoms/Slider.tsx']);
  });

  it('applies button classes only in the Button atom', () => {
    // Whole words, so a class such as `styles.buttons` (a row of buttons) does not match.
    const files = filesMatching(/className=\{[^}]*\b(button|primary|dismiss|quiet)\b/);
    expect(files.filter((file) => file !== 'atoms/Button.tsx')).toEqual([]);
  });
});
