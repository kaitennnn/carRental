import { Router } from 'express';
import { MongoClient } from 'mongodb';
import Twilio from 'twilio';
import bcrypt from 'bcrypt';
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

function ensureAuthenticated(req, res, next) {
  // 假设您在登录时把用户ID存入了 session.userId
  if (req.session && req.session.userId) {
    // 用户已登录，继续后续处理
    return next();
  }
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({
      error: 'Authentication required',
      redirectUrl: '/users/login'
    });
  }
  // 未登录，重定向到登录页，并附带 returnUrl 参数以便登录后返回
  const returnUrl = encodeURIComponent(req.originalUrl);
  res.redirect(`/users/login?returnUrl=${returnUrl}`);
};
/* GET users listing. */
router.get('/profile/:username', ensureAuthenticated, async function (req, res, next) {
  const client = new MongoClient(uri);
  if (req.params.username !== req.session.userName) {
    return res.status(403).send('Forbidden');
  }
  const user = await client.db('carRental').collection('users')
    .findOne({ userName: req.session.userName },
      { projection: { password: 0 } });
  res.render('profile', { user, csrfToken: req.csrfToken(), title: "Profile" });
});

router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('register', { csrfToken: req.csrfToken(), title: 'Register' });
});

router.post('/register', async function (req, res, next) {
  const client = new MongoClient(uri);
  const userNamec = await client.db("carRental").collection("users").findOne({ userName: req.body.userName });
  if (userNamec) {
    return res.status(409).json({ success: false, message: '使用者名稱已存在' });
  };
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
    res.set('Cache-Control', 'no-store');
    res.json({ success: true });
  } finally {
    await client.close();
  }
});

router.get('/login', (req, res) => {
  console.log('GET /users/login, returnUrl:', req.query.returnUrl);
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.set('Cache-Control', 'no-store');
  res.render('login', { returnUrl: req.query.returnUrl || '', csrfToken: req.csrfToken(), title: 'Login' });
});

router.post('/login', async (req, res) => {
  const client = new MongoClient(uri);
  const { userName, password, returnUrl } = req.body;
  const user = await client.db('carRental').collection('users').findOne({ userName });
  console.log(user);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ success: false, message: '使用者名稱或密碼錯誤' });
  }
  req.session.userId = user._id.toString();
  req.session.role = user.role;
  req.session.userName = user.userName;
  req.session.userEmail = user.email;
  console.log('Login success, returnUrl:', returnUrl);
  res.json({ success: true, redirectUrl: returnUrl && returnUrl !== '' ? decodeURIComponent(returnUrl) : '/' });
});


router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.post('/profile/update', ensureAuthenticated, async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const { phone, email } = req.body;
    await client.db("carRental").collection("users").updateOne(
      { userName: req.session.userName },
      { $set: { email, phone } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('更新资料错误:', err);
    res.json({ success: false, message: '更新失败，请稍后重试' });
  }
});

// POST /users/password/change - 处理密码更改
router.post('/password/change', ensureAuthenticated, async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await client.db("carRental").collection('users').findOne({ userName: req.session.userName });

    // 验证当前密码
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.json({ success: false, message: '当前密码错误' });
    }

    // 更新为新密码
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await client.db("carRental").collection('users').updateOne(
      { userName: req.session.userName },
      { $set: { password: hash } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('更改密码错误:', err);
    res.json({ success: false, message: '更改失败，请稍后重试' });
  }
});

// POST /users/delete - 处理帐户删除
router.post('/delete', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    const userId = ObjectId(req.session.userId);

    // 删除用户相关数据
    await Promise.all([
      db.collection('users').deleteOne({ _id: userId }),
      db.collection('bookings').deleteMany({ userId }),
      // 其他关联集合...
    ]);

    // 注销会话
    req.session.destroy(err => {
      if (err) console.error('Session 销毁错误:', err);
      res.json({ success: true });
    });
  } catch (err) {
    console.error('删除帐户错误:', err);
    res.json({ success: false, message: '删除失败，请稍后重试' });
  }
});

router.get('/getbooking', ensureAuthenticated, async (req, res) => {
  const client = new MongoClient(uri);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    const username = req.session.userName; // 假設用 req.user 存登入用戶資料
    if (!username) return res.status(401).json({ message: '未登入' });

    const orders = await client.db("carRental").collection("booking").aggregate([
      { $match: { userName: username } },
      {
        $addFields: {
          today: "$$NOW"
        }
      },

      {
        $addFields: {
          startDateObj: { $toDate: "$startDate" },
          endDateObj: { $toDate: "$endDate" }
        }
      },

      {
        $addFields: {
          todayTrunc: { $dateTrunc: { date: "$today", unit: "day" } },
          startTrunc: { $dateTrunc: { date: "$startDateObj", unit: "day" } },
          endTrunc: { $dateTrunc: { date: "$endDateObj", unit: "day" } }
        }
      },

      {
        $lookup: {
          from: 'cars',
          localField: 'carID',
          foreignField: 'carID',
          as: 'carInfo'
        }
      },
      { $unwind: '$carInfo' },

      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                {
                  case: { $lt: ["$todayTrunc", "$startTrunc"] },
                  then: "booked"
                },
                {
                  case: {
                    $and: [
                      { $gte: ["$todayTrunc", "$startTrunc"] },
                      { $lte: ["$todayTrunc", "$endTrunc"] }
                    ]
                  },
                  then: "in progress"
                }
              ],
              default: "completed"
            }
          }
        }
      },

      {
        $project: {
          _id: 1,
          carID: 1,
          startDate: 1,
          endDate: 1,
          amount: 1,
          status: 1,
          'brand': '$carInfo.brand',
          'model': '$carInfo.model'
        }
      }
    ]).toArray();

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

const TWILIO_ACCOUNT_SID = 'ACa5a0035527b8d27b232b7c4f1844b7d2';
const TWILIO_AUTH_TOKEN = '953b84f7aa7c9a85657daf8e8fb4c501';
const TWILIO_VERIFY_SID = 'VA4ab83e5a40d200ec4478d8238034d491';
// 发送验证码
router.post('/send-verification', async (req, res) => {
  const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  try {
    await client.verify.services(TWILIO_VERIFY_SID)
      .verifications
      .create({ to: `+852${phone}`, channel: 'sms' });
    res.json({ success: true });
  } catch (err) {
    console.error('Twilio send error:', err);
    res.status(500).json({ error: 'Failed to send verification' });
  }
});

// 校验验证码
router.post('/check-verification', async (req, res) => {
  const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

  try {
    const verification = await client.verify.services(TWILIO_VERIFY_SID)
      .verificationChecks
      .create({ to: `+852${phone}`, code });
    if (verification.status == 'approved') {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid code' });
    }
  } catch (err) {
    console.error('Twilio verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
