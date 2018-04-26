const TorrentFile = require('./torrent-file');
const TorrentFileList = require('./torrent-file-list');
const TorrentPiece = require('./torrent-piece');
const TorrentPieceList = require('./torrent-piece-list');
const TorrentBlock = require('./torrent-block');

const BLOCK_SIZE_BYTES = 16384;

module.exports = class TorrentInfo {

  constructor() {
    this.hash_ = null;
    this.files_ = new TorrentFileList();
    this.length_ = null;
    this.piecesLength_ = null;
    this.lastPieceLength_ = null;
    this.pieces_ = new TorrentPieceList();
  }

  static from(dict) {
    const info = new TorrentInfo();
    info.setHash(dict['infoHashBuffer']);
    info.setLength(dict['length']);
    info.setPiecesLength(dict['pieceLength']);
    info.setLastPieceLength(dict['lastPieceLength']);

    dict['files'].forEach((parsedFile, index) => {
      const file = TorrentFile.from(parsedFile);
      file.setIndex(index);
      file.setPieceLength(info.getPiecesLength());
      info.addFile(file);
    });

    dict['pieces'].forEach((parsedPiece, index) => {
      const isLast = dict['pieces'].length - 1 == index;
      const piece = TorrentPiece.from(parsedPiece);
      const pieceLength = !isLast ?
        info.getPiecesLength() :
        info.getLastPieceLength();
      const blockCount = pieceLength / BLOCK_SIZE_BYTES;

      piece.setIndex(index);
      piece.setLength(pieceLength);

      for (let i = 0; i < blockCount; i++) {
        const block = new TorrentBlock();
        block.setIndex(i);
        block.setBegin(i * BLOCK_SIZE_BYTES);
        block.setLength(BLOCK_SIZE_BYTES);

        piece.addBlock(block);
      }

      info.addPiece(piece);
    });

    return info;
  }

  setHash(hash) {
    this.hash_ = hash;
  }

  getHash() {
    return this.hash_;
  }

  addFile(file) {
    this.files_.push(file);
  }

  getFiles() {
    return this.files_;
  }

  setLength(length) {
    this.length_ = length;
  }

  getLength() {
    return this.length_;
  }

  setPiecesLength(length) {
    this.piecesLength_ = length;
  }

  getPiecesLength() {
    return this.piecesLength_;
  }

  setLastPieceLength(length) {
    this.lastPieceLength_ = length;
  }

  getLastPieceLength() {
    return this.lastPieceLength_;
  }

  addPiece(piece) {
    this.pieces_.push(piece);
  }

  getPieces() {
    return this.pieces_;
  }

  setPeerPiece(peer, index) {
    if (!this.pieces_[index]) {
      throw new Error('Piece index does not exist')
    }

    this.pieces_[index].addPeer(peer);
  }

  setPeerBitfield(peer, bitfield) {
    this.pieces_.forEach((piece, index) => {
      if (bitfield.get(index)) {
        piece.addPeer(peer);
      }
    })
  }
}