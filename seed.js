/**
 * Seed Script — Create the first Super Admin
 *
 * Usage:
 *   node seed.js
 *   node seed.js --email admin@example.com --password MyPass123 --name "Super Admin"
 *
 * Reads MONGO_URI from .env (falls back to mongodb://localhost:27017/crm).
 * Safe to run multiple times — exits early if an admin with the same email already exists.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── Default credentials (override via CLI args) ──────────────────────────────
const args = process.argv.slice(2).reduce((acc, val, i, arr) => {
  if (val.startsWith("--")) acc[val.slice(2)] = arr[i + 1];
  return acc;
}, {});

const ADMIN_NAME = args.name || "Super Admin";
const ADMIN_EMAIL = args.email || "admin@crm.com";
const ADMIN_PASSWORD = args.password || "Admin@123";
// ─────────────────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/crm";

// Inline schemas so the script has no runtime dep on the app models
const CredentialSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  status: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  role: { type: String, default: "admin" },
  credentialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Credential",
    required: true,
  },
  status: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB:", MONGO_URI);

  const Credential = mongoose.model("Credential", CredentialSchema);
  const Admin = mongoose.model("Admin", AdminSchema);

  // Guard — don't create a duplicate
  const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(
      `Admin with email "${ADMIN_EMAIL}" already exists. Nothing to do.`,
    );
    await mongoose.disconnect();
    return;
  }

  // Hash password
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Create Credential document
  const credential = await Credential.create({
    email: ADMIN_EMAIL.toLowerCase(),
    password: hashed,
    status: 1,
  });

  // Create Admin document
  const admin = await Admin.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    role: "admin",
    credentialId: credential._id,
    status: 1,
  });

  console.log("");
  console.log("✅  Super Admin created successfully!");
  console.log("────────────────────────────────────");
  console.log("  Name    :", admin.name);
  console.log("  Email   :", admin.email);
  console.log("  Password:", ADMIN_PASSWORD);
  console.log("  ID      :", admin._id.toString());
  console.log("────────────────────────────────────");
  console.log("You can now log in at  POST /api/admin/login");
  console.log("");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
