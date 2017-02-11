rethinkdb-pool
==============
A connection pool for rethinkdb

#### TODO
* Support array of rethinkdb nodes

Example
-------
```node
var rdbpool = require('rethinkdb-pool');
var r = require('rethinkdb');

var config = {
  host: 'localhost',
  port: 32769,
  user: 'admin',
  password: '',
  db: 'test',
  max: 5
};

var pool = new rdbpool(config);

var query = r.table('foo').limit(10)

pool.run(query, null, function(err, cursor) {
  if (err)
    return console.log(err);
    cursor.toArray(function(err, results) {
      if (err) throw err;
      console.log(results);
    });
});
```
