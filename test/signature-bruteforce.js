"use strict";

/* eslint-env node */
/* eslint no-underscore-dangle:0 */
/* globals describe:0, it:0, before:0, after:0, beforeEach:0, afterEach:0 */

var expect = require("chai").expect;
var rewire = require("rewire");

var bruteforce = rewire("../lib/bruteforce");

describe("signature.bruteforce", function () {

  var testExtract = function (msg, text, signature) {
    expect(bruteforce.extractSignature(msg)).to.eql({
      "text": text,
      "signature": signature
    });
  };

  it("should parse empty body", function () {
    testExtract("", "", null);
  });

  it("should parse unsigned body", function () {
    var msg = "Hey man!";
    testExtract(msg, msg, null);
  });

  it("should parse signature only messages", function () {
    var msg = "--\nRoman";
    testExtract(msg, msg, null);
  });

  it("should detect dash signatures", function () {
    testExtract("Hey man! How r u?\n---\nRoman", "Hey man! How r u?", "---\nRoman");
    testExtract("Hey!\n-roman", "Hey!", "-roman");
    testExtract("Hey!\n\n- roman", "Hey!", "- roman");
    testExtract("Wow. Awesome!\n--\nBob Smith", "Wow. Awesome!", "--\nBob Smith");
  });

  it("should detect signature words", function () {
    testExtract("Hey!\n\nThanks!\nRoman", "Hey!", "Thanks!\nRoman");
    testExtract("Hey!\n--\nBest regards,\n\nRoman", "Hey!", "--\nBest regards,\n\nRoman");
    testExtract("Hey!\n--\n--\nRegards,\nRoman", "Hey!", "--\n--\nRegards,\nRoman");
  });

  it("should detect iphone signature", function () {
    testExtract("Hey!\n\nSent from my iPhone!", "Hey!", "Sent from my iPhone!");
  });

  it("should detect Mailbox for iPhone signature", function () {
    testExtract("Blah\nSent from Mailbox for iPhone", "Blah", "Sent from Mailbox for iPhone");
  });

  it("should detect non-signature lines starting with signature-words", function () {
    testExtract("Hey man!\nThanks for your attention.\n--\nThanks!\nRoman", "Hey man!\nThanks for your attention.", "--\nThanks!\nRoman");
  });

  it("should detect non-signature lines starting with dashes", function () {
    testExtract("Hey man!\nLook at this:\n\n--> one\n--> two\n--\nRoman", "Hey man!\nLook at this:\n\n--> one\n--> two", "--\nRoman");
  });

  it("should keep blank lines inside signature", function () {
    testExtract("Blah.\n\n-Lev.\n\nSent from my HTC smartphone!", "Blah.", "-Lev.\n\nSent from my HTC smartphone!");
    testExtract("Blah.\n--\n\nJohn Doe", "Blah.", "--\n\nJohn Doe");
  });

  it("should detect BlackBerry signature", function () {
    testExtract("Heeyyoooo.\nSent wirelessly from my BlackBerry device on the Bell network.\nEnvoyé sans fil par mon terminal mobile BlackBerry sur le réseau de Bell.", "Heeyyoooo.", "Sent wirelessly from my BlackBerry device on the Bell network.\nEnvoyé sans fil par mon terminal mobile BlackBerry sur le réseau de Bell.");
    testExtract("Blah\nEnviado desde mi oficina mÃ³vil BlackBerryÂ® de Telcel", "Blah", "Enviado desde mi oficina mÃ³vil BlackBerryÂ® de Telcel");
  });

  it("should survive crash in signature detection", function () {
    bruteforce.__with__({
      "getDelimiter": function getDelimiter () {
        throw new Error("Unexpected failure!");
      }
    })(function () {
      testExtract("Hey\n--\nBob", "Hey\n--\nBob", null);
    });
  });

  it("should not detect signature at first line", function () {
    testExtract("Thanks,\n\nBlah\n\nregards\n\nJohn Doe", "Thanks,\n\nBlah", "regards\n\nJohn Doe");
  });

  it("should ignore empty lines when checking for max lines signature", function () {
    bruteforce.__with__({
      "SIGNATURE_MAX_LINES": 2
    })(function () {
      testExtract("Thanks,\nBlah\n\nregards\n\n\nJohn Doe", "Thanks,\nBlah", "regards\n\n\nJohn Doe");
    });
  });

  describe("French support", function () {

    it("should detect signature words", function () {
      testExtract("Hey!\n\nMerci!\nRoman", "Hey!", "Merci!\nRoman");
      testExtract("Coucou !\n\n\nCordialement,\n*Nicolas Chambrier*\n\n*​[image: Photos du profil]Photos du profil 1 photo\n<https://plus.google.com/photos/105040947817397227789/albums/5668513848939008417>​*\n*Mercenaire IT*\n\nTél: *0633334403 <0633334403>*\nVCard: http://nicolas.chambrier.fr/vcard", "Coucou !", "Cordialement,\n*Nicolas Chambrier*\n\n*​[image: Photos du profil]Photos du profil 1 photo\n<https://plus.google.com/photos/105040947817397227789/albums/5668513848939008417>​*\n*Mercenaire IT*\n\nTél: *0633334403 <0633334403>*\nVCard: http://nicolas.chambrier.fr/vcard")
      testExtract("Hey!\n--\nCordialement,\n\nRoman", "Hey!", "--\nCordialement,\n\nRoman");
      testExtract("Hey!\n--\nBien cordialement,\n\nRoman", "Hey!", "--\nBien cordialement,\n\nRoman");
      testExtract("Hey!\n--\nVeuillez recevoir, monsieur, l'expression de mes salutations distinguées,\n\nRoman", "Hey!", "--\nVeuillez recevoir, monsieur, l'expression de mes salutations distinguées,\n\nRoman");
      testExtract("Hey!\n--\n--\nMes remerciements,\nRoman", "Hey!", "--\n--\nMes remerciements,\nRoman");
    });

    it("should detect iphone signature", function () {
      testExtract("Hey!\n\nEnvoyé depuis mon iPhone!", "Hey!", "Envoyé depuis mon iPhone!");
    });

    it("should detect non-signature lines starting with signature-words", function () {
      testExtract("Hey man!\nMerci de ton aide.\n--\nMerci!\nRoman", "Hey man!\nMerci de ton aide.", "--\nMerci!\nRoman");
    });

  });

  describe("signature candidate", function () {

    function testCandidate (lines, result) {
      expect(bruteforce.getSignatureCandidate(lines)).to.eql(result);
    }

    it("should have no signature if not at least two non-empty lines", function () {
      [[], [""], ["", ""], ["abc"]].forEach(function (lines) {
        testCandidate(lines, []);
      });
    });

    it("should never include first line", function () {
      testCandidate(["text", "signature"], ["signature"]);
    });

    it("should be limited by SIGNATURE_MAX_LINES", function () {
      bruteforce.__with__({
        "SIGNATURE_MAX_LINES": 3
      })(function () {
        testCandidate(["text", "", "", "signature"], ["signature"]);
      });
      bruteforce.__with__({
        "SIGNATURE_MAX_LINES": 2
      })(function () {
        testCandidate(["text1", "text2", "signature1", "", "signature2"], ["signature1", "", "signature2"]);
      });
    });

    it("should not include long lines", function () {
      bruteforce.__with__({
        "TOO_LONG_SIGNATURE_LINE": 3
      })(function () {
        testCandidate(["BR", "long", "Bob"], ["Bob"]);
      });
    });

    it("should handle dashed lists", function () {
      testCandidate(["List:", "- item1", "- item 2", "--", "Bob"], ["--", "Bob"]);
    });

  });

  describe("internals", function () {

    // Note: compared to original library's tests, values are all reverted
    // this is normal and expected, see sources for details

    var markCandidateIndices = bruteforce.__get__("markCandidateIndices");

    it("should mark candidate indices", function () {
      bruteforce.__with__({
        "TOO_LONG_SIGNATURE_LINE": 3
      })(function () {
        expect(markCandidateIndices(["BR,  ", "long", "Bob"], [0, 1, 2])).to.equal("clc");
        expect(markCandidateIndices(["-", "long", "-", "- i", "Bob"], [0, 2, 3, 4])).to.equal("cdcc");
      });
    });

    var processMarkedCandidateIndices = bruteforce.__get__("processMarkedCandidateIndices");

    it("should test process marked candidate indices", function () {
      expect(processMarkedCandidateIndices([2, 13, 15], "ccd")).to.eql([2, 13, 15]);
      expect(processMarkedCandidateIndices([2, 13, 15], "cdd")).to.eql([15]);
      expect(processMarkedCandidateIndices([13, 15], "cc")).to.eql([13, 15]);
      expect(processMarkedCandidateIndices([15], "cl")).to.eql([15]);
      expect(processMarkedCandidateIndices([13, 15], "dl")).to.eql([15]);
    });

  });

  describe("advanced features", function () {

    var tooLong20 = bruteforce.__with__({
      "TOO_LONG_SIGNATURE_LINE": 20
    });

    it("should ignore URLs", function () {
      tooLong20(function () {
        testExtract("Hey man! How r u?\n---\nRoman and http://some.very.long.com/url John", "Hey man! How r u?", "---\nRoman and http://some.very.long.com/url John");
      });
    });

  });
});
