'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
const uuid = require("uuid/v4");

const postsTable = process.env.POSTS_TABLE;

// create a response
function response(statusCode, message){
  return {
    statusCode: statusCode, 
    body: JSON.stringify(message)
  }
}


// sort by Date
function sortByDate(a,b){
  if(a.createAt > b.createAt){
    return -1;
  } else {
    return 1;
  }

}


//create a post 
module.exports.createPost = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);

  if(!reqBody.title || reqBody.title.trim() === '' || !reqBody.body || reqBody.body.trim() === ''){
    return callback(null, response(400, {
      error: 'Post Must have a title and body and they must not be empty'
    }))
  }

  const post = {
    id: uuid(), 
    createAt: new Date().toISOString(),
    userId: 1,
    title: reqBody.title,
    body: reqBody.body
  };

  return db.put({
    TableName: postsTable,
    Item: post

  }).promise().then(() => {
    callback(null,response(201, post))
  })
  .catch(err => response(null, response(err.statusCode, err)));
}

// get All posts 

module.exports.getAllPosts = (event, context, callback) => {
  return db.scan({
    TableName: postsTable
  }).promise().then(res => {
    callback(null, response(200, res.Items.sort(sortByDate)))
  }).catch(err => callback(null, response(err.statusCode, err)))
}

module.exports.getPosts = (event, context, callback) => {
  const numberOfPosts = event.pathParameters.number;
  const params = {
    TableName: postsTable, 
    Limit: numberOfPosts
  };
  return db.scan(params)
    .promise()
    .then(res => {
      callback(null, response(200, res.Items.sort(sortByDate)))
    }).catch(err => callback(null, response(err.statusCode, err)))
}

//get A single Post
module.exports.getPost = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    Key: {
      id: id
    }, 
    TableName: postsTable
  }

  return db.get(params).promise()
    .then(res => {
      if(res.Item) callback(null, response(200, res.Item))
      else callback(null, response(404, {error: 'post not found'}))
    }).catch(err => callback(null, response(err.statusCode, err)))

}

//update post 

module.exports.updatePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const params = {
    Key: {
      id: id
    }, 
    TableName: postsTable, 
    ConditionExpression: 'attribute_exists(id)', 
    UpdateExpression: 'set ' + paramName + ' = :v', 
    ExpressionAttributeValues: {
      ':v': paramValue
    }, 
    ReturnValue: 'ALL_NEW'
  };

  return db.update(params)
    .promise()
    .then(res => {
      callback(null, response(200, res))
    }).catch(
      err => callback(null, response(err.statusCode, err)));
}
// Delete a post 
module.exports.deletePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    }, 
    TableName: postsTable
  };
  return db.delete(params)
    .promise()
    .then(() => callback(null, response(200, {message: 'Post delete successfully'})))
    .catch(err => callback(null, response(err.statusCode, err)));
}