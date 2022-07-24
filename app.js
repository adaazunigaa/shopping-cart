const express = require("express");
const app = express();
const path = require("path")
const ejsMate = require("ejs-mate");
const Bags = require("./models/bags");

const mongoose = require("mongoose");

const dbURL = process.env.DB_URL ||  "mongodb://localhost:27017/shoppingCart";
mongoose.connect(dbURL);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
//app.use(express.static(path.join(__dirname, "images")));

app.use(express.urlencoded({ extended: true }));

app.engine("ejs", ejsMate);

app.get("/", (req, res) => {
    res.render("home")
});

app.get("/newBag", (req,res) =>{
    res.render("newBag");
});

app.post("/newBag", async (req, res)=> {
    const {name, price, url} = req.body;
    const newBag = new Bags({name, price, url});

    await newBag.save();
    console.log(newBag);
    res.redirect("/showBags");
});

app.get("/showBags", async (req, res) => {
    const bags = await Bags.find({});
    res.render("index.ejs", { bags })
})

app.post("/updateCart", (req,res)=>{
    
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening and running on port ${port}!! `);
});