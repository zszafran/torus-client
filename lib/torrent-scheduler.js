const EventEmitter = require("events");
const debug = require("debug")("torrent-scheduler");
const prettyBytes = require("pretty-bytes");

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
    const hash = info.getHash().toString("utf-8");

    this.handles_[hash] = handle;

    const promises = handle.getTrackers().forEach(tracker => {
      tracker.on("update", this.onTrackerUpdate.bind(this, handle));
      tracker.on("add_peer", this.onAddPeer.bind(this, handle));
      tracker.on("remove_peer", this.onRemovePeer.bind(this, handle));

      tracker.update(this.peerId_, info).catch(e => {
        debug(e);
      });
    });
  }

  getHandles() {
    return this.handles;
  }

  onTrackerUpdate(handle, tracker) {
    setTimeout(
      () => tracker.update(this.peerId_, handle.getInfo()),
      tracker.getInterval()
    );
  }

  onAddPeer(handle, peer) {
    peer.on("connect", this.onPeerConnect.bind(this, handle, peer));
    peer.on("error", this.onPeerError.bind(this, handle, peer));
    peer.on("close", this.onPeerClose.bind(this, handle, peer));
    peer.on("handshake", this.onPeerHandshake.bind(this, handle, peer));
    peer.on("keepalive", this.onPeerKeepalive.bind(this, handle, peer));
    peer.on("choke", this.onPeerChoke.bind(this, handle, peer));
    peer.on("unchoke", this.onPeerUnchoke.bind(this, handle, peer));
    peer.on("interested", this.onPeerInterested.bind(this, handle, peer));
    peer.on("notinterested", this.onPeerNotInterested.bind(this, handle, peer));
    peer.on("have", this.onPeerHave.bind(this, handle, peer));
    peer.on("bitfield", this.onPeerBitfield.bind(this, handle, peer));
    peer.on("piece", this.onPeerPiece.bind(this, handle, peer));
    peer.on("request", this.onPeerRequest.bind(this, handle, peer));
    peer.on(
      "requesttimeout",
      this.onPeerRequestTimeout.bind(this, handle, peer)
    );
    peer.on("cancel", this.onPeerCancel.bind(this, handle, peer));
    peer.on("port", this.onPeerPort.bind(this, handle, peer));
    peer.on("extended", this.onPeerExtended.bind(this, handle, peer));

    peer.connect().catch(e => {
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

  onPeerError(handle, peer, err) {}

  onPeerClose(handle, peer) {}

  onPeerHandshake(handle, peer, handshake) {
    peer.keepalive();
    peer.interested();
    peer.unchoke();
  }

  onPeerKeepalive(handle, peer) {}

  onPeerChoke(handle, peer) {
    // only changing choked peers once every ten seconds
    // uploads capping is managed by unchoking the four peers which have the
    // best upload rate and are interested
  }

  onPeerUnchoke(handle, peer) {
    this.tick_(handle);
  }

  onPeerInterested(handle, peer) {}

  onPeerNotInterested(handle, peer) {}

  onPeerHave(handle, peer, index) {
    handle.getInfo().setPeerPiece(peer, index);
    this.tick_(handle);
  }

  onPeerBitfield(handle, peer, bitfield) {
    handle.getInfo().setPeerBitfield(peer, bitfield);
    this.tick_(handle);
  }

  onPeerPiece(handle, peer, index, begin, block) {
    const piece = handle
      .getInfo()
      .getPieces()
      .get(index);
    const pieceBlock = piece.getBlocks().get(begin);

    pieceBlock.setComplete(block);

    if (piece.isComplete()) {
      debug("piece complete", index);
      if (piece.verifyBlocks()) {
        debug("piece verified", index);
        const buffer = piece.flush();
        debug(buffer);
        const files = handle
          .getInfo()
          .getFiles()
          .byPiece(piece.getIndex(), piece.getLength());
        debug(files);
        // TODO: Set HAVE and tell peers
      } else {
        debug("piece discarded", index);
        piece.discard();
      }
    }

    this.tick_(handle);

    debug("Speed", prettyBytes(handle.getReadSpeed()));
    debug("Downloaded", prettyBytes(handle.getTotalBytesRead()));
    debug(
      "Percent",
      handle.getCompletedBlockCount() / handle.getTotalBlockCount() * 100
    );
  }

  onPeerRequest(handle, peer, index, begin, length) {}

  onPeerRequestTimeout(handle, peer, index, begin, length) {
    handle
      .getInfo()
      .getPieces()
      .get(index)
      .getBlocks()
      .get(begin)
      .abandon();
    // TODO: send cancel to peer
    this.tick_(handle);
  }

  onPeerCancel(handle, peer, index, begin, length) {}

  onPeerPort(handle, peer, port) {}

  onPeerExtended(handle, peer, type, payload) {}

  tick_(handle) {
    const info = handle.getInfo();

    if (info.getPieces().allComplete()) {
      debug("all pieces complete");
      return;
    }

    let piece = info.getPieces().getFirstIncomplete();
    if (!piece) {
      if (info.getPieces().hasFirst()) {
        piece = info.getPieces().getRandomAvailable();
      } else {
        piece = info.getPieces().getRandomRare();
      }
    }
    if (!piece) return;

    const newPeer = piece.getPeers().getBestAvailable();
    if (!newPeer) return;

    // TODO: request multiple blocks
    const block = piece.getBlocks().next();
    block.setPending();
    newPeer.request(piece.getIndex(), block.getBegin(), block.getLength());

    // TODO: implement end-game where the same remaining blocks are requested
    // from all peers. send cancel to all but first to respond
  }
};
