const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const BagsSchema = new Schema({
    name: String,
    price: Number,
    url: String
    
});


module.exports = mongoose.model("Bags", BagsSchema);