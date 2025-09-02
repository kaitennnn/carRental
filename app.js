import createError from 'http-errors';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import logger from 'morgan';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import carsRouter from './routes/cars.js';
import paymentRouter from './routes/payment.js';
import bookingRouter from './routes/booking.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('views', join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(join(__dirname, 'public')));

app.use(express.json());                            
app.use(express.urlencoded({ extended: false }));   
app.use(cookieParser());                            
app.use(session({                                   
  secret: 'abcdefg',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority'
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 12 }           
}));

const csrfProtection = csrf({ cookie: true });
app.use((req, res, next) => {
  // 排除无需 CSRF 的 POST 路由
  if (
    req.method == 'POST' &&
    ['/cars/update', '/cars/search'].includes(req.path)
  ) {
    return next();
  }
  csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.currentUser = req.session.userId || null;
  res.locals.currentUserName = req.session.userName || null;
  res.locals.currentRole = req.session.role || null;
  res.locals.retrunUrl = req.session.returnUrl || null;
  next();
});

// 6. 路由挂载
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/cars', carsRouter);
app.use('/payment', paymentRouter);
app.use('/booking', bookingRouter);

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // CSRF 验证失败
    return res.status(403).send('表单已过期，请重新刷新页面再试');
  }
  next(err);
});

app.use((err, req, res, next) => {
   // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
