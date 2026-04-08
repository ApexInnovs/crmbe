const mongoose = require("mongoose");
const Lead = require("../model/lead.model");
const Employee = require("../model/employee.model");
const Campigne = require("../model/campigne.model");
const Company = require("../model/Company.model");

// GET /dashboard/company
exports.getCompanyDashboard = async (req, res) => {
  try {
    const { companyId, startDate, endDate, campigneId } = req.query;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    // Date range filter (default to this month)
    let dateFilter = {};
    let start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    dateFilter.createdAt = { $gte: start, $lte: end };

    // Campaign filter
    let campigneFilter = {};
    if (campigneId) campigneFilter.campigne = new mongoose.Types.ObjectId(campigneId);

    // Card Data
    const [
      totalLeads,
      totalConversions,
      activeCampignes,
      company,
      totalEmployees,
      createdLeads,
      notResponsedLeads,
      notIntrestedLeads,
      intrestedButLaterLeads,
      intrestedLeads,
      coustomerLeads,
      lostLeads,
    ] = await Promise.all([
      Lead.countDocuments({
        company: companyId,
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: { $in: ["intrested", "coustomer"] },
        ...dateFilter,
        ...campigneFilter,
      }),
      Campigne.countDocuments({ company: companyId, status: 2 }), // status 2 = started
      Company.findById(companyId).lean(),
      Employee.countDocuments({ company: companyId }),
      Lead.countDocuments({
        company: companyId,
        status: "created",
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: "not_responsed",
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: "not_intrested",
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: "intrested_but_later",
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: "intrested",
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: "coustomer",
        ...dateFilter,
        ...campigneFilter,
      }),
      Lead.countDocuments({
        company: companyId,
        status: "lost",
        ...dateFilter,
        ...campigneFilter,
      }),
    ]);

    // Additional Card Data

    // Conversion Funnel
    const funnel = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          ...dateFilter,
          ...campigneFilter,
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Most Active Employee (by total leads)
    const mostActiveEmployee = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          ...dateFilter,
          ...campigneFilter,
        },
      },
      { $group: { _id: "$assignedTo", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      { $project: { _id: 0, employee: 1, total: 1 } },
    ]);

    // Most Active Campaign (by total leads)
    const mostActiveCampaign = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          ...dateFilter,
        },
      },
      { $group: { _id: "$campigne", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "campignes",
          localField: "_id",
          foreignField: "_id",
          as: "campigne",
        },
      },
      { $unwind: "$campigne" },
      { $project: { _id: 0, campigne: 1, total: 1 } },
    ]);

    // Average Call Duration (if available)
    const avgCallDuration = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          "call_performance.duration": { $exists: true },
          ...dateFilter,
          ...campigneFilter,
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$call_performance.duration" },
        },
      },
    ]);

    // Conversion rate
    const conversionRate =
      totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;

    // Graph Data: Leads over time (by day)
    const leadGraph = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          ...dateFilter,
          ...campigneFilter,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Graph Data: Conversions over time (by day)
    let conversionGraph = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          status: { $in: ["intrested", "coustomer"] },
          ...dateFilter,
          ...campigneFilter,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing days in conversionGraph with count 0
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateMap = {};
      conversionGraph.forEach(item => { dateMap[item._id] = item.count; });
      const filledGraph = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        filledGraph.push({ _id: dateStr, count: dateMap[dateStr] || 0 });
      }
      conversionGraph = filledGraph;
    }

    // Employee Performance: Calls and conversions per employee
    const employeePerformance = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          ...dateFilter,
          ...campigneFilter,
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalLeads: { $sum: 1 },
          conversions: {
            $sum: {
              $cond: [{ $in: ["$status", ["intrested", "coustomer"]] }, 1, 0],
            },
          },
          aiReviews: { $push: "$ai_review" },
          callPerformance: { $push: "$call_performance" },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 0,
          employee: 1,
          totalLeads: 1,
          conversions: 1,
          aiReviews: 1,
          callPerformance: 1,
        },
      },
    ]);

    // Top campaign by conversions
    const topCampaign = await Lead.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          status: { $in: ["intrested", "coustomer"] },
        },
      },
      { $group: { _id: "$campigne", conversions: { $sum: 1 } } },
      { $sort: { conversions: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "campignes",
          localField: "_id",
          foreignField: "_id",
          as: "campigne",
        },
      },
      { $unwind: "$campigne" },
      { $project: { _id: 0, campigne: 1, conversions: 1 } },
    ]);

    // Response
    res.json({
      cardData: {
        totalLeads,
        totalConversions,
        activeCampignes,
        creditsLeft: company?.creditsLeft || 0,
        totalEmployees,
        conversionRate,
        lostLeads: lostLeads,
        created: createdLeads,
        not_responsed: notResponsedLeads,
		not_intrested: notIntrestedLeads,
		intrested_but_later: intrestedButLaterLeads,
		intrested: intrestedLeads,
      },
      // Optionally keep graphData and employeePerformance if needed elsewhere in the frontend
      graphData: {
        leadGraph,
        conversionGraph,
      },
      employeePerformance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
