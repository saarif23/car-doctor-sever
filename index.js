const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin:
        ['https://car-doctors-49644.web.app',
            'https://car-doctors-49644.firebaseapp.com',
            'https://6541394dccb20344aa587bb6--ornate-strudel-967e9e.netlify.app'

        ],
    credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Doctor  is coming on the way")
});
app.use(cookieParser());

const logger = async (req, res, next) => {
    console.log("logger info :", req.method, req.url)
    next()
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    jwt.verify(token, process.env.ACCESS_USER_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: "unauthorized access" })
        }
        req.user = decoded;
        next();
    })
}

//middleware

// const logger = async (req, res, next) => {
//     console.log('called', req.host, req.originalUrl)
//     next();
// }
// const verifyToken = async (req, res, next) => {
//     const token = req.cookies?.token;
//     console.log('token from the varify token variable :', token)
//     if (!token) {
//         return res.status(401).send({ message: "unauthorized" })
//     }
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
//         if (error) {
//             return res.status(401).send({ message: "unauthorized" })
//         }
//         req.user = decoded;
//         next();
//     })

// }


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jrzn18f.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const serviceCollection = client.db("CarDoctors").collection("services")
        const bookingsCollection = client.db("CarDoctors").collection("bookings")

        // auth retaled api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log("user in  post api ", user);
            const token = jwt.sign(user, process.env.ACCESS_USER_TOKEN, { expiresIn: "1h" })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production" ? true : false,
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",

                })
                .send({ success: true })
        })


        app.post('/logout', (req, res) => {
            const user = req.body;
            console.log('delete post ', user)
            res.clearCookie('token', { maxAge: 0 },).send({ success: true })
        })

        //services related  api
        app.get("/services", async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray()
            res.send(result)
        });

        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result);
        })

        app.get("/bookings", logger, verifyToken, async (req, res) => {
            console.log('woner token', req.user)
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: "forbidden" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })

        app.post("/bookings", async (req, res) => {
            const bookings = req.body
            const result = await bookingsCollection.insertOne(bookings)
            res.send(result)
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBookings = req.body;
            const updatedDoc = {
                $set: {
                    status: updatedBookings.status
                }
            }
            const result = await bookingsCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query)
            res.send(result);
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.listen(port, () => {
    console.log(`Car Doctors in running port on ${port}`)
})
