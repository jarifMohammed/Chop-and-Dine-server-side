const express = require('express')
const app =express()
const cors =require('cors')
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

require('dotenv').config()
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.trszs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    const userCollection = client.db('dineDB').collection('users')

    const menuCollection = client.db('dineDB').collection('menu')
    const reviewCollection = client.db('dineDB').collection('reviews')
    const cartCollection = client.db('dineDB').collection('cart')
    // middlewares
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization; // Note: 'authorization' should be all lowercase.
      console.log('Authorization Header:', authHeader); // Debugging log
  
      if (!authHeader) {
          return res.status(401).send({ message: 'Unauthorized: No Authorization header provided' });
      }
  
      const token = authHeader.split(' ')[1]; // Extracting the token part
      if (!token) {
          return res.status(401).send({ message: 'Unauthorized: No token provided' });
      }
  
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
          if (err) {
              console.error('JWT Verification Error:', err); // Log the error for debugging
              return res.status(401).send({ message: 'Unauthorized: Invalid token' });
          }
          req.decoded = decoded;
          next();
      });
  };
   


    //jwt related api
    app.post('/jwt',async (req,res) => {
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,{
        expiresIn:'2h'
      })
      res.send({token})
    })
    // user related api
    app.get('/users',verifyToken,async (req,res) => {
     
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    // cheking is admin
    app.get('/users/admin/:email', verifyToken, async (req,res)=> {
      const email = req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'unauthorized access'})
      }
      const query = { email : email}
      const user = await userCollection.findOne(query)
      let admin = false
      if(user){
        admin = user?.role === 'admin'

      }
      res.send({ admin})
    })
    app.post('/users' , async (req,res) => {
      const user =  req.body
      // chekcxing if the user already exist
      const query ={ email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: ' user already exists' , insertedId: null});

      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })
    app.delete('/users/:id' , async (req,res) => {
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })
    app.patch('/users/admin/:id' , async(req,res) => {
      const id = req.params.id
      const filter = { _id : new ObjectId(id)}
      const updatedRole ={
        $set:{
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter , updatedRole)
      res.send(result)
    })




    
app.get('/menu' , async(req,res) => {
    const result = await menuCollection.find().toArray()
    res.send(result)
})
app.get('/review' , async(req,res) => {
    const result = await reviewCollection.find().toArray()
    res.send(result)
})

// cart collection
app.get('/carts' , async (req,res) => {
  const email = req.query.email
  
  const query = {email : email}
  const result = await cartCollection.find(query).toArray()
  res.send(result)
})
app.post('/carts' , async(req,res) => {
  const cartItem = req.body
  const result = await cartCollection.insertOne(cartItem)
  res.send(result)
})

app.delete('/carts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Log the req object and params
    // console.log('Request Object:', req);
    // console.log('Request Params:', req.params);

    const query = { _id: new ObjectId(id) };
    const result = await cartCollection.deleteOne(query);

    res.send(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ message: 'An error occurred' });
  }
});










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);



app.get('/', (req,res)=> {
    res.send('server runnig')
})

app.listen(port, () => {
    console.log(`serveing doing well ${port}`);
})