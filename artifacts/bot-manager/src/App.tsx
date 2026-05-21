import { Switch, Route, Router as WouterRouter } from "wouter";
import Manager from "@/pages/Manager";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Manager} />
      <Route>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#030712", color: "#334155", fontFamily: "sans-serif" }}>
          404 — Not Found
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
