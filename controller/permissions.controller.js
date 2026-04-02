const Permission = require('../model/permissions.model');

// Create a new permission
exports.createPermission = async (req, res) => {
	try {
		   // Validate required fields (example: name, adjust as per your schema)
		   const { name } = req.body;
		   if (!name || typeof name !== 'string' || !name.trim()) {
			   return res.status(400).json({ message: 'Permission name is required and must be a non-empty string.' });
		   }

		   // Check for duplicate permission (by name, adjust as per your schema)
		   const existing = await Permission.findOne({ name: name.trim() }).lean();
		   if (existing) {
			   return res.status(409).json({ message: 'Permission with this name already exists.' });
		   }

		   // Create and save the new permission
		   const permission = new Permission({ ...req.body, name: name.trim() });
		   await permission.save();
		   res.status(201).json(permission);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Get all permissions
exports.getPermissions = async (req, res) => {
	try {
		// Destructure and set defaults for query params
		const { page = 1, limit = 10, search = '' } = req.query;
		const pageNum = Math.max(parseInt(page, 10) || 1, 1);
		const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
		const skip = (pageNum - 1) * limitNum;

		// Build filter for search
		const filter = search.trim()
			? { name: { $regex: search.trim(), $options: 'i' } }
			: {};

		// Run count and find in parallel
		const [total, permissions] = await Promise.all([
			Permission.countDocuments(filter),
			Permission.find(filter).skip(skip).limit(limitNum).lean()
		]);

		res.json({
			data: permissions,
			page: pageNum,
			limit: limitNum,
			total,
			totalPages: Math.ceil(total / limitNum)
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Get a single permission by ID
exports.getPermissionById = async (req, res) => {
		try {
			const { id } = req.params;
			// Quick validation for MongoDB ObjectId (24 hex chars)
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid permission ID.' });
			}

			const permission = await Permission.findById(id).lean();
			if (!permission) {
				return res.status(404).json({ message: 'Permission not found' });
			}
			res.json(permission);
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};

// Update a permission by ID
exports.updatePermission = async (req, res) => {
		try {
			const { id } = req.params;
			// Validate MongoDB ObjectId
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid permission ID.' });
			}

			// Validate name if present
			if ('name' in req.body) {
				const name = req.body.name;
				if (!name || typeof name !== 'string' || !name.trim()) {
					return res.status(400).json({ message: 'Permission name must be a non-empty string.' });
				}
				// Check for duplicate name (exclude current doc)
				const duplicate = await Permission.findOne({ name: name.trim(), _id: { $ne: id } }).lean();
				if (duplicate) {
					return res.status(409).json({ message: 'Permission with this name already exists.' });
				}
				req.body.name = name.trim();
			}

			const permission = await Permission.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
			if (!permission) {
				return res.status(404).json({ message: 'Permission not found' });
			}
			res.json(permission);
		} catch (error) {
			res.status(400).json({ message: error.message });
		}
};

// Delete a permission by ID
exports.deletePermission = async (req, res) => {
		try {
			const { id } = req.params;
			// Validate MongoDB ObjectId
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid permission ID.' });
			}

			// Soft delete: set status to 'deleted'
			const permission = await Permission.findByIdAndUpdate(
				id,
				{ status: 0 },
				{ new: true, runValidators: true }
			).lean();
			if (!permission) {
				return res.status(404).json({ message: 'Permission not found' });
			}
			res.json({ message: 'Permission soft deleted', data: permission });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};
