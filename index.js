const path = require('path');
const fs = require('fs');
const {
  promisify
} = require('util');
const readFileAsync = promisify(fs.readFile);
const debug = require('debug')('torrent-client');

const {
  generatePeerId
} = require('./lib/torrent-peer-id');
const TorrentHandle = require('./lib/torrent-handle');
const TorrentScheduler = require('./lib/torrent-scheduler');

const fileName = 'samples/ubuntu-17.10.1-desktop-amd64.iso.torrent';
//const fileName = 'samples/archlinux-2018.04.01-x86_64.iso.torrent';
//const fileName = 'samples/Hirens.BootCD.15.2.zip.torrent';
const peerId = generatePeerId();
const scheduler = new TorrentScheduler();

scheduler.setPeerId(peerId);

readFileAsync(path.join(__dirname, fileName))
  .then((buffer) => TorrentHandle.from(buffer))
  .then((handle) => scheduler.addHandle(handle))
  .then((e) => debug(e))
  .catch((e) => debug(e));