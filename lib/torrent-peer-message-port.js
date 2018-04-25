const {TorrentPeerMessage, TorrentPeerMessageType} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessagePort extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.PORT);
  }

  setPort(port) {
    this.getPayload().writeUInt16BE(port, 0);
  }

  getPort() {
    return this.getPayload().readUInt16BE(0);
  }

}