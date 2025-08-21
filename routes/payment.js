import { Router } from 'express';
import { MongoClient, ObjectId } from "mongodb";
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
var router = Router();

/* GET  user listing*/
router.get('/', function(req, res, next) {
  res.render('payment', { title: 'Payment Page' });
});

router.post('/add', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    req.body.age = Number(req.body.age);
    const database = client.db('carRental');
    await database.collection("payment").insertOne(req.body);
       //    res.redirect("/teacherlist.html");
      res.send("Record Add!");
  } finally {
    await client.close();
  }
});


router.get('/edit/:id', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {

    const data = await client.db('rental').collection("payment").findOne(
      { _id: new ObjectId(req.params.id) }
    );
    res.render("payment", data);
  } finally {
    await client.close();
  }
});

router.post('/update', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    const id = req.body._id;
    delete req.body._id;
    req.body.age = Number(req.body.age);
    await client.db('school').collection("teacher").replaceOne(
      { _id: new ObjectId(id) }, req.body
    );
    // await client.db('school').collection("teacher").updateOne(
    // {_id:new ObjectId(id)}, {$set:req.bnody}
    //)
    res.redirect("/teacherList.html");
  } finally {
    await client.close();
  }
});

export default router;
