import { Router } from 'express';
import { MongoClient, ObjectId } from "mongodb";
import nodemailer from 'nodemailer';

const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
var router = Router();

function requireLogin(req, res, next) {
  if (req.session.userId) return next();
  // 帶上 returnUrl 跳轉到登入頁（包含 GET 和 POST）
  const returnUrl = encodeURIComponent(req.originalUrl);
  res.redirect(`/users/login?returnUrl=${returnUrl}`);
}
/*GET  user listing*/
router.get('/', requireLogin, function (req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.render('payment', {
    csrfToken: req.csrfToken(),
    carID: req.query.carID,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    amount: req.query.amount,
    bookNum: new Date(),
    title: 'Payment Page'
  });
});


router.post('/add', async function (req, res, next) {
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
        to: req.session.userEmail,
        subject: "Order Confirmation",
        text: `Dear ${req.body.cardHolder},`, // plain‑text body
        html: `Dear ${req.body.cardHolder},<br><br>
        Thank you for choosing carRental! We're happy to confirm your booking for <b>${req.body.carID}.</b><br><br>
          <b>Your order information is as below:</b><br>
          <b>Your Order No.:</b>  ${req.body.bookNum} <br>
          <b>Your Name:</b> ${req.session.userName} <br>
          <b>Car No:</b> ${req.body.carID} <br> 
          <b>From : </b>  ${req.body.startDate} <b>to</b> ${req.body.endDate} <br> 
          <b>Total Amount: </b> ${Number(req.body.amount).toLocaleString()}<br><br><br>
          
            <b>For changes or cancellations: </b> Please reply to this email or call us at 3442-6359 at least 24 hours in advance. <br><br>
            <b>On the day: </b> Please have this email available for verification. <br><br> <b>Important Information:</b><br>
            <b>Cancellation Policy:</b> Briefly state your cancellation or no-show policy <br><br>
            <b>Additional Information:</b> e.g., Parking details, directions, what to bring. We look forward to seeing you!<br><br><br><br> 
            Sincerely,<br><br>
            <a href="https://www.hongkongdisneyland.com/zh-hk/">carRental</a>` , // HTML body
      });

      console.log("Message sent:", info.messageId);
    })();

    //res.send("Record Add!");
    //res.redirect("localhost:3000");
    res.redirect("payment_success"); // Back to home page
  } finally {
    await client.close();
  }
});

router.get('/payment_success', requireLogin, function (req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.render('payment_success', { title: 'Payment Success' });
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
