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
const { ipcRenderer } = window.require('electron');

class AddOrganization extends Component {
  constructor(props) {
    super(props);
    this.state = { name: '', domain: '', peers: 2, users: 1 };
  }

  cancelClick = event => {
    event.preventDefault();
    this.props.history.push('/config');
  };

  handleChange = event => {
    this.setState({ [event.target.id]: event.target.value });
  };

  generateClick = e => {
    e.preventDefault();

    // validate
    let status = null;

    if (this.state.name === undefined || this.state.name === '') {
      status = 'Organization name required ';
    } else if (this.state.domain === undefined || this.state.domain === '') {
      status = 'Domain name required ';
    } else {
      global.orgyaml = {
        name: this.state.name,
        domain: this.state.domain,
        peers: this.state.peers,
        users: this.state.users
      };
      status = ipcRenderer.sendSync('orggen', JSON.stringify(this.state));
      this.props.history.push('/genartifacts');
    }

    this.setState({ status: status });
  };

  render() {
    let Status = <div />;

    if (this.state.status) {
      Status = (
        <div className="alert alert-danger" role="alert">
          {this.state.status}
        </div>
      );
    }

    return (
      <form className="form-horizontal">
        <fieldset>
          <legend>
            Add Org, Generate Crypto Material for Channel <b>{global.config.channelid}</b>{' '}
            <button className="btn btn-link" onClick={this.cancelClick}>
              Cancel
            </button>{' '}
          </legend>
          <div className="control-group">
            <label className="control-label" htmlFor="name">
              Name:
            </label>
            <div className="controls">
              <input
                id="name"
                name="textinput-0"
                type="text"
                onChange={this.handleChange}
                value={this.state.name}
                placeholder="Org Name"
                className="input-xlarge"
              />
              <p className="help-block">Orgnization name</p>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="domain">
              Domain:
            </label>
            <div className="controls">
              <input
                id="domain"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.state.domain}
                placeholder="Org Domain"
                className="input-xlarge"
              />
              <p className="help-block">Domain</p>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="peers">
              Peers:
            </label>
            <div className="controls">
              <input
                id="peers"
                size="4"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.peers}
                placeholder="2"
                className="input-xlarge"
              />
              <p className="help-block">Also referred to as templates</p>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="users">
              Users:
            </label>
            <div className="controls">
              <input
                id="users"
                size="4"
                name="textinput-1"
                type="text"
                onChange={this.handleChange}
                value={this.users}
                placeholder="1"
                className="input-xlarge"
              />
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="doublebutton-0" />
            <div className="controls">
              <button
                id="generate"
                onClick={this.generateClick}
                name="doublebutton-0"
                className="btn btn-success">
                Generate Org Artifacts
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="doublebutton-0" />
            <div className="controls">{Status}</div>
          </div>
        </fieldset>
      </form>
    );
  }
}

export default AddOrganization;
