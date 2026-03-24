const crypto = require('crypto');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const sessionDurationMs = Math.max(1, Number(process.env.JWT_EXPIRES_IN_DAYS) || 7) * DAY_IN_MS;
const sessions = new Map();

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(sessionId);
    }
  }
}

function createSession(user) {
  cleanupExpiredSessions();

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    userId: user.id || user._id.toString(),
    role: user.role,
    status: user.status,
    createdAt: Date.now(),
    expiresAt: Date.now() + sessionDurationMs,
  });

  return sessionId;
}

function getSession(sessionId) {
  cleanupExpiredSessions();
  return sessions.get(sessionId) || null;
}

function destroySession(sessionId) {
  sessions.delete(sessionId);
}

function destroyUserSessions(userId) {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId.toString()) {
      sessions.delete(sessionId);
    }
  }
}

function countActiveSessions() {
  cleanupExpiredSessions();
  return sessions.size;
}

module.exports = {
  countActiveSessions,
  createSession,
  destroySession,
  destroyUserSessions,
  getSession,
};
