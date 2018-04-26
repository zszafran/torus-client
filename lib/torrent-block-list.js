const debug = require('debug')('torrent-block-list');
const TorrentBlock = require('./torrent-block');

module.exports = class TorrentBlockList extends Array {

  constructor(...args) {
    super(...args);
  }

  get(begin) {
    return this.find((block) => block.getBegin() == begin);
  }

  getCount() {
    return this.length;
  }

  getCompletedCount() {
    return this.filter((block) => block.isComplete()).length;
  }

  allComplete() {
    return this.every((block) => block.isComplete());
  }

  hasReady() {
    return this.some((block) => block.isReady());
  }

  isStarted() {
    return this.some((block) => block.isPending() || block.isComplete());
  }

  next() {
    return this.find((block) => block.isReady());
  }

}