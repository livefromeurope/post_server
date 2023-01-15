require("dotenv").config();

//https://www.youtube.com/watch?v=1171ScSfIrs&t=1841s


//Strapi.io or Adonis or Nest 

//grab the packages we need
const express = require('express');
const mongodb = require('mongodb');
const helmet = require('helmet')


//configure our app
const app = express();
const MongoClient = mongodb.MongoClient;
const port = process.env.PORT || 9000;


app.use(express.json());
app.use(helmet())
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
    });


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
    console.log(db);
    return db;
};


//create our routes
app.get('/', (req,res)=>{
    console.log(req);
    res.send('mongodb-api');
});



//////POSTS/////////
// read post
app.get('/posts', async (req, res)=> {
    
    const db = await connectToDatabase('posts');
    let cat = req.query.category;
    let limit = Number(req.query.limit)
    let query_date = req.query.date
    
    console.log(req.query)
    console.log(cat)
    console.log(limit)

    if(Object.keys(req.query).length <= 1){
        var queries = {}
        console.log(1)
    }else if (cat === undefined){
        //var queries = req.query
        delete req.query.limit;
        delete req.query.date;
        var queries = req.query;
        console.log(2)
    }
    else if(cat.constructor == String){
        delete req.query.limit;
        delete req.query.date;
        var queries = req.query;
        console.log(queries)
        console.log(3)
    }else if(cat.constructor == Array){
        console.log('Array')
        //var queries = req.query['category']
        var queries = {category: {$in: []}}
        //console.log(queries['category'].$in)
        queries['category'].$in.push.apply(queries['category'].$in,cat)
        console.log(queries)
        //console.log(query)
        console.log(4)
    }
    else{
        var queries = {};
        console.log(5)
    }

    let json = {$lt: query_date}
    console.log(json)
    queries.created_date = json
    console.log(queries)
    

    /*
    //kick query and above and add  {}
    //adjust
    */
    //const posts = await db.collection("posts").find(queries).limit(limit).sort([['_id', -1]]).toArray();
    const posts = await db.collection("posts").find(queries).limit(limit).sort({created_date:-1}).toArray();
    res.json({posts});

});


// create post
app.post("/posts", async (req, res)=>{
    const db = await connectToDatabase('posts');
    const obj = req.body;
    const post = await db.collection("posts").insertOne(
        {
        title:obj.title,
        id:obj.id,
        category:obj.category,
        author:obj.author,
        content:obj.content,
        created_date:obj.created_date,
        votes:obj.votes,
        comment_count:obj.comment_count,
        image:obj.image,
        status:obj.status});
    res.send({post});
});


// update post edit
app.put("/posts/:postId", async (req, res)=>{
    const postId = req.params.postId;
    const obj = req.body;
    const updatetype = req.body.updatetype;
    let json_value = {}
    //whatvalue
    if(updatetype == 'vote_update'){
        json_value.votes = obj.votes
    }else if(updatetype == 'comment_count_update'){
        json_value.comment_count = obj.comment_count
    }
    else{
        console.log('no_update')
    }
    const db = await connectToDatabase('posts');
    console.log('update: ' + postId)
    console.log('votes: ' + obj.votes)
    const post = await db.collection("posts").updateOne(
        {_id: mongodb.ObjectId(postId)},{$set:json_value});
    res.send({post});
});


// delete post
app.delete("/posts/:postId", async (req, res)=>{
    const postId = req.params.postId;
    const db = await connectToDatabase('posts');
    const post = await db
        .collection("posts")
        .deleteOne({_id: mongodb.ObjectId(postId)})
    res.send({post});
});



/////LISTEN TO SERVER


// create the server
app.listen(port, ()=>{
    console.log("Our app is running on port", port);
});
