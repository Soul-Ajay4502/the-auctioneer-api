const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");

// use morgan logger
app.use(
    morgan(
        ":method :url :status :res[content-length] - :response-time ms - :date[web]"
    )
);

// set bodyParser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
// setup cors
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === "OPTIONS") {
        res.header(
            "Access-Control-Allow-Methods",
            "PUT, POST, PATCH, DELETE, GET"
        );
        return res.status(200).json({});
    }
    next();
});

// Use routes
app.use("/api/auth/", require("./routes/auth"));
app.use("/api/league/", require("./routes/web/endpoints/league"))
// app.use("/api/youth/", require("./routes/youth"));
// app.use("/api/dashboard/", require("./routes/admin"));
// app.use("/api/global/", require("./routes/global"));
// app.use("/api/parish/", require("./routes/parish"));

app.use((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message,
        },
    });
});

module.exports = app;
