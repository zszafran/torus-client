const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageExtended extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.EXTENDED);
    this.setPayload(Buffer.alloc(1));
  }

  setExtendedType(type) {
    this.getPayload().writeUInt8(type, 0);
  }

  getExtendedType() {
    return this.getPayload().readUInt8(0);
  }

  setExtendedPayload(payload) {
    const buff = Buffer.alloc(payload.length + 1);
    buff.writeUInt8(this.getExtendedType(), 0);
    buff.copy(payload, 1);
    this.setPayload(buff);
  }

  getExtendedPayload() {
    return this.getPayload().slice(1);
  }

}