module.exports = class TorrentPieceList extends Array {

  constructor(...args) {
    super(...args);
  }

  get(index) {
    return this[index];
  }

  getAllAvailable() {
    return this.filter((piece) => {
      return !!piece.getPeerCount() && piece.hasReady();
    });
  }

  getRandomAvailable() {
    const pieces = this.getAllAvailable();
    return pieces[Math.floor(Math.random() * pieces.length)];
  }

  getAllRare() {
    let peerCount = null;
    const rarest = [];

    this.getAllAvailable().forEach((piece) => {
      // first fun set the lowest peer count.
      if (!peerCount) {
        peerCount = piece.getPeerCount();
        rarest.push(piece);
        return;
      }

      // if this piece also has the lowest peer count.
      if (peerCount == piece.getPeerCount()) {
        rarest.push(piece);
        return;
      }

      // if this piece has the new lowest peer count.
      if (peerCount > piece.getPeerCount()) {
        peerCount = piece.getPeerCount();
        rarest.length = 0;
        rarest.push(piece);
        return;
      }
    });

    return rarest;
  }

  getRandomRare() {
    const pieces = this.getAllRare();
    return pieces[Math.floor(Math.random() * pieces.length)];
  }

  getFirstIncomplete() {
    return this.getAllAvailable().find((piece) => piece.isStarted());
  }

  hasFirst() {
    return this.some((piece) => piece.isComplete());
  }

  allComplete() {
    return this.every((piece) => piece.isComplete());
  }
}