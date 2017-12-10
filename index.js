const parse = require('url').parse;
const rp = require('request-promise');
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
  } else if (hostname.indexOf('freenode') > -1) {
    type = CHAT['IRC'];
  }

  return type;
}

async function fetchChatLink(url) {
  const patterns = {
    'irc': /(?:irc:\/\/)(?:[a-zA-Z1-9]+)?\.?freenode\.net\/?([a-zA-Z1-9-]+)?/,
    'zulip': /(?:https?:\/\/)chat\.zulip\.org/,
    'web': /(?:https?:\/\/)(?:[a-zA-Z1-9]+)?\.?(gitter|zulip(?:chat)?)\.(?:[a-zA-Z1-9]{1,5})\/?([a-zA-Z1-9-]+)?/
  };

  const parsedUrl = parse(url);
  const pathname = parsedUrl.pathname.toLowerCase();

  try {
    const response = await rp(url);

    const ircMatches = patterns.irc.exec(response);
    if (ircMatches) {
      return { type: CHAT['IRC'], url: ircMatches[0] };
    }

    const zulipMatches = patterns.zulip.exec(response);
    if (zulipMatches) {
      return { type: CHAT['ZULIP'], url: zulipMatches[0] };
    }

    const webMatches = patterns.web.exec(url);
    if (webMatches) {
      return { type: CHAT[webMatches[1].toUpperCase()], url: webMatches[0] };
    }

    if (pathname.indexOf('irc') > -1) {
      return { type: CHAT['IRC'], url };
    }

    return { type: CHAT['OTHER'], url };
  } catch (e) {
    return { type: CHAT['OTHER'], url };
  }
}

module.exports = chattie;
module.exports.CHAT = CHAT;
