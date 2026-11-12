import { RouterProvider, createBrowserRouter } from "react-router-dom";
import RouteError from "./components/RouteError";
import Layout from "./components/Layout";
import Home, { HomeFallback, homeLoader, homeShouldRevalidate } from "./pages/Home";

function PageFallback() {
  return (
    <p className="wrap page-waiting" role="status">
      불러오는 중입니다.
    </p>
  );
}

// 첫 화면(홈)만 처음 묶음에 넣는다. 글 화면은 본문 렌더러를 품고 있어 들어갈 때 받고,
// 관리·로그인 화면도 필요할 때만 받는다.
//
// 화면을 그리다 난 오류는 오류 화면(RouteError)이 받는다. 안쪽 라우트는 머리 막대·바닥글을 남긴 채
// 본문 자리에, 맨 바깥 라우트는 레이아웃 자체의 오류까지 받아 빈 화면이 남지 않는다.
const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      errorElement: <RouteError />,
      children: [
        {
          errorElement: <RouteError />,
          HydrateFallback: PageFallback,
          children: [
            {
              index: true,
              element: <Home />,
              loader: homeLoader,
              shouldRevalidate: homeShouldRevalidate,
              HydrateFallback: HomeFallback,
            },
            { path: "posts/:postId", lazy: () => import("./pages/Post") },
            { path: "login", lazy: () => import("./pages/Login") },
            { path: "github/callback", lazy: () => import("./pages/Callback") },
            {
              path: "admin",
              lazy: () => import("./pages/admin/AdminRoot"),
              children: [
                { index: true, lazy: () => import("./pages/admin/AdminList") },
                { path: "write", lazy: () => import("./pages/admin/Editor") },
                { path: "posts/:postId", lazy: () => import("./pages/admin/Editor") },
              ],
            },
            { path: "*", lazy: () => import("./components/ErrorView").then((m) => ({ Component: m.NotFound })) },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
