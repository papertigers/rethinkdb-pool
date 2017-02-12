// Taken from https://github.com/joyent/moray/blob/master/lib/dtrace.js
var dtrace = require('dtrace-provider');

var DTraceProvider = dtrace.DTraceProvider;

var PROBES = {
  /* Pool Probes */
  // clientid, host, port
  'pool-create-client': ['int'], 
  // clientid, host, port
  'pool-destroy-client': ['int'], 

  /* Query Probes */
  // clientid
  'query-start': ['int'],
  // clientid
  'query-error': ['int'],
  // clientid
  'query-finish': ['int']
}

var PROVIDER;

///--- API

module.exports = function exportStaticProvider() {
    if (!PROVIDER) {
        PROVIDER = dtrace.createDTraceProvider('rethinkdb-pool');

        PROVIDER._fast_probes = {};

        Object.keys(PROBES).forEach(function (p) {
            var args = PROBES[p].splice(0);
            args.unshift(p);

            var probe = PROVIDER.addProbe.apply(PROVIDER, args);
            PROVIDER._fast_probes[p] = probe;
        });

        PROVIDER.enable();
    }

    return (PROVIDER);
}();
