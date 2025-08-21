import { Router } from 'express';
import { MongoClient } from "mongodb";

const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

router.get('/', (req, res, next) => {
  const { brand = '', model = '', dailyRate = '', seats = '', startDate = '', endDate = '' } = req.query;
  res.render('cars', { title: 'CarsList', brand, model, seats, dailyRate, startDate, endDate });
})

router.post('/add', async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    const database = client.db("carRental");

    const {
      brand,
      model,
      year,
      type,
      dailyRate,
      description,
      imageURL,
      seats,
      transmission,
      powerSource,
      lastUpDate
    } = req.body;

    const brandUpper = brand.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const modelUpper = model.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const count = await database.collection("cars").countDocuments({
      brand: brandUpper,
      model: modelUpper
    });

    const number = String(count + 1).padStart(3, '0');
    const carID = `${brandUpper}${modelUpper}${number}`;

    const newCar = {
      carID,
      brand,
      model,
      year: Number(year),
      type,
      dailyRate: Number(dailyRate),
      description,
      imageURL,
      seats: Number(seats),
      transmission,
      powerSource,
      lastUpDate: new Date(lastUpDate),
      available: true,
      createdAt: new Date()
    };

    await database.collection("cars").insertOne(newCar);
    res.redirect("/cars.html");
  } catch (err) {
    console.error("新增車輛失敗：", err.message);
    res.status(500).json({ error: "伺服器錯誤，請稍後再試" });
  } finally {
    await client.close();
  }
});

router.post('/search', async function (req, res, next) {
  const client = new MongoClient(uri);

  try {
    // 構建查詢條件對象
    const query = {};
    const skip = Number(req.body.skip) || 0;
    const limit = Number(req.body.limit) || 9;

    // 品牌篩選 - 如果有提供品牌，使用正則匹配
    if (req.body.brand && req.body.brand.trim() !== '') {
      const reg = new RegExp(".*" + req.body.brand + ".*", "i"); // 添加 i 標誌進行大小寫不敏感匹配
      query.brand = { $regex: reg };
    }

    // 型號篩選
    if (req.body.model && req.body.model.trim() !== '') {
      const modelReg = new RegExp(".*" + req.body.model + ".*", "i");
      query.model = { $regex: modelReg };
    }

    // 日租金上限篩選
    if (req.body.dailyRate && !isNaN(req.body.dailyRate)) {
      query.dailyRate = { $lte: Number(req.body.dailyRate) };
    }

    // 座位數篩選
    if (req.body.seats && !isNaN(req.body.seats)) {
      query.seats = { $gte: Number(req.body.seats) }; // 大於等於指定座位數
    }

    // 車型篩選（如果前端有提供）
    if (req.body.type && req.body.type.trim() !== '') {
      query.type = req.body.type;
    }

    // 年份篩選（如果需要）
    if (req.body.year && !isNaN(req.body.year)) {
      query.year = { $gte: Number(req.body.year) }; // 大於等於指定年份
    }

    // 動力來源篩選（如果需要）
    if (req.body.powerSource && req.body.powerSource.trim() !== '') {
      query.powerSource = req.body.powerSource;
    }

    // 傳動系統篩選（如果需要）
    if (req.body.transmission && req.body.transmission.trim() !== '') {
      query.transmission = req.body.transmission;
    }

    console.log('Search query:', query); // 用於調試

    // 執行查詢
    const data = await client.db("carRental").collection("cars")
      .find(query) // 使用動態構建的查詢條件
      .skip(skip)
      .limit(limit)
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
      .sort({ dailyRate: 1 }) // 按價格升序排列
      .toArray();

    res.json(data);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '搜索時發生錯誤' });
  } finally {
    // Close the MongoDB client connection
    await client.close();
  }
});

export default router;
