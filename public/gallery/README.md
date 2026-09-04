# Cut photographs

Drop image files in here and they appear on `/gallery`.

## Attributing a cut to a barber

Put the photograph in a folder named after the barber's slug:

    public/gallery/eduardo/01-skin-fade.jpg   ->  Eduardo, "Skin fade"
    public/gallery/chair-2/01-taper.jpg       ->  Second Chair, "Taper"
    public/gallery/02-loose-shot.jpg          ->  no barber named

A folder rather than a naming convention inside the filename, because a
barber slug and a caption run together are ambiguous the moment a caption
starts with a word that looks like a name. Moving a photograph between
barbers is also a drag rather than a rename.

The number sets the order and the rest becomes the caption. `.jpg`, `.png`,
`.webp` and `.avif` are picked up.

Barbers with photographs get a "See their work" link on `/barbers`, and the
gallery gains a filter once more than one of them has any.

## Only use photographs the shop owns

Images on a Google Maps listing belong to whoever uploaded them — often
customers, not the business — and reusing them on the shop's own commercial
site is the shop's legal problem. Eduardo can export the ones he uploaded
himself from his Google Business Profile, and anything shot in the shop is
his to use.

Square-ish crops work best; the grid renders them 1:1 and the full-screen
view shows the whole frame. Send full-size originals rather than
pre-shrinking them — detail thrown away cannot be recovered.
