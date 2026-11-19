import converters from './converters/index.js';
import calculators from './calculators/index.js';
import dateTime from './date-time/index.js';
import colourDesign from './colour-design/index.js';
import developerTools from './developer-tools/index.js';
import imageTools from './image-tools/index.js';
import textData from './text-data/index.js';
import educationStudy from './education-study/index.js';
import randomGenerators from './random-generators/index.js';
import productivity from './productivity/index.js';
import webSeoTools from './web-seo-tools/index.js';
import maths from './maths/index.js';
import writing from './writing/index.js';

export const categories = [maths, writing, converters, calculators, dateTime, colourDesign, developerTools, imageTools, textData, educationStudy, randomGenerators, productivity, webSeoTools];
export const groups = categories.flatMap(category => category.groups.map(group => {
  const path = group.path ?? group.tools[0].path.slice(0, group.tools[0].path.lastIndexOf('/'));
  return { ...group, path, category };
}));
export const tools = groups.flatMap(group => group.tools.map(tool => ({ ...tool, category: group.category, group })));
