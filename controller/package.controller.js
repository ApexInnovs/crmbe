const Package = require('../model/package.model');

// Create a new package
exports.createPackage = async (req, res) => {
		try {
			const { name, price, offering, totalCredits, status } = req.body;
			if (!name || typeof name !== 'string' || !name.trim()) {
				return res.status(400).json({ message: 'Package name is required and must be a non-empty string.' });
			}
			if (typeof price !== 'number' || price < 0) {
				return res.status(400).json({ message: 'Price must be a non-negative number.' });
			}
			if (!Array.isArray(offering) || offering.some(f => !f.feature || typeof f.feature !== 'string' || typeof f.enabled !== 'boolean')) {
				return res.status(400).json({ message: 'Offering must be an array of { feature: string, enabled: boolean }.' });
			}
			if (typeof totalCredits !== 'number' || totalCredits < 0) {
				return res.status(400).json({ message: 'totalCredits must be a non-negative number.' });
			}
			// Check for duplicate package name
			const existing = await Package.findOne({ name: name.trim() }).lean();
			if (existing) {
				return res.status(409).json({ message: 'Package with this name already exists.' });
			}
			const pkg = new Package({
				name: name.trim(),
				price,
				offering,
				totalCredits,
				status: typeof status === 'number' ? status : 1
			});
			await pkg.save();
			res.status(201).json(pkg);
		} catch (error) {
			res.status(400).json({ message: error.message });
		}
};

// Get all packages
exports.getPackages = async (req, res) => {
		try {
			const { page = 1, limit = 10, search = '' } = req.query;
			const pageNum = Math.max(parseInt(page, 10) || 1, 1);
			const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
			const skip = (pageNum - 1) * limitNum;
			const filter = { status: { $ne: 0 } };
			if (search.trim()) filter.name = { $regex: search.trim(), $options: 'i' };
			const [total, packages] = await Promise.all([
				Package.countDocuments(filter),
				Package.find(filter).skip(skip).limit(limitNum).lean()
			]);
			res.json({
				data: packages,
				page: pageNum,
				limit: limitNum,
				total,
				totalPages: Math.ceil(total / limitNum)
			});
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};

// Get a single package by ID
exports.getPackageById = async (req, res) => {
		try {
			const { id } = req.params;
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid package ID.' });
			}
			const pkg = await Package.findById(id).lean();
			if (!pkg || pkg.status === 0) {
				return res.status(404).json({ message: 'Package not found' });
			}
			res.json(pkg);
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};

// Update a package by ID
exports.updatePackage = async (req, res) => {
		try {
			const { id } = req.params;
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid package ID.' });
			}
			if ('name' in req.body) {
				const name = req.body.name;
				if (!name || typeof name !== 'string' || !name.trim()) {
					return res.status(400).json({ message: 'Package name must be a non-empty string.' });
				}
				const duplicate = await Package.findOne({ name: name.trim(), _id: { $ne: id } }).lean();
				if (duplicate) {
					return res.status(409).json({ message: 'Package with this name already exists.' });
				}
				req.body.name = name.trim();
			}
			if ('price' in req.body && (typeof req.body.price !== 'number' || req.body.price < 0)) {
				return res.status(400).json({ message: 'Price must be a non-negative number.' });
			}
			if ('offering' in req.body && (!Array.isArray(req.body.offering) || req.body.offering.some(f => !f.feature || typeof f.feature !== 'string' || typeof f.enabled !== 'boolean'))) {
				return res.status(400).json({ message: 'Offering must be an array of { feature: string, enabled: boolean }.' });
			}
			if ('totalCredits' in req.body && (typeof req.body.totalCredits !== 'number' || req.body.totalCredits < 0)) {
				return res.status(400).json({ message: 'totalCredits must be a non-negative number.' });
			}
			const pkg = await Package.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
			if (!pkg || pkg.status === 0) {
				return res.status(404).json({ message: 'Package not found' });
			}
			res.json(pkg);
		} catch (error) {
			res.status(400).json({ message: error.message });
		}
};

// Delete a package by ID
exports.deletePackage = async (req, res) => {
		try {
			const { id } = req.params;
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid package ID.' });
			}
			// Soft delete: set status to 0
			const pkg = await Package.findByIdAndUpdate(id, { status: 0 }, { new: true, runValidators: true }).lean();
			if (!pkg) {
				return res.status(404).json({ message: 'Package not found' });
			}
			res.json({ message: 'Package soft deleted', data: pkg });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};
