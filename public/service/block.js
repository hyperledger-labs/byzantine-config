'use strict';
/** 
Copyright 2018 Keyhole Software LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var log4js = require('log4js');
var logger = log4js.getLogger('service/block.js');
var util = require('./util.js');
var sha = require('js-sha256');
var asn = require('asn1.js');
var config = require('../config.js');

logger.setLevel(config.loglevel);

var getBlock = function(channel_id, blockNumber) {
  console.log('executing block...');

  return Promise.resolve()
    .then(() => {
      return util.connectChannel(channel_id);
    })
    .then(c => {
      logger.debug('query block channel = ' + c);

      return c.queryBlock(blockNumber);
    })
    .then(query_responses => {
      logger.debug('returned from query' + JSON.stringify(query_responses));

      return JSON.stringify(query_responses);
    })
    .catch(err => {
      logger.error('Caught Error', err);
      return 'Error ' + err;
    });
};

var getConfigBlock = function(channelid, blocknumber) {
  return getBlock(channelid, blocknumber).then(function(response) {
    var json = JSON.parse(response);
    // Get last config block from Metadata
    var configBlock = parseInt(json.metadata.metadata[1].value.index);

    return getBlock(channelid, configBlock);
  });
};

var getBlockHash = async function(header) {
  let headerAsn = asn.define('headerAsn', function() {
    this.seq().obj(
      this.key('Number').int(),
      this.key('PreviousHash').octstr(),
      this.key('DataHash').octstr()
    );
  });
  let output = headerAsn.encode(
    {
      Number: parseInt(header.number),
      PreviousHash: Buffer.from(header.previous_hash, 'hex'),
      DataHash: Buffer.from(header.data_hash, 'hex')
    },
    'der'
  );
  return sha.sha256(output);
};

exports.getBlock = getBlock;
exports.getConfigBlock = getConfigBlock;
exports.getBlockHash = getBlockHash;
