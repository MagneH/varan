// Dependencies
const babel = require('@babel/core');
const preset = require('../../babel/server');

// Exports
module.exports = {
  process: src => babel.transform(src, { presets: [preset], babelrc: false, envName: 'test' }).code,
};
