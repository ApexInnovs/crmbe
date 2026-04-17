const Lead = require("../model/lead.model");
const Client = require("../model/clients.model");
const Employee = require("../model/employee.model");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const parse = require("csv-parse/sync").parse;
const XLSX = require("xlsx");
const { consumeCompanyCredits } = require("../utils/conumeToken");
const { speechToTextAndRate } = require("../utils/speechTotext");
const employeeModel = require("../model/employee.model");

// Helper: Validate lead status
const validStatuses = [
  "created",
  "not_responsed",
  "not_intrested",
  "intrested_but_later",
  "intrested",
  "customer",
  "lost",
];

// Create lead (from campaign or bulk upload)
exports.createLead = async (req, res) => {
  try {
    const { campigne, leadData, company, createdBy, status } = req.body;
    if (!company || !mongoose.Types.ObjectId.isValid(company)) {
      return res.status(400).json({ message: "Valid company ID required." });
    }
    if (campigne && !mongoose.Types.ObjectId.isValid(campigne)) {
      return res.status(400).json({ message: "Valid campaign ID required." });
    }
    if (createdBy && !mongoose.Types.ObjectId.isValid(createdBy)) {
      return res
        .status(400)
        .json({ message: "Valid createdBy (employee) ID required." });
    }
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid lead status." });
    }
    // Auto-assign employee logic
    let assignedTo = null;
    const employees = await employeeModel.find({
      company,
      status: 1
    }).select("_id");
    console.log("Active employees for company:", employees);
    if (employees.length === 1) {
      assignedTo = employees[0]._id;
    } else if (employees.length > 1 && campigne) {
      // Find employee with fewest leads for this campaign
      const counts = await Promise.all(
        employees.map(async (emp) => {
          const count = await Lead.countDocuments({ campigne, assignedTo: emp._id });
          return { empId: emp._id, count };
        })
      );
      counts.sort((a, b) => a.count - b.count);
      assignedTo = counts[0].empId;
    }
    const lead = new Lead({
      campigne: campigne || null,
      leadData: leadData || {},
      company,
      createdBy,
      status: status || "created",
      deleted: false,
      ...(assignedTo ? { assignedTo } : {})
    });
    await lead.save();
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get leads (search, pagination, filter)
exports.getLeads = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      company,
      campigne,
      contacted = "all",
      assignedTo,
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = { deleted: { $ne: true } };
    if (company) query.company = company;
    if (campigne) query.campigne = campigne;
    if (status && validStatuses.includes(status)) query.status = status;
    // Contacted filter
    if (contacted === "contacted") {
      query.status = { $ne: "created" };
    } else if (contacted === "not_contacted") {
      query.status = "created";
    }
    if (search) {
      query.$or = [
        { "leadData.name": { $regex: search, $options: "i" } },
        { "leadData.phone": { $regex: search, $options: "i" } }
      ];
    }
    if(assignedTo){
      query.assignedTo = assignedTo;
    }
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate("campigne company createdBy assignedTo")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      data: leads,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get lead by ID
exports.getLeadById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    const lead = await Lead.findOne({
      _id: req.params.id,
      deleted: { $ne: true },
    })
      .populate("campigne company createdBy assignedTo")
      .lean();
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update lead (notes, status, meeting, etc.)
exports.updateLead = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    const {
      nextMeetingDate,
      notes,
      status,
      callRecording,
      callRecordingText,
      screenshots,
      leadData,
      assignedTo,
    } = req.body;
    const updateData = { updatedAt: new Date() };
    if (nextMeetingDate) updateData.nextMeetingDate = nextMeetingDate;
    if (notes && Array.isArray(notes)) updateData.notes = notes;
    if (callRecording) updateData.callRecording = callRecording;
    if (callRecordingText) updateData.callRecordingText = callRecordingText;
    if (screenshots && Array.isArray(screenshots))
      updateData.screenshots = screenshots;
    if (leadData) updateData.leadData = leadData;
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;

    // Get the previous lead to compare callRecording
    const prevLead = await Lead.findOne({ _id: req.params.id, deleted: { $ne: true } }).lean();
    if (!prevLead) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Lead not found" });
    }

    // Only process speech-to-text if callRecording is new or changed
    let shouldProcessSpeech = false;
    let companyIdForSpeech = null;
    if (
      callRecording &&
      typeof callRecording === "string" &&
      (callRecording.startsWith("http://") || callRecording.startsWith("https://")) &&
      callRecording !== prevLead.callRecording
    ) {
      shouldProcessSpeech = true;
      companyIdForSpeech = prevLead.company;
      // Remove any previous callRecordingText/rating for this update
      updateData.callRecordingText = undefined;
      updateData.callRecordingRating = undefined;
    }

    let lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      updateData,
      { new: true, session },
    ).lean();
    if (!lead) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Lead not found" });
    }
    // If status changes to 'customer', create client
    if (status && status === "customer") {
      try {
        // Populate assignedTo to get the name
        let assignedToName = "";
        if (lead.assignedTo) {
          const assignedEmp = await Employee.findById(lead.assignedTo).select('name');
          assignedToName = assignedEmp ? assignedEmp.name : "";
        }
        const clientData = {
          company: lead.company,
          lead_id: lead._id,
          managedBy: assignedToName,
          name: lead?.leadData?.name || "",
          phone: lead?.leadData?.phone || "",
          status: 1,
          projects: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await Client.create([clientData], { session });
      } catch (clientErr) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(500)
          .json({
            message: "Failed to create client from lead",
            error: clientErr.message,
          });
      }
    }
    await session.commitTransaction();
    session.endSession();
    res.json(lead);


    // ASYNC: If call recording changed, process speech-to-text and rating
    if (shouldProcessSpeech && companyIdForSpeech) {
      (async () => {
        try {
          try {
            await consumeCompanyCredits(companyIdForSpeech, 1);
          } catch (creditErr) {
            require("../utils/logger").error("Async speech-to-text: " + creditErr.message);
            return;
          }
          // Pass the URL directly to speechToTextAndRate
          const result = await speechToTextAndRate(callRecording);
          // Update the lead with transcription and rating
          // Ensure ai_review is always an array, not a string
          let ai_review = result?.rubricBreakdown;
          if (typeof ai_review === 'string') {
            try {
              ai_review = JSON.parse(ai_review);
            } catch (e) {
              require("../utils/logger").error("Failed to parse ai_review: " + e.message);
              ai_review = [];
            }
          }
          await Lead.findByIdAndUpdate(
            lead._id,
            {
              callRecordingText: result?.text,
              call_performance: result?.rating,
              ai_review
            },
            { new: false }
          );
        } catch (err) {
          // Log error but do not affect main response
          require("../utils/logger").error("Async speech-to-text failed: " + err.message);
        }
      })();
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Soft delete lead
exports.deleteLead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { deleted: true, updatedAt: new Date() },
      { new: true },
    );
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead soft deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign leads equally to active employees of a company
exports.assignLeadsEqually = async (req, res) => {
  try {
    const { companyId, leadIds } = req.body;
    if (!companyId || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "companyId and leadIds[] required." });
    }
    // Get active employees of the company
    const employees = await Employee.find({
      company: companyId,
      status: "active",
    }).select("_id");
    if (!employees.length) {
      return res
        .status(400)
        .json({ message: "No active employees found for this company." });
    }
    // Assign leads in round-robin fashion
    const updates = [];
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      const employeeId = employees[i % employees.length]._id;
      updates.push(
        Lead.findOneAndUpdate(
          { _id: leadId, company: companyId },
          { assignedTo: employeeId },
          { new: true },
        ),
      );
    }
    const results = await Promise.all(updates);
    res.json({ message: "Leads assigned equally.", results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign leads to a specific employee
exports.assignLeadsToEmployee = async (req, res) => {
  try {
    const { employeeId, leadIds } = req.body;
    if (!employeeId || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "employeeId and leadIds[] required." });
    }
    await Lead.updateMany(
      { _id: { $in: leadIds } },
      { assignedTo: employeeId },
    );
    res.json({ message: "Leads assigned to employee." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get leads by campaign and employee (with pagination)
exports.getLeadsByCampaignAndEmployee = async (req, res) => {
  try {
    let { campigne, assignedTo, status, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = { deleted: { $ne: true } };
    // Only add campigne if provided
    if (campigne) query.campigne = campigne;
    // assignedTo: from query or fallback to req.params.user
    if (assignedTo) {
      query.assignedTo = assignedTo;
    } else if (req.params && req.params.user) {
      query.assignedTo = req.params.user;
    }
    // status logic
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: "customer" };
    }
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate({ path: "campigne", select: "title status" })
      .populate({ path: "company", select: "name status creditsLeft" })
      .populate({ path: "createdBy", select: "name status" })
      .populate({ path: "assignedTo", select: "name status" })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      data: leads,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Import leads from JSON (parsed on frontend)
exports.importLeads = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { campaignId, campignName, description, leads, company, createdBy } = req.body;

    // Validate required fields
    if (!company || !mongoose.Types.ObjectId.isValid(company)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Valid company ID required." });
    }
    if (campaignId && !mongoose.Types.ObjectId.isValid(campaignId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Valid campaign ID required." });
    }
    if (createdBy && !mongoose.Types.ObjectId.isValid(createdBy)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Valid createdBy ID required." });
    }
    if (!Array.isArray(leads) || leads.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "No leads provided." });
    }
    if (leads.length > 5000) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Maximum 5000 leads per import." });
    }

    // Campaign handling
    let resolvedCampaignId = campaignId;
    if (!campaignId) {
      // Require campignName and description
      if (!campignName || !description) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "campignName and description required if campaignId not provided." });
      }
      // Create new campaign
      const Campigne = require("../model/campigne.model");
      const newCamp = await Campigne.create([
        {
          title: campignName,
          description,
          company,
          createdBy: createdBy || null,
          status: 2, // started
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ], { session });
      resolvedCampaignId = newCamp[0]._id;
    }

    // Fetch all active employees for the company
    const employees = await employeeModel.find({
      company,
      status: 1
    }).select("_id");

    const failedRows = [];
    const insertedLeads = [];

    for (let i = 0; i < leads.length; i++) {
      const row = leads[i];
      try {
        // Build leadData from all row fields
        const leadData = { ...row };

        // Check for duplicate (by email/phone in same company)
        const orConditions = [];
        if (leadData.email)
          orConditions.push({ "leadData.email": leadData.email });
        if (leadData.phone)
          orConditions.push({ "leadData.phone": leadData.phone });

        if (orConditions.length > 0) {
          const duplicate = await Lead.findOne({
            company,
            $or: orConditions,
            deleted: { $ne: true },
          }).session(session);
          if (duplicate) {
            throw new Error("Duplicate lead (email/phone)");
          }
        }

        // Assign employee: if only one, assign all to them; if multiple, round-robin
        let assignedTo = null;
        if (employees.length === 1) {
          assignedTo = employees[0]._id;
        } else if (employees.length > 1) {
          assignedTo = employees[i % employees.length]._id;
        }

        const lead = new Lead({
          campigne: resolvedCampaignId,
          leadData,
          company,
          createdBy: createdBy || null,
          status: "created",
          deleted: false,
          ...(assignedTo ? { assignedTo } : {})
        });
        await lead.save({ session });
        insertedLeads.push(lead);
      } catch (err) {
        failedRows.push({ rowIndex: i + 1, data: row, error: err.message });
      }
    }

    if (insertedLeads.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "No leads imported. All rows failed.",
        failedCount: failedRows.length,
        failedRows,
      });
    }

    await session.commitTransaction();
    session.endSession();

    const response = {
      message:
        failedRows.length > 0
          ? "Some leads imported, some failed."
          : "All leads imported successfully.",
      imported: insertedLeads.length,
      failed: failedRows.length,
      total: leads.length,
    };
    if (failedRows.length > 0) {
      response.failedRows = failedRows;
    }

    return res.status(failedRows.length > 0 ? 207 : 201).json(response);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Uploads leads in bulk from a CSV/XLSX file (local only, no cloud)
exports.bulkUploadLeads = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Check file
    if (!req.file) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "No file uploaded." });
    }

    // 2. Parse file (local only)
    const ext = path.extname(req.file.originalname).toLowerCase();
    let leadsRaw = [];
    if (ext === ".csv") {
      const fileContent = fs.readFileSync(req.file.path);
      leadsRaw = parse(fileContent, { columns: true, skip_empty_lines: true });
    } else if (ext === ".xlsx" || ext === ".xls") {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      leadsRaw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Unsupported file type. Only CSV/XLSX allowed." });
    }

    // 3. Validate and insert leads
    const failedRows = [];
    const insertedLeads = [];
    for (let i = 0; i < leadsRaw.length; i++) {
      const row = leadsRaw[i];
      try {
        // Required: company, leadData (at least name/email/phone)
        if (!row.company || !mongoose.Types.ObjectId.isValid(row.company)) {
          throw new Error("Invalid or missing company ID");
        }
        let campigne = row.campigne || null;
        if (campigne && !mongoose.Types.ObjectId.isValid(campigne)) {
          throw new Error("Invalid campaign ID");
        }
        let createdBy = row.createdBy || null;
        if (createdBy && !mongoose.Types.ObjectId.isValid(createdBy)) {
          throw new Error("Invalid createdBy ID");
        }
        let status = row.status || "created";
        if (status && !validStatuses.includes(status)) {
          throw new Error("Invalid lead status");
        }
        // leadData: collect all other fields
        const leadData = { ...row };
        delete leadData.company;
        delete leadData.campigne;
        delete leadData.createdBy;
        delete leadData.status;
        // Check for duplicate (by email/phone in same company)
        const duplicate = await Lead.findOne({
          company: row.company,
          $or: [
            { "leadData.email": leadData.email },
            { "leadData.phone": leadData.phone },
          ],
          deleted: { $ne: true },
        }).session(session);
        if (duplicate) {
          throw new Error("Duplicate lead (email/phone)");
        }
        // Insert
        const lead = new Lead({
          campigne,
          leadData,
          company: row.company,
          createdBy,
          status,
          deleted: false,
        });
        await lead.save({ session });
        insertedLeads.push(lead);
      } catch (err) {
        failedRows.push({ ...row, error: err.message });
      }
    }

    // 4. Decide: rollback or partial success
    if (insertedLeads.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "No leads uploaded.", failedRows });
    }
    if (failedRows.length > 0) {
      // Commit only successful
      await session.commitTransaction();
      session.endSession();
      // Generate failed rows file (CSV)
      const { Parser } = require("json2csv");
      const parser = new Parser();
      const failedCsv = parser.parse(failedRows);
      const failedPath = path.join(
        __dirname,
        "../uploads/failed_leads_" + Date.now() + ".csv",
      );
      fs.writeFileSync(failedPath, failedCsv);
      return res.status(207).json({
        message: "Some leads uploaded, some failed.",
        successCount: insertedLeads.length,
        failedCount: failedRows.length,
        failedFile: path.basename(failedPath),
        failedRows,
      });
    } else {
      await session.commitTransaction();
      session.endSession();
      return res.status(201).json({
        message: "All leads uploaded successfully.",
        count: insertedLeads.length,
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  } finally {
    // Clean up local file
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};
