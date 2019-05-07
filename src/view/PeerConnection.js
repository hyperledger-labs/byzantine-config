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

class PeerConnection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userid: 'PeerAdmin',
      channelid: 'mychannel',
      peernode: 'grpc://localhost:7051',
      creds: '',
      crypto: '',
      bin: ''
    };
  }

  handleChange = event => {
    this.setState({ [event.target.id]: event.target.value });
  };

  componentDidMount() {
    let ipcRenderer = electron.ipcRenderer;
    let contents = ipcRenderer.sendSync('paths', JSON.stringify(this.state));
    let paths = JSON.parse(contents);

    if (paths && paths != null) {
      this.setState({ creds: paths.creds, crypto: paths.crypto, bin: paths.bin });
    }
  }

  connectClick = e => {
    e.preventDefault();

    // validate
    if (this.state.bin === '') {
      this.setState({
        status: 'Crpyto Directory Required, pleasee select above...'
      });
      // this.state.status = "Crpyto Directory Required, pleasee select above...";
    } else if (this.state.creds === '') {
      this.setState({
        status: 'Credentials keystore directory required, please select above...'
      });
      // this.state.status = "Credentials keystore directory required, please select above...";
    } else {
      var ipcRenderer = electron.ipcRenderer;
      var org = JSON.stringify(this.state);
      var response = ipcRenderer.sendSync('connect', org);

      if (response.indexOf('ERROR:') >= 0) {
        this.setState({ status: response });
      } else {
        global.config = JSON.parse(response);
        this.props.history.push('/config');
      }
    }
  };

  dirClick = e => {
    e.preventDefault();
    let dir = dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory']
    });
    if (dir) {
      this.setState({ creds: dir[0] });
    }
  };

  dirBinClick = e => {
    e.preventDefault();
    let dir = dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory']
    });
    if (dir) {
      this.setState({ bin: dir[0] });
    }
  };

  render() {
    let Status = <div />;

    if (this.state.status) {
      Status = (
        <div class="alert alert-danger" role="alert">
          {this.state.status}
        </div>
      );
    }

    return (
      <form className="form-horizontal">
        <fieldset>
          <legend>Connection to a HLF Peer Node</legend>
          <div className="control-group">
            <label className="control-label" for="userid">
              User Id:
            </label>
            <div className="controls">
              <input
                id="userid"
                name="textinput-0"
                type="text"
                onChange={this.handleChange}
                value={this.state.userid}
                placeholder="PeerAdmin"
                className="input-xlarge"
              />
              <p className="help-block">HLF User implied</p>
            </div>
          </div>

          <div className="control-group">
            <label class="control-label" for="peernode">
              Peer Node URL:
            </label>
            <div className="controls">
              <input
                id="peernode"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.state.peernode}
                placeholder="grpc://localhost:7051"
                className="input-xlarge"
              />
              <p className="help-block">Fabric Network Peer Node Address</p>
            </div>
          </div>

          <div className="control-group">
            <label class="control-label" for="channel">
              Channel Id:
            </label>
            <div className="controls">
              <input
                id="channelid"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.state.channelid}
                placeholder="mychannel"
                className="input-xlarge"
              />
              <p className="help-block">Channel id</p>
            </div>
          </div>

          <div className="control-group">
            <label class="control-label" for="creds">
              Credential Keystore Path:
            </label>
            <div className="controls">
              <button
                id="pickdir"
                onClick={this.dirClick}
                name="doublebutton-0"
                className="btn btn-info">
                Select Directory
              </button>{' '}
              <input
                id="creds"
                size="80"
                readonly="true"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.state.creds}
                className="input-xlarge"
              />
              <p className="help-block">
                Directory path where your Admin Public/Private Key and Userid Digital Cert is
                located
              </p>
            </div>
          </div>

          <div className="control-group">
            <label class="control-label" for="creds">
              Platform Binaries Path:
            </label>
            <div className="controls">
              <button
                id="pickdir"
                onClick={this.dirBinClick}
                name="doublebutton-0"
                className="btn btn-info">
                Select Directory
              </button>{' '}
              <input
                id="crypto"
                readonly="true"
                size="80"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.state.bin}
                className="input-xlarge"
              />
              <p className="help-block">
                Directory Path to Fabric platform specific Binaries (i.e. cryptogen, configtxgen)
              </p>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" for="doublebutton-0" />
            <div className="controls">
              <button
                id="generate"
                onClick={this.connectClick}
                name="doublebutton-0"
                className="btn btn-success">
                Connect
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" for="doublebutton-0" />
            <div className="controls">{Status}</div>
          </div>
        </fieldset>
      </form>
    );
  }
}

export default PeerConnection;
