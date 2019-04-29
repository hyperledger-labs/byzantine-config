const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const nativeImage = require('electron').nativeImage

const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const hfc = require('fabric-client');
const yaml = require('./service/yaml.js');
var log4js = require('log4js');
var logger = log4js.getLogger('service/electron.js');
var fs = require('fs');
var config = require('./config.js');
const os = require('os');

var userpath = electron.app.getPath('userData');

var filesToDelete = [];

let mainWindow;


function deleteFolder(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function copyFileSync( source, target ) {

  var targetFile = target;

  //if target is a directory a new file with the same name will be created
  if ( fs.existsSync( target ) ) {
      if ( fs.lstatSync( target ).isDirectory() ) {
          targetFile = path.join( target, path.basename( source ) );
      }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderSync( source, target ) {
  var files = [];

  //check if folder needs to be created or integrated
  //var targetFolder = path.join( target, path.basename( source ) );
  if ( !fs.existsSync( target ) ) {
      fs.mkdirSync( target );
  }

  //copy
  if ( fs.lstatSync( source ).isDirectory() ) {
      files = fs.readdirSync( source );
      files.forEach( function ( file ) {
          var curSource = path.join( source, file );
          if ( fs.lstatSync( curSource ).isDirectory() ) {
              copyFolderRecursiveSync( curSource, target );
          } else {
              copyFileSync( curSource, target );
          }
      } );
  }
}

function createWindow() {

  var keystore = os.homedir() + '/.hfc-key-store';
  logger.info('Creating keystore: ', keystore)
  if(fs.existsSync(keystore)) {
    logger.info('Remove existing keystore');
    deleteFolder(keystore);
  }
  var srcKeystore = __dirname + '/hfc-key-store';
  logger.info('Copy from keystore: ', srcKeystore);
  copyFolderSync(srcKeystore, keystore);

  // let icon = nativeImage.createFromPath(__dirname + '../images/icons/png/16x16.png')
  mainWindow = new BrowserWindow({ 
    show: false,
    width: 900, 
    height: 860,
    icon: path.join(__dirname, '../images/icons/png/64x64.png')
  });
  // prevent screen flashing by waiting for the ready-to-show event before displaying the window shell
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
  mainWindow.on('closed', () => mainWindow = null);

  const { ipcMain } = require('electron');

  ipcMain.on('block', (event, arg) => {

    let blockservice = require('./service/block.js');
    blockservice.getConfigBlock(global.config.channelid, blocks - 1).then(
      function (res) {

        global.configblock = JSON.parse(res);
        event.returnValue = res;
      });
  });

  ipcMain.on('orggen', (event, arg) => {

    let json = JSON.parse(arg);

    try {
      let yamlstring = yaml.orgYaml(json);
      filesToDelete.push(userpath + '/' + json.name + '.yaml');
      event.returnValue = "SUCCESS: Crypto Material Generated in crypto-config";
      global.orginfo = json;
    } catch (e) {
      event.returnValue = "ERROR";
      logger.info("ERROR: Crytpo Configuration failed, make sure cryptogen binary is in the path. " + e);

    }

  });

  ipcMain.on('defaultinfo', (event, arg) => {


    global.orginfo = { name: 'configupdate'};
    event.returnValue = "config returned";
   
  });


  ipcMain.on('addtx', (event, arg) => {

    let json = JSON.parse(arg);

    event.returnValue = yaml.configTx(json);


  });

  ipcMain.on('decodetojson', (event) => {

    let pbfile = userpath + '/' + global.orginfo.name + '_update';
    yaml.decodeToJson(pbfile);
    event.returnValue = 'pb file decoded to JSON ' + pbfile + '.json';
    filesToDelete.push(pbfile + '.json');

  });


  ipcMain.on('convertmodified', (event, jsonstring) => {

    let json = JSON.parse(jsonstring);

    // write to file
    let modified = userpath + '/modified.json';
    fs.writeFile(modified, JSON.stringify(global.modifiedjson), (err) => {
      if (err) throw err;
      logger.info("The file was succesfully saved!");
      let modifiedpb = userpath + '/modified_config.pb';
      event.returnValue = yaml.convertToPb(userpath + '/modified.json', modifiedpb);

      filesToDelete.push(modified);
      filesToDelete.push(modifiedpb);
    });

  });


  ipcMain.on('convertoriginalnew', (event, jsonstring) => {

    let json = global.originaljson;

    // write to file

    json = yaml.removeRuleType(json);
    let configjson = userpath + '/config.json';
    fs.writeFile(configjson, JSON.stringify(json), (err) => {
      if (err) throw err;
      logger.info("The file was succesfully saved!");

      let configpb = userpath + '/config.pb';
      event.returnValue = yaml.convertToPb(configjson, configpb);
      filesToDelete.push(configjson);
      filesToDelete.push(configpb);

    });

  });


  ipcMain.on('convertoriginal', (event, jsonstring) => {

    let json = global.modifiedjson;

    // write to file

    json = yaml.removeRuleType(json);
    let configjson = userpath + '/config.json';
    fs.writeFile(configjson, JSON.stringify(json), (err) => {
      if (err) throw err;
      logger.info("The file was succesfully saved!");

      let configpb = userpath + '/config.pb';
      event.returnValue = yaml.convertToPb(configjson, configpb);
      filesToDelete.push(configjson);
      filesToDelete.push(configpb);

    });

  });

  ipcMain.on('strip', (event, jsonstring) => {

    let json = JSON.parse(jsonstring);

    global.modifiedjson = json;

    // Fix policy type
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Writers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Readers.policy.type = 1;

    global.modifiedjson.channel_group.groups.Orderer.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.Readers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.BlockValidation.policy.type = 3;

    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Readers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Writers.policy.type = 1;

    global.modifiedjson.channel_group.groups.Application.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.groups.Application.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Application.policies.Readers.policy.type = 3;

    global.modifiedjson.channel_group.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.policies.Readers.policy.type = 3;
    yaml.removeRuleType(global.modifiedjson);



  });



  ipcMain.on('computedelta', (event) => {
    let updated = global.orginfo.name + '_update.pb';
    yaml.computeUpdateDeltaPb(global.config.channelid, userpath + '/config.pb', userpath + '/modified_config.pb', userpath + '/' + updated);
    event.returnValue = 'Updated ' + updated + ' generated';
    filesToDelete.push(userpath + '/' + updated);
    //filesToDelete.push(userpath+'/modified_config.pb');

  });


  ipcMain.on('createenvelope', (event) => {

    event.returnValue = yaml.createEnvelope(global.orginfo.name);

  });


  ipcMain.on('convertenvelope', (event) => {

    event.returnValue = yaml.convertEnvelope(global.orginfo.name);
    envelopeFileName = userpath + '/' + global.orginfo.name + '_update_in_envelope.json';
    filesToDelete.push(envelopeFileName);

    // delete temp files 
    filesToDelete.forEach((f) => fs.unlinkSync(f));
    filesToDelete = [];

  });


  ipcMain.on('paths', (event) => {

    let paths = null;
    // let userdata = electron.app.getPath('userData');
    if (fs.existsSync(userpath + '/managerpaths.json')) {
      paths = fs.readFileSync(userpath + '/managerpaths.json', 'utf8');
    }
    event.returnValue = paths;

  });




  ipcMain.on('connect', (event, jsonstring) => {

    let json = JSON.parse(jsonstring);
    let credspath = json.creds;
    if (json.creds.indexOf('..') >= 0) {
      credspath = path.join(__dirname, json.creds);
    }

    let cryptopath = json.crypto;
    if (json.creds.indexOf('..') >= 0) {
      cryptopath = path.join(__dirname, json.crypto);
    }

    let binpath = json.bin;
    if (json.bin.indexOf('..') >= 0) {
      cryptobin = path.join(__dirname, json.bin);
    }

    // calc working dir...

    let path = cryptopath.split("/");
    let working_dir = path.slice(0, path.length - 1).join("/");

    global.config = {
      network_url: json.peernode,
      channelid: json.channelid,
      user_id: json.userid,
      wallet_path: credspath,
      crypto_config: cryptopath,
      working_dir: working_dir,
      bin_path: binpath
    };

    // write selected paths
    let userdata = electron.app.getPath('userData');
    fs.writeFileSync(userdata + '/managerpaths.json', JSON.stringify({ crypto: cryptopath, creds: credspath, bin: binpath }));

    let blockinfo = require('./service/blockinfo.js');
    blockinfo.getBlockInfo(global.config.channelid).then((info) => {

      if (info.indexOf("ERROR:") >= 0) {
        return event.returnValue = "Error connecting and receiving block";
      }

      const json = JSON.parse(info);
      const blocks = json.height.low;
      global.blocks = blocks;

      //event.returnValue = JSON.stringify(global.config);

      //  Make sure fabric tool binaries are in the path

      let binpath = '"' + global.config.bin_path + '/cryptogen"';
      const { execSync } = require('child_process');

      try {
        const testexec = execSync(binpath + ' generate --help');
      } catch (err) {

        event.returnValue = "ERROR: cannot not find Fabric cryptogen and configtxgen binaries, make sure binary path is valid";

      };


      event.returnValue = JSON.stringify(global.config);



    }).catch((err) => {

      event.returnValue = "ERROR: Could not connect, make sure PEER Node URL and KEYSTORE Location are correct, and CHANNEL ID is valid...";

    });

  });

  ipcMain.on('mergeconfig', (event, jsonstring) => {

    let configupdate = JSON.parse(jsonstring);

    //config = global.configblock.data.data[0].payload.data.config;
    global.modifiedjson = global.configblock.data.data[0].payload.data.config;

    // Fix policy type
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Writers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Readers.policy.type = 1;

    let groups = global.modifiedjson.channel_group.groups.Application.groups;

    for (var name in groups) {

      if (groups.hasOwnProperty(name)) {

        global.modifiedjson.channel_group.groups.Application.groups[name].policies.Admins.policy.type = 1;
        global.modifiedjson.channel_group.groups.Application.groups[name].policies.Writers.policy.type = 1;
        global.modifiedjson.channel_group.groups.Application.groups[name].policies.Readers.policy.type = 1;

      }
    }

    global.modifiedjson.channel_group.groups.Orderer.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.Readers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.BlockValidation.policy.type = 3;

    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Readers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Writers.policy.type = 1;

    global.modifiedjson.channel_group.groups.Application.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.groups.Application.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Application.policies.Readers.policy.type = 3;

    global.modifiedjson.channel_group.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.policies.Readers.policy.type = 3;

    global.modifiedjson = yaml.removeRuleType(global.modifiedjson);

    global.originaljson = JSON.parse(JSON.stringify(global.modifiedjson));

    if (configupdate.batchsize) {
      global.modifiedjson.channel_group.groups.Orderer.values.BatchSize.value.max_message_count = parseInt(configupdate.batchsize);
    }

    if (configupdate.consensustype) {
      global.modifiedjson.channel_group.groups.Orderer.values.ConsensusType.value.type = configupdate.consensustype;
    }

    if (configupdate.batchtimeout) {
      global.modifiedjson.channel_group.groups.Orderer.values.BatchTimeout.value.timeout = configupdate.batchtimeout;
    }

    if (configupdate.orderers) {
      global.modifiedjson.channel_group.values.OrdererAddresses.value.addresses = configupdate.orderer;
    }

    if (configupdate.hashingalgo) {
      global.modifiedjson.channel_group.values.HashingAlgorithm.value.name = configupdate.hashingalgo;
    }


    if (configupdate.consortium) {
      global.modifiedjson.channel_group.values.Consortium.value.name = configupdate.consortium;
    }


    event.returnValue = "JSON Merged";


  });

  ipcMain.on('mergecrypto', (event, jsonstring) => {

    let json = JSON.parse(jsonstring);
    var filepath = userpath + "/channel-artifacts/" + global.orginfo.name + ".json";

    let orgjson = fs.readFileSync(filepath, 'utf8');

    // convert string to JSON Object
    var o = JSON.parse(orgjson);
    
    global.modifiedjson = json;
   // global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"] = o;

    // Fix policy type
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Writers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups.Org1MSP.policies.Readers.policy.type = 1;

   // global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"].policies.Admins.policy.type = 1;
   // global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"].policies.Writers.policy.type = 1;
   // global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"].policies.Readers.policy.type = 1;

    global.modifiedjson.channel_group.groups.Orderer.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.Readers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Orderer.policies.BlockValidation.policy.type = 3;

    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Readers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Orderer.groups.OrdererOrg.policies.Writers.policy.type = 1;

    global.modifiedjson.channel_group.groups.Application.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.groups.Application.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.groups.Application.policies.Readers.policy.type = 3;

    global.modifiedjson.channel_group.policies.Admins.policy.type = 3;
    global.modifiedjson.channel_group.policies.Writers.policy.type = 3;
    global.modifiedjson.channel_group.policies.Readers.policy.type = 3;

    global.modifiedjson = yaml.removeRuleType(global.modifiedjson);

    global.originaljson = JSON.parse(JSON.stringify(global.modifiedjson));
    
    global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"] = o;
    global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"].policies.Admins.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"].policies.Writers.policy.type = 1;
    global.modifiedjson.channel_group.groups.Application.groups[global.orginfo.name + "MSP"].policies.Readers.policy.type = 1;

    global.modifiedjson = yaml.removeRuleType(global.modifiedjson);
     

    event.returnValue = "JSON Merged";


  });

  //  END  });

}


app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {

  if (mainWindow === null) {
    createWindow();
  }
});
