const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageNotInterested extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.NOT_INTERESTED);
  }

  inspect() {
    return 'PeerNotInterested';
  }

}