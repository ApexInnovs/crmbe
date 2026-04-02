// Pagination utility
function getPagination(page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;
    return { skip, limit };
}

function getPagingData(data, page = 1, limit = 10, total = 0) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    };
}

module.exports = {
    getPagination,
    getPagingData
};
