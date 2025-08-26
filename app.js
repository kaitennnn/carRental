import createError from 'http-errors';
import express, { json, urlencoded } from 'express';
import session  from 'express-session';
import MongoStore from 'connect-mongo';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import carsRouter from './routes/cars.js';
import paymentRouter from './routes/payment.js';
import bookingRouter from './routes/booking.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(session({
  secret: 'abcdefg',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 天
}));

app.use((req, res, next) => {
  if (!req.session) {
    console.error('Session not initialized');
  }
  next();
});
// 中介：檢查是否登入
function requireLogin(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// 中介：檢查是否 admin
function requireAdmin(req, res, next) {
  if (req.session.role === 'admin') {
    return next();
  }
  res.status(403).send('需要管理員權限');
}

// 全域將登入資訊傳給模板
app.use((req, res, next) => {
  res.locals.currentUser   = req.session.userId || null;
  res.locals.currentRole   = req.session.role   || null;
  res.locals.currentUserName = req.session.userName || null;
  next();
});
// view engine setup
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/cars', carsRouter);
app.use('/', indexRouter);
app.use('/payment', paymentRouter);
app.use('/booking', bookingRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
