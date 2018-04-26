module.exports = class TorrentPeerList extends Array {

  constructor(...args) {
    super(...args);
  }

  getAmChoking(val = true) {
    return this.filter((peer) => {
      return peer.getAmChoking() === val;
    });
  }

  getChoking(val = true) {
    return this.filter((peer) => {
      return peer.getPeerChoking() === val;
    });
  }

  getAmInterested(val = true) {
    return this.filter((peer) => {
      return peer.getAmInterested() === val;
    });
  }

  getInterested(val = true) {
    return this.filter((peer) => {
      return peer.getPeerInterested() === val;
    });
  }

  getHasPiece(index) {
    return this.filter((peer) => {
      return peer.hasPiece(index);
    });
  }

  getAvailable() {
    return this.filter((peer) => {
      return peer.canDownload();
    });
  }

  getTotalBytesRead() {
    return this.reduce((total, p) => total += p.getTotalBytesRead(), 0);
  }

  getReadSpeed() {
    return this.reduce((total, p) => total += p.getReadSpeed(), 0);
  }

  getTotalBytesWritten() {
    return this.reduce((total, p) => total += p.getTotalBytesWritten(), 0);
  }

  getWriteSpeed() {
    return this.reduce((total, p) => total += p.getWriteSpeed(), 0);
  }

  getBestAvailable() {
    const peers = this.getAvailable();

    let best = peers[Math.floor(Math.random() * peers.length)];

    // peers.forEach((peer) => {
    //   if (best.getTimeoutCount() > peer.getTimeoutCount()) {
    //     best = peer;
    //     return;
    //   }
    //   // give new peers a chance
    //   if (!peer.getMaxReadSpeed()) {
    //     best = peer;
    //     return;
    //   }
    //   // dont overwrite new peers
    //   if (!best.getMaxReadSpeed()) {
    //     return;
    //   }
    //   if (best.getMaxReadSpeed() < peer.getMaxReadSpeed()) {
    //     best = peer;
    //     return;
    //   }
    // });

    return best;
  }

}