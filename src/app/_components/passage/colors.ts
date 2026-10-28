/** Practice-text colour roles — kept as separate tokens from the
 *  global palette because the passage is the only place where
 *  typed/untyped/error letters need to follow their own scale (MT's
 *  main/sub/error split, for instance). The MonkeyType import maps
 *  `mainColor` / `subColor` / `errorColor` to these tokens directly so
 *  they never bleed into chrome body text. Defaults track the active
 *  theme: typed paints in `--primary` (the brand spark, also what MT
 *  renders correctly-typed letters in), untyped in `--muted-foreground`,
 *  and errors in `--destructive`. */
export const TYPED_TEXT = "text-[var(--ft-passage-typed,var(--primary))]";
export const UNTYPED_TEXT =
  "text-[var(--ft-passage-untyped,var(--muted-foreground))]";
export const ERROR_TEXT = "text-[var(--ft-passage-error,var(--destructive))]";
export const ERROR_DECORATION =
  "decoration-[var(--ft-passage-error,var(--destructive))]";
