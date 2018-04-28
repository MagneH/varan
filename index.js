// Dependencies
const init = require('./src/init');
const build = require('./src/build');
const watch = require('./src/watch');

// Exports
module.exports.init = init;
module.exports.build = build;
module.exports.watch = watch;
module.exports.browsers = ['>0.25%', 'not ie <11'];
