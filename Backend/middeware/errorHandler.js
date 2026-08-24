const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    const statusCode = error.statusCode || error.status || 500;

    if (statusCode >= 500) console.error(error);
    res.status(statusCode).json({
        success: false,
        message: statusCode === 500 ? "Internal server error." : error.message
    });
};

module.exports = { notFound, errorHandler };
