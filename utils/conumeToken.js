// Utility to consume company credits
const Company = require('../model/Company.model');

/**
 * Consume credits from a company by companyId.
 * @param {string} companyId - The company _id (string or ObjectId)
 * @param {number} tokens - Number of credits to consume
 * @returns {Promise<Company>} - The updated company document
 * @throws {Error} - If company not found or insufficient credits
 */
async function consumeCompanyCredits(companyId, tokens = 1) {
	if (!companyId) throw new Error('companyId is required');
	const company = await Company.findById(companyId);
	if (!company) throw new Error('Company not found');
	if (!company.creditsLeft || company.creditsLeft < tokens) {
		throw new Error('Insufficient credits');
	}
	company.creditsLeft -= tokens;
	await company.save();
	return company;
}

module.exports = { consumeCompanyCredits };
