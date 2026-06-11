import { SessionProvider } from "@home/auth";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme-provider";
import UsersRoutes from "./remote/UsersRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <UsersRoutes />
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
