const Employee = require("../model/employee.model");
const Credential = require("../model/credental.model");
const { hashPassword, comparePassword } = require("../utils/bcrypt");
const { signToken } = require("../utils/token");
const mongoose = require("mongoose");

// Ensure indexes for production (run once in setup or migration)
// Employee.collection.createIndex({ email: 1 }, { unique: true });
// Employee.collection.createIndex({ company: 1 });
// Employee.collection.createIndex({ role: 1 });

// Manual validation for employee creation
function validateEmployeeInput(body) {
  const errors = [];
  if (
    !body.email ||
    typeof body.email !== "string" ||
    !body.email.includes("@")
  ) {
    errors.push({ field: "email", message: "Valid email is required" });
  }
  if (
    !body.password ||
    typeof body.password !== "string" ||
    body.password.length < 6
  ) {
    errors.push({
      field: "password",
      message: "Password must be at least 6 characters",
    });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.push({ field: "name", message: "Name is required" });
  }
  if (!body.role) {
    errors.push({ field: "role", message: "Role is required" });
  }
  if (!body.company) {
    errors.push({ field: "company", message: "Company is required" });
  }
  return errors;
}

// Create a new employee (with credential)
exports.createEmployee = async (req, res) => {
  const errors = validateEmployeeInput(req.body);
  if (errors.length > 0) {
    return res.status(422).json({ errors });
  }
  try {
    const { email, password, ...rest } = req.body;
    // Check if email already exists in credentials
    const existingCredential = await Credential.findOne({ email });
    if (existingCredential) {
      return res.status(409).json({ message: "Email already exists" });
    }
    // Create credential
    const hashedPassword = await hashPassword(password);
    const credential = new Credential({ email, password: hashedPassword });
    await credential.save();
    // Create employee
    const employee = new Employee({
      ...rest,
      email,
      credentialId: credential._id,
    });
    await employee.save();
    // Exclude sensitive fields
    const employeeObj = employee.toObject();
    delete employeeObj.credentialId;
    res.status(201).json(employeeObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all employees with search, pagination, and filters (production-grade)
exports.getEmployees = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      role,
      company,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const queryObj = { deleted: { $ne: true } };
    if (search) {
      queryObj.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (status !== undefined) queryObj.status = status;
    if (role) queryObj.role = role;
    if (company) queryObj.company = company;
    // Sorting
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
    const total = await Employee.countDocuments(queryObj);
    const employees = await Employee.find(queryObj)
      .populate("role company")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortObj)
      .select("-credentialId -jwtToken")
      .lean();
    // Remove jwtToken if present (in case select is bypassed)
    const sanitizedEmployees = employees.map(emp => {
      if (emp.jwtToken) delete emp.jwtToken;
      return emp;
    });
    res.json({
      data: sanitizedEmployees,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single employee by ID (exclude sensitive fields)
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      deleted: { $ne: true },
    })
      .populate("role company")
      .select("-credentialId -jwtToken")
      .lean();
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    // Remove jwtToken if present (in case select is bypassed)
    if (employee.jwtToken) delete employee.jwtToken;
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Manual validation for employee update
function validateEmployeeUpdateInput(body) {
  const errors = [];
  if (
    body.email &&
    (typeof body.email !== "string" || !body.email.includes("@"))
  ) {
    errors.push({ field: "email", message: "Valid email is required" });
  }
  if (
    body.password &&
    (typeof body.password !== "string" || body.password.length < 6)
  ) {
    errors.push({
      field: "password",
      message: "Password must be at least 6 characters",
    });
  }
  if (body.name && (typeof body.name !== "string" || !body.name.trim())) {
    errors.push({ field: "name", message: "Name is required" });
  }
  if (body.role && !body.role) {
    errors.push({ field: "role", message: "Role is required" });
  }
  if (body.company && !body.company) {
    errors.push({ field: "company", message: "Company is required" });
  }
  return errors;
}

// Update an employee by ID (with updatedAt and exclude sensitive fields)
exports.updateEmployee = async (req, res) => {
  const errors = validateEmployeeUpdateInput(req.body);
  if (errors.length > 0) {
    return res.status(422).json({ errors });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { password, email, jwtToken, ...rest } = req.body;
    if (jwtToken !== undefined) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Updating jwtToken is not allowed" });
    }
    let updateData = { ...rest, updatedAt: new Date() };
    const employee = await Employee.findOne({
      _id: req.params.id,
      deleted: { $ne: true },
    }).session(session);
    if (!employee) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Employee not found" });
    }
    const credential = await Credential.findById(employee.credentialId).session(session);
    // Update password in credential if provided
    if (password && credential) {
      credential.password = await hashPassword(password);
      await credential.save({ session });
    }
    // Update email in credential if changed
    if (email && credential && email !== employee.email) {
      credential.email = email;
      await credential.save({ session });
      updateData.email = email;
    }
    // Update employee fields
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, session },
    )
      .populate("role company")
      .select("-credentialId -jwtToken")
      .lean();
    await session.commitTransaction();
    session.endSession();
    res.json(updatedEmployee);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// Soft delete an employee by ID (set deleted flag)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { deleted: true, updatedAt: new Date() },
      { new: true },
    );
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json({ message: "Employee soft deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Employee login (using credential)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const credential = await Credential.findOne({ email });
    if (!credential) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (credential.status !== 1) {
      return res.status(403).json({ message: "Credential is inactive" });
    }
    const isMatch = await comparePassword(password, credential.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const employee = await Employee.findOne({ credentialId: credential._id })
      .populate({ path: "role", populate: { path: "permissions" } })
      .populate("company");
    if (!employee) {
      return res
        .status(401)
        .json({ message: "Employee not found for credentials" });
    }
    if (employee.status !== 1) {
      return res.status(403).json({ message: "Employee is inactive" });
    }
    const token = signToken({
      id: employee._id,
      email: employee.email,
      userType: "employee",
    });
    if(token){
      await Employee.findByIdAndUpdate(employee._id, { jwtToken: token});
    }
    res.json({ token, employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password (using credential)
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const credential = await Credential.findById(employee.credentialId);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }
    const isMatch = await comparePassword(oldPassword, credential.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }
    credential.password = await hashPassword(newPassword);
    await credential.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
