import { Router } from 'express';
import { MongoClient } from "mongodb";

const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('profile', { title: "Profile"});
});

router.post('/add', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    const database = client.db("carRental");
    await database.collection("users").insertMany([
            {
        userName: req.body.userName,
        password: req.body.password,
        phone: Number(req.body.phone),
        email: req.body.email,
        lastUpdate:req.body.lastUpdate,
      }
    ]);


  } finally {
    await client.close();
  }
});

export default router;
