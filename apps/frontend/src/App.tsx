import { RouterProvider } from "react-router-dom";
import { Background } from "@/components/common/Background";
import { router } from "@/routes/AppRouter";

function App() {
  return (
    <>
      <Background />
      <RouterProvider router={router} />
    </>
  );
}

export default App;