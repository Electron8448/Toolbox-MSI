import grammarSpelling from './grammar-spelling/index.js';
import textTools from './text-tools/index.js';
import writingHelpers from './writing-helpers/index.js';
import formatting from './formatting/index.js';

export default {
  name: 'Writing',
  path: '/writing',
  icon: 'Aa',
  theme: 'writing',
  description: 'Tools to help with writing and working with text.',
  groups: [grammarSpelling, textTools, writingHelpers, formatting]
};
