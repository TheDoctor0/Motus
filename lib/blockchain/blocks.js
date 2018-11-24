const R = require('ramda');
const Block = require('./block');

class Blocks extends Array {
    static fromJson(data) {
        let blocks = new Blocks();

        R.forEach((block) => { blocks.push(Block.fromJson(block)); }, data);

        return blocks;
    }
}

module.exports = Blocks;