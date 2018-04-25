const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageInterested extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.INTERESTED);
  }

  inspect() {
    return 'PeerInterested';
  }

}