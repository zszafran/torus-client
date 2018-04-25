const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageKeepAlive extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.KEEP_ALIVE);
  }

  inspect() {
    return 'PeerKeepAlive';
  }

}