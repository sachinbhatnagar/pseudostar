# Sentient

Publisher: Indian Type Foundry via [Fontshare](https://www.fontshare.com/fonts/sentient).

The official [Sentient archive](https://api.fontshare.com/v2/fonts/download/sentient), retrieved 2026-09-06, includes ITF Free Font License 2.0, dated 17 Aug 2026. The unchanged licence is in `FFL.txt`. Section 01 permits self-hosting for the licensee's own websites and apps through CSS @font-face. Section 02 restricts modification, redistribution and offering fonts for third-party content creation. This is not an OFL font.

Use Sentient for PseudoStar's interface. Do not offer it as a selectable font in learner-generated documents or distribute its binaries in a source repository. Each developer or build operator obtains a copy directly from Fontshare:

```sh
node scripts/setup-fonts.mjs
```

Run from `code/`. This installs the unmodified official variable WOFF2, which supports existing 500 and 600 weights. Font binaries are ignored by Git but included in built app assets for permitted self-hosting. The old medium file is unused. Do not subset or convert fonts.

Search results for the [online licence](https://www.fontshare.com/licenses/itf-ffl) can show an older version. This licence came from the official download. The setup script stops if the downloaded licence changes; review new terms before updating.
