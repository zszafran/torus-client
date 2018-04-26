const crypto = require("crypto");
const TorrentPeerList = require('./torrent-peer-list');
const TorrentBlockList = require('./torrent-block-list');

const BLOCK_SIZE_BYTES = 2000;

module.exports = class TorrentPiece {

  constructor() {
    this.hash_ = null;
    this.peers_ = new TorrentPeerList();
    this.pieceLength_ = 0; // bytes
    this.index_ = 0;
    this.blocks_ = new TorrentBlockList();
  }

  static from(hash) {
    const piece = new TorrentPiece();
    piece.setHash(hash);
    return piece;
  }

  addBlock(block) {
    this.blocks_.push(block);
  }

  getIndex() {
    return this.index_;
  }

  setIndex(index) {
    this.index_ = index;
  }

  getLength() {
    return this.pieceLength_;
  }

  setLength(length) {
    this.pieceLength_ = length;
  }

  setHash(hash) {
    this.hash_ = hash;
  }

  isComplete() {
    return this.blocks_.allComplete();
  }

  isStarted() {
    return this.blocks_.isStarted();
  }

  hasReady() {
    return this.blocks_.hasReady();
  }

  addPeer(peer) {
    this.peers_.push(peer);
  }

  getPeers() {
    return this.peers_;
  }

  getPeerCount() {
    return this.peers_.length;
  }

  getBlocks() {
    return this.blocks_;
  }

  verifyBlocks() {
    const piece = Buffer.concat(this.blocks_.map((b) => b.getChunk()));
    if (this.pieceLength_ != piece.length) return false;

    const hash = crypto.createHash('sha1');
    this.blocks_.forEach((b) => {
      hash.write(b.getChunk());
    });
    hash.end();

    return this.hash_ == hash.read().toString('hex');
  }

  discard() {
    this.blocks_.forEach((block) => block.discard());
  }

  flush() {
    return Buffer.concat(this.blocks_.map((b) => b.flush()));
  }

}