import { SessionProvider } from "@home/auth";
import { BrowserRouter } from "react-router-dom";
import UsersRoutes from "./remote/UsersRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <UsersRoutes />
      </SessionProvider>
    </BrowserRouter>
  );
}
