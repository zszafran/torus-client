const util = require('util');
const buffer = require('buffer');

const TorrentPeerMessageType = {
  KEEP_ALIVE: null,
  CHOKE: 0,
  UNCHOKE: 1,
  INTERESTED: 2,
  NOT_INTERESTED: 3,
  HAVE: 4,
  BITFIELD: 5,
  REQUEST: 6,
  PIECE: 7,
  CANCEL: 8,
  PORT: 9,
  EXTENDED: 20,
};

class TorrentPeerMessage {

  constructor() {
    this.length_ = 0;
    this.type_ = null;
    this.payload_ = null;
    this.bufferPosition_ = 0;
  }

  static clone(message) {
    const instance = new this();
    instance.setLength(message.getLength());
    instance.setType(message.getType());
    instance.setPayload(message.getPayload());
    return instance;
  }

  static from(buf) {
    try {
      const instance = new this();
      const len = buf.readUInt32BE(0);

      instance.setLength(len);

      if (len) {
        instance.setType(buf.readUInt8(4));
      } else {
        instance.setType(TorrentPeerMessageType.KEEP_ALIVE);
      }

      if (len > 1 && len < buffer.kMaxLength) {
        // subtract the len of the 'type'
        instance.setPayload(new Buffer(len - 1));
        instance.appendPayload(buf.slice(5));
      }

      return instance;
    } catch (e) {
      console.log(buf);
      throw e;
    }
  }

  build() {
    if (this.type_ === TorrentPeerMessageType.KEEP_ALIVE) {
      return Buffer.alloc(4);
    }

    const len = this.payload_ ? this.payload_.length + 1 : 1;
    const type = this.type_ == null ? 0 : this.type_;
    const ret = Buffer.alloc(4 + len);

    ret.writeUInt32BE(len, 0);

    if (type) {
      ret.writeUInt8(type, 4);
    }

    if (type && this.payload_) {
      this.payload_.copy(ret, 5);
    }

    return ret;
  }

  setLength(len) {
    this.length_ = len;
  }

  getLength() {
    if (this.length_ === null) {
      // add 1 for len of 'type'
      return this.payload_.length + 1;
    }
    return this.length_;
  }

  setType(type) {
    this.type_ = type;
  }

  getType() {
    return this.type_;
  }

  setPayload(payload) {
    this.payload_ = payload;
  }

  appendPayload(buf) {
    if (!this.payload_) {
      this.payload_ = buf;
    } else {
      buf.copy(this.payload_, this.bufferPosition_);
    }
    this.bufferPosition_ += buf.length;
  }

  getPayload() {
    return this.payload_;
  }

  isComplete() {
    // add 1 for len of 'type'
    const len = this.bufferPosition_ + 1;
    return this.length_ === len;
  }

}

module.exports = {
  TorrentPeerMessage,
  TorrentPeerMessageType,
}