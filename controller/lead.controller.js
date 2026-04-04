const Lead = require('../model/lead.model');
const Client = require('../model/clients.model');
const Employee = require('../model/employee.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync').parse;
const XLSX = require('xlsx');

// Helper: Validate lead status
const validStatuses = [
    'created',
    'not_responsed',
    'not_intrested',
    'intrested_but_later',
    'intrested',
    'coustomer',
    'lost'
];

// Create lead (from campaign or bulk upload)
exports.createLead = async (req, res) => {
    try {
        const { campigne, leadData, company, createdBy, status } = req.body;
        if (!company || !mongoose.Types.ObjectId.isValid(company)) {
            return res.status(400).json({ message: 'Valid company ID required.' });
        }
        if (campigne && !mongoose.Types.ObjectId.isValid(campigne)) {
            return res.status(400).json({ message: 'Valid campaign ID required.' });
        }
        if (createdBy && !mongoose.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({ message: 'Valid createdBy (employee) ID required.' });
        }
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid lead status.' });
        }
        const lead = new Lead({
            campigne: campigne || null,
            leadData: leadData || {},
            company,
            createdBy,
            status: status || 'created',
            deleted: false
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
        let { page = 1, limit = 10, search = '', status, company, campigne } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const query = { deleted: { $ne: true } };
        if (company) query.company = company;
        if (campigne) query.campigne = campigne;
        if (status && validStatuses.includes(status)) query.status = status;
        if (search) {
            query.$or = [
                { 'leadData.name': { $regex: search, $options: 'i' } },
                { 'leadData.email': { $regex: search, $options: 'i' } },
                { 'leadData.phone': { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } }
            ];
        }
        const total = await Lead.countDocuments(query);
        const leads = await Lead.find(query)
            .populate('campigne company createdBy assignedTo')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            data: leads,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get lead by ID
exports.getLeadById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid lead ID' });
        }
        const lead = await Lead.findOne({ _id: req.params.id, deleted: { $ne: true } })
            .populate('campigne company createdBy assignedTo')
            .lean();
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
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
            return res.status(400).json({ message: 'Invalid lead ID' });
        }
        const { nextMeetingDate, notes, status, callRecording, callRecordingText, screenshots, leadData, assignedTo } = req.body;
        const updateData = { updatedAt: new Date() };
        if (nextMeetingDate) updateData.nextMeetingDate = nextMeetingDate;
        if (notes && Array.isArray(notes)) updateData.notes = notes;
        if (callRecording) updateData.callRecording = callRecording;
        if (callRecordingText) updateData.callRecordingText = callRecordingText;
        if (screenshots && Array.isArray(screenshots)) updateData.screenshots = screenshots;
        if (leadData) updateData.leadData = leadData;
        if (status) updateData.status = status;
        if (assignedTo) updateData.assignedTo = assignedTo;

        // If callRecording is present and is a URL, check and decrement credits
        if (callRecording && typeof callRecording === 'string' && (callRecording.startsWith('http://') || callRecording.startsWith('https://'))) {
            // Find the lead to get the company
            const leadDoc = await Lead.findOne({ _id: req.params.id, deleted: { $ne: true } }).session(session);
            if (!leadDoc) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Lead not found' });
            }
            const company = await require('../model/Company.model').findById(leadDoc.company).session(session);
            if (!company) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Company not found' });
            }
            if (!company.creditsLeft || company.creditsLeft <= 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'No credits left. Cannot upload call recording.' });
            }
            company.creditsLeft -= 1;
            await company.save({ session });
        }

        let lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            updateData,
            { new: true, session }
        ).lean();
        if (!lead) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Lead not found' });
        }
        // If status changes to 'coustomer', create client
        if (status && status === 'coustomer') {
            try {
                const clientData = {
                    company: lead.company,
                    lead_id: lead._id,
                    managedBy: lead.assignedTo ? lead.assignedTo.toString() : '',
                    notes: Array.isArray(lead.notes) && lead.notes.length > 0 ? lead.notes.map(n => n.text).join('\n') : '',
                    status: 1,
                    projects: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await Client.create([clientData], { session });
            } catch (clientErr) {
                await session.abortTransaction();
                session.endSession();
                return res.status(500).json({ message: 'Failed to create client from lead', error: clientErr.message });
            }
        }
        await session.commitTransaction();
        session.endSession();
        res.json(lead);
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
            return res.status(400).json({ message: 'Invalid lead ID' });
        }
        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            { deleted: true, updatedAt: new Date() },
            { new: true }
        );
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json({ message: 'Lead soft deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Assign leads equally to active employees of a company
exports.assignLeadsEqually = async (req, res) => {
    try {
        const { companyId, leadIds } = req.body;
        if (!companyId || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ message: 'companyId and leadIds[] required.' });
        }
        // Get active employees of the company
        const employees = await Employee.find({ company: companyId, status: 'active' }).select('_id');
        if (!employees.length) {
            return res.status(400).json({ message: 'No active employees found for this company.' });
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
                    { new: true }
                )
            );
        }
        const results = await Promise.all(updates);
        res.json({ message: 'Leads assigned equally.', results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Assign leads to a specific employee
exports.assignLeadsToEmployee = async (req, res) => {
    try {
        const { employeeId, leadIds } = req.body;
        if (!employeeId || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ message: 'employeeId and leadIds[] required.' });
        }
        await Lead.updateMany(
            { _id: { $in: leadIds } },
            { assignedTo: employeeId }
        );
        res.json({ message: 'Leads assigned to employee.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get leads by campaign and employee (with pagination)
exports.getLeadsByCampaignAndEmployee = async (req, res) => {
    try {
        let { campigne, employeeId, page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        if (!campigne || !employeeId) {
            return res.status(400).json({ message: 'campigne and employeeId required.' });
        }
        const query = {
            campigne,
            assignedTo: employeeId,
            deleted: { $ne: true }
        };
        const total = await Lead.countDocuments(query);
        const leads = await Lead.find(query)
            .populate('campigne company createdBy assignedTo')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            data: leads,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
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
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // 2. Parse file (local only)
        const ext = path.extname(req.file.originalname).toLowerCase();
        let leadsRaw = [];
        if (ext === '.csv') {
            const fileContent = fs.readFileSync(req.file.path);
            leadsRaw = parse(fileContent, { columns: true, skip_empty_lines: true });
        } else if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            leadsRaw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Unsupported file type. Only CSV/XLSX allowed.' });
        }

        // 3. Validate and insert leads
        const failedRows = [];
        const insertedLeads = [];
        for (let i = 0; i < leadsRaw.length; i++) {
            const row = leadsRaw[i];
            try {
                // Required: company, leadData (at least name/email/phone)
                if (!row.company || !mongoose.Types.ObjectId.isValid(row.company)) {
                    throw new Error('Invalid or missing company ID');
                }
                let campigne = row.campigne || null;
                if (campigne && !mongoose.Types.ObjectId.isValid(campigne)) {
                    throw new Error('Invalid campaign ID');
                }
                let createdBy = row.createdBy || null;
                if (createdBy && !mongoose.Types.ObjectId.isValid(createdBy)) {
                    throw new Error('Invalid createdBy ID');
                }
                let status = row.status || 'created';
                if (status && !validStatuses.includes(status)) {
                    throw new Error('Invalid lead status');
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
                        { 'leadData.email': leadData.email },
                        { 'leadData.phone': leadData.phone }
                    ],
                    deleted: { $ne: true }
                }).session(session);
                if (duplicate) {
                    throw new Error('Duplicate lead (email/phone)');
                }
                // Insert
                const lead = new Lead({
                    campigne,
                    leadData,
                    company: row.company,
                    createdBy,
                    status,
                    deleted: false
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
            return res.status(400).json({ message: 'No leads uploaded.', failedRows });
        }
        if (failedRows.length > 0) {
            // Commit only successful
            await session.commitTransaction();
            session.endSession();
            // Generate failed rows file (CSV)
            const { Parser } = require('json2csv');
            const parser = new Parser();
            const failedCsv = parser.parse(failedRows);
            const failedPath = path.join(__dirname, '../uploads/failed_leads_' + Date.now() + '.csv');
            fs.writeFileSync(failedPath, failedCsv);
            return res.status(207).json({
                message: 'Some leads uploaded, some failed.',
                successCount: insertedLeads.length,
                failedCount: failedRows.length,
                failedFile: path.basename(failedPath),
                failedRows
            });
        } else {
            await session.commitTransaction();
            session.endSession();
            return res.status(201).json({
                message: 'All leads uploaded successfully.',
                count: insertedLeads.length
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