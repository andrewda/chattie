const parse  = require('url').parse;
const rp = require('request-promise');
const cheerio = require('cheerio');
const CHAT = require('./resources/chat-types');

async function chattie(url) {
  if (!url) return { type: null, url: null };

  let chatType = getChatType(url);
  let chatLink = url;

  if (!chatType) {
    const urlInfo = await fetchChatLink(url);

    chatType = urlInfo.type;
    chatLink = urlInfo.url;
  }

  return { type: chatType, url: chatLink };
}

function getChatType(url) {
  const parsedUrl = parse(url);
  const hostname = parsedUrl.hostname.toLowerCase();
  const splitHost = hostname.split('.');
  const pathname = parsedUrl.pathname.toLowerCase();

  let type = null;

  if (splitHost[0] === 'gitter') {
    type = CHAT['GITTER'];
  } else if (splitHost[1] === 'zulipchat') {
    type = CHAT['ZULIPCHAT'];
  } else if (splitHost[0] === 'telegram') {
    type = CHAT['TELEGRAM'];
  } else if (hostname.indexOf('slack') > -1 || pathname.indexOf('slack') > -1) {
    type = CHAT['SLACK'];
  }

  return type;
}

async function fetchChatLink(url) {
  const patterns = {
    'irc': /(?:irc:\/\/)(?:[a-zA-Z1-9]+)?\.?freenode\.net\/(#?[a-zA-Z1-9-]+)/,
    'ircweb': /(?:https?:\/\/)webchat\.freenode\.net\/\?channels=%23([a-zA-Z1-9-]+)/,
    'zulip': /(?:https?:\/\/)chat\.zulip\.org/,
    'rocket': /RocketChat/,
    'web': /(?:https?:\/\/)(?:[a-zA-Z1-9]+)?\.?(gitter|zulip(?:chat)?)\.(?:[a-zA-Z1-9]{1,5})\/?([a-zA-Z1-9-]+)?/,
    'discourse': /Discourse\s\d\.\d.+?$/,
  };

  const parsedUrl = parse(url);
  const pathname = parsedUrl.pathname.toLowerCase();

  try {
    const options = {
      uri: url,
      resolveWithFullResponse: true,
    };

    const response = await rp(options);
    const $body = cheerio.load(response.body);
    const generator = $body('meta[name=generator]').attr('content');

    const ircMatches = patterns.irc.exec(response.body);
    if (ircMatches) {
      return { type: CHAT['IRC'], url: ircMatches[0] };
    }

    const ircwebMatches = patterns.ircweb.exec(response.request.href);
    if (ircwebMatches) {
      return { type: CHAT['IRC'], url: `irc://irc.freenode.net/${ircwebMatches[1]}` };
    }

    const zulipMatches = patterns.zulip.exec(response.body);
    if (zulipMatches) {
      return { type: CHAT['ZULIP'], url: zulipMatches[0] };
    }

    const rocketMatches = patterns.rocket.exec(response.body);
    if (rocketMatches) {
      return { type: CHAT['ROCKET'], url: response.request.href };
    }
    
    const discourseMatches = patterns.discourse.exec(generator);
    if (discourseMatches) {
      return { type: CHAT['DISCOURSE'], url: response.request.href };
    }

    const webMatches = patterns.web.exec(response.request.href);
    if (webMatches) {
      return { type: CHAT[webMatches[1].toUpperCase()], url: webMatches[0] };
    }

    if (pathname.indexOf('irc') > -1) {
      return { type: CHAT['IRC'], url: response.request.href };
    }

    return { type: CHAT['OTHER'], url: response.request.href };
  } catch (e) {
    return { type: CHAT['OTHER'], url };
  }
}

module.exports = chattie;
module.exports.CHAT = CHAT;
