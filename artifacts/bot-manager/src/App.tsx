import { Switch, Route, Router as WouterRouter } from "wouter";
import Manager from "./pages/Manager";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Manager} />
      <Route path="/manager" component={Manager} />
      <Route path="/manager/" component={Manager} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base="/manager">
      <Router />
    </WouterRouter>
  );
}
