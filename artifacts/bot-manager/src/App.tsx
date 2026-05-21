import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Manager from "@/pages/Manager";

const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <WouterRouter base="">
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
