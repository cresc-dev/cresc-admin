import * as React from "react";
import { render } from "react-dom";
import { HashRouter as Router } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./index.css";
import Main from "./main";

window.React = React;

render(
  <DndProvider backend={HTML5Backend}>
    <Router>
      <Main />
    </Router>
  </DndProvider>,
  document.getElementById("main")
);
