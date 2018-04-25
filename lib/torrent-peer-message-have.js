const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageHave extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.HAVE);
    this.setPayload(Buffer.alloc(4));
  }

  setIndex(index) {
    this.getPayload().writeUInt32BE(index, 0);
  }

  getIndex() {
    return this.getPayload().readUInt32BE(0);
  }

  inspect() {
    return `PeerHave (${this.getIndex()})`;
  }

}