const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function getAuthUser(request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

function getAdminUser(request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('AdminBearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], JWT_SECRET + '_admin');
  } catch {
    return null;
  }
}

function signAdminToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET + '_admin', { expiresIn: '8h' });
}

module.exports = { getAuthUser, getAdminUser, signAdminToken };
