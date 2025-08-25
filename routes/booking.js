import { Router } from 'express';
import { MongoClient, ObjectId } from "mongodb";
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

/* GET users listing. */
router.get('/', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    const query = {};
    query.carID = req.query.carID;
    const car = await client.db('carRental').collection('cars')
      .find(query)
      .project({
        _id: 0,
        carID: 1,
        brand: 1,
        model: 1,
        year: 1,
        type: 1,
        dailyRate: 1,
        description: 1,
        imageURL: 1,
        seats: 1,
        transmission: 1,
        powerSource: 1
      })
      .toArray();
    res.render('booking',car[0]);
  } catch (err) {
    return next(err);
  } finally {
    await client.close();
  }
});

router.post('add', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    const database = client.db("carRental");
    await database.collection("booking").insertMany([
      {
        name: req.body.name,
        phone: Number(req.body.phone),
        carType: req.body.carType,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      }
    ]);
    res.redirect("/payment");
  } finally {
    // Close the MongoDB client connection
    await client.close();
  }
})

export default router;
