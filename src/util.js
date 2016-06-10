/**
 * Utilities
 * @author Liu Xiaoyi <me@c-3.io>
 */

import request from 'superagent';
import config from './config';

const base = config.base.charAt(config.base.length - 1) === '/' ? config.base : `${config.base}/`;

function parseURL(url) {
  if(url.indexOf(base) !== 0) {
    throw new Error('Invalid path prefix. Please check the base field in your configuration.');
  } else {
    const segs = url.substring(base.length).split('/').filter(e => e.length > 0);
    if(segs.length === 0) {
      // Is index
      return {
        type: 'list',
        ref: 'all',
        page: 1,
      };
    } if(segs.length === 1) {
      // Is post
      return {
        type: 'post',
        url: segs[0],
      };
    } else if(segs.length === 2) {
      if(Number.isInteger(segs[1])) {
        // Is tag
        return {
          type: 'list',
          ref: segs[0],
          page: Number.parseInt(segs[1], 10),
        };
      }
    }
    throw new Error('Invalid url format.');
  }
}

function postURL(url) {
  return `/${url}`;
}

function listURL(tag, page) {
  if(tag === undefined || tag === null || tag === '') {
    return page === 1 ? '/' : `/all/${page}`;
  } else {
    return `/${tag}/${page}`;
  }
}

function loadList(tag, page, cb) {
  const path = tag === 'all' ? `/posts/${page}` : `/tag/${tag}/${page}`;
  request.get(config.backend + path, (err, res) => {
    if(err) return cb(err);
    else {
      try {
        return cb(null, JSON.parse(res.text));
      } catch(e) {
        return cb(e);
      }
    }
  });
}

function loadPost(url, cb) {
  request.get(`${config.backend}/post/${url}`, (err, res) => {
    if(err) return cb(err);
    else {
      try {
        return cb(null, JSON.parse(res.text));
      } catch(e) {
        return cb(e);
      }
    }
  });
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

function initLogin(signIn, signOut) {
  window.gapi.load('auth2', () => {
    const auth = window.gapi.auth2.init({
      client_id: config.googleClientID,
    });

    auth.isSignedIn.listen((signedIn) => {
      if(signedIn) {
        if(signIn) signIn(auth.currentUser.get());
      } else {
        if(signOut) signOut();
      }
    });
  });
}

export default {
  parseURL,
  postURL,
  listURL,
  loadList,
  loadPost,
  ping,
  whyAreYouLookingAtThis,
  doLogin,
  doLogout,
  initLogin,
};
