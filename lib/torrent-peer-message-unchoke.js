const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');

module.exports = class TorrentPeerMessageUnchoke extends TorrentPeerMessage {

  constructor() {
    super();
    this.setType(TorrentPeerMessageType.UNCHOKE);
  }

  inspect() {
    return 'PeerUnchoke';
  }

}