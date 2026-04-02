const Campigne = require('../model/campigne.model');
const mongoose = require('mongoose');

// Helper: Validate form fields
function validateFormStructure(formStructure) {
    if (!Array.isArray(formStructure)) return 'Form structure must be an array.';
    for (const field of formStructure) {
        if (!field.name || typeof field.name !== 'string') return 'Each field must have a valid name.';
        if (!field.label || typeof field.label !== 'string') return 'Each field must have a valid label.';
        if (!field.type || !['text', 'email', 'number', 'date', 'textarea', 'dropdown', 'radio', 'checkbox'].includes(field.type))
            return `Invalid field type: ${field.type}`;
        if (field.options && !Array.isArray(field.options)) return 'Options must be an array.';
    }
    return null;
}

// Create campaign
exports.createCampigne = async (req, res) => {
    try {
        const { title, description, company, createdBy, formStructure, status } = req.body;
        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ message: 'Title is required and must be a string.' });
        }
        if (!company || !mongoose.Types.ObjectId.isValid(company)) {
            return res.status(400).json({ message: 'Valid company ID is required.' });
        }
        if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({ message: 'Valid createdBy (employee) ID is required.' });
        }
        if (formStructure) {
            const formError = validateFormStructure(formStructure);
            if (formError) return res.status(400).json({ message: formError });
        }
        const campigne = new Campigne({
            title: title.trim(),
            description: description ? description.trim() : '',
            company,
            createdBy,
            formStructure: formStructure || [],
            status: status || 1,
            deleted: false
        });
        await campigne.save();
        res.status(201).json(campigne);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get campaigns by company ID (with search, pagination, filter)
exports.getCampignesByCompanyId = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', status } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const query = { company: req.params.companyId, deleted: { $ne: true } };
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) query.status = Number(status);
        const total = await Campigne.countDocuments(query);
        const campignes = await Campigne.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            data: campignes,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get campaign by ID
exports.getCampigneById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid campaign ID' });
        }
        const campigne = await Campigne.findOne({ _id: req.params.id, deleted: { $ne: true } }).lean();
        if (!campigne) return res.status(404).json({ message: 'Campaign not found' });
        res.json(campigne);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update campaign by ID
exports.updateCampigne = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid campaign ID' });
        }
        const { title, description, formStructure, status } = req.body;
        const updateData = { updatedAt: new Date() };
        if (title) {
            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ message: 'Title must be a string.' });
            }
            updateData.title = title.trim();
        }
        if (description) {
            if (typeof description !== 'string') {
                return res.status(400).json({ message: 'Description must be a string.' });
            }
            updateData.description = description.trim();
        }
        if (formStructure) {
            const formError = validateFormStructure(formStructure);
            if (formError) return res.status(400).json({ message: formError });
            updateData.formStructure = formStructure;
        }
        if (status) updateData.status = Number(status);
        const campigne = await Campigne.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            updateData,
            { new: true }
        ).lean();
        if (!campigne) return res.status(404).json({ message: 'Campaign not found' });
        res.json(campigne);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Soft delete campaign by ID
exports.deleteCampigne = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid campaign ID' });
        }
        const campigne = await Campigne.findOneAndUpdate(
            { _id: req.params.id, deleted: { $ne: true } },
            { deleted: true, updatedAt: new Date() },
            { new: true }
        );
        if (!campigne) return res.status(404).json({ message: 'Campaign not found' });
        res.json({ message: 'Campaign soft deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
