const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hlsud.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// verify json web token
const verifyJWT = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1]

    if (!token) {
        return res.status(401).send({ message: 'forbidden access' })
    }

    jwt.verify(token, process.env.SECRET_WEB_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })

};


async function run() {
    try {
        const projectCollection = client.db('myPortfolio').collection('project');
        const userCollection = client.db('myPortfolio').collection('user');
        const skillCollection = client.db('myPortfolio').collection('skills');


        //verify admin use after verify jwt
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded?.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }



        /*<---------json web-token------->*/
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_WEB_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })

        /*<---------- project------->*/
        //project section 
        app.get('/project', async (req, res) => {
            const result = await projectCollection.find().toArray();
            res.send(result)
        });

        app.post('/project', verifyJWT, verifyAdmin, async (req, res) => {
            const project = req.body;
            const result = await projectCollection.insertOne(project);
            res.send(result);
        });

        app.delete('/project/delete/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await projectCollection.deleteOne(query);
            res.send(result)
        })
        //project update 
        app.get('/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await projectCollection.findOne(query);
            res.send(result);
        });

        app.put('/update/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const project = req.body;
            const query = { _id: new ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    projectName: project?.projectName,
                    description: project?.description,
                    img: project?.img
                }
            };
            const result = await projectCollection.updateOne(query, updatedDoc, option);
            res.send(result)
        });

        /*<---------- skill------->*/
        //skill section 
        app.get('/skills', async (req, res) => {
            const result = await skillCollection.find().toArray();
            res.send(result)
        });

        app.post('/skill', verifyJWT, verifyAdmin, async (req, res) => {
            const skill = req.body;
            const result = await skillCollection.insertOne(skill);
            res.send(result);
        });

        app.delete('/skill/delete/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await skillCollection.deleteOne(query);
            res.send(result)
        })



        /*<---------- user------->*/
        //save user in database
        app.post('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist' });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });


        app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {

            const query = {};
            const result = await userCollection.find(query).toArray();
            res.send(result)
        });

        // make admin in a new user 
        app.get('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })

        });

        app.patch('/user/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)

        });
        //user delete 
        app.delete('/user/delete/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

    } finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('hay Abdul satter')
})

app.listen(port, () => {
    console.log(`server running on ${port}`)
})