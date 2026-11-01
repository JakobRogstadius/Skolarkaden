# Ficklampan artwork redraws

Both illustrations were generated from scratch using the built-in image-generation
tool. They retain their original 1536 × 1024 pixels and are encoded as WebP at
quality 90. The answer text is rendered separately by the browser. All 32 answer
surfaces per image were remapped to the new artwork in `resources/ficklampan/scenes.js`.

## Space hangar

Asset: `resources/ficklampan/images/space-hangar.webp`

Final prompt:

> Use case: stylized-concept.
> Asset type: detailed background illustration for a flashlight exploration game, landscape 1536x1024.
> Primary request: a completely NEW space scene, an engaging orbital-station maintenance hangar viewed from an elevated corner inside the room. One large coherent rectangular room, one continuous level floor and one consistent perspective. Not a moonbase, not a dollhouse, not a building divided into little rooms.
> Composition: the complete interior fills the frame, with foreground equipment visible along the lower edge and rear walls across the top. A small, well-engineered spacecraft occupies the central maintenance bay, angled slightly toward us. It has one clear cockpit, one fuselage, two symmetrical short wings with engine pods, and three visible sensible landing supports touching the floor. A generous continuous walking route goes around it. One pressure door in the rear wall is reached by a clear aisle. A large sealed observation window in the upper rear wall shows the blue limb of a planet and stars, unmistakably outer space. Everything is inside a pressurized station.
> Purposeful details: an avionics workbench with organized instruments at the left; tidy tool boards and repair cabinets on the right; flight-control consoles beneath the observation window; racks of sealed spare parts and equipment against both side walls; a few substantial cargo containers in the foreground placed so they do not block the walking route. One astronaut engineer in a practical flight suit inspecting the ship, and one small wheeled maintenance robot. No animals, fantasy, magic, floating objects, random pipes, extra rooms, staircases or balconies.
> Answer surfaces: the game needs many separate readable rectangular surfaces distributed across this image. Make the equipment with LARGE clear faces: inset console screens, broad cabinet doors, instrument-panel fronts, clipped technical drawings on tool boards, and flat rectangular label panels on cargo containers. Aim for about 32 distinct usable surfaces, varying naturally by their purpose; keep these fairly front-facing or only mildly angled, with enough height for two lines of text later. Surfaces should already contain meaningful simple graphics such as ship diagrams, circuit schematics, instrument traces, inventory symbols or a material texture. Never empty floating cards. These are real parts of real equipment, not artificial plaques scattered through the room. Do not render legible text, letters or numbers. Avoid tiny illegible micro-details and clutter.
> Style: polished, crisp science-fiction adventure concept illustration, rich navy and teal with warm orange accents, brushed metal and cream panels, beautiful reflected light. More atmosphere and color than an architectural model, but physically believable and readable. Carefully designed objects with clear silhouettes, not repeated nonsensical gadgets. Even usable illumination across the scene; darkness is added by the game. Only small practical light fixtures and status lamps. Prioritize coherent room geometry, convincing spacecraft anatomy and the large logical answer surfaces. No UI, no watermarks.

## Dinosaur field station

Asset: `resources/ficklampan/images/prehistoric-field-station.webp`

The field station replaces the textured rock surfaces with illustrated paper
and equipment labels. Answer quadrilaterals follow their paper interiors,
preserving frames, pins, page edges and surrounding shadows. The occupied
panels use the existing renderer's sampled paper colour and native text; unused
and collected panels retain the original drawings. No answer covers a dinosaur,
person, tool or lantern. Eight practical lanterns provide small ambient glows.

The built-in image-generation tool was used for the initial image and two
localized refinement passes.

### Initial generation prompt

> Use case: illustration-story.
> Asset type: richly detailed explorable background for a flashlight matching game, landscape 1536x1024.
>
> Create a NEW dinosaur-themed illustration: a time-travelling naturalists' field station in a lush prehistoric valley. An imaginative place with clear internal logic, full of purposeful discoveries. Use a confident hand-painted adventure-book style, crisp clean shapes and carefully designed objects, rich greens, ochres, terracotta and teal. NOT photorealistic, NOT noisy grunge textures, NOT babyish.
>
> Composition: elevated three-quarter view of a coherent small research camp, filling the whole image with very little sky. A walking path links a timber observation hut on the left, a canvas field laboratory in the middle, and a low animal-care/workshop shelter on the right. All structures are on solid ground, with proper entrances, supported roofs, usable steps and clear walking routes. A shallow stream at the rear has one small sensible bridge. Ferns, conifers, large leaves and flowering-free prehistoric vegetation surround the camp. No disconnected platforms or impossible architecture.
>
> Dinosaur life: four separate well-formed animals with clear anatomy and feet on the ground: one long-necked sauropod reaching toward a leafy branch at the rear; a Stegosaurus beside the rear stream; one small feathered bipedal dinosaur inspecting a dropped glove near the path; a young Triceratops near a low trough of freshly cut ferns. A neat nest with three eggs is visible in vegetation. One naturalist examines a leaf at a workbench; another sketches the sauropod from the observation hut. No fused animals, extra legs, disconnected tails or floating objects. The living dinosaurs and the research activities explain one another.
>
> Exploration details: binoculars, a hanging hat, a neatly coiled rope, muddy dinosaur footprints, seed jars, labeled specimen drawers, a leaf press, a magnifying glass, a compass, rolled maps, folded field blankets, baskets of fern cuttings, a weather instrument, an orderly repair bench, a rack of boots, a steaming enamel mug and a few small warm lanterns. Group things by their purpose. Every object must be recognizable, not meaningless visual filler. Enough detail rewards searching all parts of the image.
>
> CRITICAL GAMEPLAY REQUIREMENT: provide at least 32 substantial, genuinely flat RECTANGULAR ANSWER SURFACES distributed throughout the camp, near the top, middle and foreground and on both sides. They must be logical parts of the objects: cream paper sheets pinned to observation boards, inset cream labels on specimen drawers and supply crates, broad pages in field sketchbooks, flat chart panels attached to the laboratory, smooth framed instruction cards at the care station, illustrated inventory panels on equipment cabinets. Each usable inner rectangle should be roughly 70–100 pixels wide and 40–65 pixels high at this resolution, with only mild perspective. Do not make lots of tiny sliver-shaped labels. Integrate them into several distinct useful stations, not one repetitive wall or scattered floating plaques.
>
> EVERY such rectangle has a SMOOTH, nearly UNIFORM light cream or pale muted background, a thin clearly defined frame or paper edge, and a small centered meaningful line illustration (leaf study, animal track, dinosaur profile, simple tool diagram or map). No text, numbers or unreadable pseudo-writing. The game will replace the illustrated INNER rectangle with a matching flat fill and high-resolution answer text; this must look like writing on the existing paper or panel. Keep shadows, seams, pins and decorative texture OUTSIDE the usable inner rectangle. No rough stone faces, bark, foliage, mottling, cracks, decorative borders or objects across these usable interiors. The panel illustrations keep unused locations interesting.
>
> Preserve an attractive, coherent DINOSAUR ADVENTURE scene, not a spreadsheet of signs. Draw sensible richly furnished spaces around the panels. Even, readable color illumination throughout; the game's darkness and flashlight will be applied later. Tiny practical lanterns, no huge bloom. No UI and no watermark.

### Panel refinement prompt

> Use case: precise-object-edit.
> Edit target: the attached dinosaur research camp illustration.
> Keep the overall composition, landscape, buildings, existing panels, people and all four dinosaurs exactly as they are. Preserve their anatomy and positions. This is a targeted addition of usable paper/label surfaces, not a redesign.
>
> Add EIGHT clearly defined smooth cream rectangular surfaces, each containing only a small centered simple line illustration and no text. The paper interiors must have uniform light color, without speckled texture or marks reaching the margins. They should be large enough to read, roughly 70-100 px wide and 45-65 px tall, and physically attached to appropriate objects:
>
> 1. A cream inventory label with a simple tent sketch on the FRONT of the large wooden supply crate at lower left, below its folded dark blanket. Keep straps, handles and edges outside the label.
> 2. A cream label with a simple boot sketch on the front of the green storage box beside it.
> 3. One sheet with a compass drawing clipped neatly to the FRONT apron of the central workbench, beside the existing green and wooden specimen cases. It must be mounted to the bench, not floating.
> 4. A larger square cream label on the green field-equipment case on the central tabletop, with a binocular sketch. Keep the handle and case outline.
> 5. A cream feeding-chart panel with a leaf drawing inset into the FRONT wooden face of the fern trough beside the Triceratops.
> 6. A cream equipment label with a coiled rope drawing on the front face of the large foreground wooden crate at the lower right.
> 7 and 8. Add ONE open field notebook resting on a broad flat foreground rock, just left of the egg nest and out of the walking path. Its two separate cream pages are nearly front-facing and broad enough to hold answers. Put a tiny dinosaur track drawing on one page and a tiny fern drawing on the other. Keep paper flat, corners clear, and all visible marks away from its margins. Do not cover the nest or animals.
>
> Do not add more characters, dinosaurs, buildings or floating signs. Do not turn the labels into rough painted patches. Preserve the rich discoveries and coherent camp layout; make all the added rectangles read as actual stationery or equipment labels. No rendered words, letters, numerals or watermark.

### Final storage-label prompt

> Use case: precise-object-edit.
> Edit target: the supplied dinosaur field-station illustration.
> Make ONE tiny localized addition and preserve absolutely everything else, including all existing paper panels, their drawings, the dinosaurs, people, scenery and composition.
>
> Near the LOWER LEFT, there are three storage containers side by side. The left wooden crate has a cream TENT-drawing label. The tall right wooden crate has a cream BOOT-drawing label. BETWEEN THEM is a low dark GREEN METAL STORAGE BOX with a folded pinkish cloth on its lid. This middle GREEN box currently has NO large paper label.
>
> Add one smooth rectangular cream inventory label to the FRONT FACE of this middle green box, below its lid and latches. Match its mild perspective. Make the label as large as the exposed front face permits, about 65 pixels wide and 45 pixels high. It must have a clean thin paper edge, near-uniform cream interior and a single small centered outline drawing of a water bottle, with wide clear margins. Keep the green box's hinges, lid, cloth, edges and surrounding leaves visible. Do NOT replace the tent label or the boot label. Do NOT add the new label anywhere else. No text, letters or numbers. Change nothing outside this one green-box face.
