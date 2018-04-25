module.exports = class TorrentFileList extends Array {

  constructor(...args) {
    super(...args);
  }

  byPiece(pieceIndex, pieceLength) {
    return this.filter((file) => {
      const pieceStart = pieceIndex * file.getPieceLength();
      const pieceEnd = pieceStart + pieceLength;
      const fileStart = file.getOffset();
      const fileEnd = fileStart + file.getLength();

      // piece ended before the file starts
      if (pieceEnd < fileStart) {
        return false;
      }

      // piece starts after the file ends
      if (pieceStart > fileEnd) {
        return false;
      }

      return true;
    });
  }

}