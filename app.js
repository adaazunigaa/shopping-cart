if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
};

const express = require("express");
const app = express();
const path = require("path")
const ejsMate = require("ejs-mate");
const Bags = require("./models/bags");
const session  = require('express-session');
const nodemailer = require("nodemailer");

const helmet = require("helmet");

const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const Cart = require("./models/cart");



const transporter = nodemailer.createTransport({
    service: "hotmail",
    auth: {
        user: process.env.EMAIL,
        pass:  process.env.PASSWORD
    },
    tls: {
        rejectUnauthorized: false,
    }
});


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
app.use(express.json());

app.engine("ejs", ejsMate);

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net/",
    "https://res.cloudinary.com/dzbcso9z0/"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net/",
];



const fontSrcUrls = [ "https://res.cloudinary.com/dzbcso9z0/", "https://fonts.gstatic.com", "https://fonts.googleapis.com/" ];
 
app.use(
    helmet.contentSecurityPolicy({
        directives : {
            defaultSrc : [],
            connectSrc : [ "'self'"],
            scriptSrc  : [ "'unsafe-inline'", "'self'", ...scriptSrcUrls ],
            styleSrc   : [ "'self'", "'unsafe-inline'", ...styleSrcUrls ],
            workerSrc  : [ "'self'", "blob:" ],
            objectSrc  : [],
            imgSrc     : [
                "'self'",
                "blob:",
                "data:",
                "https://images.unsplash.com/",
            ],
            fontSrc    : [ "'self'", ...fontSrcUrls ],
            mediaSrc   : [  ],
            childSrc   : [ "blob:" ]
        }
    })
);





const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = MongoStore.create({
    mongoUrl: dbURL,
    touchAfter: 24 * 60 * 60, //time in sec
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
        return res.redirect("/home")
    }
    cart.add(bag, bag._id);
    req.session.cart = cart;
    //console.log(req.session.cart);
    res.redirect("/showBags");
});


app.get("/shoppingCart", (req,res)=> {
    if(!req.session.cart) {
        return res.render('shopping_cart');
    }
    const cart = new Cart(req.session.cart);
    //console.log(cart.generateArray());
    return res.render("shopping_cart", {products: cart.generateArray(), totalPrice: cart.totalPrice})
})

app.get("/checkout", (req, res)=>{
    res.render("checkout")
})

app.post("/email", (req,res)=>{
    const cart = new Cart(req.session.cart);

    const {email, userName} = req.body;
    let mailOptions = {
        from: "elcentroada@hotmail.com",
        to: email,
        subject: "Thank you for your purchase",
        text: `Hello ${userName} \n


        Your cart has ${cart.totalQty} item(s), and  \n
        Your total is $${cart.totalPrice}`
    };
    
    transporter.sendMail(mailOptions, function(err, success){
        if(err){
            res.redirect("/")
            //console.log(err)
        }else{
            req.session.destroy();
            res.redirect("/")
           // console.log("email")
        }
    });
    
})



const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening and running on port ${port}!! `);
});