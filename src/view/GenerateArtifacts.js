/*
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

import React, { Component } from 'react';
const electron = window.require('electron');
const remote = electron.remote;
const { dialog } = remote;

var userpath = remote.app.getPath('userData');

class AddConfigTx extends Component {
  constructor(props) {
    super(props);
    this.state = global.orgyaml;
    this.operations = [];
    this.setState({ current: '' });
    this.configblock = null;
    this.orgjson = null;
    this.modifiedjson = null;
    this.block = null;
    this.setState({ policies: null });
  }

  componentDidMount() {
    let current = '';
    var ipcRenderer = electron.ipcRenderer;

    // let response = ipcRenderer.sendSync('orggen', JSON.stringify(this.state));
    let response = ipcRenderer.sendSync('addtx', JSON.stringify(this.state));

    if (response.indexOf('ERROR') >= 0) {
      current = 'ERROR generating Organization JSON Update...';
    } else {
      global.orgjson = response;
      current = 'Organization JSON Update Created...';
    }

    this.operations.push(current);
    this.setState({ current: current });

    this.getConfigBlock();
    this.convertAndTrim();
    this.mergeCrypto();
    this.convertOriginal();
    this.convertModified();
    this.computeDelta();
    this.decodeToJson();
    this.createEnvelope();
    this.convertEnvelopeToPb();
  }

  cryptodirClick = e => {
    e.preventDefault();
    dialog.showOpenDialog({
      title: 'Crypto Files',
      defaultPath: userpath + '/crypto-config/peerOrganizations/' + global.orgyaml.domain,
      properties: ['openFile', 'openDirectory']
    });
  };

  pbdirClick = e => {
    e.preventDefault();
    dialog.showOpenDialog({
      filters: [{ name: 'All Files', extensions: ['pb'] }],
      title: 'PR Config File ',
      defaultPath: userpath + '/' + this.state.name + '_update_in_envelope.pb',
      properties: ['openFile']
    });
  };

  getConfigBlock() {
    let current = '';
    var ipcRenderer = electron.ipcRenderer;

    var response = ipcRenderer.sendSync('block', JSON.stringify(this.state));

    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR Getting Config Block';
    } else {
      let block = JSON.parse(response);

      let pol = block.data.data[0].payload.data.config.channel_group.policies;

      let policies = [];
      for (var poly in pol) {
        pol[poly].name = poly;
        policies.push(pol[poly]);
      }

      this.setState({ policies: policies });
      // this.state.policies = policies;

      this.configblock = JSON.parse(response);
      current = 'Configuration Block retrrieved...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  convertAndTrim() {
    var ipcRenderer = electron.ipcRenderer;
    this.configblock = this.configblock.data.data[0].payload.data.config;

    ipcRenderer.sendSync('block', JSON.stringify(this.configblock));

    let current = 'Trimmed Configuration Block...';
    this.operations.push(current);
    this.setState({ current: current });
  }

  mergeCrypto() {
    this.modifiedjson = JSON.parse(JSON.stringify(this.configblock));

    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('mergecrypto', JSON.stringify(this.modifiedjson));

    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR merging Crypto JSON';
    } else {
      current = 'Org Crypto Merged...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  convertModified() {
    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('convertmodified', JSON.stringify(this.modifiedjson));
    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR Converting modified JSON';
    } else {
      current = 'Converted Modified Block to Protocol Buffer...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  convertOriginal() {
    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('convertoriginalnew', JSON.stringify(this.modifiedjson));
    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR Converting original JSON';
    } else {
      current = 'Converted Config Block to Protocol Buffer...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  computeDelta() {
    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('computedelta');
    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR computing delta';
    } else {
      current = 'Computed Delta Configuration Block...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  decodeToJson() {
    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('decodetojson');
    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR computing delta';
    } else {
      current = 'Decoded Configuration Block to JSON...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  createEnvelope() {
    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('createenvelope');
    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR creating envelope';
    } else {
      current = 'Config envelope created...';
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  convertEnvelopeToPb() {
    var ipcRenderer = electron.ipcRenderer;
    let current = null;
    var response = ipcRenderer.sendSync('convertenvelope');
    if (response.indexOf('ERROR:') >= 0) {
      current = 'ERROR converting envelope';
    } else {
      current = response;
    }

    this.operations.push(current);
    this.setState({ current: current });
  }

  render() {
    let opslist = [];

    if (this.operations) {
      this.operations.forEach(s => {
        opslist.push(<li>{s}</li>);
      });
    }

    let policyhtml = [];
    if (this.state.policies) {
      this.state.policies.forEach(p => {
        policyhtml.push(
          <div>
            <b> {p.name} Policy</b>: {p.policy.type}, {p.policy.value.rule}{' '}
          </div>
        );
      });
    }

    return (
      <div>
        <legend>
          Generating Artifacts for new Organization : <b> {this.state.name} </b> in Channel:{' '}
          <b>{global.config.channelid}</b>{' '}
        </legend>
        <div>
          {' '}
          <ul> {opslist} </ul>{' '}
        </div>

        <legend>
          Crypto Elements generated for : <b> {this.state.name} </b>{' '}
        </legend>

        <blockquote>
          Cryptographic Keys and Certs for org have been generated and can be found here{' '}
          <button
            id="pickdir"
            onClick={this.cryptodirClick}
            name="doublebutton-0"
            className="btn btn-success">
            channel-artifacts
          </button>
        </blockquote>

        <legend>
          Updated Configuration PB Envelope created:{' '}
          <b> {this.state.name}_update_in_envelope.pb </b>{' '}
        </legend>

        <blockquote>
          The new org <b>{this.state.name}</b> Configuration Update Transaction can found here{' '}
          <button
            id="pickdir"
            onClick={this.pbdirClick}
            name="doublebutton-0"
            className="btn btn-success">
            Config Block Envelope
          </button>
          <br />
          Based upon the channels policy, the following Organizations admins will need to sign
          before invoked against channel.
          <br /> Channel policies are: {policyhtml}
        </blockquote>
      </div>
    );
  }
}

export default AddConfigTx;
