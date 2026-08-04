// Vérifications statiques : ce que les tests unitaires ne voient pas et qui
// casse une publication (fichier oublié dans le cache, module non importé,
// manifeste incohérent).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const racine = new URL('../', import.meta.url);
const lire = (chemin) => readFile(new URL(chemin, racine), 'utf8');

async function modulesJs(dossier = 'js', prefixe = './js') {
  const entrees = await readdir(new URL(dossier, racine), { withFileTypes: true });
  const trouves = [];
  for (const entree of entrees) {
    if (entree.isDirectory()) {
      trouves.push(...await modulesJs(`${dossier}/${entree.name}`, `${prefixe}/${entree.name}`));
    } else if (entree.name.endsWith('.js')) {
      trouves.push(`${prefixe}/${entree.name}`);
    }
  }
  return trouves;
}

test('le service worker liste tous les modules JavaScript', async () => {
  const sw = await lire('sw.js');
  for (const module of await modulesJs()) {
    assert.ok(sw.includes(`'${module}'`), `${module} manque dans le cache du service worker`);
  }
});

test('tous les fichiers listés par le service worker existent', async () => {
  const sw = await lire('sw.js');
  const listes = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
  for (const fichier of listes) {
    await assert.doesNotReject(
      () => readFile(new URL(fichier, racine)),
      `${fichier} est mis en cache mais absent du dépôt`,
    );
  }
});

test('le service worker sert le code réseau d’abord', async () => {
  const sw = await lire('sw.js');
  assert.match(sw, /versLeReseau/);
  assert.match(sw, /endsWith\('\.js'\)/);
  assert.ok(
    sw.includes('url.origin !== self.location.origin'),
    'le registre d’Éclats ne doit jamais être servi depuis le cache',
  );
});

test('la page charge le module d’entrée et la feuille de style', async () => {
  const html = await lire('index.html');
  assert.match(html, /<script type="module" src="\.\/js\/app\.js">/);
  assert.match(html, /href="\.\/css\/style\.css"/);
  assert.match(html, /<html lang="fr"/);
  assert.match(html, /id="vue"/);
  assert.match(html, /id="navigation"/);
  assert.match(html, /id="annonces"/);
});

test('le manifeste est installable et ses icônes existent', async () => {
  const manifeste = JSON.parse(await lire('manifest.json'));
  assert.equal(manifeste.name, 'Sport');
  assert.equal(manifeste.display, 'standalone');
  assert.equal(manifeste.start_url, './');
  assert.equal(manifeste.scope, './');

  const tailles = manifeste.icons.map((i) => i.sizes);
  assert.ok(tailles.includes('192x192'));
  assert.ok(tailles.includes('512x512'));
  for (const icone of manifeste.icons) {
    await assert.doesNotReject(() => readFile(new URL(icone.src, racine)), icone.src);
  }
});

test('le manifeste d’écosystème respecte le contrat commun', async () => {
  const eco = JSON.parse(await lire('ecosystem.json'));
  const schema = JSON.parse(
    await readFile(new URL('../../contracts/application-manifest.schema.json', racine), 'utf8'),
  );

  for (const requis of schema.required) {
    assert.ok(requis in eco, `champ obligatoire manquant : ${requis}`);
  }
  for (const cle of Object.keys(eco)) {
    assert.ok(cle in schema.properties, `champ inconnu du contrat : ${cle}`);
  }
  assert.equal(eco.appId, 'sport');
  assert.equal(eco.eclats.mode, 'shared');
  assert.equal(eco.eclats.ledger, 'canonical');
  assert.equal(eco.data.productionMutationAllowed, false);
  assert.ok(schema.properties.lifecycle.enum.includes(eco.lifecycle));
  assert.ok(schema.properties.integration.properties.status.enum.includes(eco.integration.status));
});

test('l’adaptateur déclaré dans le manifeste existe', async () => {
  const eco = JSON.parse(await lire('ecosystem.json'));
  await assert.doesNotReject(() => readFile(new URL(eco.integration.adapter, racine)));
});

/**
 * Règle du propriétaire : aucun tiret typographique dans ce qui s'affiche.
 * Les commentaires de code ne sont pas visibles et restent libres, on les
 * retire donc avant de contrôler.
 */
test('aucun tiret typographique dans le contenu visible', async () => {
  const interdits = /[—–−]/;

  for (const module of await modulesJs()) {
    const source = await lire(module.replace('./', ''));
    const sansCommentaires = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((ligne) => ligne.replace(/(^|\s)\/\/.*$/, '$1'))
      .join('\n');

    const fautives = sansCommentaires.split('\n')
      .map((ligne, i) => [i + 1, ligne])
      .filter(([, ligne]) => interdits.test(ligne));

    assert.deepEqual(fautives, [], `${module} : tiret typographique visible`);
  }

  const html = await lire('index.html');
  assert.ok(!interdits.test(html), 'index.html');
});

test('aucun module n’est orphelin : tout est atteignable depuis app.js', async () => {
  const sources = new Map();
  for (const module of await modulesJs()) {
    sources.set(module.replace('./js/', ''), await lire(module.replace('./', '')));
  }

  const atteints = new Set(['app.js']);
  const aVisiter = ['app.js'];
  while (aVisiter.length) {
    const courant = aVisiter.pop();
    const dossier = courant.includes('/') ? courant.slice(0, courant.lastIndexOf('/')) : '';
    for (const [, chemin] of (sources.get(courant) || '').matchAll(/from '(\.[^']+)'/g)) {
      const resolu = new URL(chemin, `file:///${dossier}/`).pathname.replace(/^\/+/, '');
      if (sources.has(resolu) && !atteints.has(resolu)) {
        atteints.add(resolu);
        aVisiter.push(resolu);
      }
    }
  }

  for (const module of sources.keys()) {
    assert.ok(atteints.has(module), `${module} n’est importé par personne`);
  }
});
