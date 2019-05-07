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
var path = require('path');
var hfc = require('fabric-client');
var config = require('../config.js');
var log4js = require('log4js');
var logger = log4js.getLogger('service/yaml.js');
var yamljs = require('json2yaml');
var fs = require('fs');
const electron = require('electron');

var userpath = electron.app.getPath('userData');

logger.setLevel(config.loglevel);

var orgYaml = function(json) {
  let jsonyaml = {};

  jsonyaml.PeerOrgs = [
    {
      Name: json.name,
      Domain: json.domain,
      EnableNodeOUs: true,
      Template: { Count: json.peers },
      Users: { Count: json.users }
    }
  ];
  let yaml = yamljs.stringify(jsonyaml);

  logger.debug('Converted to Org Yaml ' + yaml);

  // write to file system

  var fs = require('fs');
  var filepath = userpath + '/' + json.name + '.yaml';

  fs.writeFileSync(filepath, yaml);

  // Exceute crypto

  let binpath = '"' + global.config.bin_path + '/cryptogen"';
  const { execSync } = require('child_process');
  const testscript = execSync(
    binpath +
      ' generate --output="' +
      userpath +
      '/crypto-config" --config="' +
      userpath +
      '/' +
      json.name +
      '.yaml"'
  );

  return;
};

var configTx = function(json) {
  let jsonyaml = {};
  let orgs = [];
  console.log('Name=' + json.domain);
  let org = {};
  org['&' + json.name] = {
    Name: json.name + 'MSP',
    ID: json.name + 'MSP',
    MSPDir: 'crypto-config/peerOrganizations/' + json.domain + '/msp',
    AnchorPeers: [{ Host: 'peer0.' + json.domain, port: 7051 }]
  };
  orgs.push(org);
  jsonyaml.Organizations = orgs;
  let yaml = yamljs.stringify(jsonyaml);

  // format label...

  let index = yaml.indexOf('&') + json.name.length;
  yaml = yaml.substr(0, index) + yaml.substr(index + 2);

  logger.debug('Converted to Org ConfigTX Yaml ' + yaml);

  // write to file system

  var fs = require('fs');
  var filepath = userpath + '/configtx.yaml';

  fs.writeFileSync(filepath, yaml);

  // create directory

  if (!fs.existsSync(userpath + '/channel-artifacts')) {
    fs.mkdirSync(userpath + '/channel-artifacts');
  }

  //get update JSON

  const { execSync } = require('child_process');
  let output = userpath + '/channel-artifacts/' + json.name + '.json';
  let binpath = '"' + global.config.bin_path + '/configtxgen"';

  const configtxgen = execSync(
    'export FABRIC_CFG_PATH="' +
      userpath +
      '" && ' +
      binpath +
      ' -printOrg ' +
      json.name +
      'MSP > "' +
      output +
      '"'
  );

  let contents = fs.readFileSync(output, 'utf8');

  return contents;
};

var convertToPb = function(fileName, pbfileName) {
  let binpath = '"' + global.config.bin_path + '/configtxlator"';

  // Exceute crypto
  const { execSync } = require('child_process');
  const testscript = execSync(
    binpath +
      ' proto_encode --input "' +
      fileName +
      '" --type common.Config --output "' +
      pbfileName +
      '"'
  );

  return 'Converted ' + fileName + ' to Protocol Buffer';
};

var computeUpdateDeltaPb = function(channel, original, modified, updated) {
  // Exceute crypto

  let binpath = '"' + global.config.bin_path + '/configtxlator"';
  const { execSync } = require('child_process');
  const testscript = execSync(
    binpath +
      ' compute_update --channel_id ' +
      channel +
      ' --original "' +
      original +
      '" --updated "' +
      modified +
      '" --output "' +
      updated +
      '"'
  );

  return 'Created Updated PB -' + updated;
};

var decodeToJson = function(input) {
  // Exceute crypto

  let binpath = '"' + global.config.bin_path + '/configtxlator"';
  const { execSync } = require('child_process');
  const testscript = execSync(
    binpath +
      ' proto_decode --input "' +
      input +
      '.pb" --type common.ConfigUpdate --output "' +
      input +
      '.json"'
  );

  return 'Decoded to JSON -' + input;
};

var createEnvelope = function(orgname) {
  let envelopeFileName = userpath + '/' + orgname + '_update_in_envelope.json';
  let modified = userpath + '/' + orgname + '_update.json';

  let json = fs.readFileSync(modified, 'utf8');
  var o = JSON.parse(json);

  var envelope = {
    payload: {
      header: { channel_header: { channel_id: 'mychannel', type: 2 } },
      data: { config_update: o }
    }
  };

  fs.writeFileSync(envelopeFileName, JSON.stringify(envelope), err => {
    if (err) throw err;
    logger.info('Envelope file was succesfully created!');
  });

  return 'Modified Envelope Created -' + envelopeFileName;
};

var convertEnvelope = function(orgname) {
  let envelopeFileName = userpath + '/' + orgname + '_update_in_envelope.json';
  let outputFileName = userpath + '/' + orgname + '_update_in_envelope.pb';
  // Exceute crypto

  let binpath = '"' + global.config.bin_path + '/configtxlator"';
  const { execSync } = require('child_process');
  const testscript = execSync(
    binpath +
      ' proto_encode --input "' +
      envelopeFileName +
      '" --type common.Envelope --output "' +
      outputFileName +
      '"'
  );

  return 'PB Envelope created in: ' + outputFileName;
};

var recurse = function(obj) {
  for (var k in obj) {
    if (k == 'rules') {
      delete obj[k][0].Type;
    }

    if (k == 'rule') {
      delete obj[k].Type;
      if (obj[k].n_out_of) {
        let value = obj[k].n_out_of.N;
        delete obj[k].n_out_of.N;
        obj[k].n_out_of.n = value;
      }
    }

    if (k == 'rule') {
      delete obj[k].Type;
      if (obj[k].n_out_of) {
        let value = obj[k].n_out_of.N;
        delete obj[k].n_out_of.N;
        obj[k].n_out_of.n = value;
      }
    }

    if (k == 'identities') {
      let classification = obj[k][0].principal_classification;
      let msp_identifier = obj[k][0].msp_identifier;
      let role = obj[k][0].Role;

      delete obj[k][0];

      obj[k] = [
        {
          principal: { msp_identifier: msp_identifier, role: 'ADMIN' },
          principal_classification: 'ROLE'
        }
      ];
    }

    if (k == 'root_certs') {
      let cert = obj[k][0];
      let begin = '-----BEGIN CERTIFICATE-----\n';
      let end = '\n-----END CERTIFICATE-----\n';
      obj[k][0] = cert.replace(begin, '').replace(end, '');
    }

    if (k == 'admins') {
      let admincert = obj[k][0];
      let begin = '-----BEGIN CERTIFICATE-----\n';
      let end = '\n-----END CERTIFICATE-----\n';
      obj[k][0] = admincert.replace(begin, '').replace(end, '');
    }

    if (k == 'tls_root_certs') {
      let rootcert = obj[k][0];
      let begin = '-----BEGIN CERTIFICATE-----\n';
      let end = '\n-----END CERTIFICATE-----\n';
      obj[k][0] = rootcert.replace(begin, '').replace(end, '');
    }

    if (typeof obj[k] == 'object' && obj[k] !== null) {
      recurse(obj[k]);
    } else {
    }
  }
};

var removeRuleType = function(json) {
  let result = JSON.parse(JSON.stringify(json));

  recurse(result);

  return result;
};

exports.orgYaml = orgYaml;
exports.configTx = configTx;
exports.convertToPb = convertToPb;
exports.removeRuleType = removeRuleType;
exports.computeUpdateDeltaPb = computeUpdateDeltaPb;
exports.decodeToJson = decodeToJson;
exports.createEnvelope = createEnvelope;
exports.convertEnvelope = convertEnvelope;
