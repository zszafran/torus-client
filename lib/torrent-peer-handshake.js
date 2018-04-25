module.exports = class TorrentPeerHandshake {

  constructor() {
    this.protocol_ = Buffer.from('BitTorrent protocol', 'utf-8');
    this.reserved_ = new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    this.infoHash_ = null;
    this.peerId_ = null;
  }

  static from(buffer) {
    const instance = new TorrentPeerHandshake();
    const size = parseInt(buffer[0], 10);
    instance.setProtocol(buffer.slice(1, size + 1));
    instance.setReserved(buffer.slice(size + 1, size + 9));
    instance.setInfoHash(buffer.slice(size + 9, size + 29));
    instance.setPeerId(buffer.slice(size + 29, size + 49));
    return instance;
  }

  setProtocol(protocol) {
    this.protocol_ = protocol;
  }

  getProtocol() {
    return this.protocol_;
  }

  setReserved(reserved) {
    this.reserved_ = reserved;
  }

  getReserved() {
    return this.reserved_;
  }

  setInfoHash(hash) {
    this.infoHash_ = hash;
  }

  getInfohash() {
    return this.infoHash_;
  }

  setPeerId(id) {
    this.peerId_ = id;
  }

  getPeerId() {
    return this.peerId_;
  }

  build() {
    return Buffer.concat([
      Buffer.from([this.protocol_.length]),
      this.protocol_,
      this.reserved_,
      this.infoHash_,
      this.peerId_,
    ], 49 + this.protocol_.length);
  }

  inspect() {
    return `PeerHandshake (${this.getPeerId()}, ${this.getProtocol()})`;
  }

}