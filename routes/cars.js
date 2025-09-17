import { Router } from 'express';
import { MongoClient } from "mongodb";
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'car-images',
    allowed_formats: ['jpg', 'png'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  },
});
const upload = multer({ storage: storage });

cloudinary.config({
  cloud_name: 'dclbim2gs',
  api_key: '794545249291633',
  api_secret: 'z4yQC9BU0KRFvCj18bRZd79Sl3M'
});

router.get('/', (req, res) => {
  const isAdmin = req.session.role === 'admin';
  const {
    brand = '',
    model = '',
    dailyRate = '',
    seats = '',
    startDate = '',
    endDate = ''
  } = req.query;

  res.render('cars', {
    csrfToken: req.csrfToken(),
    title: 'CarsList',
    isAdmin,
    brand,
    model,
    seats,
    dailyRate,
    startDate,
    endDate
  });
});

router.post('/add', upload.single('vehicleImage'), async function (req, res, next) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("carRental");
    const carsCollection = db.collection("cars");
    const systemNumCollection = db.collection("systemNum");

    const imageUrl = req.file?.path || '';

    const {
      brand,
      model,
      year,
      type,
      dailyRate,
      description,
      seats,
      transmission,
      powerSource,
      lastUpDate
    } = req.body;

    const brandUpper = brand.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const modelUpper = model.toUpperCase().replace(/[^A-Z0-9]/g, "");

    let number = 1;
    let carID = `${brandUpper}${modelUpper}${String(number).padStart(3, '0')}`;

    const systemDoc = await systemNumCollection.findOne({ name: "carIDList" });
    const usedIDs = systemDoc?.carIDs || [];

    while (usedIDs.includes(carID)) {
      number++;
      carID = `${brandUpper}${modelUpper}${String(number).padStart(3, '0')}`;
    }

    await systemNumCollection.updateOne(
      { name: "carIDList" },
      { $push: { carIDs: carID } },
      { upsert: true }
    );

    const newCar = {
      carID,
      brand,
      model,
      year: Number(year),
      type,
      dailyRate: Number(dailyRate),
      description,
      imageURL: imageUrl,
      seats: Number(seats),
      transmission,
      powerSource,
      lastUpDate: new Date(lastUpDate),
      createdAt: new Date()
    };

    await carsCollection.insertOne(newCar);
    res.redirect("/cars");
  } catch (err) {
    console.error("新增車輛失敗：", err.message);
    res.status(500).json({ error: "伺服器錯誤，請稍後再試" });
  } finally {
    await client.close();
  }
});

router.get('/edit/:carID', async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const carID = req.params.carID;
    const car = carID == "0"
      ? {}
      : await client.db("carRental").collection("cars").findOne({ carID });

    res.render("addCar", { car, csrfToken: req.csrfToken() });
  } catch (err) {
    console.error("取得車輛資料失敗:", err);
    res.status(500).send("伺服器錯誤");
  } finally {
    await client.close();
  }
});

router.post('/update', upload.single('vehicleImage'), async (req, res) => {
  if (req.session?.role !== 'admin') {
    return res.status(403).send('無權限更新車輛');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("carRental");
    const carsCollection = db.collection("cars");
    const systemNumCollection = db.collection("systemNum");

    const carID = req.body.carID;
    const imageUrl = req.file?.path || req.body.existingImageURL || '';

    const newCarData = {
      carID,
      brand: req.body.brand,
      model: req.body.model,
      year: Number(req.body.year),
      type: req.body.type,
      dailyRate: Number(req.body.dailyRate),
      description: req.body.description,
      imageURL: imageUrl,
      seats: Number(req.body.seats),
      transmission: req.body.transmission,
      powerSource: req.body.powerSource,
      lastUpDate: new Date(req.body.lastUpDate),
      createdAt: new Date()
    };

    if (carID == "0") {
      const brandUpper = req.body.brand.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const modelUpper = req.body.model.toUpperCase().replace(/[^A-Z0-9]/g, "");
      let number = 1;
      let newCarID = `${brandUpper}${modelUpper}${String(number).padStart(3, '0')}`;

      const systemDoc = await systemNumCollection.findOne({ name: "carIDList" });
      const usedIDs = systemDoc?.carIDs || [];

      while (usedIDs.includes(newCarID)) {
        number++;
        newCarID = `${brandUpper}${modelUpper}${String(number).padStart(3, '0')}`;
      }

      await systemNumCollection.updateOne(
        { name: "carIDList" },
        { $push: { carIDs: newCarID } },
        { upsert: true }
      );

      newCarData.carID = newCarID;
      newCarData.createdAt = new Date();

      await carsCollection.insertOne(newCarData);
    } else {
      const existingCar = await carsCollection.findOne({ carID });
      if (!existingCar) {
        console.error("找不到指定車輛，無法更新：", carID);
        return res.status(404).send("找不到指定車輛");
      }

      const updatedCar = {
        carID,
        brand: req.body.brand,
        model: req.body.model,
        year: Number(req.body.year),
        type: req.body.type,
        dailyRate: Number(req.body.dailyRate),
        description: req.body.description,
        imageURL: imageUrl,
        seats: Number(req.body.seats),
        transmission: req.body.transmission,
        powerSource: req.body.powerSource,
        lastUpDate: new Date(req.body.lastUpDate),
        createdAt: existingCar.createdAt
      };

      await carsCollection.replaceOne({ carID }, updatedCar);
    }

    res.redirect("/cars");
  } catch (err) {
    console.error("更新錯誤:", err);
    res.status(500).send("伺服器錯誤");
  } finally {
    await client.close();
  }
});

router.post('/delete', async (req, res) => {
  if (req.session?.role !== 'admin') {
    return res.status(403).send('無權限刪除車輛');
  }

  const carID = req.body.carID;
  if (!carID) {
    return res.status(400).send('缺少 carID');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const result = await client.db("carRental").collection("cars").deleteOne({ carID });

    if (result.deletedCount === 1) {
      res.status(200).send('刪除成功');
    } else {
      res.status(404).send('找不到指定車輛');
    }
  } catch (err) {
    console.error('刪除錯誤:', err);
    res.status(500).send('伺服器錯誤');
  } finally {
    await client.close();
  }
});

router.get('/carList', async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const cars = await client.db("carRental").collection("cars")
      .find({})
      .sort({ createdAt: -1 }) // 最新的車排最前面
      .project({
        _id: 0,
        carID: 1,
        brand: 1,
        model: 1,
        year: 1,
        type: 1,
        dailyRate: 1,
        imageURL: 1
      })
      .toArray();

    res.json(cars);
  } catch (err) {
    console.error("取得車輛清單失敗：", err);
    res.status(500).json({ error: "伺服器錯誤" });
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
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const booked = await client.db("carRental").collection('booking').distinct(
      'carID',
      {
        $nor: [
          { endDate: { $lt: start } },  // 訂單結束早於請求開始
          { startDate: { $gt: end } }   // 訂單開始晚於請求結束
        ]
      }
    );
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
    if (booked.length > 0) {
      query.carID = { $nin: booked };
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

router.get('/api/models/:brand', async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const { brand } = req.params;
    // 使用 MongoDB distinct 查詢該品牌下的所有型號
    const models = await client.db("carRental").collection('cars').distinct('model', {
      brand: brand
    });
    res.json(models);
  } catch (error) {
    console.error('查詢型號錯誤:', error);
    res.status(500).json({ error: '查詢型號失敗' });
  }
});

// 如果需要取得所有品牌列表
router.get('/api/brands', async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const brands = await client.db("carRental").collection('cars').distinct('brand');
    res.json(brands);
  } catch (error) {
    console.error('查詢品牌錯誤:', error);
    res.status(500).json({ error: '查詢品牌失敗' });
  }
});

router.get('/statistics', async (req, res, next) => {
  if (req.session.role !== 'admin') return res.status(403).send('Admin only');
  const client = new MongoClient(uri);
  const db = client.db('carRental');
  const bookings = db.collection('booking');
  const cars = db.collection('cars');
  try {
    // 1. 品牌选择次数：先 lookup 到 cars 获取 brand，再 group
    const brandAgg = [
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
        $group: {
          _id: '$carInfo.brand',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ];
    const brandsData = await bookings.aggregate(brandAgg).toArray();

    // 2. 金额区间分布：将 amount 转 Number，再 bucket
    const amountAgg = [
      {
        $addFields: {
          amountNum: { $toDouble: '$amount' }
        }
      },
      {
        $bucket: {
          groupBy: '$amountNum',
          boundaries: [0, 600, 800, 1200, Infinity],
          default: '其他',
          output: { count: { $sum: 1 } }
        }
      }
    ];
    const amountsData = await bookings.aggregate(amountAgg).toArray();
    console.log(brandsData,amountsData);

    // 3. 渲染页面

    res.render('statistics', {
      brands: brandsData.map(b => ({ brand: b._id, count: b.count })),
      amounts: amountsData.map(a => ({ range: String(a._id), count: a.count }))
    });
  } catch (err) {
    next(err);
  } finally {
    await client.close();
  }
});


export default router;
