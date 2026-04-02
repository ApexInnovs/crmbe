const Company = require("../model/Company.model");
const Credential = require("../model/credental.model");
const { hashPassword, comparePassword } = require("../utils/bcrypt");
const { signToken } = require("../utils/token");
const PackageModel = require("../model/package.model");

// Create a new company
exports.createCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      phone,
      logo,
      instagram,
      facebook,
      twitter,
      linkedin,
      isVerified,
      status,
      password, // Accept password from request
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Company name is required and must be a non-empty string.",
      });
    }
    if (
      !email ||
      typeof email !== "string" ||
      !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
    ) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "A valid password (min 6 chars) is required." });
    }
    // Check for duplicate email in Company
    const existing = await Company.findOne({
      email: email.trim().toLowerCase(),
    }).lean();
    if (existing) {
      return res
        .status(409)
        .json({ message: "Company with this email already exists." });
    }
    // Check for duplicate email in Credential
    const existingCredential = await Credential.findOne({
      email: email.trim().toLowerCase(),
    }).lean();
    if (existingCredential) {
      return res.status(409).json({ message: "Credential with this email already exists." });
    }
    // Hash password and create credential
    const hashedPassword = await hashPassword(password);
    const credential = new Credential({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      status: 1,
    });
    await credential.save();

    const company = new Company({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      address,
      phone,
      logo,
      instagram,
      facebook,
      twitter,
      linkedin,
      isVerified: typeof isVerified === "boolean" ? isVerified : false,
      status: typeof status === "number" ? status : 1,
      credentialId: credential._id,
    });
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all companies
exports.getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;
    const filter = { status: { $ne: 0 } };
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }
    const [total, companies] = await Promise.all([
      Company.countDocuments(filter),
      Company.find(filter).skip(skip).limit(limitNum).lean(),
    ]);
    res.json({
      data: companies,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }
    const company = await Company.findById(id).lean();
    if (!company || company.status === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.companyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      !email ||
      typeof email !== "string" ||
      !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
    ) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Password required." });
    }
    const company = await Company.findOne({
      email: email.trim().toLowerCase(),
      status: 1,
    });
    if (!company) {
      return res
        .status(404)
        .json({ message: "Company not found or inactive." });
    }
    const credential = await Credential.findById(company.credentialId);
    if (!credential || credential.status !== 1) {
      return res
        .status(403)
        .json({ message: "Credential inactive or not found." });
    }
    const isMatch = await comparePassword(password, credential.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }
    // Generate JWT token
    const token = signToken({
      id: company._id,
      email: company.email,
      userType: "company",
    });
    const companyObj = company.toObject();
    delete companyObj.credentialId;
    res.json({ token, company: companyObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a company by ID
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }
    if ("name" in req.body) {
      const name = req.body.name;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res
          .status(400)
          .json({ message: "Company name must be a non-empty string." });
      }
      req.body.name = name.trim();
    }
    if ("email" in req.body) {
      const email = req.body.email;
      if (
        !email ||
        typeof email !== "string" ||
        !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
      ) {
        return res.status(400).json({ message: "A valid email is required." });
      }
      // Check for duplicate email (exclude current doc)
      const duplicate = await Company.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: id },
      }).lean();
      if (duplicate) {
        return res
          .status(409)
          .json({ message: "Company with this email already exists." });
      }
      req.body.email = email.trim().toLowerCase();
    }
    const company = await Company.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!company || company.status === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a company by ID
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }
    // Soft delete: set status to 0
    const company = await Company.findByIdAndUpdate(
      id,
      { status: 0 },
      { new: true, runValidators: true },
    ).lean();
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({ message: "Company soft deleted", data: company });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Buy a package for a company (increment credits)
exports.buyPackage = async (req, res) => {
  try {
    const { companyId, packageId } = req.body;
    if (!companyId || !packageId) {
      return res.status(400).json({ message: "companyId and packageId are required." });
    }
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }
    const pkg = await PackageModel.findById(packageId).lean();
    if (!pkg || typeof pkg.totalCredits !== 'number') {
      return res.status(404).json({ message: "Package not found or invalid." });
    }
    company.packageId = packageId;
    company.creditsLeft = (company.creditsLeft || 0) + pkg.totalCredits;
    await company.save();
    res.json({ message: "Package purchased and credits updated.", company });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};