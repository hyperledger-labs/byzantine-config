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

import React, { Component } from "react";
const electron = window.require('electron');
const remote = electron.remote;
const { dialog } = remote;

var userpath = remote.app.getPath('userData');

class EnrollUser extends Component {

    constructor(props) {
        super(props);
        this.state = { userid: "" };

    }


    componentDidMount() {
        let ipcRenderer = electron.ipcRenderer;
        let contents = ipcRenderer.sendSync('paths', JSON.stringify(this.state));
        let paths = JSON.parse(contents);

        if (paths && paths != null) {
            this.setState({ creds: paths.creds, crypto: paths.crypto, bin: paths.bin });
        }

    }


    cancelClick = event => {
        event.preventDefault();
        this.props.history.push("/config");
    }

    handleChange = event => {
        this.setState({ [event.target.id]: event.target.value });

    }


    generateClick = e => {
        e.preventDefault();

        // validate
        let status = null;


        if (this.state.userid === undefined || this.state.userid === "") {
            status = "Userid  required ";
    
        } else {

            global.orgyaml = { "userid": this.state.userid};
            var ipcRenderer = electron.ipcRenderer;
            status = ipcRenderer.sendSync('enrolluser', JSON.stringify(this.state));
           // this.props.history.push("/genartifacts");
        }

        this.setState({ status: status });
    }

    cryptodirClick = e => {
        e.preventDefault();
        dialog.showOpenDialog({ title: "Crypto Files", defaultPath: this.state.creds , properties: ['openFile', 'openDirectory'] }); 
    }


    render() {

        let Status = <div></div>;

        if (this.state.status) {


            if (this.state.status.indexOf('SUCCESS:') >= 0) {

                Status = <div class="alert alert-success" role="alert">
                    {this.state.status}...  <button id="genconfigtx" onClick={this.cryptodirClick} name="genconfig" className="btn btn-primary">User Credentials Directory</button>
                </div>

            } else {

                Status = <div class="alert alert-danger" role="alert">
                    {this.state.status}
                </div>

            }

        }


        return (


            <form className="form-horizontal">
                <fieldset>
                    <legend>Enroll User <b>{global.config.channelid}</b> <button class="btn btn-link" onClick={this.cancelClick}>Cancel</button> </legend>
                    <div className="control-group">
                        <label className="control-label" for="name">User ID:</label>
                        <div className="controls">
                            <input id="userid" name="textinput-0" type="text" onChange={this.handleChange} value={this.state.userid} placeholder="enter userid" className="input-xlarge" />
                            <p className="help-block">New User ID</p>
                        </div>
                    </div>


                    <div className="control-group">
                        <label className="control-label" for="doublebutton-0"></label>
                        <div className="controls">
                            <button id="generate" onClick={this.generateClick} name="doublebutton-0" className="btn btn-success">Create </button>
                        </div>
                    </div>

                    <div className="control-group">
                        <label className="control-label" for="doublebutton-0"></label>
                        <div className="controls">
                            {Status}
                        </div>
                    </div>


                </fieldset>
            </form>


        );
    }
}

export default EnrollUser;
