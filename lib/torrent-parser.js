const parseTorrentFile = require('parse-torrent-file');
const fs = require('fs');
const {
  promisify
} = require('util');
const readFileAsync = promisify(fs.readFile);

const TorrentHandle = require('./torrent-handle');
const TorrentInfo = require('./torrent-info');
const TorrentFile = require('./torrent-file');
const TorrentPiece = require('./torrent-piece');
const TorrentTracker = require('./torrent-tracker');

module.exports = parse = async (path) => {
  const torrent = await readFileAsync(path);
  const parsed = parseTorrentFile(torrent);
  const handle = new TorrentHandle();
  const info = new TorrentInfo();
  info.setHash(parsed['infoHashBuffer']);
  info.setLength(parsed['length']);
  info.setPiecesLength(parsed['pieceLength']);
  info.setLastPieceLength(parsed['lastPieceLength']);

  parsed['files'].forEach((parsedFile) => {
    const file = new TorrentFile();
    file.setPath(parsedFile['path']);
    file.setName(parsedFile['name']);
    file.setLength(parsedFile['length']);
    file.setOffset(parsedFile['offset']);
    info.addFile(file);
  });

  parsed['pieces'].forEach((parsedPiece, index) => {
    const isLast = parsed['pieces'].length - 1 == index;
    const piece = new TorrentPiece();
    piece.setHash(parsedPiece);
    piece.setIndex(index);
    piece.setLength(!isLast ?
      info.getPieceLength() :
      info.getLastPieceLength());
    info.addPiece(piece);
  });

  parsed['announce'].forEach((parsedAnnounce) => {
    const announce = new TorrentTracker();
    announce.setAnnounce(parsedAnnounce);
    handle.addAnnounce(announce);
  });

  parsed['urlList'].forEach((parsedUrl) => {
    handle.addUrl(parsedUrl);
  })

  handle.setName(parsed['name']);
  handle.setCreated(parsed['created']);
  handle.setComment(parsed['comment']);
  handle.setInfo(info);

  return handle;
}