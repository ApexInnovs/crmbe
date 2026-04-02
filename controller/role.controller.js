const Role = require('../model/roles.model');

// Create a new role
exports.createRole = async (req, res) => {
		try {
			const { name, permissions,type='company' } = req.body;
			if (!name || typeof name !== 'string' || !name.trim()) {
				return res.status(400).json({ message: 'Role name is required and must be a non-empty string.' });
			}
			// Check for duplicate role name
			const existing = await Role.findOne({ name: name.trim(), type }).lean();
			if (existing) {
				return res.status(409).json({ message: 'Role with this name already exists.' });
			}
			// Optionally validate permissions as array of ObjectIds
			let perms = Array.isArray(permissions) ? permissions : [];
			// Create and save the new role
			const role = new Role({ ...req.body, name: name.trim(), permissions: perms, type });
			await role.save();
			res.status(201).json(role);
		} catch (error) {
			res.status(400).json({ message: error.message });
		}
};

// Get all roles
exports.getRoles = async (req, res) => {
		try {
			// Pagination, search, and type filter
			const { page = 1, limit = 10, search = '', type } = req.query;
			const pageNum = Math.max(parseInt(page, 10) || 1, 1);
			const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
			const skip = (pageNum - 1) * limitNum;
			const filter = { status: { $ne: 0 } };
			if (search.trim()) filter.name = { $regex: search.trim(), $options: 'i' };
			if (type && typeof type === 'string' && type.trim()) filter.type = type.trim();
			const [total, roles] = await Promise.all([
				Role.countDocuments(filter),
				Role.find(filter).skip(skip).limit(limitNum).populate('permissions').lean()
			]);
			res.json({
				data: roles,
				page: pageNum,
				limit: limitNum,
				total,
				totalPages: Math.ceil(total / limitNum)
			});
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};

// Get a single role by ID
exports.getRoleById = async (req, res) => {
		try {
			const { id } = req.params;
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid role ID.' });
			}
			const role = await Role.findById(id).populate('permissions').lean();
			if (!role || role.status === 0) {
				return res.status(404).json({ message: 'Role not found' });
			}
			res.json(role);
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};

// Update a role by ID
exports.updateRole = async (req, res) => {
		try {
			const { id } = req.params;
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid role ID.' });
			}
			if ('name' in req.body) {
				const name = req.body.name;
				const type = req.body.type || 'company';
				if (!name || typeof name !== 'string' || !name.trim()) {
					return res.status(400).json({ message: 'Role name must be a non-empty string.' });
				}
				const duplicate = await Role.findOne({ name: name.trim(), type, _id: { $ne: id } }).lean();
				if (duplicate) {
					return res.status(409).json({ message: 'Role with this name and type already exists.' });
				}
				req.body.name = name.trim();
				req.body.type = type;
			}
			// Optionally validate permissions as array of ObjectIds
			if ('permissions' in req.body && !Array.isArray(req.body.permissions)) {
				req.body.permissions = [];
			}
			const role = await Role.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).populate('permissions').lean();
			if (!role || role.status === 0) {
				return res.status(404).json({ message: 'Role not found' });
			}
			res.json(role);
		} catch (error) {
			res.status(400).json({ message: error.message });
		}
};

// Delete a role by ID
exports.deleteRole = async (req, res) => {
		try {
			const { id } = req.params;
			if (!id || typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
				return res.status(400).json({ message: 'Invalid role ID.' });
			}
			// Soft delete: set status to 0
			const role = await Role.findByIdAndUpdate(id, { status: 0 }, { new: true, runValidators: true }).lean();
			if (!role) {
				return res.status(404).json({ message: 'Role not found' });
			}
			res.json({ message: 'Role soft deleted', data: role });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
};
