// Atomic design level rules for src/components/ (feature 002, FR-003 to FR-005, FR-015).
// Each level folder may import only the levels below it: atoms import no component,
// molecules import only atoms, organisms anything but templates and pages, templates no
// organisms or pages. Atoms, molecules, and templates also may not use app state. The
// README's "Component structure" section explains the levels; the rules and messages are
// specified in specs/002-atomic-design-components/contracts/component-levels.md §1.
//
// Each level is one config object with a single `no-restricted-imports` entry: when two
// objects configure the rule for the same file, flat config keeps only the later options,
// which would silently drop the other object's patterns.

/** Imports a component file or folder at any relative depth, e.g. `../molecules/Legend`. */
const levels = (...names) => `^\\.{1,2}/(.*/)?(${names.join('|')})(/|$)`;

/** Any import from the same folder except the component's own CSS module (`.module.scss`). */
const SIBLING = '^\\./(?!.*\\.module\\.scss$)';

const STATE_MESSAGE =
  'Atomic design (FR-004): atoms, molecules, and templates may not use app state (store, zustand, or hooks); take values and callbacks as props.';

const STATE = [
  { regex: '(^|/)(store|hooks)/', message: STATE_MESSAGE },
  { group: ['zustand'], message: STATE_MESSAGE },
];

const level = (name, patterns) => ({
  files: [`src/components/${name}/**/*.{ts,tsx}`],
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

const ATOM_MESSAGE =
  'Atomic design (FR-003): an atom may not import other components (atoms, molecules, organisms, templates, or pages).';
const MOLECULE_MESSAGE =
  'Atomic design (FR-003): a molecule may import only atoms, not molecules, organisms, templates, or pages.';

export const boundaries = [
  level('atoms', [
    {
      regex: levels('atoms', 'molecules', 'organisms', 'templates', 'pages'),
      message: ATOM_MESSAGE,
    },
    { regex: SIBLING, message: ATOM_MESSAGE },
    ...STATE,
  ]),
  level('molecules', [
    { regex: levels('molecules', 'organisms', 'templates', 'pages'), message: MOLECULE_MESSAGE },
    { regex: SIBLING, message: MOLECULE_MESSAGE },
    ...STATE,
  ]),
  level('organisms', [
    {
      regex: levels('templates', 'pages'),
      message: 'Atomic design (FR-005): an organism may not import templates or pages.',
    },
  ]),
  level('templates', [
    {
      regex: levels('organisms', 'pages'),
      message:
        'Atomic design (FR-003): a template is pure layout and may not import organisms or pages; the page passes content in.',
    },
    ...STATE,
  ]),
];
