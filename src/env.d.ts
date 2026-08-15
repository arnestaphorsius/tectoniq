declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // `object` rather than `{}`: the empty object literal type accepts any
  // non-nullish value, which the lint config bans for good reason.
  const component: DefineComponent<object, object, unknown>
  export default component
}
