const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


//JWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m12jl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const gkCollection = client.db('quizzie').collection('general-knowledge');
        const englishCollection = client.db('quizzie').collection('english');
        const userCollection = client.db('quizzie').collection('users');
        const resultCollection = client.db('quizzie').collection('result');


        //create and update user
        app.put('/create-user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;

            const filter = { email: email };
            const options = { upsert: true };

            const updatedDoc = {
                $set: user,
            };

            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10d' });
            res.send({ result, token });
        })

        //get specific user by email
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            const result = await userCollection.findOne(query);
            res.send(result);
        })


        //get gk questions
        app.get('/quiz/:subject', async (req, res) => {

            // const query = {};
            // const question = gkCollection.find(query);
            // const result = await question.toArray();

            const topic = req.params.subject;
            let questions;
            console.log(topic);

            if (topic === 'general-knowledge') {
                questions = gkCollection.aggregate([{ $sample: { size: 5 } }]);
            }
            if (topic === 'english') {
                questions = englishCollection.aggregate([{ $sample: { size: 5 } }]);
            }

            const result = await questions.toArray();

            res.send(result);
        })

        // add result to db 
        app.post('/insert-result', async (req, res) => {
            const examResult = req.body;

            console.log(examResult);
            const result = await resultCollection.insertOne(examResult);
            res.send(result);
        })

    }

    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Quizzie Server is Running");
})

app.listen(port, () => {
    console.log("Quizzie Server is Running");
})