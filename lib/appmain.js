const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

// x-response-time

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

// logger

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}`);
});

// response

app.use(router.routes());
app.use(router.allowedMethods());

router
  .get('/', function (ctx, next) {
    ctx.body = 'Hello World!!!!1';
  });

app.listen(3000);
