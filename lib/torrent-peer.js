const debug = require("debug")("torrent-peer");
const net = require("net");
const EventEmitter = require("events");
const BitField = require("bitfield");
const speedometer = require("speedometer");
const { Writable } = require("stream");

const TorrentProtocol = require("torrent-peer-protocol");

const BITFIELD_GROW = 400000;
const MAX_REQUESTS = 10;

module.exports = class TorrentPeer extends EventEmitter {
  constructor() {
    super();
    this.id_ = null;
    this.ip_ = null;
    this.port_ = null;
    this.amChoking_ = true;
    this.amInterested_ = false;
    this.peerChoking_ = true;
    this.peerInterested_ = false;
    this.socket_ = null;
    this.connected_ = false;
    this.handshake_ = false;

    this.pendingRequestCount_ = 0;
    this.maxRequestCount_ = MAX_REQUESTS;
    // this.pendingRequestTimeout_ = null;

    this.timeoutCount_ = 0;
    this.keepAliveInterval_ = null;
    this.message_ = null;
    this.writeSpeed_ = speedometer();
    this.maxWriteSpeed_ = 0;
    this.readSpeed_ = speedometer();
    this.maxReadSpeed_ = 0;
    this.pieces_ = new BitField(0, {
      grow: BITFIELD_GROW
    });
  }

  debug_(message, sent = null) {
    const id = this.id_ ? this.id_.toString("utf-8") : "unknown";
    const direction = sent == null ? "" : sent ? "->" : "<-";
    debug(`(${id})`, direction, message);
  }

  getTotalBytesRead() {
    if (!this.socket_) return 0;
    return this.socket_.bytesRead;
  }

  getReadSpeed() {
    return this.readSpeed_();
  }

  getTotalBytesWritten() {
    if (!this.socket_) return 0;
    return this.socket_.bytesWritten;
  }

  getWriteSpeed() {
    return this.writeSpeed_();
  }

  setId(id) {
    this.id_ = id;
  }

  getId() {
    return this.id_;
  }

  setIp(ip) {
    this.ip_ = ip;
  }

  getIp() {
    return this.ip_;
  }

  setPort(port) {
    this.port_ = port;
  }

  getPort() {
    return this.port_;
  }

  getIpAndPort() {
    return `${this.ip_}:${this.port_}`;
  }

  setConnected(conn) {
    this.connected_ = conn;
  }

  getConnected() {
    return this.connected_;
  }

  getIsReady() {
    return this.connected_ && this.handshake_;
  }

  setAmChoking(choking) {
    this.amChoking_ = choking;
  }

  getAmChoking() {
    return this.amChoking_;
  }

  setAmInterested(interested) {
    this.amInterested_ = interested;
  }

  getAmInterested() {
    return this.amInterested_;
  }

  setPeerChoking(choking) {
    this.peerChoking_ = choking;
  }

  getPeerChoking() {
    return this.peerChoking_;
  }

  setPeerInterested(interested) {
    this.peerInterested_ = interested;
  }

  getPeerInterested() {
    return this.peerInterested_;
  }

  canDownload() {
    return (
      this.getIsReady() &&
      this.amInterested_ &&
      !this.peerChoking_ &&
      this.pendingRequestCount_ < this.maxRequestCount_
    );
  }

  canUpload() {
    return this.getIsReady() && this.peerInterested_ && !this.amChoking_;
  }

  hasPiece(index) {
    return !!this.pieces_.get(index);
  }

  getPendingRequestCount() {
    return this.pendingRequestCount_;
  }

  getTimeoutCount() {
    return this.timeoutCount_;
  }

  getMaxWriteSpeed() {
    return this.maxWriteSpeed_;
  }

  getMaxReadSpeed() {
    return this.maxReadSpeed_;
  }

  getMessageWritable() {
    return new Writable({
      objectMode: true,
      write: (chunk, encoding, callback) => {
        this.onMessage_(chunk);
        callback();
      }
    });
  }

  onConnect_() {
    this.debug_("Connected");
    this.setConnected(true);
    this.emit("connect");
  }

  onData_(data) {
    const speed = this.readSpeed_(data.length);
    this.maxReadSpeed_ = (this.maxReadSpeed_ + speed) / 2;
    //this.debug_(data.toString("hex"), false);
  }

  onMessage_(message) {
    switch (message.getType()) {
      case TorrentProtocol.PeerMessageType.HANDSHAKE:
        this.onPeerHandshake_(message);
        break;
      case TorrentProtocol.PeerMessageType.KEEP_ALIVE:
        this.onPeerKeepAlive_(message);
        break;
      case TorrentProtocol.PeerMessageType.CHOKE:
        this.onPeerChoke_(message);
        break;
      case TorrentProtocol.PeerMessageType.UNCHOKE:
        this.onPeerUnchoke_(message);
        break;
      case TorrentProtocol.PeerMessageType.INTERESTED:
        this.onPeerInterested_(message);
        break;
      case TorrentProtocol.PeerMessageType.NOT_INTERESTED:
        this.onPeerNotInterested_(message);
        break;
      case TorrentProtocol.PeerMessageType.HAVE:
        this.onPeerHave_(message);
        break;
      case TorrentProtocol.PeerMessageType.BITFIELD:
        this.onPeerBitfield_(message);
        break;
      case TorrentProtocol.PeerMessageType.REQUEST:
        this.onPeerRequest_(message);
        break;
      case TorrentProtocol.PeerMessageType.PIECE:
        this.onPeerPiece_(message);
        break;
      case TorrentProtocol.PeerMessageType.CANCEL:
        this.onPeerCancel_(message);
        break;
      case TorrentProtocol.PeerMessageType.PORT:
        this.onPeerPort_(message);
        break;
      case TorrentProtocol.PeerMessageType.EXTENDED:
        this.onExtendedMessage_(message);
        break;
      default:
        this.debug_(`Unknown Message ID: ${message.getType()}`);
        this.debug_(message.toBuffer());
    }
  }

  onClose_() {
    this.debug_("Connection closed");
    this.setConnected(false);
    this.stopKeepalive();
    this.emit("close");
  }

  onError_(err) {
    this.debug_(err);
    this.emit("error", err);
  }

  onPeerHandshake_(handshake) {
    // TODO: verify info hash
    // TODO: verify peer-id from the tracker
    this.debug_(handshake, false);
    this.setId(handshake.getPeerId());
    this.handshake_ = true;
    this.emit("handshake", handshake);
  }

  onPeerKeepAlive_(message) {
    this.debug_(message, false);
    this.emit("keepalive");
  }

  onPeerChoke_(message) {
    this.debug_(message, false);
    this.setPeerChoking(true);
    this.emit("choke");
  }

  onPeerUnchoke_(message) {
    this.debug_(message, false);
    this.setPeerChoking(false);
    this.emit("unchoke");
  }

  onPeerInterested_(message) {
    this.debug_(message, false);
    this.setPeerInterested(true);
    this.emit("interested");
  }

  onPeerNotInterested_(message) {
    this.debug_(message, false);
    this.setPeerInterested(false);
    this.emit("notinterested");
  }

  onPeerHave_(message) {
    this.debug_(message, false);

    const index = message.getIndex();
    if (this.pieces_.get(index)) return;

    this.debug_(`New piece: ${index}`);
    this.pieces_.set(index, true);

    this.emit("have", index);
  }

  onPeerBitfield_(message) {
    this.debug_(message, false);
    this.pieces_ = message.getBitField();
    this.emit("bitfield", this.pieces_);
  }

  onPeerRequest_(message) {
    this.debug_(message, false);
    this.emit(
      "request",
      message.getIndex(),
      message.getBegin(),
      message.getLength()
    );
  }

  onPeerRequestTimeout_(message) {
    this.debug_("request timeout", false);
    this.pendingRequest_ = message;
    this.pendingRequestTimeout_ = null;
    this.timeoutCount_ += 1;
    this.emit(
      "requesttimeout",
      message.getIndex(),
      message.getBegin(),
      message.getLength()
    );
  }

  onPeerPiece_(message) {
    this.debug_(message, false);
    this.pendingRequestCount_ -= 1;
    this.debug_(this.pendingRequestCount_, true);

    // if (this.pendingRequestTimeout_) {
    //   clearTimeout(this.pendingRequestTimeout_);
    //   this.pendingRequestTimeout_ = null;
    // }

    this.emit(
      "piece",
      message.getIndex(),
      message.getBegin(),
      message.getBlock()
    );
  }

  onPeerCancel_(message) {
    this.debug_(message, false);
    this.emit(
      "cancel",
      message.getIndex(),
      message.getBegin(),
      message.getLength()
    );
  }

  onPeerPort_(message) {
    this.debug_(message, false);
    this.emit("port", message.getPort());
  }

  onExtendedMessage_(message) {
    this.debug_(message, false);
    this.emit(
      "extended",
      message.getExtendedType(),
      message.getExtendedPayload()
    );
  }

  write_(message) {
    this.debug_(message, true);
    const buffer = message.toBuffer();
    this.socket_.write(buffer);
    const speed = this.writeSpeed_(buffer.length);
    this.maxWriteSpeed_ = (this.maxWriteSpeed_ + speed) / 2;
  }

  close() {
    this.debug_("Close");
    this.socket_.destroy();
  }

  connect() {
    this.handshake_ = false;

    return new Promise((resolve, reject) => {
      this.socket_ = new net.Socket();

      this.socket_
        .pipe(new TorrentProtocol.StreamTransform())
        .pipe(this.getMessageWritable());

      this.socket_.on("data", data => this.onData_(data));

      this.socket_.on("close", () => this.onClose_());

      this.socket_.on("error", err => {
        this.onError_(err);
        reject(err);
      });

      this.socket_.connect(this.port_, this.ip_, () => {
        this.onConnect_();
        resolve();
      });
    });
  }

  handshake(peerId, infoHash) {
    const handshake = new TorrentProtocol.PeerHandshake.Builder()
      .setPeerId(peerId)
      .setInfoHash(infoHash)
      .build();
    this.write_(handshake);
  }

  keepalive() {
    const message = new TorrentProtocol.PeerKeepAlive.Builder().build();
    this.write_(message);
  }

  startKeepalive(interval) {
    this.keepAliveInterval_ = setInterval(() => this.keepalive(), interval);
  }

  stopKeepalive() {
    if (this.keepAliveInterval_) {
      clearInterval(this.keepAliveInterval_);
      this.keepAliveInterval_ = null;
    }
  }

  choke() {
    const message = new TorrentProtocol.PeerChoke.Builder().build();
    this.write_(message);
    this.setAmChoking(true);
  }

  unchoke() {
    const message = new TorrentProtocol.PeerUnchoke.Builder().build();
    this.write_(message);
    this.setAmChoking(false);
  }

  interested() {
    const message = new TorrentProtocol.PeerInterested.Builder().build();
    this.write_(message);
    this.setAmInterested(true);
  }

  notInterested() {
    const message = new TorrentProtocol.PeerNotInterested.Builder().build();
    this.write_(message);
    this.setAmInterested(false);
  }

  have(index) {
    const message = new TorrentProtocol.PeerHave.Builder()
      .setIndex(index)
      .build();
    this.write_(message);
  }

  bitfield(bits) {
    const message = new TorrentProtocol.PeerBitfield.Builder()
      .setBitField(bits)
      .build();
    this.write_(message);
  }

  request(index, begin, len) {
    const message = new TorrentProtocol.PeerRequest.Builder()
      .setIndex(index)
      .setBegin(begin)
      .setLength(len)
      .build();
    this.pendingRequestCount_ += 1;
    this.write_(message);

    // this.pendingRequestTimeout_ = setTimeout(
    //   () => this.onPeerRequestTimeout_(message),
    //   10 * 1000);
  }

  piece(index, begin, block) {
    const message = new TorrentProtocol.PeerPiece.Builder()
      .setIndex(index)
      .setBegin(begin)
      .setBlock(block)
      .build();
    this.write_(message);
  }

  cancel(index, begin, len) {
    const message = new TorrentProtocol.PeerCancel.Builder()
      .setIndex(index)
      .setBegin(begin)
      .setLength(len)
      .build();
    this.write_(message);
  }

  port(port) {
    const message = new TorrentProtocol.PeerPort.Builder()
      .setPort(port)
      .build();
    this.write_(message);
  }

  extended(type, payload) {
    const message = new TorrentProtocol.PeerExtended.Builder()
      .setExtendedType(type)
      .setExtendedPayload(payload)
      .build();
    this.write_(message);
  }
};
