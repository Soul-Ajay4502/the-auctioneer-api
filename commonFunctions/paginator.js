const db = require('../config/db');

const paginate = async (query, params, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count`;
    const totalRecords = await db.query(countQuery, params);

    const totalObject = totalRecords[0]?.find(item => item.total !== undefined);
    const totalrows = totalObject ? totalObject.total : 0;

    const resultQuery = `${query} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows, fields] = await db.query(resultQuery, params);

    return {
        data: rows,
        pagination: {
            totalPages: Math.ceil(totalrows / limit),
            currentPage: page,
            totalRecords: totalrows,
            recordsPerPage: limit
        }
    };
};

module.exports = paginate;