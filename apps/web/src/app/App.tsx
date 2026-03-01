import { ToastNotifications } from "@/components/common/ToastNotifications";

import { resolveRoute } from "./routes";

export default function App() {
  const route = resolveRoute(window.location.pathname);
  return (
    <>
      {route.element}
      <ToastNotifications />
    </>
  );
}
