import { onRequest as __diary__date__ts_onRequest } from "/home/jared/source/dbt-diary-cards/functions/diary/[date].ts"
import { onRequest as __index_ts_onRequest } from "/home/jared/source/dbt-diary-cards/functions/index.ts"

export const routes = [
    {
      routePath: "/diary/:date",
      mountPath: "/diary",
      method: "",
      middlewares: [],
      modules: [__diary__date__ts_onRequest],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__index_ts_onRequest],
    },
  ]