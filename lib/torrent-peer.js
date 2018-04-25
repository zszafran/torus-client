const debug = require('debug')('torrent-peer');
const net = require('net');
const EventEmitter = require('events');
const BitField = require('bitfield');
const speedometer = require('speedometer')

const TorrentPeerHandshake = require('./torrent-peer-handshake');
const {
  TorrentPeerMessage,
  TorrentPeerMessageType
} = require('./torrent-peer-message');
const TorrentPeerMessageKeepAlive = require('./torrent-peer-message-keepalive');
const TorrentPeerMessageChoke = require('./torrent-peer-message-choke');
const TorrentPeerMessageUnchoke = require('./torrent-peer-message-unchoke');
const TorrentPeerMessageInterested = require('./torrent-peer-message-interested');
const TorrentPeerMessageNotInterested = require('./torrent-peer-message-notinterested');
const TorrentPeerMessageHave = require('./torrent-peer-message-have');
const TorrentPeerMessageBitfield = require('./torrent-peer-message-bitfield');
const TorrentPeerMessageRequest = require('./torrent-peer-message-request');
const TorrentPeerMessagePiece = require('./torrent-peer-message-piece');
const TorrentPeerMessageCancel = require('./torrent-peer-message-cancel');
const TorrentPeerMessagePort = require('./torrent-peer-message-port');
const TorrentPeerMessageExtended = require('./torrent-peer-message-extended');

const BITFIELD_GROW = 400000;

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

    // TODO: support multiple requests
    this.pendingRequest_ = null;
    this.pendingRequestTimeout_ = null;

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
    const id = this.id_ ? this.id_.toString('utf-8') : 'unknown';
    const direction = sent == null ? '' : sent ? '->' : '<-';
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
    return this.getIsReady() &&
      this.amInterested_ &&
      !this.peerChoking_ &&
      !this.pendingRequest_;
  }

  canUpload() {
    return this.getIsReady() && this.peerInterested_ && !this.amChoking_;
  }

  hasPiece(index) {
    return !!this.pieces_.get(index);
  }

  getPendingRequest() {
    return this.pendingRequest_;
  }

  setPendingRequest(request) {
    this.pendingRequest_ = request;
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

  onConnect_() {
    this.debug_('Connected');
    this.setConnected(true);
    this.emit('connect');
  }

  onData_(data) {
    const speed = this.readSpeed_(data.length);
    this.maxReadSpeed_ = (this.maxReadSpeed_ + speed) / 2;
    //this.debug_(data, false);

    if (!this.handshake_) {
      const handshake = TorrentPeerHandshake.from(data);
      this.handshake_ = true;
      this.onPeerHandshake_(handshake);
      return;
    }

    if (this.message_) {
      this.message_.appendPayload(data);
    } else if (data.length >= 4) {
      this.message_ = TorrentPeerMessage.from(data);
    } else {
      this.debug_('new message is incorrect size', false);
      this.debug_(data, false);
      return;
    }

    if (this.message_.isComplete()) {
      this.onMessage_(this.message_);
      this.message_ = null;
      return;
    }
  }

  onMessage_(message) {
    switch (message.getType()) {
      case TorrentPeerMessageType.KEEP_ALIVE:
        this.onPeerKeepAlive_(
          TorrentPeerMessageKeepAlive.clone(message));
        break;

      case TorrentPeerMessageType.CHOKE:
        this.onPeerChoke_(
          TorrentPeerMessageChoke.clone(message));
        break;

      case TorrentPeerMessageType.UNCHOKE:
        this.onPeerUnchoke_(
          TorrentPeerMessageUnchoke.clone(message));
        break;

      case TorrentPeerMessageType.INTERESTED:
        this.onPeerInterested_(
          TorrentPeerMessageInterested.clone(message));
        break;

      case TorrentPeerMessageType.NOT_INTERESTED:
        this.onPeerNotInterested_(
          TorrentPeerMessageNotInterested.clone(message));
        break;

      case TorrentPeerMessageType.HAVE:
        this.onPeerHave_(
          TorrentPeerMessageHave.clone(message));
        break;

      case TorrentPeerMessageType.BITFIELD:
        this.onPeerBitfield_(
          TorrentPeerMessageBitfield.clone(message));
        break;

      case TorrentPeerMessageType.REQUEST:
        this.onPeerRequest_(
          TorrentPeerMessageRequest.clone(message));
        break;

      case TorrentPeerMessageType.PIECE:
        this.onPeerPiece_(
          TorrentPeerMessagePiece.clone(message));
        break;

      case TorrentPeerMessageType.CANCEL:
        this.onPeerCancel_(
          TorrentPeerMessageCancel.clone(message));
        break;

      case TorrentPeerMessageType.PORT:
        this.onPeerPort_(
          TorrentPeerMessagePort.clone(message));
        break;

      case TorrentPeerMessageType.EXTENDED:
        this.onExtendedMessage_(
          TorrentPeerMessageExtended.clone(message));
        break;

      default:
        this.debug_(`Unknown Message ID: ${message.getType()}`);
        this.debug_(message.getPayload());
    }
  }

  onClose_() {
    this.debug_('Connection closed');
    this.setConnected(false);
    this.stopKeepalive();
    this.emit('close');
  }

  onError_(err) {
    this.debug_(err);
    this.emit('error', err);
  }

  onPeerHandshake_(handshake) {
    // TODO: verify info hash
    this.debug_(handshake, false);
    this.setId(handshake.getPeerId());
    this.emit('handshake', handshake);
  }

  onPeerKeepAlive_(message) {
    this.debug_(message, false);
    this.emit('keepalive');
  }

  onPeerChoke_(message) {
    this.debug_(message, false);
    this.setPeerChoking(true);
    this.emit('choke');
  }

  onPeerUnchoke_(message) {
    this.debug_(message, false);
    this.setPeerChoking(false);
    this.emit('unchoke');
  }

  onPeerInterested_(message) {
    this.debug_(message, false);
    this.setPeerInterested(true);
    this.emit('interested');
  }

  onPeerNotInterested_(message) {
    this.debug_(message, false);
    this.setPeerInterested(false);
    this.emit('notinterested');
  }

  onPeerHave_(message) {
    this.debug_(message, false);

    const index = message.getIndex();
    if (this.pieces_.get(index)) return;

    this.debug_(`New piece: ${index}`);
    this.pieces_.set(index, true);

    this.emit('have', index);
  }

  onPeerBitfield_(message) {
    this.debug_(message, false);
    this.pieces_ = message.getBitfield();
    this.emit('bitfield', this.pieces_);
  }

  onPeerRequest_(message) {
    this.debug_(message, false);
    this.emit('request', message.getIndex(), message.getBegin(), message.getLength());
  }

  onPeerRequestTimeout_(message) {
    this.debug_("request timeout", false);
    this.pendingRequest_ = message;
    this.pendingRequestTimeout_ = null;
    this.timeoutCount_ += 1;
    this.emit('requesttimeout', message.getIndex(), message.getBegin(), message.getLength());
  }

  onPeerPiece_(message) {
    this.debug_(message, false)
    this.pendingRequest_ = null;

    if (this.pendingRequestTimeout_) {
      clearTimeout(this.pendingRequestTimeout_);
      this.pendingRequestTimeout_ = null;
    }

    this.emit('piece', message.getIndex(), message.getBegin(), message.getBlock());
  }

  onPeerCancel_(message) {
    this.debug_(message, false);
    this.emit('cancel', message.getIndex(), message.getBegin(), message.getLength());
  }

  onPeerPort_(message) {
    this.debug_(message, false);
    this.emit('port', message.getPort());
  }

  onExtendedMessage_(message) {
    this.debug_(message, false);
    this.emit('extended', message.getExtendedType(), message.getExtendedPayload());
  }

  write_(message) {
    this.debug_(message, true);
    const buffer = message.build();
    this.socket_.write(buffer);
    const speed = this.writeSpeed_(buffer.length);
    this.maxWriteSpeed_ = (this.maxWriteSpeed_ + speed) / 2;
  }

  close() {
    this.debug_('Close');
    this.socket_.destroy();
  }

  connect() {
    this.handshake_ = false;

    return new Promise((resolve, reject) => {
      this.socket_ = new net.Socket();

      this.socket_.on('data', (data) => this.onData_(data));

      this.socket_.on('close', () => this.onClose_());

      this.socket_.on('error', (err) => {
        this.onError_(err);
        reject(err);
      });

      this.socket_.connect(this.port_, this.ip_, () => {
        this.onConnect_();
        resolve();
      });
    })
  }

  handshake(peerId, infoHash) {
    const handshake = new TorrentPeerHandshake();
    handshake.setPeerId(peerId);
    handshake.setInfoHash(infoHash);
    this.write_(handshake);
  }

  keepalive() {
    const message = new TorrentPeerMessageKeepAlive();
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
    const message = new TorrentPeerMessageChoke();
    this.write_(message);
    this.setAmChoking(true);
  }

  unchoke() {
    const message = new TorrentPeerMessageUnchoke();
    this.write_(message);
    this.setAmChoking(false);
  }

  interested() {
    const message = new TorrentPeerMessageInterested();
    this.write_(message);
    this.setAmInterested(true);
  }

  notInterested() {
    const message = new TorrentPeerMessageNotInterested();
    this.write_(message);
    this.setAmInterested(false);
  }

  have(index) {
    const message = new TorrentPeerMessageHave();
    message.setIndex(index);
    this.write_(message);
  }

  bitfield(bits) {
    const message = new TorrentPeerMessageBitfield();
    message.setBitfield(bits);
    this.write_(message);
  }

  request(index, begin, len) {
    const message = new TorrentPeerMessageRequest();
    message.setIndex(index);
    message.setBegin(begin);
    message.setLength(len);
    this.pendingRequest_ = message;
    this.write_(message);

    this.pendingRequestTimeout_ = setTimeout(
      () => this.onPeerRequestTimeout_(message),
      10 * 1000);
  }

  piece(index, begin, block) {
    const message = new TorrentPeerMessagePiece();
    message.setIndex(index);
    message.setBegin(begin);
    message.setBlock(block);
    this.write_(message);
  }

  cancel(index, begin, len) {
    const message = new TorrentPeerMessageCancel();
    message.setIndex(index);
    message.setBegin(begin);
    message.setLength(len);
    this.write_(message);
  }

  port(port) {
    const message = new TorrentPeerMessagePort();
    message.setPort(port);
    this.write_(message);
  }

  extended(type, payload) {
    const message = new TorrentPeerMessageExtended();
    message.setExtendedType(type);
    message.setExtendedPayload(payload);
    this.write_(message);
  }

}