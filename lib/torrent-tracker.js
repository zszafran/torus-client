const debug = require('debug')('torrent-tracker');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const TorrentPeerList = require('./torrent-peer-list');
const TorrentTrackerRequest = require('./torrent-tracker-request');
const TorrentTrackerResponse = require('./torrent-tracker-response');

const containsPeer = (peerList, peer) => {
  return peerList.some((p) => {
    return p.getIpAndPort() == peer.getIpAndPort();
  })
};

module.exports = class TorrentTracker extends EventEmitter {

  constructor() {
    super();
    this.announce_ = null;
    this.infoHash_ = null;
    this.complete_ = 0;
    this.incomplete_ = 0;
    this.interval_ = 1000;
    this.minInterval_ = 1000;
    this.peers_ = new TorrentPeerList();
  }

  static from(announce) {
    const instance = new TorrentTracker();
    instance.setAnnounce(announce);
    return instance;
  }

  setAnnounce(url) {
    this.announce_ = url;
  }

  setInfoHash(hash) {
    this.infoHash_ = hash;
  }

  setComplete(num) {
    this.complete_ = num;
  }

  getComplete() {
    return this.complete_;
  }

  setIncomplete(num) {
    this.incomplete_ = num;
  }

  getIncomplete() {
    return this.incomplete_;
  }

  setInterval(secs) {
    this.interval_ = secs;
  }

  getInterval() {
    return this.interval_ * 1000;
  }

  setMinInterval(secs) {
    this.minInterval_ = secs;
  }

  getPeers() {
    return this.peers_;
  }

  async response_(res) {
    const body = await res.buffer();
    return TorrentTrackerResponse.from(body);
  }

  request_(peerId, torrentInfo) {
    const request = new TorrentTrackerRequest();
    request.setAnnounce(this.announce_);
    request.setPeerId(peerId);
    request.setInfohash(torrentInfo.getHash());
    request.setPort(8080);
    request.setUploaded(0);
    request.setDownloaded(0);
    request.setLeft(torrentInfo.getLength());
    request.setCompact(0);
    request.setEvent(TorrentTrackerRequest.Event.STARTED);
    request.setNoPeerId(0);
    //request.setIp('192.168.1.1');
    request.setNumWant(50);
    //request.setKey(null);
    //request.setTrackerId(null);
    return request;
  }

  mergePeers_(peers) {
    peers.forEach((peer) => {
      if (!containsPeer(this.peers_, peer)) {
        this.onAddPeer_(peer);
        this.peers_.push(peer);
      }
    });

    this.peers_ = this.peers_.filter((peer) => {
      const contains = containsPeer(peers, peer);
      if (contains) return true;
      this.onRemovePeer_(peer);
    })
  }

  async update(peerId, torrentInfo) {
    const request = this.request_(peerId, torrentInfo);
    debug(request);

    const res = await fetch(request.build());
    const response = await this.response_(res);
    debug(response);

    if (response.hasFailureReason()) {
      throw new Error(response.getFailureReason());
    }

    this.mergePeers_(response.getPeers());
    this.setComplete(response.getComplete());
    this.setIncomplete(response.getIncomplete());
    this.setInterval(response.getInterval());
    this.setMinInterval(response.getMinInterval());

    this.emit('update', this);
  }

  onAddPeer_(peer) {
    this.emit('add_peer', peer);
  }

  onRemovePeer_(peer) {
    this.emit('remove_peer', peer);
  }

}