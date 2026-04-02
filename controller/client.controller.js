const Client = require('../model/clients.model');
const mongoose = require('mongoose');

// Create client
exports.createClient = async (req, res) => {
    try {
        const { lead_id, company, managedBy, projectDetails, documents, notes, status } = req.body;
        if (!lead_id || !mongoose.Types.ObjectId.isValid(lead_id)) {
            return res.status(400).json({ message: 'Valid lead_id is required.' });
        }
        if (!company || !mongoose.Types.ObjectId.isValid(company)) {
            return res.status(400).json({ message: 'Valid company ID is required.' });
        }
        const client = new Client({
            lead_id,
            company,
            managedBy,
            projectDetails: projectDetails || {},
            documents: documents || [],
            notes: notes || null,
            status: typeof status !== 'undefined' ? status : 1,
            deleted: false
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
        let { page = 1, limit = 10, search = '', status, company, managedBy } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const query = { deleted: { $ne: true } };
        if (company) query.company = company;
        if (managedBy) query.managedBy = managedBy;
        if (typeof status !== 'undefined') query.status = Number(status);
        if (search) {
            query.$or = [
                { notes: { $regex: search, $options: 'i' } },
                { 'projectDetails.name': { $regex: search, $options: 'i' } },
                { 'projectDetails.description': { $regex: search, $options: 'i' } },
                { 'documents.title': { $regex: search, $options: 'i' } }
            ];
        }
        const total = await Client.countDocuments(query);
        const clients = await Client.find(query)
            .populate('lead_id company managedBy')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            data: clients,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get client by ID
exports.getClientById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid client ID' });
        }
        const client = await Client.findOne({ _id: req.params.id, deleted: { $ne: true } })
            .populate('lead_id company managedBy')
            .lean();
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update client by ID
exports.updateClient = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid client ID' });
        }
        const { projectDetails, documents, notes, status, managedBy } = req.body;
        const updateData = { updatedAt: new Date() };
        if (projectDetails) updateData.projectDetails = projectDetails;
        if (documents) updateData.documents = documents;
        if (notes) updateData.notes = notes;
        if (typeof status !== 'undefined') updateData.status = Number(status);
        if (managedBy) updateData.managedBy = managedBy;
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            updateData,
            { new: true }
        ).populate('lead_id company managedBy').lean();
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Soft delete client by ID
exports.deleteClient = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid client ID' });
        }
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            { deleted: true, updatedAt: new Date() },
            { new: true }
        );
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json({ message: 'Client soft deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add document to client
exports.addDocument = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid client ID' });
        }
        const { title, type, fileUrl } = req.body;
        if (!title || !fileUrl) {
            return res.status(400).json({ message: 'Document title and fileUrl are required.' });
        }
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            { $push: { documents: { title, type: type || 'Other', fileUrl, uploadedAt: new Date() } }, updatedAt: new Date() },
            { new: true }
        ).populate('lead_id company managedBy').lean();
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add note to client
exports.addNote = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid client ID' });
        }
        const { note } = req.body;
        if (!note || typeof note !== 'string') {
            return res.status(400).json({ message: 'Note must be a string.' });
        }
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            { notes: note, updatedAt: new Date() },
            { new: true }
        ).populate('lead_id company managedBy').lean();
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
