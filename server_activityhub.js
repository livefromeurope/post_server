require("dotenv").config();

//https://www.npmjs.com/package/activitypub-express

//Strapi.io or Adonis or Nest 

//grab the packages we need
const express = require('express');
const mongodb = require('mongodb');
const helmet = require('helmet')
const ActivitypubExpress = require('activitypub-express')


//configure our app
const app = express()

const MongoClient = mongodb.MongoClient;
const port = process.env.PORT || 9000;



app.use(helmet())
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
    });






const routes = {
  actor: '/u/:actor',
  object: '/o/:id',
  activity: '/s/:id',
  inbox: '/u/:actor/inbox',
  outbox: '/u/:actor/outbox',
  followers: '/u/:actor/followers',
  following: '/u/:actor/following',
  liked: '/u/:actor/liked',
  collections: '/u/:actor/c/:id',
  blocked: '/u/:actor/blocked',
  rejections: '/u/:actor/rejections',
  rejected: '/u/:actor/rejected',
  shares: '/s/:id/shares',
  likes: '/s/:id/likes'
}
const apex = ActivitypubExpress({
  name: 'Apex Example',
  version: '1.0.0',
  domain: 'localhost',
  actorParam: 'actor',
  objectParam: 'id',
  activityParam: 'id',
  routes,
  endpoints: {
    proxyUrl: 'https://localhost/proxy'
  }
})

app.use(
  express.json({ type: apex.consts.jsonldTypes }),
  express.urlencoded({ extended: true }),
  apex
)
// define routes using prepacakged middleware collections
app.route(routes.inbox)
  .get(apex.net.inbox.get)
  .post(apex.net.inbox.post)
app.route(routes.outbox)
  .get(apex.net.outbox.get)
  .post(apex.net.outbox.post)
app.get(routes.actor, apex.net.actor.get)
app.get(routes.followers, apex.net.followers.get)
app.get(routes.following, apex.net.following.get)
app.get(routes.liked, apex.net.liked.get)
app.get(routes.object, apex.net.object.get)
app.get(routes.activity, apex.net.activityStream.get)
app.get(routes.shares, apex.net.shares.get)
app.get(routes.likes, apex.net.likes.get)
app.get('/.well-known/webfinger', apex.net.webfinger.get)
app.get('/.well-known/nodeinfo', apex.net.nodeInfoLocation.get)
app.get('/nodeinfo/:version', apex.net.nodeInfo.get)
app.post('/proxy', apex.net.proxy.post)
// custom side-effects for your app
app.on('apex-outbox', msg => {
  if (msg.activity.type === 'Create') {
    console.log(`New ${msg.object.type} from ${msg.actor}`)
  }
})
app.on('apex-inbox', msg => {
  if (msg.activity.type === 'Create') {
    console.log(`New ${msg.object.type} from ${msg.actor} to ${msg.recipient}`)
  }
})



const client = new MongoClient(process.env.REACT_APP_DATABASE_URL)
//connect to our mongodb database
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase(database){
    if (cachedDb) return cachedDb;

    const client = await MongoClient.connect(process.env.REACT_APP_DATABASE_URL,{
        useNewUrlParser: true,
        useUnifiedTopology: true,
        //tls:true,
        tlsCAFile: "./ca-certificate.crt",
    });

    const db = client.db(database);
    cachedClient = client;
    cachedDb = db;
    //nconsole.log(db);
    return db;
};


let Db = connectToDatabase('activitypub_posts').then(() => {
    console.log(Db)
    apex.store.db = Db
    return apex.store.setup()
  })
  .then(() => {
    app.listen(port, () => console.log(`apex app listening on port ${port}`))
  })