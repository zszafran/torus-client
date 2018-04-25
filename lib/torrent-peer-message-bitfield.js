const BitField = require('bitfield');

const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageBitfield extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.BITFIELD);
  }

  getBitfield() {
    return new BitField(this.getPayload() || []);
  }

  setBitfield(bitfield) {
    this.setPayload(bitfield.buffer);
  }

  inspect() {
    return 'PeerBitfield';
  }

}