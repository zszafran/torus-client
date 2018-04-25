const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageChoke extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.CHOKE);
  }

  inspect() {
    return 'PeerChoke';
  }

}