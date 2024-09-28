import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import path from "path";
import cors from "cors";
import multer from "multer";
import fs from "fs";
const port = 4000;
const app = express();

app.use(express.json());
app.use(cors());

//database connection with MongoDB
mongoose.connect('mongodb+srv://devbrightwillies:4B2tfve5ckAkASzf@chatappcluster.kpzof.mongodb.net/recom_app?retryWrites=true&w=majority&appName=ChatAppCluster')
    .then(() => {
        console.log('Db connected')
    });

// Ensure upload/images directory exists
const uploadDir = './upload/images';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });  // Create the directory if it doesn't exist
}

const storage = multer.diskStorage({
    destination: uploadDir,  // Set destination to the correct path
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`); // Correct filename
    }
});

const upload = multer({ storage: storage });
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}` // Corrected 'htttp' to 'http'
    });
});

app.get('/', (req, res) => {
    res.send('122ry am up');
});

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true

    },
    image: {
        type: String,
        required: true

    },
    new_price: {
        type: String,
        required: true
    },
    old_price: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        required: true,
        default: true
    }
})
app.post('/addproduct', async (req, res) => {

    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 0;
    }

    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    });

    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({ success: true, name: req.body.name, product: product })
})

//creating api for deleting  productt
app.post("/removeproduct", async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true, message: "deleted" })
})

//creatng  app for gettting  all productts
app.get("/allproducts", async (req, res) => {
    let products = await Product.find({});
    res.json(products)

})

const Users = mongoose.model("Users", {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        unique: true,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    },
})
//  creatingg endpint fro registering userthe 

app.post('/signup', async (req, res) => {


    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "Existing user found with same email address" })
    }
    let cart = {};
    for (let i = 1; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart
    })
    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token: token })

})
//creating  endpooint for userss  login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });

    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, "secret_ecom");
            res.json({ success: true, token });
        }
        else {
            res.json({ success: false, errors: "Wrong password" });
        }

    } else {
        res.json({ success: false, errors: "Wrong email id" });
    }
})

//creating api for new collection data
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollections = products.slice(1).slice(-8);
    console.log("New collection")
    res.send(newcollections);
})

//creating api for new poopular in women data
app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" });
    let newcollections = products.slice(1).slice(-4);
    res.send(newcollections);
})

// creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using valid" })
    }
    else {
        try {
            const data = jwt.verify(token, "secret_ecom");
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ errors: "please authenticate using  valid token" })
        }
    }
}


//creating  add  ot cart
app.post('/addtocart', fetchUser, async (req, res) => {

    let userData = await Users.findOne({ _id: req.user.id });

    userData.cartData[req.body.itemid] += 1;
    // console.log(userData.cartData);
    await Users.findOneAndUpdate(
        { _id: req.user.id },
        { cartData: userData.cartData });
    res.send("Added");
})

app.post('/removefromcart', fetchUser, async (req, res) => {

    let userData = await Users.findOne({ _id: req.user.id });
    // console.log(userData.cartData[req.body.itemid]);
    if (userData.cartData[req.body.itemid] > 0)
        userData.cartData[req.body.itemid] -= 1;
    await Users.findOneAndUpdate(
        { _id: req.user.id },
        { cartData: userData.cartData });
    res.send('deletetd');
})

app.post('/getcart', fetchUser, async(req, res)=>{
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
})


app.listen(port, () => {
    console.log("server is running");
});
