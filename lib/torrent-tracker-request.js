const {URL} = require('url');

const Event = {
  STARTED: 'started',
  STOPPED: 'stopped',
  COMPLETED: 'completed',
}

module.exports = class TorrentTrackerRequest {

  static get Event() {
    return Event;
  }

  constructor() {
    this.announce_ = null;
    this.infoHash_ = null;
    this.peerId_ = null;
    this.port_ = null;
    this.uploaded_ = null;
    this.downloaded_ = null;
    this.left_ = null;
    this.compact_ = null;
    this.noPeerId_ = null;
    this.event_ = null;
    this.ip_ = null;
    this.numWant_ = null;
    this.key_ = null;
    this.trackerId_ = null;
  }

  setAnnounce(announce) {
    this.announce_ = announce;
  }

  setInfohash(hash) {
    this.infoHash_ = hash;
  }

  setPeerId(id) {
    this.peerId_ = id;
  }

  setPort(port) {
    this.port_ = port;
  }

  setUploaded(uploaded) {
    this.uploaded_ = uploaded;
  }

  setDownloaded(downloaded) {
    this.downloaded_ = downloaded;
  }

  setLeft(left) {
    this.left_ = left;
  }

  setCompact(compact) {
    this.compact_ = compact;
  }

  setNoPeerId(noPeerId) {
    this.noPeerId_ = noPeerId;
  }

  setEvent(event) {
    this.event_ = event;
  }

  setIp(ip) {
    this.ip_ = ip;
  }

  setNumWant(want) {
    this.numWant_ = want;
  }

  setKey(key) {
    this.key_ = key;
  }

  setTrackerId(id) {
    this.trackerId_ = id;
  }

  serialize_(obj) {
    return Object.keys(obj).map(k => {
      return `${escape(k)}=${escape(obj[k])}`;
    }).join('&');
  }

  build() {
    const params = {
      'info_hash': this.infoHash_.toString('binary'),
      'peer_id': this.peerId_.toString('utf-8'),
      'port': this.port_,
      'uploaded': this.uploaded_,
      'downloaded': this.downloaded_,
      'left': this.left_,
      'compact': this.compact_,
      'no_peer_id': this.noPeerId_,
      'event': this.event_,
    };

    if (this.ip_) {
      params['ip'] = this.ip_;
    }

    if (this.numWant_) {
      params['numwant'] = this.numWant_;
    }

    if (this.key_) {
      params['key'] = this.key_;
    }

    if (this.trackerId_) {
      params['trackerid'] = this.trackerId_;
    }

    const url = new URL(this.announce_);
    url.search = this.serialize_(params);
    return url.toString();
  }
}