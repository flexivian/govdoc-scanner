import fs from "fs/promises";
import crypto from "crypto";

// File-backed user store with hashed passwords.
// File path configured via API_USERS_FILE (default ./users.json)
// Password hashing: PBKDF2 with per-user salt.

const ITERATIONS = 100_000;
const KEYLEN = 32;
const DIGEST = "sha256";

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
}

export class UserStore {
  constructor(filePath) {
    this.filePath = filePath || process.env.API_USERS_FILE || "./users.json";
    this.users = new Map(); // id -> record
    this.usernameIndex = new Map(); // username -> id
    this.nextId = 1;
  }
  async load() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(raw);
      this.users.clear();
      this.usernameIndex.clear();
      for (const u of data.users || []) {
        this.users.set(u.id, u);
        this.usernameIndex.set(u.username, u.id);
        if (u.id >= this.nextId) this.nextId = u.id + 1;
      }
    } catch (e) {
      if (e.code !== "ENOENT") throw e; // ignore missing
    }
  }
  async persist() {
    const data = { users: Array.from(this.users.values()) };
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }
  list() {
    return Array.from(this.users.values()).map(
      ({ passwordHash, salt, ...pub }) => pub
    );
  }
  verify(username, password) {
    const id = this.usernameIndex.get(username);
    if (!id) return false;
    const u = this.users.get(id);
    const h = hashPassword(password, u.salt);
    if (h !== u.passwordHash) return false;
    const { passwordHash, salt, ...pub } = u;
    return pub;
  }
  async create({ username, password, role }) {
    if (this.usernameIndex.has(username)) throw new Error("user_exists");
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const user = {
      id: this.nextId++,
      username,
      role,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.usernameIndex.set(username, user.id);
    await this.persist();
    const { passwordHash: _, salt: __, ...pub } = user;
    return pub;
  }
  async update(id, { username, password, role }) {
    const user = this.users.get(id);
    if (!user) return null;
    if (username && username !== user.username) {
      if (this.usernameIndex.has(username)) throw new Error("user_exists");
      this.usernameIndex.delete(user.username);
      user.username = username;
      this.usernameIndex.set(username, id);
    }
    if (password) {
      user.salt = crypto.randomBytes(16).toString("hex");
      user.passwordHash = hashPassword(password, user.salt);
    }
    if (role) user.role = role;
    await this.persist();
    const { passwordHash, salt, ...pub } = user;
    return pub;
  }
  async delete(id) {
    const user = this.users.get(id);
    if (!user) return false;
    this.usernameIndex.delete(user.username);
    this.users.delete(id);
    await this.persist();
    return true;
  }
}

export async function initUserStore(path) {
  const store = new UserStore(path);
  await store.load();
  // seed default admin if empty and env provides
  if (
    store.users.size === 0 &&
    process.env.API_DEFAULT_ADMIN_USER &&
    process.env.API_DEFAULT_ADMIN_PASS
  ) {
    try {
      await store.create({
        username: process.env.API_DEFAULT_ADMIN_USER,
        password: process.env.API_DEFAULT_ADMIN_PASS,
        role: "admin",
      });
    } catch {}
  }
  return store;
}
