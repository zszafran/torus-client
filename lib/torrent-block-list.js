const debug = require('debug')('torrent-block-list');
const TorrentBlock = require('./torrent-block');

const BLOCK_SIZE_BYTES = 16384;

module.exports = class TorrentBlockList extends Array {

  constructor(...args) {
    super(...args);
    this.size_ = 0;
  }

  get(begin) {
    const index = begin / BLOCK_SIZE_BYTES;
    return this[index];
  }

  setSize(size) {
    this.size_ = size;
  }

  getCount() {
    return Math.ceil(this.size_ / BLOCK_SIZE_BYTES);
  }

  getCompletedCount() {
    return this.filter((block) => block.isComplete()).length;
  }

  allComplete() {
    if (this.hasAvailable()) return false;
    return this.every((block) => block.isComplete());
  }

  hasAvailable() {
    const count = this.getCount();
    if (this.length !== count) return true;
    return this.some((block) => !block.hasPeer() && !block.isComplete());
  }

  getAbandoned() {
    return this.find((block) => !block.hasPeer() && !block.isComplete());
  }

  next() {
    const abandoned = this.getAbandoned();
    if (abandoned) return abandoned;

    const block = new TorrentBlock();
    block.setIndex(this.length);
    block.setBegin(this.length * BLOCK_SIZE_BYTES);
    block.setLength(BLOCK_SIZE_BYTES);

    this.push(block);

    return block;
  }

}