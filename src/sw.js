// Service Worker

import config from './config';

const assets = global.serviceWorkerOption.assets;

if(!global.indexedDB) global.indexedDB =
  global.mozIndexedDB ||
  global.webkitIndexedDB ||
  global.msIndexedDB;

if(!global.IDBTransaction) global.IDBTransaction =
  global.webkitIDBTransaction ||
  global.msIDBTransaction;

if(!global.IDBKeyRange) global.IDBKeyRange =
  global.webkitIDBKeyRange ||
  global.msIDBTransaction;

import idb from 'idb';

const DB_NAME = 'c3meow';

async function getIDBStore(name, mode = 'readonly') {
  const dbc = await idb.open(DB_NAME, 1, db => {
    if(db.oldVersion === 0) {
      db.createObjectStore('lists', { keyPath: ['tagName', 'page'] });

      const postsStore = db.createObjectStore('posts', { keyPath: 'data.post_time' });
      postsStore.createIndex('url', 'data.url', { unique: true });
    }
  });

  return dbc
    .transaction(name, mode)
    .objectStore(name);
}

function buildOfflineResponse(record) {
  if(typeof record !== 'undefined')
    return new Response(JSON.stringify({
      cached: {
        time: record.time,
      },
      ...record.data,
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  else return new Response(JSON.stringify({
    cached: true,
  }), {
    status: 404,
    statusText: 'Cache missed',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function fetchListAndUpdate(req, tagName, page) {
  let resp;
  try {
    resp = await fetch(req);
  } catch(e) {
    const store = await getIDBStore('lists');
    const record = await store.get([tagName, page]);

    return buildOfflineResponse(record);
  }

  if(resp.status !== 200) return resp;
  const respData = await resp.clone().json();

  try {
    const store = await getIDBStore('lists', 'readwrite');
    await store.put({
      time: Date.now(),
      tagName,
      page,
      data: respData,
    });
  } catch(e) { /* Ignore */ }

  return resp;
}

async function fetchInternalPostAndUpdate(req, ts) {
  let resp;
  try {
    resp = await fetch(req);
  } catch(e) {
    const store = await getIDBStore('posts');
    const record = await store.get(ts);

    return buildOfflineResponse(record);
  }

  if(resp.status !== 200) return resp;
  const respData = await resp.clone().json();

  if(ts === resp.post_time)
    try {
      const store = await getIDBStore('posts', 'readwrite');
      await store.put({
        time: Date.now(),
        data: respData,
      });
    } catch(e) { /* Ignore */ }

  return resp;
}

async function fetchPostAndUpdate(req, url) {
  let resp;
  try {
    resp = await fetch(req);
  } catch(e) {
    const store = await getIDBStore('posts');
    const record = await store.index('url').get(url);

    return buildOfflineResponse(record);
  }

  if(resp.status !== 200) return resp;
  const respData = await resp.clone().json();

  if(url === respData.url)
    try {
      const store = await getIDBStore('posts', 'readwrite');
      await store.put({
        time: Date.now(),
        data: respData,
      });
    } catch(e) { /* Ignore */ }

  return resp;
}

function fetchBackend(req) {
  if(req.method !== 'GET') return null;

  const pathname = req.url.substr(config.backend.length);

  let regResult = pathname.match(/^\/posts(?:\/(\d+))?\/*$/);
  if(regResult) { // Is list of all
    const [, pageStr] = regResult;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    return fetchListAndUpdate(req, 'all', page);
  }

  regResult = pathname.match(/^\/internal\/post\/(\d+)\/*$/);
  if(regResult) { // Is post by ts
    const [, tsStr] = regResult;
    const ts = parseInt(tsStr, 10);
    return fetchInternalPostAndUpdate(req, ts);
  }

  regResult = pathname.match(/^\/post\/([^/]+)\/*$/);
  if(regResult) { // Is post by URL
    const [, url] = regResult;
    return fetchPostAndUpdate(req, url);
  }

  regResult = pathname.match(/^\/tag\/([^/]+)(?:\/(\d+))\/*$/);
  if(regResult) { // Is a tag group
    const [, tagName, pageStr] = regResult;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    return fetchListAndUpdate(req, tagName, page);
  }

  return fetch(req);
}

function fetchOrigin(req) {
  const pathname = new URL(req.url).pathname;
  if(pathname === '/__webpack_hmr') // Development environment
    return null;
  else if(pathname.match(/\/[a-zA-Z-]+(\.[0-9a-f]+)?\.(css|js|css\.map|js\.map|png|jpg|json|woff2?|ttf|eot)$/)) // Is an asset
    return caches.match(req).then(resp => {
      if(resp) return resp;

      return fetch(req).then(liveResp =>
        caches.open('v1').then(cache => {
          cache.put(req, liveResp.clone());
          return liveResp;
        }),
      );
    }).catch(() => new Response('', { status: 404, statusText: 'Cache missed' }));
  else return fetch(req).catch(e => caches.match('/index.html').then(resp => {
    if(resp) return resp;
    else throw e;
  }));
}

global.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache =>
      cache.addAll([
        '/index.html',
        ...assets,
      ]),
    ),
  );
});

global.addEventListener('fetch', event => {
  const toBackend = event.request.url.indexOf(config.backend) === 0 &&
    (event.request.url.length === config.backend.length ||
    event.request.url.charAt(config.backend.length) === '/');
  let resp = null;
  if(toBackend) {
    const req = event.request.clone();
    resp = fetchBackend(req);
  } else if(new URL(event.request.url).origin === (global.location.origin))
    resp = fetchOrigin(event.request);

  if(resp !== null) event.respondWith(resp);
});
