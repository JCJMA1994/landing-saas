# Campaign Rules
- Una campaña modifica solo slots allowlisted.
- Resolver por tiempo + status + priority.
- Guardar timestamps UTC; interpretar según timezone del site.
- `subtle|balanced|festive` son presets de intensidad, no permisos.
- Animaciones respetan `prefers-reduced-motion`.
- Si falta asset/config, degradar al theme base.
- No mezclar campañas arbitrariamente en MVP.
- Preview temporal nunca altera la campaña pública.
