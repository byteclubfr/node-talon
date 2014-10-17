"use strict";

/* eslint-env node */
/* eslint no-use-before-define:0 */

var debug = require("debug")("talon");
var _ = require("lodash");


module.exports = {
  "extractSignature": extractSignature,
  "getSignatureCandidate": getSignatureCandidate
};


// RE_DELIMITER = re.compile('\r?\n')
var RE_DELIMITER = /\r?\n/;

// from talon.utils import get_delimiter
function getDelimiter (msgBody) {
  var delimiter = RE_DELIMITER.exec(msgBody);
  if (delimiter) {
    return delimiter[0];
  } else {
    return "\n";
  }
}

// from talon.signature.constants import (SIGNATURE_MAX_LINES, TOO_LONG_SIGNATURE_LINE)
var SIGNATURE_MAX_LINES = 11;

// Original: 60
// Switched to 80 as French is a bit more verbose :P
var TOO_LONG_SIGNATURE_LINE = 80;


// From https://gist.github.com/dperini/729294
// See https://mathiasbynens.be/demo/url-regex
var RE_URL = new RegExp(
    // protocol identifier
    "(?:(?:https?|ftp)://)" +
    // user:pass authentication
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
      // IP address exclusion
      // private & local networks
      "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
      "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
      "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
      // IP address dotted notation octets
      // excludes loopback network 0.0.0.0
      // excludes reserved space >= 224.0.0.0
      // excludes network & broacast addresses
      // (first & last IP address of each class)
      "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
      "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
      "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
      // host name
      "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
      // domain name
      "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
      // TLD identifier
      "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
    ")" +
    // port number
    "(?::\\d{2,5})?" +
    // resource path
    "(?:/\\S*)?",
"ig");

// regex to fetch signature based on common signature words
var RE_SIGNATURE = new RegExp(
  "(" +
    "(?:" +
      // from original talon lib
      "^[\\s]*--*[\\s]*[a-z \\.]*$" +
      "|" +
      "^thanks[\\s,!]*$" +
      "|" +
      "^regards[\\s,!]*$" +
      "|" +
      "^cheers[\\s,!]*$" +
      "|" +
      "^best[ a-z]*[\\s,!]*$" +
      // added for French support
      "|" +
      "^merci[\\s,!]*$" +
      "|" +
      "^(?:mes\\s+)?remerciements[\\s,!]*$" +
      "|" +
      "^(?:bien|très\\s+)?cordialement[\\s,!]*$" +
      "|" +
      "^(?:mes\\s+)?meilleur(?:e)?(?:s)?[ a-z]*[\\s,!]*$" +
      "|" +
      "^(?:veuillez recevoir|je vous prie)?.*(?:mes\\s+)?salutations[ a-zé,]*[\\s,!]*$" +
    ")" +
    ".*" +
  ")",
  "im"
);

// signatures appended by phone email clients
var RE_PHONE_SIGNATURE = new RegExp(
  "(" +
    "(?:" +
      // original talon lib
      "^sent\\sfrom\\smy[\\s,!\\w]*$" +
      "|" +
      "^sent[ ]from[ ]Mailbox[ ]for[ ]iPhone.*$" +
      "|" +
      "^sent[ ]([\\S]*[ ])?from[ ]my[ ]BlackBerry.*$" +
      "|" +
      "^Enviado[ ]desde[ ]mi[ ]([\\S]+[ ]){0,2}BlackBerry.*$" +
      // added French support
      "|" +
      "^envoyé\\sdepuis.*$" +
    ")" +
    ".*" +
  ")",
  "im"
);


// see _mark_candidate_indexes() for details
// c - could be signature line
// d - line starts with dashes (could be signature or list item)
// l - long line
var RE_SIGNATURE_CANDIDATE = new RegExp(
  "(c+d)[^d]" +
  "|" +
  "(c+d)$" +
  "|" +
  "(c+)" +
  "|" +
  "(d)[^d]" +
  "|" +
  "(d)$"
, "im");


/* from original lib
    Analyzes message for a presence of signature block (by common patterns)
    and returns tuple with two elements: message text without signature block
    and the signature itself.

    >>> extract_signature('Hey man! How r u?\n\n--\nRegards,\nRoman')
    ('Hey man! How r u?', '--\nRegards,\nRoman')

    >>> extract_signature('Hey man!')
    ('Hey man!', None)
*/
function extractSignature (msgBody) {
  try {
    // identify line delimiter first
    var delimiter = getDelimiter(msgBody);

    // make an assumption
    var strippedBody = msgBody.trim();
    var phoneSignature = null;

    // strip off phone signature (get last one)
    var match = msgBody.match(RE_PHONE_SIGNATURE);
    if (match) {
      phoneSignature = strippedBody.substring(match.index);
      strippedBody = strippedBody.substring(0, match.index);
    }
    debug("phoneSignature", JSON.stringify(phoneSignature));

    // decide on signature candidate
    var lines = strippedBody.split(delimiter);
    debug("lines", lines);
    var candidate = getSignatureCandidate(lines).join(delimiter);
    debug("candidate", JSON.stringify(candidate));

    // Try to extract signature
    var signatureIndex = candidate.search(RE_SIGNATURE);

    // No signature found, just use (maybe) phone signature
    if (signatureIndex === -1) {
      return { "text": strippedBody.trim(), "signature": phoneSignature };
    }

    var signature = candidate.substring(signatureIndex);
    debug("signature", JSON.stringify(signature));

    // when we splitlines() and then join them
    // we can lose a new line at the end
    // we did it when identifying a candidate
    // so we had to do it for stripped_body now
    strippedBody = lines.join(delimiter).slice(0, -signature.length);

    if (phoneSignature) {
      signature = signature + phoneSignature;
    }

    return { "text": strippedBody.trim(), "signature": signature };

  } catch (e) {
    debug("ERROR extracting signature", e);
    return { "text": msgBody, "signature": null };
  }
}

/* from original lib
    """Return lines that could hold signature

    The lines should:

    * be among last SIGNATURE_MAX_LINES non-empty lines.
    * not include first line
    * be shorter than TOO_LONG_SIGNATURE_LINE
    * not include more than one line that starts with dashes
    """
*/
function getSignatureCandidate (lines) {
  debug("getSignatureCandidate", lines);
  // keep only non-empty lines: ["hello", "", "world"] → [0, 2]
  var nonEmpty = _.filter(_.map(lines, function (line, index) {
    return (line && line.trim()) ? index : null;
  }), function isNotNull (index) {
    return index !== null;
  });
  debug("nonEmpty", nonEmpty);

  // if message is empty or just one line then there is no signature
  if (nonEmpty.length <= 1) {
    return [];
  }

  // we don't expect signature to start at the 1st line
  var candidateIndices = nonEmpty.slice(1);
  debug("candidateIndices", candidateIndices);
  // signature shouldn't be longer then SIGNATURE_MAX_LINES
  candidateIndices = candidateIndices.slice(-SIGNATURE_MAX_LINES);

  var markers = markCandidateIndices(lines, candidateIndices);
  candidateIndices = processMarkedCandidateIndices(candidateIndices, markers);

  // get actual lines for the candidate instead of indices
  if (candidateIndices.length) {
    return lines.slice(candidateIndices[0]);
  }

  return [];
}

/* from original lib
    """Mark candidate indexes with markers

    Markers:

    * c - line that could be a signature line
    * l - long line
    * d - line that starts with dashes but has other chars as well

    >>> _mark_candidate_lines(['Some text', '', '-', 'Bob'], [0, 2, 3])
    'cdc'
    """
*/
function markCandidateIndices (lines, candidateIndices) {
  // note: original lib marks from the bottom up, then reverses in _process_marked_candidate_indexes
  // that did not seem very logical so I mark from the top to bottom here
  debug("markCandidateIndices", lines, candidateIndices);
  var markers = "";
  _.forEachRight(candidateIndices, function (lineIdx) {
    var line = lines[lineIdx].trim();
    if (lineLengthIgnoringURLs(line) > TOO_LONG_SIGNATURE_LINE) {
      markers += "l"; // Marked as too long
    } else if (line.match(/^-+[^\-]/)) { // if line.startswith('-') and line.strip("-"):
      markers += "d"; // Marked as dash-line
    } else {
      markers += "c"; // Still a candidate
    }
  });
  debug("markers", markers);
  return markers;
}

/* from original lib
    """
    Run regexes against candidate's marked indexes to strip
    signature candidate.

    >>> _process_marked_candidate_indexes([9, 12, 14, 15, 17], 'clddc')
    [15, 17]
    """
*/
function processMarkedCandidateIndices (candidateIndices, markers) {
  debug("processMarkedCandidateIndices", candidateIndices, markers);
  var match = markers.match(RE_SIGNATURE_CANDIDATE);
  if (!match) {
    return [];
  }

  var found = _.filter(match)[1] || "";
  var end = match.index + found.length;

  var candidates = candidateIndices.slice(-end);

  debug("candidates", candidates);

  return candidates;
}

function lineLengthIgnoringURLs (line) {
  var length = line.length;
  do {
    var match = RE_URL.exec(line);
    if (match) {
      length -= match[0].length;
    }
  } while (match);

  return length;
}
