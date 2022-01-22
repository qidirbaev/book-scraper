const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const axios = require("axios").default;

dotenv.config();
const app = express();

app.use(express.urlencoded({ extended: true }));

const baseUrl = "http://librar.zionet.uz/uz/book/download/";

// Request sender Promise function
const sendRequest = (url) => {
    return new Promise((resolve, reject) => {
        axios.get(baseUrl + url)
            .then(response => {
                resolve({
                    ok: true,
                    data: response.data
                });
            })
            .catch(error => {
                resolve({
                    ok: false,
                    error: error
                });
            });
    });
};

sendRequest("1")
    .then(response => {
        console.log(response);
    })
    .catch(error => {
        console.log(error);
    });


app.get("/", (req, res) => {
    res.send("Hello from Express Server");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Server listening on port: " + port);
});