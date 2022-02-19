const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        // type of image can be Buffer or String
        type: [ Buffer, String ],
        default: "https://via.placeholder.com/150"
    },
    link: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    langs: {
        type: Array,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    published_at: {
        type: String,
        default: "Unknown"
    },
    UDK: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

module.exports = {
    Book: mongoose.model("Books", BookSchema)
} 
