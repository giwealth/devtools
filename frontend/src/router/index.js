import { createRouter, createWebHistory } from "vue-router";
import ShellLayout from "../shell/ShellLayout.vue";
import JsonTool from "../tools/JsonTool.vue";
import Base64Tool from "../tools/Base64Tool.vue";
import TimestampTool from "../tools/TimestampTool.vue";
import JwtTool from "../tools/JwtTool.vue";
import ImageTool from "../tools/ImageTool.vue";

const LAST_ROUTE_KEY = "devtools-last-route";

const routes = [
  {
    path: "/",
    component: ShellLayout,
    redirect: () => {
      try {
        const saved = localStorage.getItem(LAST_ROUTE_KEY);
        if (saved && saved !== "/") return saved;
      } catch {
        /* ignore */
      }
      return "/json";
    },
    children: [
      { path: "json", name: "json", component: JsonTool, meta: { titleKey: "tools.json.title" } },
      { path: "base64", name: "base64", component: Base64Tool, meta: { titleKey: "tools.base64.title" } },
      { path: "timestamp", name: "timestamp", component: TimestampTool, meta: { titleKey: "tools.timestamp.title" } },
      { path: "jwt", name: "jwt", component: JwtTool, meta: { titleKey: "tools.jwt.title" } },
      { path: "image", name: "image", component: ImageTool, meta: { titleKey: "tools.image.title" } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  if (to.path && to.path !== "/") {
    try {
      localStorage.setItem(LAST_ROUTE_KEY, to.path);
    } catch {
      /* ignore */
    }
  }
});

export default router;
