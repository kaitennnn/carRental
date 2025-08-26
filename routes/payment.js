import { Router } from 'express';
import { MongoClient, ObjectId } from "mongodb";
import nodemailer from 'nodemailer';

const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
var router = Router();

function requireLogin(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('users/login');
}
/*GET  user listing*/
router.get('/',requireLogin, function (req, res, next) {
  res.render('payment', {
    carID: req.query.carID,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    amount: req.query.amount,
    bookNum: new Date(),
    title: 'Payment Page'
  });
});


router.post('/add', async function (req, res, next) {
  const { cardNum, cardExpiry, cardCVV, amount, bookingTempId } = req.body;
  const client = new MongoClient(uri);
  try {
    const database = client.db('carRental');
    const tamp = await database.collection("temp").find().project({
      lastTimestampforinv: 1,
      lastTimestampforbook: 1,
      sequence: 1,
      sequenceB: 1
    })
      .toArray();
    let lastTimestampforinv = tamp[0].lastTimestampforinv;
    let lastTimestampforbook = tamp[0].lastTimestampforbook;
    let sequence = tamp[0].sequence;
    let sequenceB = tamp[0].sequenceB;
    /**
     * 生成訂單號：時間戳(YYYYMMDDHHMMSSmmm) + 3 位流水號
     */
    async function generateOrderNo() {
      const now = new Date();
      const currentMonth = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0')
      ].join('');
      // 重設或保留當月流水
      if (currentMonth !== lastTimestampforinv) {
        lastTimestampforinv = currentMonth;
        sequence = 1;
      } else {
        sequence++;
      }
      const timestamp = [
        now.getFullYear(),                                       // 年
        String(now.getMonth() + 1).padStart(2, '0'),             // 月
        String(now.getDate()).padStart(2, '0'),                  // 日
        String(now.getHours()).padStart(2, '0'),                 // 時
        String(now.getMinutes()).padStart(2, '0'),               // 分
        String(now.getSeconds()).padStart(2, '0'),               // 秒
        String(now.getMilliseconds()).padStart(3, '0')           // 毫秒
      ].join('');
      await database.collection("temp").updateMany({}, { $set: { sequence: sequence, lastTimestampforinv: lastTimestampforinv } });
      // 四位流水號，不足補零
      const seqString = String(sequence).padStart(4, '0');
      return timestamp + seqString;
    }

    async function generateBookNo() {
      const now = new Date();
      const currentMonth = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0')
      ].join('');
      // 重設或保留當月流水
      if (currentMonth !== lastTimestampforbook) {
        lastTimestampforbook = currentMonth;
        sequenceB = 1;
      } else {
        sequenceB++;
      }
      const timestamp = [
        now.getFullYear(),                                       // 年
        String(now.getMonth() + 1).padStart(2, '0'),             // 月
        String(now.getDate()).padStart(2, '0'),                  // 日
        String(now.getHours()).padStart(2, '0'),                 // 時
        String(now.getMinutes()).padStart(2, '0'),               // 分
        String(now.getSeconds()).padStart(2, '0'),               // 秒
        String(now.getMilliseconds()).padStart(3, '0')           // 毫秒
      ].join('');
      await database.collection("temp").updateMany({}, { $set: { sequenceB: sequenceB, lastTimestampforbook: lastTimestampforbook } });
      // 四位流水號，不足補零
      const seqString = String(sequenceB).padStart(4, '0');
      return timestamp + seqString;
    }
    req.body.tranDateTime = new Date();
    req.body.bookNum = await generateBookNo();
    req.body.invNum = await generateOrderNo();
    await database.collection("payment").insertMany([{
      userName: req.session.userName,
      cardHolder: req.body.cardHolder,
      cardNum: req.body.cardNum,
      cardExpiry: req.body.cardExpiry,
      cardCVV: req.body.cardCVV,
      bookNum: req.body.bookNum,
      invNum: req.body.invNum,
      tranDateTime: req.body.tranDateTime,
    }]);
    if (req.body.invNum) {
      await database.collection("booking").insertMany([{
        userName: req.session.userName,
        carID: req.body.carID,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        amount: req.body.amount,
        bookNum: req.body.bookNum,
      }]);
    }

// Test Email Sending Procedure

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'mrfranco2000@gmail.com',
      pass: 'zmttkslidjklbaxw',
    },
});

// Wrap in an async IIFE so we can use await.
(async () => {
  const info = await transporter.sendMail({
    from: '"carRental" <backendtest25@gmail.com>',
    to: "mrfranco2000@hotmail.com",
    subject: "Hello ✔",
    text: "Hello world?", // plain‑text body
    html: "<b>Hello world?</b>", // HTML body
  });

  console.log("Message sent:", info.messageId);
})();

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

export default router;
