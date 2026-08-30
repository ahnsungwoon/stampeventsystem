const crypto = require('crypto');

function currentWindow() {
  return Math.floor(Date.now() / 10000);
}

function computeToken(boothId, secret, window) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${boothId}:${window}`)
    .digest('hex')
    .substring(0, 16);
}

function generateToken(boothId, secret) {
  return computeToken(boothId, secret, currentWindow());
}

function verifyToken(boothId, secret, token) {
  const win = currentWindow();
  for (let offset = 0; offset <= 1; offset++) {
    const expected = computeToken(boothId, secret, win - offset);
    if (
      expected.length === token.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
    ) {
      return true;
    }
  }
  return false;
}

function remainingMs() {
  return 10000 - (Date.now() % 10000);
}

module.exports = { generateToken, verifyToken, remainingMs };
