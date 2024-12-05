function getErrorMessage(error) {
    if (error.errno) {
        if (error.errno === 1062) {
            return "Duplicate entry not permitted";
        } else if (error.errno === 1451) {
            return "Operation not permitted on this item";
        } else {
            return error.sqlMessage
        }

    } else {
        return "Oops !. Please try again later.";
    }
}

function sendServerError(res, error) {
    console.error(error);
    const errorMessage = getErrorMessage(error);
    res.status(500).json({
        statusCode: 500,
        isError: true,
        responseData: error,
        statusText: errorMessage
    }).end();
}

module.exports = sendServerError