import { Router } from 'express';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('profile', { title: "Profile" });
});

router.post('/register', async function (req, res, next) {
  const client = new MongoClient(uri);
  const hash = await bcrypt.hash(req.body.password, 10);
  req.body.lastUpdate = new Date();
  try {
    await client.db("carRental").collection("users").insertMany([
      {
        userName: req.body.userName,
        password: hash,
        phone: Number(req.body.phone),
        email: req.body.email,
        role: 'user',
        lastUpdate: req.body.lastUpdate,
      }
    ]);
    res.redirect('../register_success.html');
  } finally {
    await client.close();
  }
});

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  const client = new MongoClient(uri);
  const { userName, password } = req.body;
  const user = await client.db('carRental').collection('users').findOne({ userName });
  console.log(user);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ success: false, message: '使用者名稱或密碼錯誤' });
  }
  req.session.userId = user._id.toString();
  req.session.role = user.role;
  req.session.userName = user.userName;
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

export default router;
