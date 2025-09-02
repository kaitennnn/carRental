import { Router } from 'express';
import { MongoClient, ObjectId } from "mongodb";
import session from 'express-session';
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

/* GET users listing. */
router.get('/', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    const car = await client.db('carRental').collection('cars')
      .findOne(
        { carID: req.query.carID },
        {
          projection: {
            _id: 0, carID: 1, brand: 1, model: 1, year: 1, type: 1,
            dailyRate: 1, description: 1, imageURL: 1, seats: 1,
            transmission: 1, powerSource: 1
          }
        }
      );

    const user = await client.db('carRental').collection('users')
      .findOne({ userName: req.session.userName },
        { projection: { _id: 0, phone: 1 } })
      ;
    res.render('booking', { csrfToken: req.csrfToken(),car: car, user: user });
  } catch (err) {
    return next(err);
  } finally {
    await client.close();
  }
});


export default router;
