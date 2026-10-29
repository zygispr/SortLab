// Nesting limit for SCSS (feature 003, FR-004): a top-level rule plus two nested levels.
// Only this rule is enabled; see specs/003-scss-styling/research.md R5.
export default {
  customSyntax: 'postcss-scss',
  rules: { 'max-nesting-depth': 2 },
};
