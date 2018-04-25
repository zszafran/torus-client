module.exports = class TorrentFile {

  constructor() {
    this.index_ = null;
    this.path_ = null;
    this.name_ = null;
    this.length_ = null;
    this.offset_ = null;
    this.pieceLength_ = null;
  }

  static from(dict) {
    const file = new TorrentFile();
    file.setPath(dict['path']);
    file.setName(dict['name']);
    file.setLength(dict['length']);
    file.setOffset(dict['offset']);
    return file;
  }

  getIndex() {
    return this.index_;
  }

  setIndex(index) {
    this.index_ = index;
  }

  getPath() {
    return this.path_;
  }

  setPath(path) {
    this.path_ = path;
  }

  setName(name) {
    this.name_ = name;
  }

  getLength() {
    return this.length_;
  }

  setLength(length) {
    this.length_ = length;
  }

  getPieceLength() {
    return this.pieceLength_;
  }

  setPieceLength(length) {
    this.pieceLength_ = length;
  }

  getOffset() {
    return this.offset_;
  }

  setOffset(offset) {
    this.offset_ = offset;
  }
}