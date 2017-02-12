var assert = require('assert-plus');
var dtrace = require('./libs/dtrace');
var pooling = require('pooling');
var r = require('rethinkdb');

var CLIENT_ID = 0;

function RDBPool(config) {
  assert.object(config, 'config');
  assert.string(config.host, 'config.host');
  assert.string(config.user, 'config.user');
  assert.string(config.password, 'config.password');
  assert.string(config.db, 'config.db');
  assert.optionalObject(config.ssl, 'config.ssl');

  var create = function createRethinkClient(cb) {
    r.connect({
      host: config.host,
      port: config.port || 28015,
      user: config.user,
      password: config.password,
      db: config.db,
      ssl: config.ssl || null 
    }, function(err, client) {
      if (err) return cb(err, null);
      if (++CLIENT_ID >= 4294967295) // 2^32 -1
        CLIENT_ID = 1;
      client._id = CLIENT_ID;
      dtrace['pool-create-client'].fire(function (){
        return ([client._id]);
      });
      cb(null, client);
    });
  }

  var destroy = function destroyRethinkClient(client) {
    client._was = client._id;
    client._id = -1;
    client.close(function closeRethinkConnection(err) {
      // Crash hard if a connection fails to close for some reason
      assert.ifError(err)
      dtrace['pool-destroy-client'].fire(function (){
        return ([client._was]);
      });
    });
  } 

  var check = function checkRethinkClient(client, cb) {
    if (!client.isOpen()) 
      return cb(new Error());
    cb(null);
  }

  this.pool = pooling.createPool({
    checkInterval: config.checkInterval || 30000,
    max: config.max || 10,
    maxIdleTime: config.maxIdleTime || 3000,
    name: 'rethinkdb pool',
    check: check,
    create: create,
    destroy: destroy,
  });
}

// ---------------- private funcitons ---------------------
RDBPool.prototype._getClient = function _getClient(cb) {
  var self = this;
  self.pool.acquire(function(err, client) {
    if (err)
      return cb(err, null);
    cb(null, client);
  });
}

// ---------------- public funcitons ---------------------
RDBPool.prototype.run = function runQuery(query, opts, cb) {
  var self = this;
  if (opts instanceof Function) {
    cb = opts;
    opts = null;
  }
  self._getClient(function aquireClient(err, client) {
    if (err)
      return cb(err, null);
    dtrace['query-start'].fire(function (){
      return ([client._id]);
    });
    query.run(client, opts, function queryResultsCallback(err, cursor) {
      dtrace['query-finish'].fire(function (){
        return ([client._id]);
      });
      if (err) {
        dtrace['query-error'].fire(function (){
          return ([client._id]);
        });
        cb(err, null);
        return self.pool.release(client);
      }
      cb(null, cursor); 
      self.pool.release(client);
    }); 
  });
}

module.exports = RDBPool;
