

## Alineacion de Marca Hoppiness - Implementacion Completa

Ya tengo las 15 fotos y las instrucciones completas. Este es el plan de ejecucion:

---

### Paso 1: Copiar las 15 fotos a src/assets/

Copiar todas las fotos WebP subidas al directorio `src/assets/`:
- hero-wall.webp, hoppiness-43.webp, hoppiness-50.webp, hoppiness-62.webp, hoppiness-64.webp, hoppiness-68.webp, hoppiness-82.webp (de este mensaje)
- hoppiness-118.webp, hoppiness-125.webp, hoppiness-134.webp, hoppiness-138.webp, hoppiness-139.webp, hoppiness-142.webp, hoppiness-150.webp, hoppiness-152.webp (del mensaje anterior)

### Paso 2: Actualizar archivos (6 archivos)

| Archivo | Cambio |
|---|---|
| `src/pages/Index.tsx` | Reemplazo completo: Hero con hero-wall.webp, seccion "Culto al Sabor" con fotos reales, seccion Spotify "Modo Hoppi", reordenamiento de secciones (Locales y Reviews arriba, Franquicias agrupadas abajo) |
| `src/pages/Nosotros.tsx` | Reemplazo completo: valores actualizados (Culto al sabor, Adaptabilidad, Optimismo, Resolucion), copy con tono de marca, galeria mixta equipo+proceso |
| `src/components/layout/PublicHeader.tsx` | "Pedi Online" como CTA naranja dominante, "Nuestros Clubes" visible solo en Home, "Franquicias" baja a ghost |
| `src/components/layout/PublicFooter.tsx` | "Pedir" cambia a "Pedi Online", Spotify agregado en redes sociales |
| `src/components/landing/ReviewsSection.tsx` | Titulo cambia a "LO QUE DICE EL CLUB", subtitulo con rating Google Maps |
| `src/pages/Franquicias.tsx` | Cambio puntual: Hero usa hero-wall.webp en lugar de hero-burger.jpg |

### Paso 3: Agregar color info/celeste

| Archivo | Cambio |
|---|---|
| `src/index.css` | Agregar variables CSS `--info` (#1FB4FF) y `--info-foreground` |
| `tailwind.config.ts` | Agregar color `info` en la configuracion de colores |

---

### Detalle tecnico de cambios principales

**Index.tsx - Nuevo orden de secciones:**
1. Hero (hero-wall.webp de fondo, CTA "Pedi tu Hamburguesa")
2. Stats Banner (15+ "Creaciones de autor", "Ano del primer club")
3. Culto al Sabor (fotos hoppiness-64, hoppiness-125, hoppiness-43)
4. Premios (AwardsSection)
5. Medios (MediaSection)
6. Nuestros Clubes (LocationsSection)
7. Spotify "Modo Hoppi" (nueva seccion con link a playlist)
8. Reviews (ReviewsSection)
9. Separador B2C a B2B ("Crece con Hoppiness")
10. Sumate (SumateSection)
11. Franquicia Hero + WhyHoppiness + Timeline + Formulario
12. Footer

**Nosotros.tsx - Valores corregidos:**
- Culto al sabor (reemplaza "Calidad Premium")
- Adaptabilidad (reemplaza "Innovacion")
- Optimismo (reemplaza "Comunidad")
- Resolucion (reemplaza "Pasion")

**Header - Cambios de navegacion:**
- Desktop: "Pedi Online" con icono ShoppingBag como CTA naranja, "Nuestros Clubes" solo visible en Home (scroll a #clubes), "Franquicias" pasa a ghost
- Mobile: "Pedi Online" reemplaza "Pedir", "Nuestros Clubes" condicional a Home

