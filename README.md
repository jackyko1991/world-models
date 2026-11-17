# World Models / 世界模型

An interactive, bilingual (English, 繁體中文) book on machine-learning world models: predict, imagine and plan with
a model of the world, then render one — from Craik, Kalman and Dyna through Dreamer, MuZero and JEPA to Google
DeepMind's Genie, World Labs' Marble, NeRF and 3D Gaussian splatting. Everything runs in the browser; the demos are
small fixed models in TypeScript, with weights precomputed offline.

**Live:** https://jackyko1991.github.io/world-models/ · part of the learnkit series (Further reading ▸ Explorables).

## Develop
With [pixi](https://pixi.sh) (Node 24 as CI uses, Python for the offline scripts), from the repo root:

```sh
git submodule update --init   # learnkit (private) at vendor/learnkit
pixi run dev                  # the site with hot reload
pixi run test                 # unit tests (node --test); pixi run test-links also fetches every source URL
pixi run build                # the static site in dist/
pixi run history-images       # redraw the History cards' diagrams
pixi run -e train tiny-nerf   # retrain an asset (also: latent-map, fourier-fit, splat2d, splat3d)
```

How pages, models, demos and tests fit together: [docs/writing-pages.md](docs/writing-pages.md).

## Deploying
Every push to `main` runs `.github/workflows/pages.yml`: tests, build, and deploy to GitHub Pages. learnkit is a
private submodule, fetched with a read-only deploy key on `jackyko1991/learnkit` whose private key is this
repository's secret `LEARNKIT_DEPLOY_KEY`.

## Licence
Code and original diagrams: Apache-2.0 (LICENSE). Photographs on the History page keep their own licences, listed in
[public/history/CREDITS.md](public/history/CREDITS.md).
