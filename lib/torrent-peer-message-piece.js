const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessagePiece extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.PIECE);
    this.setPayload(Buffer.alloc(8));
  }

  setIndex(index) {
    this.getPayload().writeUInt32BE(index, 0);
  }

  getIndex() {
    return this.getPayload().readUInt32BE(0);
  }

  setBegin(begin) {
    this.getPayload().writeUInt32BE(begin, 4);
  }

  getBegin() {
    return this.getPayload().readUInt32BE(4);
  }

  setBlock(block) {
    const buff = Buffer.alloc(block.length + 8);
    buff.writeUInt32BE(this.getIndex(), 0);
    buff.writeUInt32BE(this.getBegin(), 4);
    buff.copy(block, 8);
    this.setPayload(buff);
  }

  getBlock() {
    return this.getPayload().slice(8);
  }

  inspect() {
    return `PeerPiece (${this.getIndex()}, ${this.getBegin()})`;
  }

}