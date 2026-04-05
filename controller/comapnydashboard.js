const mongoose = require('mongoose');
const Lead = require('../model/lead.model');
const Employee = require('../model/employee.model');
const Campigne = require('../model/campigne.model');
const Company = require('../model/Company.model');

// GET /dashboard/company
exports.getCompanyDashboard = async (req, res) => {
	try {
		const { companyId, startDate, endDate, campigneId } = req.query;
		if (!companyId) {
			return res.status(400).json({ message: 'companyId is required' });
		}

		// Date range filter
		let dateFilter = {};
		if (startDate || endDate) {
			dateFilter.createdAt = {};
			if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
			if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
		}

		// Campaign filter
		let campigneFilter = {};
		if (campigneId) campigneFilter.campigne = campigneId;

		// Card Data
		const [
			totalLeads,
			totalConversions,
			activeCampignes,
			company,
			totalEmployees,
			newLeadsThisMonth,
			topEmployee
		] = await Promise.all([
			Lead.countDocuments({ company: companyId, ...dateFilter, ...campigneFilter }),
			Lead.countDocuments({ company: companyId, status: { $in: ['intrested', 'coustomer'] }, ...dateFilter, ...campigneFilter }),
			Campigne.countDocuments({ company: companyId, status: 2 }), // status 2 = started
			Company.findById(companyId).lean(),
			Employee.countDocuments({ company: companyId }),
			Lead.countDocuments({ company: companyId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
			// Top employee by conversions
			Lead.aggregate([
				{ $match: { company: new mongoose.Types.ObjectId(companyId), status: { $in: ['intrested', 'coustomer'] } } },
				{ $group: { _id: '$assignedTo', conversions: { $sum: 1 } } },
				{ $sort: { conversions: -1 } },
				{ $limit: 1 },
				{ $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
				{ $unwind: '$employee' },
				{ $project: { _id: 0, employee: 1, conversions: 1 } }
			])
		]);

				// Additional Card Data
				const lostLeads = await Lead.countDocuments({ company: companyId, status: 'lost', ...dateFilter, ...campigneFilter });

				// Conversion Funnel
				const funnel = await Lead.aggregate([
					{ $match: { company: new mongoose.Types.ObjectId(companyId), ...dateFilter, ...campigneFilter } },
					{ $group: { _id: '$status', count: { $sum: 1 } } }
				]);

				// Most Active Employee (by total leads)
				const mostActiveEmployee = await Lead.aggregate([
					{ $match: { company: new mongoose.Types.ObjectId(companyId), ...dateFilter, ...campigneFilter } },
					{ $group: { _id: '$assignedTo', total: { $sum: 1 } } },
					{ $sort: { total: -1 } },
					{ $limit: 1 },
					{ $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
					{ $unwind: '$employee' },
					{ $project: { _id: 0, employee: 1, total: 1 } }
				]);

				// Most Active Campaign (by total leads)
				const mostActiveCampaign = await Lead.aggregate([
					{ $match: { company: new mongoose.Types.ObjectId(companyId), ...dateFilter } },
					{ $group: { _id: '$campigne', total: { $sum: 1 } } },
					{ $sort: { total: -1 } },
					{ $limit: 1 },
					{ $lookup: { from: 'campignes', localField: '_id', foreignField: '_id', as: 'campigne' } },
					{ $unwind: '$campigne' },
					{ $project: { _id: 0, campigne: 1, total: 1 } }
				]);

				// Average Call Duration (if available)
				const avgCallDuration = await Lead.aggregate([
					{ $match: { company: new mongoose.Types.ObjectId(companyId), 'call_performance.duration': { $exists: true }, ...dateFilter, ...campigneFilter } },
					{ $group: { _id: null, avgDuration: { $avg: '$call_performance.duration' } } }
				]);

		// Conversion rate
		const conversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;

		// Graph Data: Leads over time (by day)
		const leadGraph = await Lead.aggregate([
			{ $match: { company: new mongoose.Types.ObjectId(companyId), ...dateFilter, ...campigneFilter } },
			{ $group: {
				_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
				count: { $sum: 1 }
			} },
			{ $sort: { _id: 1 } }
		]);

		// Graph Data: Conversions over time (by day)
		const conversionGraph = await Lead.aggregate([
			{ $match: { company: new mongoose.Types.ObjectId(companyId), status: { $in: ['intrested', 'coustomer'] }, ...dateFilter, ...campigneFilter } },
			{ $group: {
				_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
				count: { $sum: 1 }
			} },
			{ $sort: { _id: 1 } }
		]);

		// Employee Performance: Calls and conversions per employee
		const employeePerformance = await Lead.aggregate([
			{ $match: { company: new mongoose.Types.ObjectId(companyId), ...dateFilter, ...campigneFilter } },
			{ $group: {
				_id: '$assignedTo',
				totalLeads: { $sum: 1 },
				conversions: { $sum: { $cond: [{ $in: ['$status', ['intrested', 'coustomer']] }, 1, 0] } },
				aiReviews: { $push: '$ai_review' },
				callPerformance: { $push: '$call_performance' }
			} },
			{ $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
			{ $unwind: '$employee' },
			{ $project: { _id: 0, employee: 1, totalLeads: 1, conversions: 1, aiReviews: 1, callPerformance: 1 } }
		]);

		// Top campaign by conversions
		const topCampaign = await Lead.aggregate([
			{ $match: { company: new mongoose.Types.ObjectId(companyId), status: { $in: ['intrested', 'coustomer'] } } },
			{ $group: { _id: '$campigne', conversions: { $sum: 1 } } },
			{ $sort: { conversions: -1 } },
			{ $limit: 1 },
			{ $lookup: { from: 'campignes', localField: '_id', foreignField: '_id', as: 'campigne' } },
			{ $unwind: '$campigne' },
			{ $project: { _id: 0, campigne: 1, conversions: 1 } }
		]);

		// Response
				res.json({
					cardData: {
						totalLeads,
						totalConversions,
						activeCampignes,
						creditsLeft: company?.creditsLeft || 0,
						totalEmployees,
						newLeadsThisMonth,
						conversionRate,
						lostLeads,
						funnel,
						mostActiveEmployee: mostActiveEmployee[0] || null,
						mostActiveCampaign: mostActiveCampaign[0] || null,
						avgCallDuration: avgCallDuration[0]?.avgDuration || null,
						topEmployee: topEmployee[0] || null,
						topCampaign: topCampaign[0] || null
					},
					graphData: {
						leadGraph,
						conversionGraph
					},
					employeePerformance,
					suggestions: [
						'Focus on campaigns with highest conversion rates',
						'Encourage employees with lower performance to review top performers',
						'Monitor credit usage and upgrade package if needed',
						...(company?.creditsLeft < 10 ? ['Warning: Low credits, consider upgrading your package.'] : []),
						...(lostLeads > 0 ? ['Analyze lost leads to improve conversion.'] : [])
					]
				});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Server error', error: err.message });
	}
};
