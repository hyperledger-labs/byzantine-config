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
var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var config = require('../config.js');
var log4js = require('log4js');
var logger = log4js.getLogger('service/enroll.js');
const electron = require('electron');
var userpath = electron.app.getPath('userData');

//logger.setLevel(config.loglevel);

var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var admin_user = null;
var member_user = null;
//var store_path = path.join(__dirname, 'hfc-key-store');


var enrollUser = function (userid, credspath) {

  console.log(credspath)
  // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
  Fabric_Client.newDefaultKeyValueStore({
    path: credspath
  }).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    var crypto_store = Fabric_Client.newCryptoKeyStore({ path: credspath });
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);
    var tlsOptions = {
      trustedRoots: [],
      verify: false
    };
    // be sure to change the http to https when the CA is running TLS enabled
    fabric_ca_client = new Fabric_CA_Client('http://localhost:7054', null, '', crypto_suite);

    // first check to see if the admin is already enrolled
    return fabric_client.getUserContext(config.user_id, true);
  }).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
      console.log('Successfully loaded admin from persistence');
      admin_user = user_from_store;
    } else {
      throw new Error('Failed to get admin.... run enrollAdmin.js');
    }

    // at this point we should have the admin user
    // first need to register the user with the CA server
    return fabric_ca_client.register({ enrollmentID: userid, affiliation: 'org1.department1', role: 'client' }, admin_user);
  }).then((secret) => {
    // next we need to enroll the user with CA server
    console.log('Successfully registered '+userid+' - secret:' + secret);

    return fabric_ca_client.enroll({ enrollmentID: userid, enrollmentSecret: secret });
  }).then((enrollment) => {
    console.log('Successfully enrolled member user ' + userid);
    return fabric_client.createUser(
      {
        username: userid,
        mspid: 'Org1MSP',
        cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
      });
  }).then((user) => {
    member_user = user;

    return fabric_client.setUserContext(member_user);
  }).then(() => {
    console.log(userid + ' was successfully registered and enrolled and is ready to intreact with the fabric network');

  }).catch((err) => {
    console.error('Failed to register: ' + err);
    if (err.toString().indexOf('Authorization') > -1) {
      console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
        'Try again after deleting the contents of the store directory ' + store_path);
    }
    return "ERROR";
  });


}


exports.enrollUser = enrollUser;