import { AuthProvider } from "@home/auth-ts";
import { BrowserRouter } from "react-router-dom";
import UsersRoutes from "./remote/UsersRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UsersRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
