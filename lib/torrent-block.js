const State = {
  READY: 0,
  PENDING: 1,
  COMPLETE: 2
}

module.exports = class TorrentBlock {

  constructor() {
    this.chunk_ = null;
    this.index_ = 0;
    this.begin_ = 0;
    this.index_ = 0;
    this.state_ = State.READY;
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

  abandon() {
    this.state_ = State.READY;
  }

  isComplete() {
    return this.state_ === State.COMPLETE;
  }

  isPending() {
    return this.state_ === State.PENDING;
  }

  isReady() {
    return this.state_ === State.READY;
  }

  setComplete(chunk) {
    this.chunk_ = chunk;
    this.state_ = State.COMPLETE;
  }

  setPending() {
    this.state_ = State.PENDING;
  }

  getChunk() {
    return this.chunk_;
  }

  discard() {
    this.state_ = State.READY;
    this.chunk_ = null;
  }

  flush() {
    const chunk = this.chunk_;
    this.chunk_ = null;
    return chunk;
  }

}