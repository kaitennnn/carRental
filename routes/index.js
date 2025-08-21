import { Router } from 'express';
import { MongoClient } from "mongodb";

const router = Router();

const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
router.get('/', (req, res) => res.render('index.ejs', { title: '租車服務' }));


export default router;