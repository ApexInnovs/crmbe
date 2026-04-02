const mongoose = require('mongoose');
const Lead = require('../model/lead.model');
const Employee = require('../model/employee.model');
const Campigne = require('../model/campigne.model');
const Company = require('../model/Company.model');
const Client = require('../model/clients.model');

exports.getCompanyDashboard = async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: 'Valid companyId required' });
    }
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const companyObjId = mongoose.Types.ObjectId(companyId);

    // Parallel DB queries for all major stats
    const [
      totalLeads,
      callsMade,
      connectedCalls,
      conversions,
      activeCampaigns,
      callStatusAgg,
      callsPerEmployeeAgg,
      campaigns,
      employees,
      newLeads,
      contactedLeads,
      pendingFollowUps,
      leadSourcesAgg,
      recentRecordings,
      leadsForTrends,
      conversionsPerEmpAgg
    ] = await Promise.all([
      Lead.countDocuments({ company: companyObjId, createdAt: { $gte: start, $lte: end } }),
      Lead.countDocuments({ company: companyObjId, callRecording: { $ne: null }, createdAt: { $gte: start, $lte: end } }),
      Lead.countDocuments({ company: companyObjId, status: 'intrested', createdAt: { $gte: start, $lte: end } }),
      Lead.countDocuments({ company: companyObjId, status: 'coustomer', createdAt: { $gte: start, $lte: end } }),
      Campigne.countDocuments({ company: companyObjId, status: 1 }),
      Lead.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { company: companyObjId, callRecording: { $ne: null }, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
      ]),
      Campigne.find({ company: companyObjId }),
      Employee.find({ company: companyObjId }),
      Lead.countDocuments({ company: companyObjId, status: 'created', createdAt: { $gte: start, $lte: end } }),
      Lead.countDocuments({ company: companyObjId, status: { $ne: 'created' }, createdAt: { $gte: start, $lte: end } }),
      Lead.countDocuments({ company: companyObjId, nextMeetingDate: { $gte: new Date() }, createdAt: { $gte: start, $lte: end } }),
      Lead.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$leadData.source', count: { $sum: 1 } } }
      ]),
      Lead.find({ company: companyObjId, callRecording: { $ne: null }, createdAt: { $gte: start, $lte: end } })
        .sort({ createdAt: -1 }).limit(10).populate('assignedTo campigne'),
      Lead.find({ company: companyObjId, createdAt: { $gte: start, $lte: end } }, 'createdAt status campigne'),
      Lead.aggregate([
        { $match: { company: companyObjId, status: 'coustomer', createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
      ])
    ]);

    const conversionRate = totalLeads ? ((conversions / totalLeads) * 100).toFixed(2) : 0;
    const callStatus = callStatusAgg.reduce((acc, cur) => { acc[cur._id] = cur.count; return acc; }, {});
    const avgCallDuration = 0; // Placeholder

    // Calls per employee with employee details (avoid N+1 by mapping after)
    const empMap = new Map(employees.map(e => [e._id.toString(), e]));
    const callsPerEmployee = callsPerEmployeeAgg.map(c => ({
      employee: empMap.get(c._id ? c._id.toString() : ''),
      count: c.count
    }));
    const conversionsPerEmployee = conversionsPerEmpAgg.map(c => ({
      employee: empMap.get(c._id ? c._id.toString() : ''),
      count: c.count
    }));
    // Leaderboard: sort by conversions
    const leaderboard = [...conversionsPerEmployee].sort((a, b) => b.count - a.count).map(item => ({
      employee: item.employee,
      conversions: item.count,
      aiRating: 0 // Placeholder
    }));

    // Campaign Performance (parallelize per campaign)
    const campaignPerformance = await Promise.all(campaigns.map(async (c) => {
      const [leadsGenerated, calls, conversions] = await Promise.all([
        Lead.countDocuments({ campigne: c._id }),
        Lead.countDocuments({ campigne: c._id, callRecording: { $ne: null } }),
        Lead.countDocuments({ campigne: c._id, status: 'coustomer' })
      ]);
      const convRate = leadsGenerated ? ((conversions / leadsGenerated) * 100).toFixed(2) : 0;
      return {
        campaign: c,
        status: c.status,
        leadsGenerated,
        callsMade: calls,
        conversions,
        conversionRate: convRate
      };
    }));

    // Lead sources
    const leadSources = leadSourcesAgg.map(s => ({ source: s._id, count: s.count }));

    // Call recordings
    const callRecordings = recentRecordings.map(r => ({
      recordingId: r._id,
      employee: r.assignedTo,
      campaign: r.campigne,
      url: r.callRecording,
      duration: 0, // Placeholder
      flagged: false, // Placeholder
      createdAt: r.createdAt
    }));

    // Trends & Graphs (group by day, in-memory for now)
    function groupByDate(arr, field) {
      const map = {};
      arr.forEach(item => {
        const d = item.createdAt.toISOString().slice(0, 10);
        map[d] = (map[d] || 0) + 1;
      });
      return Object.entries(map).map(([date, count]) => ({ date, count }));
    }
    const leadsOverTime = groupByDate(leadsForTrends, 'createdAt');
    const callsOverTime = groupByDate(leadsForTrends.filter(l => l.callRecording), 'createdAt');
    const conversionsOverTime = groupByDate(leadsForTrends.filter(l => l.status === 'coustomer'), 'createdAt');
    const campaignPerformanceGraph = campaigns.map(c => {
      const cLeads = leadsForTrends.filter(l => l.campigne && l.campigne.equals(c._id));
      return {
        campaign: c.title,
        data: groupByDate(cLeads, 'createdAt')
      };
    });

    res.json({
      cards: {
        totalLeads,
        callsMade,
        connectedCalls,
        conversionRate,
        activeCampaigns
      },
      callAnalytics: {
        totalCalls: { day: callsMade, week: callsMade, month: callsMade },
        status: callStatus,
        avgDuration: avgCallDuration,
        callsPerEmployee
      },
      campaignPerformance,
      employeePerformance: {
        totalEmployees: employees.length,
        activeToday: 0, // Could be optimized further
        callsPerEmployee,
        conversionsPerEmployee,
        leaderboard
      },
      leadManagementInsights: {
        totalLeads,
        newVsContacted: { new: newLeads, contacted: contactedLeads },
        convertedLeads: conversions,
        pendingFollowUps,
        leadSources
      },
      callRecordings,
      trends: {
        leadsOverTime,
        callsOverTime,
        conversionsOverTime,
        campaignPerformanceGraph
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
