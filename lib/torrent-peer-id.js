const PREFIX = 'NT';
const VERSION = '0001';

const unique_ = (size) => {
  return `${parseInt(Math.random() * (10 ** size), 10)}`.padStart(size, '0');
};

const generatePeerId = () => {
  return Buffer.from(`-${PREFIX}${VERSION}-${unique_(12)}`);
};

const parsePeerId = () => {

};

module.exports = {
  generatePeerId,
  parsePeerId,
};