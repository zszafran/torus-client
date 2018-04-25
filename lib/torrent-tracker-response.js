const bencode = require('bencode');
const TorrentPeer = require('./torrent-peer');

module.exports = class TorrentTrackerResponse {

  constructor() {
    this.failureReason_ = null;
    this.warningMessage_ = null;
    this.interval_ = null;
    this.minInterval_ = null;
    this.trackerId_ = null;
    this.complete_ = null;
    this.incomplate_ = null;
    this.peers_ = [];
  }

  static from(buffer) {
    const parsed = bencode.decode(buffer);
    const response = new TorrentTrackerResponse();

    response.setFailureReason(parsed['failure reason']);
    response.setWarningMessage(parsed['warning message']);
    response.setInterval(parsed['interval']);
    response.setMinInterval(parsed['min interval']);
    response.setTrackerId(parsed['tracker id']);
    response.setComplete(parsed['complete']);
    response.setIncomplete(parsed['incomplete']);

    if (parsed['peers'] instanceof Buffer) {
      for (let i=0; i < parsed['peers'].length; i+=6) {
        const ip = parsed['peers'].slice(i, i + 4).readUInt32BE();
        const port = parsed['peers'].slice(i + 4, i + 6).readUInt16BE();
        const address = (ip>>>24) +
            '.' + (ip>>16 & 255) +
            '.' + (ip>>8 & 255) +
            '.' + (ip & 255);

        const peer = new TorrentPeer();
        peer.setIp(address);
        peer.setPort(port);
        response.addPeer(peer);
      }
    }
    else {
      (parsed['peers'] || []).forEach((parsedPeer) => {
        const peer = new TorrentPeer();
        peer.setIp(parsedPeer['ip']);
        peer.setPort(parsedPeer['port']);
        peer.setPeerId(parsedPeer['peer id']);
        response.addPeer(peer);
      });
    }

    return response;
  }

  hasFailureReason() {
    return !!this.failureReason_ && !!this.failureReason_.length;
  }

  getFailureReason() {
    return this.failureReason_.toString("utf8");
  }

  setFailureReason(reason) {
    this.failureReason_ = reason || null;
  }

  setWarningMessage(message) {
    this.warningMessage_ = message || null;
  }

  setInterval(interval) {
    this.interval_ = interval || 0;
  }

  getInterval() {
    return this.interval_;
  }

  setMinInterval(interval) {
    this.minInterval_ = interval || 0;
  }

  getMinInterval() {
    return this.minInterval_;
  }

  setTrackerId(id) {
    this.trackerId_ = id || null;
  }

  getTrackerId() {
    return this.trackerId_;
  }

  setComplete(complete) {
    this.complete_ = complete || 0;
  }

  getComplete() {
    return this.complete_;
  }

  setIncomplete(incomplete) {
    this.incomplate_ = incomplete || 0;
  }

  getIncomplete() {
    return this.incomplate_;
  }

  addPeer(peer) {
    this.peers_.push(peer);
  }

  getPeers() {
    return this.peers_;
  }

}