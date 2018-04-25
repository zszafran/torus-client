const debug = require('debug')('torrent-handle');
const parseTorrentFile = require('parse-torrent-file');

const TorrentHandle = require('./torrent-handle');
const TorrentInfo = require('./torrent-info');
const TorrentTracker = require('./torrent-tracker');
const TorrentTrackerList = require('./torrent-tracker-list');

module.exports = class TorrentHandle {

  constructor() {
    this.info_ = null;
    this.name_ = null;
    this.created_ = null;
    this.comment_ = null;
    this.trackers_ = new TorrentTrackerList();
    this.urls_ = [];
  }

  static from(buffer) {
    const parsed = parseTorrentFile(buffer);
    const handle = new TorrentHandle();
    const info = TorrentInfo.from(parsed);

    parsed['announce'].forEach((parsedAnnounce) => {
      const announce = TorrentTracker.from(parsedAnnounce);
      handle.addTracker(announce);
    });

    parsed['urlList'].forEach((parsedUrl) => {
      handle.addUrl(parsedUrl);
    })

    handle.setName(parsed['name']);
    handle.setCreated(parsed['created']);
    handle.setComment(parsed['comment']);
    handle.setInfo(info);

    debug(handle);

    return handle;
  }

  setInfo(info) {
    this.info_ = info;
  }

  getInfo() {
    return this.info_;
  }

  setName(name) {
    this.name_ = name;
  }

  getName() {
    return this.name_;
  }

  setCreated(created) {
    this.created_ = created;
  }

  getCreated() {
    return this.created_;
  }

  setComment(comment) {
    this.comment_ = comment;
  }

  getComment() {
    return this.comment_;
  }

  addTracker(announce) {
    this.trackers_.push(announce);
  }

  addUrl(url) {
    this.urls_.push(url);
  }

  getTrackers() {
    return this.trackers_;
  }

  getReadSpeed() {
    return this.getTrackers().getReadSpeed();
  }

  getTotalBytesRead() {
    return this.getTrackers().getTotalBytesRead();
  }

  getTotalBlockCount() {
    return this.getInfo().getPieces().reduce((total, piece) => {
      return total + piece.getBlocks().getCount();
    }, 0);
  }

  getCompletedBlockCount() {
    return this.getInfo().getPieces().reduce((total, piece) => {
      return total + piece.getBlocks().getCompletedCount();
    }, 0);
  }

}