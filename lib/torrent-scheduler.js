const EventEmitter = require('events');
const debug = require('debug')('torrent-scheduler');
const prettyBytes = require('pretty-bytes');

module.exports = class TorrentScheduler {

  constructor() {
    this.peerId_ = null;
    this.handles_ = {};
  }

  getPeerId() {
    return this.peerId_;
  }

  setPeerId(id) {
    this.peerId_ = id;
  }

  addHandle(handle) {
    const info = handle.getInfo();
    const hash = info.getHash().toString('utf-8');

    this.handles_[hash] = handle;

    const promises = handle.getTrackers().forEach((tracker) => {
      tracker.on('update', (t) => this.onTrackerUpdate(handle, t));
      tracker.on('add_peer', (p) => this.onAddPeer(handle, p));
      tracker.on('remove_peer', (p) => this.onRemovePeer(handle, p));

      tracker.update(this.peerId_, info).catch((e) => {
        debug(e);
      })
    });
  }

  getHandles() {
    return this.handles;
  }

  onTrackerUpdate(handle, tracker) {
    setTimeout(
      () => tracker.update(this.peerId_, handle.getInfo()),
      tracker.getInterval());
  }

  onAddPeer(handle, peer) {
    //if (this.temp_) return;
    peer.on('connect', (...args) => this.onPeerConnect(handle, peer, ...args));
    peer.on('error', (...args) => this.onPeerError(handle, peer, ...args));
    peer.on('close', (...args) => this.onPeerClose(handle, peer, ...args));
    peer.on('handshake', (...args) => this.onPeerHandshake(handle, peer, ...args));
    peer.on('keepalive', (...args) => this.onPeerKeepalive(handle, peer, ...args));
    peer.on('choke', (...args) => this.onPeerChoke(handle, peer, ...args));
    peer.on('unchoke', (...args) => this.onPeerUnchoke(handle, peer, ...args))
    peer.on('interested', (...args) => this.onPeerInterested(handle, peer, ...args))
    peer.on('notinterested', (...args) => this.onPeerNotInterested(handle, peer, ...args))
    peer.on('have', (...args) => this.onPeerHave(handle, peer, ...args))
    peer.on('bitfield', (...args) => this.onPeerBitfield(handle, peer, ...args));
    peer.on('piece', (...args) => this.onPeerPiece(handle, peer, ...args))
    peer.on('request', (...args) => this.onPeerRequest(handle, peer, ...args));
    peer.on('requesttimeout', (...args) => this.onPeerRequestTimeout(handle, peer, ...args))
    peer.on('cancel', (...args) => this.onPeerCancel(handle, peer, ...args))
    peer.on('port', (...args) => this.onPeerPort(handle, peer, ...args))
    peer.on('extended', (...args) => this.onPeerExtended(handle, peer, ...args))

    peer.connect().catch((e) => {
      debug(e);
    });
  }

  onRemovePeer(handle, peer) {
    peer.dispose();
  }

  onPeerConnect(handle, peer) {
    peer.handshake(this.peerId_, handle.getInfo().getHash());
    peer.startKeepalive(60 * 1000);
  }

  onPeerError(handle, peer, err) {

  }

  onPeerClose(handle, peer) {

  }

  onPeerHandshake(handle, peer, handshake) {
    peer.keepalive();
    peer.interested();
    peer.unchoke();
  }

  onPeerKeepalive(handle, peer) {

  }

  onPeerChoke(handle, peer) {
    // only changing choked peers once every ten seconds

    // uploads capping is managed by unchoking the four peers which have the 
    // best upload rate and are interested
  }

  onPeerUnchoke(handle, peer) {
    this.tick_(handle);
  }

  onPeerInterested(handle, peer) {

  }

  onPeerNotInterested(handle, peer) {

  }

  onPeerHave(handle, peer, index) {
    handle.getInfo().setPeerPiece(peer, index);
    this.tick_(handle);
  }

  onPeerBitfield(handle, peer, bitfield) {
    handle.getInfo().setPeerBitfield(peer, bitfield);
    this.tick_(handle);
  }

  onPeerPiece(handle, peer, index, begin, block) {
    const piece = handle.getInfo().getPieces().get(index);
    const pieceBlock = piece.getBlocks().get(begin);

    pieceBlock.setComplete(block);

    if (piece.isComplete()) {
      debug('piece complete', index);
      if (piece.verifyBlocks()) {
        debug('piece verified', index);
        const buffer = piece.flush();
        debug(buffer);
        const files = handle
          .getInfo()
          .getFiles()
          .byPiece(piece.getIndex(), piece.getLength());
        debug(files);
        // TODO: Set HAVE and tell peers
      } else {
        debug('piece discarded', index);
        piece.discard();
      }
    }

    this.tick_(handle);

    debug('Speed', prettyBytes(handle.getReadSpeed()));
    debug('Downloaded', prettyBytes(handle.getTotalBytesRead()));
    debug('Percent', (handle.getCompletedBlockCount() / handle.getTotalBlockCount()) * 100);
  }

  onPeerRequest(handle, peer, index, begin, length) {

  }

  onPeerRequestTimeout(handle, peer, index, begin, length) {
    handle.getInfo()
      .getPieces().get(index)
      .getBlocks().get(begin)
      .abandon();
    // TODO: send cancel to peer
    this.tick_(handle);
  }

  onPeerCancel(handle, peer, index, begin, length) {

  }

  onPeerPort(handle, peer, port) {

  }

  onPeerExtended(handle, peer, type, payload) {

  }

  tick_(handle) {
    const info = handle.getInfo();

    if (info.getPieces().allComplete()) {
      debug('all pieces complete');
      return;
    }

    let piece = null;
    // TODO: pick piece with blocks to resume so file pieces can be written asap
    if (info.getPieces().hasFirst()) {
      piece = info.getPieces().getRandomAvailable();
    } else {
      piece = info.getPieces().getRandomRare();
    }
    if (!piece) return;

    const newPeer = piece.getPeers().getBestAvailable();
    if (!newPeer) return;

    // TODO: request 10 blockss
    const block = piece.getBlocks().next();
    block.setPeer(newPeer);

    newPeer.request(piece.getIndex(), block.getBegin(), block.getLength());

    // TODO: implement end-game where the same remaining blocks are requested
    // from all peers. send cancel to all but first to respond
  }
}