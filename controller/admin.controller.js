const Admin = require("../model/admin.model");
const Credential = require("../model/credental.model");
const { hashPassword, comparePassword } = require("../utils/bcrypt");
const { signToken } = require("../utils/token");
const mongoose = require("mongoose");

// Create Admin
exports.createAdmin = async (req, res) => {
  try {
    // Permission check (example, adapt as needed)
    // if (!req.user || !req.user.hasPermission('create_admin')) return res.status(403).json({ message: 'Permission denied' });

    const { name, email, password, role } = req.body;
    // Basic validation
    if (!name || typeof name !== "string" || name.trim().length < 2)
      return res.status(400).json({ message: "Valid name required" });
    if (
      !email ||
      typeof email !== "string" ||
      !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
    )
      return res.status(400).json({ message: "Valid email required" });
    if (!password || typeof password !== "string" || password.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });

    // Check for duplicate admin or credential
    const existingAdmin = await Admin.findOne({ email }).lean();
    if (existingAdmin)
      return res
        .status(409)
        .json({ message: "Admin with this email already exists" });
    const existingCredential = await Credential.findOne({ email });
    if (existingCredential)
      return res
        .status(409)
        .json({ message: "Credential with this email already exists" });

    // Create credential
    const hashedPassword = await hashPassword(password);
    const credential = new Credential({
      email,
      password: hashedPassword,
      status: 1,
    });
    await credential.save();

    // Create admin and link credential
    const admin = new Admin({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "admin",
      credentialId: credential._id,
      status: 1,
    });
    await admin.save();

    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all admins with search, pagination, filters, and sorting
exports.getAllAdmins = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = { deleted: { $ne: true } };
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (typeof status !== "undefined") query.status = Number(status);
    // Sorting
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
    const total = await Admin.countDocuments(query);
    const admins = await Admin.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortObj)
      .select("-credentialId")
      .lean();
    res.json({
      data: admins,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get admin by ID (exclude sensitive fields)
exports.getAdminById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }
    const admin = await Admin.findOne({
      _id: req.params.id,
      deleted: { $ne: true },
    })
      .select("-credentialId")
      .lean();
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update admin by ID (with updatedAt and exclude sensitive fields)
exports.updateAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }
    const { name, email, role, status, credentialId } = req.body;
    const admin = await Admin.findOne({
      _id: req.params.id,
      deleted: { $ne: true },
    });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (typeof credentialId !== "undefined") {
      return res.status(400).json({ message: "Cannot update credentialId" });
    }
    if (name) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ message: "Valid name required" });
      }
      admin.name = name.trim();
    }
    if (email) {
      if (
        typeof email !== "string" ||
        !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
      ) {
        return res.status(400).json({ message: "Valid email required" });
      }
      const existingAdmin = await Admin.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingAdmin) {
        return res
          .status(409)
          .json({ message: "Email already in use by another admin" });
      }
      admin.email = email.trim().toLowerCase();
    }
    if (role) {
      if (typeof role !== "string" || !role.trim()) {
        return res.status(400).json({ message: "Valid role required" });
      }
      admin.role = role.trim();
    }
    if (typeof status !== "undefined") {
      if (![0, 1].includes(Number(status))) {
        return res.status(400).json({ message: "Status must be 0 or 1" });
      }
      admin.status = Number(status);
    }
    admin.updatedAt = Date.now();
    await admin.save();
    const adminObj = admin.toObject();
    delete adminObj.credentialId;
    res.json(adminObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete admin by ID (set deleted flag)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { deleted: true, status: 0, updatedAt: new Date() },
      { new: true },
    );
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    // Also deactivate credential
    if (admin.credentialId) {
      await Credential.findByIdAndUpdate(admin.credentialId, { status: 0 });
    }
    res.json({ message: "Admin soft deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add or update password (patch credential)
exports.updateAdminPassword = async (req, res) => {
  try {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }
    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (!admin.credentialId) {
      return res
        .status(400)
        .json({ message: "No credential linked to this admin" });
    }
    const hashedPassword = await hashPassword(password);
    const credUpdate = await Credential.findByIdAndUpdate(admin.credentialId, {
      password: hashedPassword,
      status: 1,
    });
    if (!credUpdate) {
      return res.status(404).json({ message: "Credential not found" });
    }
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin login (using credential)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const credential = await Credential.findOne({ email });
    if (!credential) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isMatch = await comparePassword(password, credential.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const admin = await Admin.findOne({
      credentialId: credential._id,
      deleted: { $ne: true },
    })
      .select("-credentialId")
      .lean();
    if (!admin) {
      return res
        .status(401)
        .json({ message: "Admin not found for credentials" });
    }
    const token = signToken({
      id: admin._id,
      email: admin.email,
      userType: "admin",
    });
    res.json({ token, admin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
