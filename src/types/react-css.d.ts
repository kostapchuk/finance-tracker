import 'react'

declare module 'react' {
  // CSS custom properties that components set through `style` so dynamic
  // values can feed Tailwind classes such as `bg-(--item-color)`.
  interface CSSProperties {
    /** User-picked color of an account, category or income source */
    '--item-color'?: string
    /** Filled share of a progress bar, e.g. `42%` */
    '--progress'?: string
    /** Height of a chart bar, e.g. `42%` */
    '--bar-height'?: string
    /** `conic-gradient()` drawn by the report donut chart */
    '--donut-gradient'?: string
    /** Distance of the floating submit button from the bottom, above the keyboard */
    '--keyboard-offset'?: string
    /** dnd-kit transform of an item being dragged */
    '--drag-transform'?: string
    /** dnd-kit transition of a sortable row */
    '--drag-transition'?: string
  }
}
