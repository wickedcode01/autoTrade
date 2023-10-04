var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/runoob";
const {dbname}=require('../../config.json')


const config= {
  useNewUrlParser: true,
  useUnifiedTopology: true
}
function insert(name,content) {
  return new Promise((resolve,reject)=>{
    MongoClient.connect(url,config,function (err, db) {
      if (err) reject(err);
      const dbo = db.db(dbname);
      dbo.collection(name).insertOne(content, function (err, res) {
        if (err) reject(err);
        resolve()
        db.close();
      });
    });
  })
 
}

function update(name,where,content,filter={}){
  return new Promise((resolve,reject)=>{
    MongoClient.connect(url, config,function(err, db) {
      if (err) reject(err);
      const dbo = db.db(dbname);
      const updateStr = {$set: content};
      dbo.collection(name).updateOne(where, updateStr,{arrayFilters:filter}, function(err, res) {
          if (err) reject(err);
          console.log("文档更新成功");
          db.close();
          resolve()
      });
  });
  })
}

function select(name,filter={}) {
  return new Promise((reslove,reject)=>{
    MongoClient.connect(url,config, function (err, db) {
      if (err) reject(err);
      const dbo = db.db(dbname);
      dbo.collection(name).find(filter).toArray(function (err, result) { // 返回集合中所有数据
        if (err){
          reject(err)
        }
        reslove(result)
        db.close();
      });
    });
  })
 
}

// const today='2021-05-05'
// const position=1
// const code='600000'
// update("tradeInfo",{date:today},{"position.$[i].amount":position},[{"i.code":code}])


module.exports={select,insert,update}