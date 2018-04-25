module.exports = class TorrentBlock {

  constructor() {
    this.peer_ = null;
    this.chunk_ = null;
    this.index_ = 0;
    this.begin_ = 0;
    this.index_ = 0;
    this.complete_ = false;
  }

  getIndex() {
    return this.index_
  }

  setIndex(index) {
    this.index_ = index;
  }

  getBegin() {
    return this.begin_;
  }

  setBegin(begin) {
    this.begin_ = begin;
  }

  getLength() {
    return this.length_;
  }

  setLength(length) {
    this.length_ = length;
  }

  hasPeer() {
    return !!this.peer_;
  }

  setPeer(peer) {
    this.peer_ = peer;
  }

  abandon() {
    this.peer_ = null;
  }

  isComplete() {
    return !!this.complete_;
  }

  setComplete(chunk) {
    this.chunk_ = chunk;
    this.complete_ = true;
  }

  getChunk() {
    return this.chunk_;
  }

  discard() {
    this.complete_ = false;
    this.chunk_ = null;
    this.peer_ = null;
  }

  flush() {
    const chunk = this.chunk_;
    this.chunk_ = null;
    this.peer_ = null;
    return chunk;
  }

}