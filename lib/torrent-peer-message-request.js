const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageRequest extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.REQUEST);
    this.setPayload(Buffer.alloc(12));
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

  setLength(len) {
    this.getPayload().writeUInt32BE(len, 8);
  }

  getLength() {
    return this.getPayload().readUInt32BE(8);
  }

  inspect() {
    return `PeerRequest (${this.getIndex()}, ${this.getBegin()}, ${this.getLength()})`;
  }

}