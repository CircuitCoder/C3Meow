/**
 * Utilities
 * @author Liu Xiaoyi <me@c-3.io>
 */

import request from 'superagent';
import config from './config';

const base = config.base.charAt(config.base.length - 1) === '/' ? config.base : `${config.base}/`;

// Internal
function isInt(str) {
  return /^\d+$/.test(str);
}

const postReq = [];
const listReq = [];
let postReqIndex = 0;
let listReqIndex = 0;

// Exposed
function parseURL(url) {
  if(url.indexOf(base) !== 0)
    throw new Error('Invalid path prefix. Please check the base field in your configuration.');
  else {
    const segs = url.substring(base.length).split('/').filter(e => e.length > 0);
    if(segs.length === 0)
      // Is index
      return {
        ref: 'all',
        page: 1,
        post: null,
      };

    if(segs.length === 1)
      // Is post
      return {
        ref: 'all',
        page: 1,
        post: segs[0],
      };

    if(segs.length === 2)
      if(isInt(segs[1]))
        // Is tag
        return {
          ref: decodeURIComponent(segs[0]),
          page: Number.parseInt(segs[1], 10),
          post: null,
        };

    if(segs.length === 3)
      if(isInt(segs[1]))
        // Is tag
        return {
          ref: decodeURIComponent(segs[0]),
          page: Number.parseInt(segs[1], 10),
          post: segs[2],
        };

    throw new Error('Invalid url format.');
  }
}

function buildURL(state) {
  let refurl;
  let posturl;
  if(state.ref === 'all' && state.page === 1)
    refurl = '';
  else
    refurl = `/${state.ref}/${state.page}`;

  if(state.post !== null)
    posturl = `/${state.post}`;
  else
    posturl = '';

  const result = refurl + posturl;
  return result === '' ? '/' : result;
}

function postURL(url) {
  return `/${url}`;
}

function listURL(tag, page) {
  if(tag === undefined || tag === null || tag === '')
    return page === 1 ? '/' : `/all/${page}`;
  else
    return `/${tag}/${page}`;
}

function loadList(tag, page, cb) {
  const reqIndex = ++listReqIndex;
  for(const req of listReq)
    req.abort();

  const enctag = encodeURIComponent(tag);

  const path = tag === 'all' ? `/posts/${page}` : `/tag/${enctag}/${page}`;
  const req = request.get(config.backend + path)
      .withCredentials()
      .end((err, res) => {
        if(reqIndex !== listReqIndex) return false;
        else if(err) return cb(err);
        else
          try {
            return cb(null, JSON.parse(res.text));
          } catch(e) {
            return cb(e);
          }
      });
  listReq.push(req);
}

function loadPost(url, cb) {
  const reqIndex = ++postReqIndex;
  for(const req of postReq)
    req.abort();

  const encurl = encodeURIComponent(url);

  const req = request.get(`${config.backend}/post/${encurl}`)
      .withCredentials()
      .end((err, res) => {
        if(reqIndex !== postReqIndex) return false;
        else if(err) return cb(err);
        else
          try {
            const post = JSON.parse(res.text);
            if(post.tags === null) post.tags = [];
            return cb(null, post);
          } catch(e) {
            return cb(e);
          }
      });
  postReq.push(req);
}

function ping() {
  return 'pong';
}

function whyAreYouLookingAtThis() {
  throw new Error('should never be called');
}

function doLogin(cb) {
  const pro = window.gapi.auth2.getAuthInstance().signIn();
  if(cb) pro.then(cb);
}

function doLogout(cb) {
  const pro = window.gapi.auth2.getAuthInstance().signOut().then(cb);
  if(cb) pro.then(cb);
}

function postLogin(token, sub, cb) {
  request.post(`${config.backend}/account/login`)
      .withCredentials()
      .send({ token, sub })
      .end((err, res) => {
        if(err) return cb(err);
        else if(res.status !== 200) return cb({ code: res.status, text: res.text });
        try {
          return cb(null, JSON.parse(res.text));
        } catch(e) {
          return cb(e);
        }
      });
}

function postLogout(cb) {
  request.post(`${config.backend}/account/logout`)
      .withCredentials()
      .end((err, res) => {
        if(err) return cb(err);
        else if(res.status !== 200) return cb({ code: res.status, text: res.text });
        try {
          return cb(null, JSON.parse(res.text));
        } catch(e) {
          return cb(e);
        }
      });
}

function initLogin(signIn, signOut) {
  window.gapi.load('auth2', () => {
    const auth = window.gapi.auth2.init({
      client_id: config.googleClientID,
    });

    auth.isSignedIn.listen((signedIn) => {
      if(signedIn) {
        if(signIn) signIn(auth.currentUser.get());
      } else if(signOut) signOut();
    });
  });
}

function updatePost(id, content, cb) {
  request.post(`${config.backend}/internal/post/${id}`)
      .withCredentials()
      .send(content)
      .end((err, res) => {
        if(err) return cb(err);
        else if(res.status !== 200) return cb({ code: res.status, text: res.text });
        try {
          return cb(null, JSON.parse(res.text));
        } catch(e) {
          return cb(e);
        }
      });
}

function newPost(content, cb) {
  request.post(`${config.backend}/posts`)
      .withCredentials()
      .send(content)
      .end((err, res) => {
        if(err) return cb(err);
        else if(res.status !== 200) return cb({ code: res.status, text: res.text });
        try {
          return cb(null, JSON.parse(res.text));
        } catch(e) {
          return cb(e);
        }
      });
}

function deletePost(id, cb) {
  request.delete(`${config.backend}/internal/post/${id}`)
      .withCredentials()
      .end((err, res) => {
        if(err) return cb(err);
        else if(res.status !== 200) return cb({ code: res.status, text: res.text });
        try {
          return cb(null, JSON.parse(res.text));
        } catch(e) {
          return cb(e);
        }
      });
}

export default {
  parseURL,
  buildURL,
  postURL,
  listURL,
  loadList,
  loadPost,
  ping,
  whyAreYouLookingAtThis,
  doLogin,
  doLogout,
  postLogin,
  postLogout,
  initLogin,

  updatePost,
  newPost,
  deletePost,
};
