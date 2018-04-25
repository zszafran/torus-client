module.exports = class TorrentPieceList extends Array {

  constructor(...args) {
    super(...args);
  }

  get(index) {
    return this[index];
  }

  getAllAvailable() {
    return this.filter((piece) => {
      return !!piece.getPeerCount() && piece.getBlocks().hasAvailable();
    });
  }

  getRandomAvailable() {
    const continuation = this.find((piece) => piece.hasAvailableBlocks());
    if (continuation) return continuation;
    const pieces = this.getAllAvailable();
    return pieces[Math.floor(Math.random() * pieces.length)];
  }

  getAllRare() {
    let peerCount = null;
    const rarest = [];

    this.forEach((piece) => {
      // ignore pieces that have no peers to download from.
      if (!piece.getPeerCount()) {
        return;
      }

      // skip pieces that are completely finished.
      if (!piece.getBlocks().hasAvailable()) {
        return;
      }

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

  hasFirst() {
    return this.some((piece) => piece.isComplete());
  }

  allComplete() {
    return this.every((piece) => piece.isComplete());
  }
}