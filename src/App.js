import React, { Component } from 'react';
// import './App.css';
import Configuration from './view/Configuration.js';
import AddOrganization from './view/AddOrganization.js';
import GenerateArtifacts from './view/GenerateArtifacts.js';
import PeerConnection from './view/PeerConnection.js';
import ConfigUpdate from './view/ConfigUpdate.js';

import { BrowserRouter, Switch, Route, Link, Redirect } from 'react-router-dom';

import { Navbar, Nav, NavItem } from 'react-bootstrap';
import EnrollUser from './view/EnrollUser.js';

// const electron = window.require('electron');
// const fs = electron.remote.require('fs');

class App extends Component {
  // TODO - is this necessary?  Or, can it be deleted?  Seems like it's not doing anything.
  // read() {
  //   fs.readFile('./src/App.css', (err, data) => {
  //     if (err) throw err;
  //        console.log(data);
  //        this.state = {file: "file has been read "+data};
  //   });

  //     this.state = {file: "Reading"};
  // }

  render() {
    // this.read();
    const Main = ({ numberofblocks }) => (
      <main>
        <Switch>
          <Route exact path="/" component={PeerConnection} />
          <Route exact path="/config" component={Configuration} />
          <Route exact path="/addorg" component={AddOrganization} />
          <Route exact path="/genartifacts" component={GenerateArtifacts} />
          <Route exact path="/enrolluser" component={EnrollUser} />
          <Route exact path="/connection" component={PeerConnection} />
          <Route exact path="/configupdate" component={ConfigUpdate} />
          <Route path="/">
            <Redirect to="/connection" />
          </Route>
        </Switch>
      </main>
    );

    return (
      <div>
        <BrowserRouter>
          <div>
            <div>
              <Navbar inverse>
                <Navbar.Header>
                  <Navbar.Brand>
                    <a href="/">HLF Org Manager</a>
                  </Navbar.Brand>
                </Navbar.Header>
                <Navbar.Collapse>
                  <Nav pullRight>
                    <NavItem eventKey={3} href="/" to="/" componentClass={Link}>
                      Connect
                    </NavItem>
                  </Nav>
                </Navbar.Collapse>
              </Navbar>
            </div>
            <div className="container">
              <div className="row">
                <div>
                  <Main />
                </div>
              </div>
            </div>
          </div>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;
