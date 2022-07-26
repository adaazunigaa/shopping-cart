const express = require("express");
const app = express();
const path = require("path")
const ejsMate = require("ejs-mate");
const Bags = require("./models/bags");
const MongoStore = require('connect-mongo');
const session  = require('express-session');

const Cart = require("./models/cart");



const mongoose = require("mongoose");
const cart = require("./models/cart");
const { createWriteStream } = require("fs");

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


const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = MongoStore.create({
    mongoUrl: dbURL,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret,
    }
});

store.on("Error", function(e){
    console.log("session store error", e)
})
const sessionConfig = {
    store,
    name: "session",
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));

app.use(function(req, res, next) {
    res.locals.cart = req.session.cart;
    next();
  });

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
});

app.get("/addToCart/:id", async(req, res)=>{
    
    const cart = new Cart(req.session.cart ? req.session.cart : {});

    const bag = await Bags.findById(req.params.id)
    if(!bag){
        // req.flash("error", "not found!");
        return res.redirect("/home")
    }
    cart.add(bag, bag._id);
    req.session.cart = cart;
    //console.log(req.session.cart);
    res.redirect("/showBags");
});


app.get("/shoppingCart", (req,res)=> {
// let cart = new Cart(req.session.cart)
    // //console.log(cart);
    // //console.log(cart.items)
    // for (let id in cart.items){
    //    // console.log(id);
    //     const ID = toString(id);
    //     console.log(cart.items)
    // }

    // // const newCart = new Cart(req.session.cart)

    // if(!req.session.cart){
    //     return res.render("shopping_cart")
    // }
    
    //console.log(cart)
    //console.log(cart.generateArray());
    if(!req.session.cart) {
        return res.render('/cart', {products: null});
    }
    const cart = new Cart(req.session.cart);
    console.log(cart.generateArray());
    return res.render("shopping_cart", {products: cart.generateArray(), totalPrice: cart.totalPrice})
})



const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening and running on port ${port}!! `);
});