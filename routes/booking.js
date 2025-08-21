import { Router } from 'express';
import { MongoClient, ObjectId } from "mongodb";
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('booking', { title: 'Booking Page' });
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
        endDate:req.body.endDate,
      }
    ]);
    res.redirect("/payment");
  } finally {
    // Close the MongoDB client connection
    await client.close();
  }
})

export default router;
