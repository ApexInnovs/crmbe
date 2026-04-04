const Client = require("../model/clients.model");
const mongoose = require("mongoose");

// Create client
exports.createClient = async (req, res) => {
  try {
    const { lead_id, company, managedBy, projects, notes, status } = req.body;
    if (!lead_id || !mongoose.Types.ObjectId.isValid(lead_id)) {
      return res.status(400).json({ message: "Valid lead_id is required." });
    }
    if (!company || !mongoose.Types.ObjectId.isValid(company)) {
      return res.status(400).json({ message: "Valid company ID is required." });
    }
    // managedBy is now a string, no ObjectId validation
    const client = new Client({
      lead_id,
      company,
      managedBy: managedBy || "",
      projects: Array.isArray(projects) ? projects : [],
      notes: notes || null,
      status: typeof status !== "undefined" ? status : 1,
      deleted: false,
    });
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get clients (search, pagination, filter)
exports.getClients = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      company,
      managedBy,
      campaign,
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = { deleted: { $ne: true } };
    if (company) query.company = company;
    if (managedBy) query.managedBy = managedBy;
    if (typeof status !== "undefined") query.status = Number(status);
    if (search) {
      query.$or = [
        { notes: { $regex: search, $options: "i" } },
        { "projects.name": { $regex: search, $options: "i" } },
        { "projects.description": { $regex: search, $options: "i" } },
      ];
    }
    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .populate([
        { path: "company" },
        {
          path: "lead_id",
          populate: {
            path: "campigne",
            select: "title",
          },
        },
      ])
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      data: clients,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get client by ID
exports.getClientById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    const client = await Client.findOne({
      _id: req.params.id,
      deleted: { $ne: true },
    })
      .populate("lead_id company") // managedBy is now a string, do not populate
      .lean();
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update client by ID
exports.updateClient = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    const { projects, notes, status, managedBy } = req.body;
    const updateData = { updatedAt: new Date() };
    if (projects) updateData.projects = projects;
    if (notes) updateData.notes = notes;
    if (typeof status !== "undefined") updateData.status = Number(status);
    if (typeof managedBy !== "undefined") updateData.managedBy = managedBy;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      updateData,
      { new: true },
    )
      .populate("lead_id company")
      .lean(); // managedBy is now a string, do not populate
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete client by ID
exports.deleteClient = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { deleted: true, updatedAt: new Date() },
      { new: true },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Client soft deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
