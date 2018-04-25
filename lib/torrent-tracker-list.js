module.exports = class TorrentTrackerList extends Array {

  constructor(...args) {
    super(...args);
  }

  get(index) {
    return this[index];
  }

  getTotalBytesRead() {
    return this.reduce((total, t) => total += t.getPeers().getTotalBytesRead(), 0);
  }

  getReadSpeed() {
    return this.reduce((total, t) => total += t.getPeers().getReadSpeed(), 0);
  }

  getTotalBytesWritten() {
    return this.reduce((total, t) => total += t.getPeers().getTotalBytesWritten(), 0);
  }

  getWriteSpeed() {
    return this.reduce((total, t) => total += t.getPeers().getWriteSpeed(), 0);
  }
}