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
    else if(req.query.search){
        delete req.query.limit;
        delete req.query.date;
        search_token = req.query.search
        var queries = {$text: {$search: search_token}};
        console.log(queries)
        console.log('NOW')
    } else if(cat.constructor == String){
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
    console.log(posts)
    res.json({posts});


});


// create post
app.post("/posts", async (req, res) => {
    try {
        // Input validation
        const {
            title, id, category, author, content, created_date, votes,
            comment_count, image, status, tags, type
        } = req.body;

        if (!title || !id || !category || !author || !content) {
            return res.status(400).json({ status: '400', error: 'Required fields are missing' });
        }

        // Connect to the database and create the post
        const db = await connectToDatabase('posts');
        const result = await db.collection("posts").insertOne({
            title: title,
            id: id,
            category: category,
            author: author,
            content: content,
            created_date: created_date,
            votes: votes,
            comment_count: comment_count,
            image: image,
            status: status,
            tags: tags,
            type: type
        });

        // Return a success response with the inserted post's ID
        return res.json({
            status: '200',
            message: 'Post created successfully',
            postId: result.insertedId
        });

    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ status: '500', error: 'Internal Server Error' });
    }
});



// update post edit
app.put("/posts/:postId", async (req, res) => {
    try {
        // Input validation
        const postId = req.params.postId;
        const { updatetype, votes, comment_count } = req.body;

        if (!postId) {
            return res.status(400).json({ status: '400', error: 'Post ID is required' });
        }

        if (!updatetype) {
            return res.status(400).json({ status: '400', error: 'Update type is required' });
        }

        let updateFields = {};

        // Determine the fields to update based on the update type
        switch (updatetype) {
            case 'vote_update':
                updateFields.votes = votes;
                break;
            case 'comment_count_update':
                updateFields.comment_count = comment_count;
                break;
            default:
                return res.status(400).json({ status: '400', error: 'Invalid update type' });
        }

        // Connect to the database and update the post
        const db = await connectToDatabase('posts');
        const result = await db.collection("posts").updateOne(
            { _id: mongodb.ObjectId(postId) },
            { $set: updateFields }
        );

        // Check if a post was actually updated
        if (result.matchedCount === 0) {
            return res.status(404).json({ status: '404', error: 'Post not found' });
        }

        // Return a success response
        return res.json({
            status: '200',
            message: 'Post updated successfully'
        });

    } catch (error) {
        // Handle potential ObjectId casting error
        if (error instanceof mongodb.MongoError && error.message.includes("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters")) {
            return res.status(400).json({ status: '400', error: 'Invalid post ID format' });
        }

        console.error("Error updating post:", error);
        res.status(500).json({ status: '500', error: 'Internal Server Error' });
    }
});



// delete post
app.delete("/posts/:postId", async (req, res) => {
    try {
        // Input validation
        const postId = req.params.postId;
        if (!postId) {
            return res.status(400).json({ status: '400', error: 'Post ID is required' });
        }

        // Connect to the database and delete the post
        const db = await connectToDatabase('posts');
        const result = await db.collection("posts").deleteOne({ _id: mongodb.ObjectId(postId) });

        // Check if a post was actually deleted
        if (result.deletedCount === 0) {
            return res.status(404).json({ status: '404', error: 'Post not found' });
        }

        // Return a success response
        return res.json({
            status: '200',
            message: 'Post deleted successfully'
        });

    } catch (error) {
        // Handle potential ObjectId casting error
        if (error instanceof mongodb.MongoError && error.message.includes("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters")) {
            return res.status(400).json({ status: '400', error: 'Invalid post ID format' });
        }

        console.error("Error deleting post:", error);
        res.status(500).json({ status: '500', error: 'Internal Server Error' });
    }
});




/////LISTEN TO SERVER


// create the server
app.listen(port, ()=>{
    console.log("Our app is running on port", port);
});
