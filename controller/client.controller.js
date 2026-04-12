const Client = require("../model/clients.model");
const mongoose = require("mongoose");

// Create client
exports.createClient = async (req, res) => {
  try {
    const { lead_id, company, managedBy, projects, notes, status, name, phone } = req.body;
    if (!company || !mongoose.Types.ObjectId.isValid(company)) {
      return res.status(400).json({ message: "Valid company ID is required." });
    }
    // managedBy is now a string, no ObjectId validation
    const client = new Client({
      lead_id,
      name: name || "",
      phone: phone || "",
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
      status,
      company,
      managedBy,
      campaign,
      name
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Build aggregation pipeline
    const pipeline = [
      // Match base client filters
      {
        $match: {
          deleted: { $ne: true },
          ...(company ? { company: mongoose.Types.ObjectId.isValid(company) ? new mongoose.Types.ObjectId(company) : company } : {}),
          ...(managedBy ? { managedBy } : {}),
          ...(name? { name: { $regex: name, $options: "i" } } : {}),
          ...(typeof status !== "undefined" ? { status: Number(status) } : {}),
        }
      },
      // Join with Lead collection
      {
        $lookup: {
          from: "leads",
          localField: "lead_id",
          foreignField: "_id",
          as: "lead_info"
        }
      },
      { $unwind: { path: "$lead_info", preserveNullAndEmptyArrays: true } },
      // Filter by campaign (if provided)
...(campaign ? [{
  $match: (
    campaign === 'offline'
      ? {
          $or: [
            { lead_id: { $exists: false } },
            { lead_id: null }
          ]
        }
      : {
          "lead_info.campigne": mongoose.Types.ObjectId.isValid(campaign)
            ? new mongoose.Types.ObjectId(campaign)
            : campaign
        }
  )
}] : []),
      // Filter by leadName (if provided)
      // Join with Campaign for population
      {
        $lookup: {
          from: "campignes",
          localField: "lead_info.campigne",
          foreignField: "_id",
          as: "campaign_info"
        }
      },
      { $unwind: { path: "$campaign_info", preserveNullAndEmptyArrays: true } },
      // Join with Company
      {
        $lookup: {
          from: "companies",
          localField: "company",
          foreignField: "_id",
          as: "company_info"
        }
      },
      { $unwind: "$company_info" },
      // Project final shape
      {
        $project: {
          lead_id: {
            _id: "$lead_info._id",
            campigne: {
              _id: "$campaign_info._id",
              title: "$campaign_info.title"
            },
            status: "$lead_info.status",
            leadData: "$lead_info.leadData",
            nextMeetingDate: "$lead_info.nextMeetingDate"
          },
          name: 1,
          phone: 1,
          company: "$company_info",
          managedBy: 1,
          status: 1,
          notes: 1,
          projects: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      // Pagination and total count
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ]
        }
      }
    ];

    const result = await Client.aggregate(pipeline);
    const total = result[0].metadata[0]?.total || 0;
    const clients = result[0].data;

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
    // Ensure name and phone are present in the response
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
    const { projects, notes, status, managedBy, name, phone } = req.body;
    const updateData = { updatedAt: new Date() };
    if (projects) updateData.projects = projects;
    if (notes) updateData.notes = notes;
    if (typeof status !== "undefined") updateData.status = Number(status);
    if (typeof managedBy !== "undefined") updateData.managedBy = managedBy;
    if (typeof name !== "undefined") updateData.name = name;
    if (typeof phone !== "undefined") updateData.phone = phone;
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
