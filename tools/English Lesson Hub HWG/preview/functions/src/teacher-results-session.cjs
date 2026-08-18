"use strict";

const crypto = require("node:crypto");

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const RESULT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MAX_RESULT_IDS_PER_EXPORT = 5000;

function normalizeSessionToken(value) {
  const candidate = typeof value === "string" ? value : "";
  return SESSION_TOKEN_PATTERN.test(candidate) ? candidate : null;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function sessionIdForToken(value) {
  const token = normalizeSessionToken(value);
  if (!token) return null;
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeResultIds(value, limit = MAX_RESULT_IDS_PER_EXPORT) {
  if (!Array.isArray(value) || !value.length || value.length > limit) return null;
  const normalized = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (normalized.some((item, index) => !RESULT_ID_PATTERN.test(item) || item !== value[index])) return null;
  if (new Set(normalized).size !== normalized.length) return null;
  return normalized;
}

module.exports = {
  DEFAULT_SESSION_DURATION_MS,
  MAX_RESULT_IDS_PER_EXPORT,
  createSessionToken,
  normalizeResultIds,
  normalizeSessionToken,
  sessionIdForToken
};